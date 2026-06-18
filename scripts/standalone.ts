import path from "node:path"
import { fileURLToPath } from "node:url"
import { discoverBrokerRunnerHtmlFiles, discoverChatWebappPackageFiles, discoverStandaloneHtmlFiles, hasBrokerRunnerInstructions } from "./standalone-discovery.ts"
import {
  aiBrokerBin,
  aiChatRunnerBin,
  formatGithubTarballUrl,
  getGitHubRepo,
  isRepoCdnUrl,
  rewriteChatWebappPackageJson,
  rewriteBrokerRunnerInstructions,
  rewriteStandaloneHtml,
  type GitHubRepo,
  type ResourceKind,
} from "./standalone-rewriter.ts"

type Args = {
  mode?: "cdn" | "local"
  all: boolean
  check: boolean
  allowPendingPush: boolean
  help: boolean
  files: string[]
}

type CommitInfo = {
  commit: string
  timestamp: number
}

async function main() {
  const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
  const args = parseArgs(Bun.argv.slice(2))

  if (args.help) {
    printHelp()
    process.exit(0)
  }

  if (!args.mode) fail("Choose exactly one mode: --cdn or --local.")
  if (!args.all && args.files.length === 0) fail("Pass --all or at least one file.")

  const repo = await getGitHubRepo(root)
  const requestedFiles = args.files.map((file) => path.resolve(root, file))
  const rewriteFiles = args.all ? await discoverStandaloneHtmlFiles(root, repo) : requestedFiles.filter(isHtmlFile)
  const instructionFiles = args.all ? await discoverBrokerRunnerHtmlFiles(root) : rewriteFiles
  const packageFiles = args.all ? await discoverChatWebappPackageFiles(root) : requestedFiles.filter(isChatWebappPackageFile)
  const rewriteFileSet = new Set(rewriteFiles)
  const instructionFileSet = new Set(instructionFiles)
  const packageFileSet = new Set(packageFiles)
  const files = Array.from(new Set([...rewriteFiles, ...instructionFiles, ...packageFiles]))
  const resolver = new CommitResolver(root, repo)
  const changed: string[] = []

  for (const filePath of files) {
    const file = Bun.file(filePath)
    if (!(await file.exists())) continue

    const input = await file.text()
    let output = input

    if (rewriteFileSet.has(filePath)) {
      output = await rewriteStandaloneHtml(output, {
        root,
        htmlPath: filePath,
        repo,
        mode: args.mode,
        localUrlStyle: "relative",
        resolveCdnUrl: async (repoPath, kind) => resolver.cdnUrlFor(repoPath, kind),
      })
    }

    if (instructionFileSet.has(filePath) && hasBrokerRunnerInstructions(output)) {
      output = rewriteBrokerRunnerInstructions(output, {
        tarballUrl: await resolver.githubTarballForBin(aiBrokerBin),
        repoPath: path.relative(root, filePath).replaceAll(path.sep, "/"),
      })
    }

    if (packageFileSet.has(filePath)) {
      output = args.mode === "cdn"
        ? rewriteChatWebappPackageJson(output, {
          mode: "cdn",
          tarballUrl: await resolver.githubTarballForBin(aiChatRunnerBin),
        })
        : rewriteChatWebappPackageJson(output, {
          mode: "local",
          runnerPath: relativeScriptPath(
            path.dirname(filePath),
            path.join(root, await resolver.packageBinPath(aiChatRunnerBin)),
          ),
        })
    }

    if (input === output) continue

    changed.push(path.relative(root, filePath))
    if (!args.check) await Bun.write(filePath, output)
  }

  if (args.mode === "cdn" && !args.allowPendingPush) {
    await verifyCommitsOnGitHub(repo, resolver.usedCommits)
  }

  if (args.check && changed.length > 0) {
    for (const file of changed) console.error(`would rewrite ${file}`)
    process.exitCode = 1
  } else {
    const modeLabel = args.mode === "cdn" ? "CDN" : "local"
    console.log(changed.length === 0 ? `Standalone files already in ${modeLabel} mode` : `Rewrote ${changed.length} standalone file(s) to ${modeLabel} mode`)
  }
}

