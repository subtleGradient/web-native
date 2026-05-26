import { existsSync } from "node:fs"
import path from "node:path"

export type GitHubRepo = {
  owner: string
  repo: string
}

export type LocalUrlStyle = "relative" | "root"

export type StandaloneRewriteMode = "cdn" | "local"

type RewriteHtmlOptions = {
  root: string
  htmlPath: string
  repo: GitHubRepo
  mode: StandaloneRewriteMode
  localUrlStyle?: LocalUrlStyle
  resolveCdnUrl?: (repoPath: string, kind: ResourceKind) => Promise<string>
}

export type ResourceKind = "css" | "js" | "other"

const fallbackRepo: GitHubRepo = { owner: "subtleGradient", repo: "web-native" }
const repoCdnHosts = new Set(["cdn.jsdelivr.net", "gcore.jsdelivr.net"])
const rewrittenAttributes = ["src", "href"] as const

export async function getGitHubRepo(root: string): Promise<GitHubRepo> {
  const remote = (await Bun.$`git -C ${root} remote get-url origin`.quiet().text()).trim()
  return parseGitHubRemote(remote)
}

export function parseGitHubRemote(remote: string): GitHubRepo {
  const normalized = remote.trim().replace(/\.git$/, "")
  const ssh = normalized.match(/^git@github\.com:([^/]+)\/(.+)$/)
  if (ssh) return { owner: ssh[1]!, repo: ssh[2]! }

  const sshUrl = normalized.match(/^ssh:\/\/git@github\.com\/([^/]+)\/(.+)$/)
  if (sshUrl) return { owner: sshUrl[1]!, repo: sshUrl[2]! }

  const url = new URL(normalized)
  if (url.hostname !== "github.com") throw new Error(`origin is not a GitHub remote: ${remote}`)
  const [owner, repo] = url.pathname.replace(/^\/+/, "").split("/")
  if (!owner || !repo) throw new Error(`cannot parse GitHub owner/repo from origin: ${remote}`)
  return { owner, repo }
}

export async function rewriteStandaloneHtml(html: string, options: RewriteHtmlOptions): Promise<string> {
  const mappings = await createRewriteMappings(html, options)

  const response = new HTMLRewriter()
    .on("*", {
      element(element) {
        for (const attribute of rewrittenAttributes) {
          const value = element.getAttribute(attribute)
          if (!value) continue

          const kind = resourceKindForElement(element.tagName, attribute, element.getAttribute("rel"), value)
          const rewritten = mappings.urls.get(value) ?? rewriteUrlValue(value, kind, options, mappings)
          if (rewritten && rewritten !== value) element.setAttribute(attribute, rewritten)
        }
      },
    })
    .on("script", {
      text(text) {
        if (!text.text) return
        const rewritten = rewriteText(text.text, mappings)
        if (rewritten !== text.text) text.replace(rewritten, { html: true })
      },
    })
    .transform(new Response(html))

  return await response.text()
}

export async function localizeRepoCdnHtml(html: string, options: { root: string; htmlPath: string; repo?: GitHubRepo; localUrlStyle?: LocalUrlStyle }) {
  return await rewriteStandaloneHtml(html, {
    root: options.root,
    htmlPath: options.htmlPath,
    repo: options.repo ?? fallbackRepo,
    mode: "local",
    localUrlStyle: options.localUrlStyle ?? "root",
  })
}

export function isRepoCdnUrl(value: string, repo: GitHubRepo) {
  return Boolean(parseRepoCdnUrl(value, repo))
}

function rewriteText(text: string, mappings: RewriteMappings) {
  let rewritten = text
  for (const [from, to] of mappings.urls) rewritten = rewritten.split(from).join(to)
  for (const [from, to] of mappings.specifiers) rewritten = replaceModuleSpecifier(rewritten, from, to)
  return rewritten
}

type RewriteMappings = {
  urls: Map<string, string>
  specifiers: Map<string, string>
}

