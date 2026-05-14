#!/usr/bin/env bun

import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

type OpenAIOAuth = {
  accessToken: string
  refreshToken: string
  expiresAt: number
  accountId?: string
}

const HOST = "localhost"
const DEFAULT_PORT = 4174
const DEFAULT_DEMO_PATH = "src/openai/openai.demo.html"
const OPENAI_API_BASE_URL = "https://api.openai.com/v1"
const CODEX_RESPONSES_URL = "https://chatgpt.com/backend-api/codex/responses"
const CODEX_EMBEDDINGS_URL = "https://chatgpt.com/backend-api/codex/embeddings"
const AUTH_URL = "https://auth.openai.com/oauth/token"
const OPENAI_OAUTH_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann"

const packageRoot = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)))
const launchPath = resolveLaunchPath(process.argv[2] ?? DEFAULT_DEMO_PATH)
const token = crypto.randomUUID()
const port = Number(process.env.PORT ?? process.env.WEB_NATIVE_OPENAI_PORT ?? DEFAULT_PORT)

const server = Bun.serve({
  hostname: HOST,
  port,
  fetch: handleFetch,
})

const launchUrl = `http://${HOST}:${server.port}/${path.relative(packageRoot, launchPath).split(path.sep).join("/")}?t=${encodeURIComponent(token)}`
console.log(`${path.basename(launchPath)}: ${launchUrl}`)
openBrowser(launchUrl)

process.on("SIGINT", () => stop())
process.on("SIGTERM", () => stop())

await new Promise(() => {})

async function handleFetch(request: Request) {
  const url = new URL(request.url)

  if (url.pathname === "/favicon.ico") return new Response(null, { status: 204 })

  if (url.pathname.startsWith("/__web-native-openai/")) {
    if (!authorized(request, url)) return new Response("Forbidden", { status: 403 })
    return handleBrokerFetch(request, url)
  }

  const filePath = resolvePublicPath(url.pathname)
  if (!filePath) return new Response("Not found", { status: 404 })
  const file = Bun.file(filePath)
  if (!(await file.exists())) return new Response("Not found", { status: 404 })
  return new Response(file, {
    headers: {
      "cache-control": "no-store",
      "content-type": contentType(filePath),
    },
  })
}

async function handleBrokerFetch(request: Request, url: URL) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 })

  if (url.pathname === "/__web-native-openai/api/responses") {
    return proxyJson(request, `${OPENAI_API_BASE_URL}/responses`, openAIHeaders(request))
  }
  if (url.pathname === "/__web-native-openai/api/embeddings") {
    return proxyJson(request, `${OPENAI_API_BASE_URL}/embeddings`, openAIHeaders(request))
  }
  if (url.pathname === "/__web-native-openai/api/realtime/session") {
    return proxyJson(request, `${OPENAI_API_BASE_URL}/realtime/sessions`, openAIHeaders(request))
  }
  if (url.pathname === "/__web-native-openai/codex/responses") {
    return proxyJson(request, CODEX_RESPONSES_URL, await codexHeaders())
  }
  if (url.pathname === "/__web-native-openai/codex/embeddings") {
    return proxyJson(request, CODEX_EMBEDDINGS_URL, await codexHeaders())
  }
  if (url.pathname === "/__web-native-openai/codex/realtime/session") {
    return new Response("Codex realtime broker is not implemented yet.", { status: 501 })
  }

  return new Response("Not found", { status: 404 })
}

async function proxyJson(request: Request, endpoint: string, headers: HeadersInit) {
  const body = await request.text()
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body,
  })
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders(response),
  })
}

function openAIHeaders(request: Request) {
  const apiKey = request.headers.get("x-openai-api-key") ?? process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for api-key broker calls")
  const headers: Record<string, string> = {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
  }
  const organization = request.headers.get("openai-organization") ?? process.env.OPENAI_ORGANIZATION
  const project = request.headers.get("openai-project") ?? process.env.OPENAI_PROJECT
  if (organization) headers["OpenAI-Organization"] = organization
  if (project) headers["OpenAI-Project"] = project
  return headers
}