function parseArgs(values: string[]): Args {
  const parsed: Args = { all: false, check: false, allowPendingPush: false, help: false, files: [] }

  for (const value of values) {
    if (value === "--cdn") {
      if (parsed.mode && parsed.mode !== "cdn") fail("Choose only one mode.")
      parsed.mode = "cdn"
    } else if (value === "--local" || value === "--remove-cdn") {
      if (parsed.mode && parsed.mode !== "local") fail("Choose only one mode.")
      parsed.mode = "local"
    } else if (value === "--all") {
      parsed.all = true
    } else if (value === "--check") {
      parsed.check = true
    } else if (value === "--allow-pending-push") {
      parsed.allowPendingPush = true
    } else if (value === "--help" || value === "-h") {
      parsed.help = true
    } else if (value.startsWith("-")) {
      fail(`Unknown option: ${value}`)
    } else {
      parsed.files.push(value)
    }
  }

  return parsed
}

function printHelp() {
  console.log(`Usage:
  bun run standalone --cdn --all [--check]
  bun run standalone --local --all [--check]
  bun run standalone --remove-cdn path/to/page.html

Options:
  --cdn                 Rewrite managed local repo URLs to pinned GitHub URLs.
                        Also pins .chat.webapp package runner tarballs.
  --local, --remove-cdn Rewrite this repo's jsDelivr GitHub CDN URLs to local relative URLs.
                        Also restores .chat.webapp package runner scripts to local paths.
  --all                 Discover and process standalone HTML pages.
                        Also normalizes discovered OpenAI runner comments.
  --check               Report whether rewriting would change files without writing.
  --allow-pending-push  Skip GitHub reachability checks for commits being pushed by the pre-push hook.
`)
}

class CommitResolver {
  readonly usedCommits = new Set<string>()
  readonly pathCommitCache = new Map<string, Promise<CommitInfo>>()
  readonly directoryCommitCache = new Map<string, Promise<CommitInfo>>()
  readonly jsGraphCache = new Map<string, Promise<CommitInfo>>()
  readonly cssGraphCache = new Map<string, Promise<CommitInfo>>()

  constructor(
    readonly root: string,
    readonly repo: GitHubRepo,
  ) {}

  async cdnUrlFor(repoPath: string, kind: ResourceKind) {
    const commit = await this.latestCommitForResource(repoPath, kind)
    this.usedCommits.add(commit.commit)
    return formatCdnUrl(this.repo, commit.commit, repoPath)
  }

  async githubTarballForBin(binName: string) {
    const commit = await this.latestCommitForBin(binName)
    this.usedCommits.add(commit.commit)
    return formatGithubTarballUrl(this.repo, commit.commit)
  }

  async latestCommitForBin(binName: string): Promise<CommitInfo> {
    const binPath = await this.packageBinPath(binName)
    return newestCommit([
      await this.latestCommitForPath("package.json"),
      await this.latestCommitForResource(binPath, "js"),
    ])
  }

  async latestCommitForResource(repoPath: string, kind: ResourceKind): Promise<CommitInfo> {
    if (kind === "js") return await this.latestCommitForJsGraph(repoPath)
    if (kind === "css") return await this.latestCommitForCssGraph(repoPath)
    if (normalizeRepoPath(repoPath).endsWith("/")) return await this.latestCommitForDirectoryResource(repoPath)
    return await this.latestCommitForPath(repoPath)
  }

  latestCommitForPath(repoPath: string): Promise<CommitInfo> {
    const normalized = normalizeRepoPath(repoPath)
    const cached = this.pathCommitCache.get(normalized)
    if (cached) return cached

    const promise = this.readLatestCommitForPath(normalized)
    this.pathCommitCache.set(normalized, promise)
    return promise
  }