async function createRewriteMappings(html: string, options: RewriteHtmlOptions): Promise<RewriteMappings> {
  const mappings: RewriteMappings = { urls: new Map(), specifiers: new Map() }

  const importMaps = readImportMaps(html)
  const moduleScripts = readInlineModuleScripts(html)

  for (const script of moduleScripts) {
    const imports = new Bun.Transpiler({ loader: "js" }).scanImports(script)
    for (const item of imports) {
      const source = item.path
      const mapped = resolveImportSpecifier(source, importMaps, options)
      if (!mapped) continue

      if (options.mode === "local") {
        const local = repoPathToLocalUrl(mapped.repoPath, options)
        mappings.specifiers.set(source, local)
      } else if (options.resolveCdnUrl) {
        mappings.specifiers.set(source, await options.resolveCdnUrl(mapped.repoPath, "js"))
      }
    }
  }

  for (const [from, target] of collectHtmlUrls(html, options)) {
    if (options.mode === "local") {
      mappings.urls.set(from, withSuffix(repoPathToLocalUrl(target.repoPath, options), target.suffix))
    } else if (options.resolveCdnUrl) {
      mappings.urls.set(from, withSuffix(await options.resolveCdnUrl(target.repoPath, target.kind), target.suffix))
    }
  }

  return mappings
}

function rewriteUrlValue(value: string, kind: ResourceKind, options: RewriteHtmlOptions, mappings: RewriteMappings) {
  if (options.mode === "local") {
    const parsed = parseRepoCdnUrl(value, options.repo)
    if (!parsed) return undefined
    return withSuffix(repoPathToLocalUrl(parsed.repoPath, options), parsed.suffix)
  }

  const local = resolveLocalUrl(value, options)
  if (!local || !options.resolveCdnUrl) return undefined

  const mapped = mappings.urls.get(value)
  if (mapped) return mapped

  return undefined
}

function collectHtmlUrls(html: string, options: RewriteHtmlOptions) {
  const found = new Map<string, { repoPath: string; kind: ResourceKind; suffix: string }>()
  const attributePattern = /\s(?:src|href)=["']([^"']+)["']/g
  for (const match of html.matchAll(attributePattern)) {
    const value = match[1]!
    const target = resolveUrlToRepoPath(value, options)
    if (target) found.set(value, target)
  }

  for (const importMap of readImportMaps(html)) {
    for (const value of Object.values(importMap.imports ?? {})) {
      if (typeof value !== "string") continue
      const target = resolveUrlToRepoPath(value, options)
      if (target) found.set(value, target)
    }
  }

  return found
}

function resolveUrlToRepoPath(value: string, options: RewriteHtmlOptions): { repoPath: string; kind: ResourceKind; suffix: string } | undefined {
  const cdn = parseRepoCdnUrl(value, options.repo)
  if (cdn) return { repoPath: cdn.repoPath, kind: resourceKindForPath(cdn.repoPath), suffix: cdn.suffix }

  const local = resolveLocalUrl(value, options)
  if (!local) return undefined
  return { repoPath: local.repoPath, kind: resourceKindForPath(local.repoPath), suffix: local.suffix }
}

function resolveImportSpecifier(source: string, importMaps: ImportMap[], options: RewriteHtmlOptions): { repoPath: string } | undefined {
  const direct = resolveUrlToRepoPath(source, options)
  if (direct) return { repoPath: direct.repoPath }

  for (const importMap of importMaps) {
    for (const [prefix, target] of Object.entries(importMap.imports ?? {})) {
      if (typeof target !== "string") continue
      if (prefix.endsWith("/") && source.startsWith(prefix)) {
        const resolved = resolveUrlToRepoPath(`${target}${source.slice(prefix.length)}`, options)
        if (resolved) return { repoPath: resolved.repoPath }
      }
      if (source === prefix) {
        const resolved = resolveUrlToRepoPath(target, options)
        if (resolved) return { repoPath: resolved.repoPath }
      }
    }
  }

  return undefined
}

type ImportMap = {
  imports?: Record<string, string>
}

