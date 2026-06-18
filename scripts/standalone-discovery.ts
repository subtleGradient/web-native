import { existsSync } from "node:fs"
import path from "node:path"
import type { GitHubRepo } from "./standalone-rewriter.ts"

export async function discoverStandaloneHtmlFiles(
  root: string,
  repo: GitHubRepo,
) {
  const candidates = await discoverHtmlFiles(root)
  const standalone: string[] = []

  for (const repoPath of candidates) {
    if (
      isStandaloneHtmlPath(repoPath) ||
      (await containsRepoCdnUrl(root, repoPath, repo))
    ) {
      standalone.push(path.join(root, repoPath))
    }
  }

  return standalone
}

export async function discoverVerifiableStandaloneHtmlFiles(
  root: string,
  repo: GitHubRepo,
) {
  const files = await discoverStandaloneHtmlFiles(root, repo)
  const verifiable: string[] = []

  for (const filePath of files) {
    const html = await Bun.file(filePath).text()
    if (
      html.includes("__webNativeStandaloneDemoReady") ||
      html.includes("__webNativeGithubDemoReady") ||
      html.includes("__webNativeCompositeDemoReady")
    ) {
      verifiable.push(filePath)
    }
  }

  return verifiable
}

export async function discoverBrokerRunnerHtmlFiles(root: string) {
  const candidates = await discoverHtmlFiles(root)
  const files: string[] = []

  for (const repoPath of candidates) {
    const html = await Bun.file(path.join(root, repoPath)).text()
    if (hasBrokerRunnerInstructions(html)) files.push(path.join(root, repoPath))
  }

  return files
}

export async function discoverChatWebappPackageFiles(root: string) {
  const tracked = await gitLines(root, [
    "ls-files",
    "--",
    ":(glob)**/*.chat.webapp/package.json",
  ])
  const untracked = await gitLines(root, [
    "ls-files",
    "--others",
    "--exclude-standard",
    "--",
    ":(glob)**/*.chat.webapp/package.json",
  ])
  return Array.from(new Set([...tracked, ...untracked]))
    .filter((repoPath) => existsSync(path.join(root, repoPath)))
    .map((repoPath) => path.join(root, repoPath))
    .sort()
}

export function hasBrokerRunnerInstructions(html: string) {
  return (
    html.includes("broker-runner.ts") ||
    html.includes("web-native-ai-broker") ||
    html.includes("local Codex broker")
  )
}

async function discoverHtmlFiles(root: string) {
  const tracked = await gitLines(root, ["ls-files", "--", "*.html"])
  const untracked = await gitLines(root, [
    "ls-files",
    "--others",
    "--exclude-standard",
    "--",
    "*.html",
  ])
  return Array.from(new Set([...tracked, ...untracked]))
    .filter((repoPath) => !isIgnoredHtmlPath(repoPath))
    .filter((repoPath) => existsSync(path.join(root, repoPath)))
    .sort()
}

async function gitLines(root: string, args: string[]) {
  const result = await Bun.$`git -C ${root} ${args}`.quiet().nothrow()
  if (result.exitCode !== 0) throw new Error(result.stderr.toString().trim())
  return result.stdout
    .toString()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

function isStandaloneHtmlPath(repoPath: string) {
  if (!repoPath.endsWith(".html")) return false

  const parts = repoPath.split("/")
  if (
    parts[0] === "examples" &&
    parts.length === 3 &&
    parts[2] === "index.html"
  )
    return true
  if (parts[0] !== "src") return false

  const fileStem = path.basename(repoPath, ".html")
  const standaloneStem = fileStem.replace(/\.(?:demo|stories)$/, "")
  const parent = parts.at(-2)
  if (!parent) return false

  if (standaloneStem === parent) return true

  const packageStem = parent.split(".")[0]
  return standaloneStem === packageStem
}

function isIgnoredHtmlPath(repoPath: string) {
  return (
    repoPath.includes("/.local/") ||
    repoPath.includes("/node_modules/") ||
    repoPath.startsWith("node_modules/")
  )
}

async function containsRepoCdnUrl(
  root: string,
  repoPath: string,
  repo: GitHubRepo,
) {
  const html = await Bun.file(path.join(root, repoPath)).text()
  return (
    html.includes(`cdn.jsdelivr.net/gh/${repo.owner}/${repo.repo}@`) ||
    html.includes(`gcore.jsdelivr.net/gh/${repo.owner}/${repo.repo}@`)
  )
}