  latestCommitForDirectoryResource(repoPath: string): Promise<CommitInfo> {
    const normalized = normalizeRepoPath(repoPath)
    const cached = this.directoryCommitCache.get(normalized)
    if (cached) return cached

    const promise = this.readLatestCommitForDirectoryResource(normalized)
    this.directoryCommitCache.set(normalized, promise)
    return promise
  }

  latestCommitForJsGraph(repoPath: string): Promise<CommitInfo> {
    const normalized = normalizeRepoPath(repoPath)
    const cached = this.jsGraphCache.get(normalized)
    if (cached) return cached

    const promise = this.walkJsGraph(normalized, new Set())
    this.jsGraphCache.set(normalized, promise)
    return promise
  }

  latestCommitForCssGraph(repoPath: string): Promise<CommitInfo> {
    const normalized = normalizeRepoPath(repoPath)
    const cached = this.cssGraphCache.get(normalized)
    if (cached) return cached

    const promise = this.walkCssGraph(normalized, new Set())
    this.cssGraphCache.set(normalized, promise)
    return promise
  }

  private async readLatestCommitForPath(repoPath: string): Promise<CommitInfo> {
    const result = await Bun.$`git -C ${this.root} log -1 --format=%ct:%H -- ${repoPath}`.quiet().nothrow()
    const text = result.stdout.toString().trim()
    if (result.exitCode !== 0 || !text) throw new Error(`No committed history found for ${repoPath}`)

    const [timestamp, commit] = text.split(":")
    if (!timestamp || !commit) throw new Error(`Cannot parse git log output for ${repoPath}: ${text}`)
    return { timestamp: Number(timestamp), commit }
  }