function readImportMaps(html: string): ImportMap[] {
  const maps: ImportMap[] = []
  const pattern = /<script\b[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/gi
  for (const match of html.matchAll(pattern)) {
    try {
      maps.push(JSON.parse(match[1]!) as ImportMap)
    } catch {
      // Invalid import maps should fail in the browser; leave them unchanged here.
    }
  }
  return maps
}

function readInlineModuleScripts(html: string) {
  const scripts: string[] = []
  const pattern = /<script\b(?=[^>]*type=(?:"module"|'module'|module))(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi
  for (const match of html.matchAll(pattern)) scripts.push(match[1]!)
  return scripts
}

function resolveLocalUrl(value: string, options: RewriteHtmlOptions): { repoPath: string; suffix: string } | undefined {
  if (!isLocalUrl(value)) return undefined

  const { bare, suffix } = splitUrlSuffix(value)
  const absolute = bare.startsWith("/")
    ? path.resolve(options.root, `.${decodeURIComponent(bare)}`)
    : path.resolve(path.dirname(options.htmlPath), decodeURIComponent(bare))

  let repoPath = toRepoPath(options.root, absolute)
  if (!repoPath || !existsSync(absolute)) return undefined
  if (bare.endsWith("/") && !repoPath.endsWith("/")) repoPath += "/"
  return { repoPath, suffix }
}

function parseRepoCdnUrl(value: string, repo: GitHubRepo): { repoPath: string; ref: string; suffix: string } | undefined {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return undefined
  }

  if (!repoCdnHosts.has(url.hostname)) return undefined

  const segments = url.pathname.split("/").filter(Boolean)
  if (segments[0] !== "gh" || segments.length < 4) return undefined

  const [owner, repoAtRef, ...pathSegments] = segments.slice(1)
  const separator = repoAtRef!.lastIndexOf("@")
  if (separator === -1) return undefined

  const parsedRepo = repoAtRef!.slice(0, separator)
  const ref = repoAtRef!.slice(separator + 1)
  let repoPath = pathSegments.map(decodeURIComponent).join("/")
  if (url.pathname.endsWith("/") && !repoPath.endsWith("/")) repoPath += "/"
  if (!isAllowedRepo(owner!, parsedRepo, repo)) return undefined
  if (!repoPath) return undefined

  return { repoPath, ref, suffix: `${url.search}${url.hash}` }
}

function isAllowedRepo(owner: string, repoName: string, repo: GitHubRepo) {
  return (owner === repo.owner && repoName === repo.repo) || (owner === fallbackRepo.owner && repoName === fallbackRepo.repo)
}

function repoPathToLocalUrl(repoPath: string, options: RewriteHtmlOptions) {
  if (options.localUrlStyle === "root") return `/${repoPath}`

  const from = path.dirname(options.htmlPath)
  const to = path.join(options.root, repoPath)
  let relative = path.relative(from, to).replaceAll(path.sep, "/")
  if (!relative.startsWith(".")) relative = `./${relative}`
  if (repoPath.endsWith("/") && !relative.endsWith("/")) relative += "/"
  return relative
}

function isLocalUrl(value: string) {
  if (value.startsWith("/") && !value.startsWith("//")) return true
  if (value.startsWith("./") || value.startsWith("../")) return true
  return false
}

function splitUrlSuffix(value: string) {
  const index = value.search(/[?#]/)
  if (index === -1) return { bare: value, suffix: "" }
  return { bare: value.slice(0, index), suffix: value.slice(index) }
}

function withSuffix(value: string, suffix: string) {
  return `${value}${suffix}`
}

function toRepoPath(root: string, absolute: string) {
  const relative = path.relative(root, absolute)
  if (relative.startsWith("..") || path.isAbsolute(relative)) return undefined
  return relative.replaceAll(path.sep, "/")
}

function resourceKindForElement(tagName: string, attribute: string, rel: string | null, value: string): ResourceKind {
  if (tagName === "script" && attribute === "src") return "js"
  if (tagName === "link" && attribute === "href" && rel?.split(/\s+/).includes("stylesheet")) return "css"
  return resourceKindForPath(value)
}

function resourceKindForPath(value: string): ResourceKind {
  const { bare } = splitUrlSuffix(value)
  if (bare.endsWith(".js") || bare.endsWith(".mjs")) return "js"
  if (bare.endsWith(".css")) return "css"
  return "other"
}

function replaceModuleSpecifier(source: string, from: string, to: string) {
  const escaped = escapeRegExp(from)
  return source.replace(new RegExp(`(["'])${escaped}\\1`, "g"), (_, quote: string) => `${quote}${to}${quote}`)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