async function codexHeaders() {
  const auth = await loadOpenAIOAuth()
  const accessToken = auth.expiresAt <= Date.now() + 60_000 ? await refreshAccessToken(auth.refreshToken) : auth.accessToken
  const headers: Record<string, string> = {
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json",
    "user-agent": "web-native-openai",
  }
  if (auth.accountId) headers["ChatGPT-Account-Id"] = auth.accountId
  return headers
}

async function loadOpenAIOAuth(): Promise<OpenAIOAuth> {
  const authPath = process.env.OPENCODE_AUTH_FILE ?? (process.env.XDG_DATA_HOME ? `${process.env.XDG_DATA_HOME}/opencode/auth.json` : `${homedir()}/.local/share/opencode/auth.json`)
  const parsed = JSON.parse(await readFile(authPath, "utf8")) as unknown
  if (!isRecord(parsed) || !isRecord(parsed.openai)) throw new Error(`No OpenAI OAuth credentials in ${authPath}`)
  const openai = parsed.openai
  if (openai.type !== "oauth" || typeof openai.access !== "string" || typeof openai.refresh !== "string" || typeof openai.expires !== "number") {
    throw new Error(`No usable OpenAI OAuth credentials in ${authPath}. Run: opencode auth login`)
  }
  return {
    accessToken: openai.access,
    refreshToken: openai.refresh,
    expiresAt: openai.expires,
    ...(typeof openai.accountId === "string" ? { accountId: openai.accountId } : {}),
  }
}

async function refreshAccessToken(refreshToken: string) {
  const response = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: OPENAI_OAUTH_CLIENT_ID,
    }),
  })
  const body = await response.text()
  if (!response.ok) throw new Error(body || `OpenAI OAuth refresh failed: HTTP ${response.status}`)
  const payload = JSON.parse(body) as unknown
  if (!isRecord(payload) || typeof payload.access_token !== "string") throw new Error("OpenAI OAuth refresh response did not include access_token")
  return payload.access_token
}

function responseHeaders(response: Response) {
  const headers = new Headers()
  const contentType = response.headers.get("content-type")
  const requestId = response.headers.get("x-request-id") ?? response.headers.get("x-oai-request-id")
  if (contentType) headers.set("content-type", contentType)
  if (requestId) headers.set("x-request-id", requestId)
  return headers
}

function authorized(request: Request, url: URL) {
  return request.headers.get("x-web-native-openai-token") === token || url.searchParams.get("t") === token
}

function resolveLaunchPath(input: string) {
  const cwdPath = path.resolve(process.cwd(), input)
  if (existsSync(cwdPath)) return cwdPath
  const packagePath = path.resolve(packageRoot, input)
  if (existsSync(packagePath)) return packagePath
  throw new Error(`Demo file not found: ${input}`)
}

function resolvePublicPath(pathname: string) {
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return undefined
  }
  if (decoded === "/") decoded = `/${path.relative(packageRoot, launchPath).split(path.sep).join("/")}`
  const filePath = path.resolve(packageRoot, `.${decoded}`)
  return filePath === packageRoot || filePath.startsWith(`${packageRoot}${path.sep}`) ? filePath : undefined
}

function contentType(filePath: string) {
  const extension = path.extname(filePath)
  if (extension === ".css") return "text/css; charset=utf-8"
  if (extension === ".html" || extension === ".htm") return "text/html; charset=utf-8"
  if (extension === ".js" || extension === ".mjs" || extension === ".ts") return "text/javascript; charset=utf-8"
  if (extension === ".json") return "application/json; charset=utf-8"
  if (extension === ".svg") return "image/svg+xml"
  return "application/octet-stream"
}

function openBrowser(url: string) {
  if (process.env.WEB_NATIVE_OPENAI_NO_OPEN === "1") return
  if (process.platform === "darwin") {
    Bun.spawn(["open", url], { stdout: "ignore", stderr: "ignore" })
    return
  }
  if (process.platform === "win32") {
    Bun.spawn(["cmd", "/c", "start", "", url], { stdout: "ignore", stderr: "ignore" })
    return
  }
  Bun.spawn(["xdg-open", url], { stdout: "ignore", stderr: "ignore" })
}

function stop() {
  server.stop(true)
  process.exit(0)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