  async packageBinPath(binName: string) {
    const parsed = JSON.parse(await Bun.file(path.join(this.root, "package.json")).text()) as unknown
    const value = isRecord(parsed) && isRecord(parsed.bin) ? parsed.bin[binName] : undefined
    if (typeof value !== "string") {
      throw new Error(`No package.json bin entry found for ${binName}`)
    }
    return normalizeRepoPath(value.replace(/^\.\//, ""))
  }

  private async readLatestCommitForDirectoryResource(repoPath: string): Promise<CommitInfo> {
    const result = await Bun.$`git -C ${this.root} log -1 --format=%ct:%H -- ${repoPath} ${":(exclude)**/*.html"}`.quiet().nothrow()
    const text = result.stdout.toString().trim()
    if (result.exitCode === 0 && text) {
      const [timestamp, commit] = text.split(":")
      if (!timestamp || !commit) throw new Error(`Cannot parse git log output for ${repoPath}: ${text}`)
      return { timestamp: Number(timestamp), commit }
    }

    return await this.readLatestCommitForPath(repoPath)
  }

  private async walkJsGraph(repoPath: string, seen: Set<string>): Promise<CommitInfo> {
    if (seen.has(repoPath)) return await this.latestCommitForPath(repoPath)
    seen.add(repoPath)

    const commits = [await this.latestCommitForPath(repoPath)]
    const absolute = path.join(this.root, repoPath)
    const file = Bun.file(absolute)
    if (!(await file.exists())) throw new Error(`Missing JS module: ${repoPath}`)

    const source = stripShebang(await file.text())
    const imports = new Bun.Transpiler({ loader: jsGraphLoaderForPath(repoPath) }).scanImports(source)

    for (const item of imports) {
      const imported = resolveJsImport(repoPath, item.path, this.repo)
      if (!imported) continue
      commits.push(await this.walkJsGraph(imported, seen))
    }

    return newestCommit(commits)
  }

  private async walkCssGraph(repoPath: string, seen: Set<string>): Promise<CommitInfo> {
    if (seen.has(repoPath)) return await this.latestCommitForPath(repoPath)
    seen.add(repoPath)

    const commits = [await this.latestCommitForPath(repoPath)]
    const absolute = path.join(this.root, repoPath)
    const file = Bun.file(absolute)
    if (!(await file.exists())) throw new Error(`Missing CSS file: ${repoPath}`)

    const source = await file.text()
    const imports = source.matchAll(/@import\s+(?:url\()?["']?([^"')\s]+)["']?\)?/g)
    for (const match of imports) {
      const imported = resolveRelativeRepoPath(repoPath, match[1]!)
      if (!imported || !imported.endsWith(".css")) continue
      commits.push(await this.walkCssGraph(imported, seen))
    }

    return newestCommit(commits)
  }
}

function resolveJsImport(importerRepoPath: string, specifier: string, repo: GitHubRepo) {
  if (specifier.startsWith("./") || specifier.startsWith("../")) return resolveRelativeRepoPath(importerRepoPath, specifier)
  if (specifier.startsWith("/")) return normalizeRepoPath(specifier)
  if (specifier.startsWith("web-native/")) return `src/${specifier.slice("web-native/".length)}`

  const parsed = parseCdnSpecifier(specifier, repo)
  if (parsed) return parsed

  return undefined
}

function parseCdnSpecifier(specifier: string, repo: GitHubRepo) {
  if (!isRepoCdnUrl(specifier, repo)) return undefined
  const url = new URL(specifier)
  const segments = url.pathname.split("/").filter(Boolean)
  return segments.slice(3).map(decodeURIComponent).join("/")
}

function resolveRelativeRepoPath(importerRepoPath: string, specifier: string) {
  const [bare] = specifier.split(/[?#]/)
  if (!bare) return undefined
  const resolved = path.normalize(path.join(path.dirname(importerRepoPath), bare)).replaceAll(path.sep, "/")
  if (resolved.startsWith("../")) return undefined
  return resolved
}

function jsGraphLoaderForPath(repoPath: string): "js" | "jsx" | "ts" | "tsx" {
  const extension = path.extname(repoPath).toLowerCase()
  if (extension === ".jsx") return "jsx"
  if (extension === ".tsx") return "tsx"
  if (extension === ".ts" || extension === ".mts" || extension === ".cts") return "ts"
  return "js"
}

function stripShebang(source: string) {
  return source.startsWith("#!") ? source.replace(/^#![^\n]*(?:\n|$)/, "") : source
}

function newestCommit(commits: CommitInfo[]) {
  return commits.reduce((newest, commit) => (commit.timestamp > newest.timestamp ? commit : newest))
}

function formatCdnUrl(repo: GitHubRepo, commit: string, repoPath: string) {
  const encoded = normalizeRepoPath(repoPath).split("/").map(encodeURIComponent).join("/")
  return `https://cdn.jsdelivr.net/gh/${repo.owner}/${repo.repo}@${commit}/${encoded}`
}

function normalizeRepoPath(repoPath: string) {
  return repoPath.replace(/^\/+/, "").replaceAll(path.sep, "/")
}

function isHtmlFile(filePath: string) {
  return path.extname(filePath).toLowerCase() === ".html"
}

function isChatWebappPackageFile(filePath: string) {
  return path.basename(filePath) === "package.json" && path.basename(path.dirname(filePath)).endsWith(".chat.webapp")
}

function relativeScriptPath(fromDirectory: string, toFile: string) {
  const relative = path.relative(fromDirectory, toFile).replaceAll(path.sep, "/")
  return relative.startsWith(".") ? relative : `./${relative}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

async function verifyCommitsOnGitHub(repo: GitHubRepo, commits: Set<string>) {
  if (commits.size === 0) return

  for (const commit of commits) {
    const response = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}/commits/${commit}`, {
      headers: { accept: "application/vnd.github+json", "user-agent": "web-native-standalone-script" },
    })

    if (!response.ok) {
      throw new Error(`Commit ${commit} is not reachable from GitHub for ${repo.owner}/${repo.repo}. Push it before generating CDN URLs.`)
    }
  }
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

await main()
