import path from "node:path"
import type { GitHubRepo } from "./standalone-rewriter.ts"

export async function discoverStandaloneHtmlFiles(root: string, repo: GitHubRepo) {
  const candidates = await discoverHtmlFiles(root)
  const standalone: string[] = []

  for (const repoPath of candidates) {
    if (isStandaloneHtmlPath(repoPath) || (await containsRepoCdnUrl(root, repoPath, repo))) {
      standalone.push(path.join(root, repoPath))
    }
  }

  return standalone
}

export async function discoverVerifiableStandaloneHtmlFiles(root: string, repo: GitHubRepo) {
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

async function discoverHtmlFiles(root: string) {
  const tracked = await gitLines(root, ["ls-files", "--", "*.html"])
  const untracked = await gitLines(root, ["ls-files", "--others", "--exclude-standard", "--", "*.html"])
  return Array.from(new Set([...tracked, ...untracked]))
    .filter((repoPath) => !isIgnoredHtmlPath(repoPath))
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
  if (!repoPath.endsWith(".html") || repoPath.endsWith(".demo.html") || repoPath.endsWith(".stories.html")) return false

  const parts = repoPath.split("/")
  if (parts[0] === "examples" && (parts[1] === "standalone" || parts[1] === "composite")) return true
  if (parts[0] !== "src") return false

  const fileStem = path.basename(repoPath, ".html")
  const parent = parts.at(-2)
  if (!parent) return false

  if (fileStem === parent) return true

  const packageStem = parent.split(".")[0]
  return fileStem === packageStem
}

function isIgnoredHtmlPath(repoPath: string) {
  return repoPath.includes("/.local/") || repoPath.includes("/node_modules/") || repoPath.startsWith("node_modules/")
}

async function containsRepoCdnUrl(root: string, repoPath: string, repo: GitHubRepo) {
  const html = await Bun.file(path.join(root, repoPath)).text()
  return html.includes(`cdn.jsdelivr.net/gh/${repo.owner}/${repo.repo}@`) || html.includes(`gcore.jsdelivr.net/gh/${repo.owner}/${repo.repo}@`)
}
