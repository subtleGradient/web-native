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
const DEFAULT_DEMO_PATH = "src/openai.webapp/openai.demo.html"
const OPENAI_API_BASE_URL = "https://api.openai.com/v1"
const OPENAI_RESPONSES_WS_URL = "wss://api.openai.com/v1/responses"
const CODEX_RESPONSES_URL = "https://chatgpt.com/backend-api/codex/responses"
const CODEX_RESPONSES_WS_URL = "wss://chatgpt.com/backend-api/codex/responses"
const CODEX_EMBEDDINGS_URL = "https://chatgpt.com/backend-api/codex/embeddings"
const AUTH_URL = "https://auth.openai.com/oauth/token"
const OPENAI_OAUTH_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann"

type ResponsesRelayData = {
  apiKey?: string
  closed?: boolean
  connecting?: Promise<void>
  organization?: string
  project?: string
  queue: string[]
  transport: "api-key-broker" | "codex-broker"
  upstream?: WebSocket
}

const packageRoot = path.resolve(
  fileURLToPath(new URL("../../..", import.meta.url)),
)
const launchPath = resolveLaunchPath(process.argv[2] ?? DEFAULT_DEMO_PATH)
const token = crypto.randomUUID()
const explicitPort =
  process.env.PORT !== undefined ||
  process.env.WEB_NATIVE_OPENAI_PORT !== undefined
const requestedPort = readPort()

const server = serveOpenAIRunner(requestedPort, explicitPort)

const launchUrl = `http://${HOST}:${server.port}/${path.relative(packageRoot, launchPath).split(path.sep).join("/")}?t=${encodeURIComponent(token)}`
if (!explicitPort && server.port !== requestedPort)
  console.warn(`Port ${requestedPort} is in use; using ${server.port}.`)
console.log(`${launchLabel()}: ${launchUrl}`)

process.on("SIGINT", () => stop())
process.on("SIGTERM", () => stop())

await new Promise(() => {})

function readPort() {
  const raw = process.env.PORT ?? process.env.WEB_NATIVE_OPENAI_PORT
  if (raw === undefined) return DEFAULT_PORT
  const port = Number(raw)
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error(`Invalid port: ${raw}`)
  return port
}

function serveOpenAIRunner(requestedPort: number, fixedPort: boolean) {
  const attempts = fixedPort ? 1 : 50
  for (let offset = 0; offset < attempts; offset += 1) {
    const port = requestedPort + offset
    if (port > 65535) break
    try {
      return Bun.serve({
        hostname: HOST,
        port,
        fetch: handleFetch,
        websocket: {
          message: handleWebSocketMessage,
          close: handleWebSocketClose,
        },
      })
    } catch (error) {
      if (!isAddressInUse(error) || fixedPort) throw error
    }
  }
  throw new Error(
    `No available port found from ${requestedPort} to ${Math.min(65535, requestedPort + attempts - 1)}`,
  )
}

function launchLabel() {
  return path.basename(launchPath) === "openai.demo.html"
    ? "OpenAI demos"
    : path.basename(launchPath)
}

async function handleFetch(request: Request) {
  const url = new URL(request.url)

  if (url.pathname === "/favicon.ico")
    return new Response(null, { status: 204 })

  if (url.pathname.startsWith("/__web-native-openai/")) {
    if (!authorized(request, url))
      return new Response("Forbidden", { status: 403 })
    if (url.pathname === "/__web-native-openai/api/responses/ws")
      return handleResponsesWebSocket(request, "api-key-broker")
    if (url.pathname === "/__web-native-openai/codex/responses/ws")
      return handleResponsesWebSocket(request, "codex-broker")
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

function handleResponsesWebSocket(
  request: Request,
  transport: ResponsesRelayData["transport"],
) {
  const upgraded = server.upgrade(request, {
    data: {
      apiKey: request.headers.get("x-openai-api-key") ?? undefined,
      organization:
        request.headers.get("openai-organization") ??
        process.env.OPENAI_ORGANIZATION,
      project:
        request.headers.get("openai-project") ?? process.env.OPENAI_PROJECT,
      queue: [],
      transport,
    } satisfies ResponsesRelayData,
  })
  return upgraded
    ? undefined
    : new Response("WebSocket upgrade failed", { status: 400 })
}

function handleWebSocketMessage(
  ws: ServerWebSocket<ResponsesRelayData>,
  message: string | Buffer,
) {
  const data = ws.data
  const text = typeof message === "string" ? message : message.toString()
  const control = parseRelayConnectMessage(text)
  if (control !== undefined) {
    if (
      data.transport !== "codex-broker" &&
      typeof control.apiKey === "string" &&
      control.apiKey.length > 0
    )
      data.apiKey = control.apiKey
    if (
      typeof control.organization === "string" &&
      control.organization.length > 0
    )
      data.organization = control.organization
    if (typeof control.project === "string" && control.project.length > 0)
      data.project = control.project
    void connectResponsesUpstream(ws, data)
    return
  }
  sendOrQueueResponsesFrame(data, text)
  void connectResponsesUpstream(ws, data)
}

function handleWebSocketClose(ws: ServerWebSocket<ResponsesRelayData>) {
  const data = ws.data
  data.closed = true
  data.upstream?.close()
}

async function connectResponsesUpstream(
  ws: ServerWebSocket<ResponsesRelayData>,
  data: ResponsesRelayData,
) {
  if (data.upstream !== undefined) return
  if (data.connecting !== undefined) return data.connecting
  data.connecting = connectResponsesUpstreamOnce(ws, data).finally(() => {
    data.connecting = undefined
  })
  return data.connecting
}

async function connectResponsesUpstreamOnce(
  ws: ServerWebSocket<ResponsesRelayData>,
  data: ResponsesRelayData,
) {
  let upstreamOptions: { headers: Record<string, string>; url: string }
  try {
    upstreamOptions = await responsesRelayConnection(data)
  } catch (error) {
    ws.send(
      JSON.stringify({
        type: "error",
        status: 401,
        error: {
          type: "authentication_error",
          code: "missing_credentials",
          message: error instanceof Error ? error.message : String(error),
        },
      }),
    )
    ws.close()
    return
  }

  const upstream = new WebSocket(upstreamOptions.url, {
    headers: upstreamOptions.headers,
  } as unknown as string | string[])
  data.upstream = upstream

  upstream.addEventListener("open", () => {
    const pending = data.queue.splice(0)
    for (const frame of pending) upstream.send(frame)
  })
  upstream.addEventListener("message", (event) => {
    if (data.closed) return
    ws.send(typeof event.data === "string" ? event.data : String(event.data))
  })
  upstream.addEventListener("error", () => {
    if (data.closed) return
    ws.send(
      JSON.stringify({
        type: "error",
        error: { message: "Responses WebSocket relay upstream error" },
        status: 502,
      }),
    )
  })
  upstream.addEventListener("close", (event) => {
    if (!data.closed && event.code !== 1000) {
      ws.send(
        JSON.stringify({
          type: "error",
          status: 502,
          error: {
            message: `Responses WebSocket upstream closed: ${event.code}${event.reason ? ` ${event.reason}` : ""}`,
          },
        }),
      )
    }
    if (!data.closed) ws.close()
  })
}

async function responsesRelayConnection(data: ResponsesRelayData) {
  if (data.transport === "codex-broker") {
    return { headers: await codexHeaders(), url: CODEX_RESPONSES_WS_URL }
  }
  if (data.apiKey) {
    return {
      headers: openAIAuthHeaders({
        apiKey: data.apiKey,
        organization: data.organization,
        project: data.project,
      }),
      url: OPENAI_RESPONSES_WS_URL,
    }
  }
  try {
    return { headers: await codexHeaders(), url: CODEX_RESPONSES_WS_URL }
  } catch (error) {
    if (!isCodexAuthNotFoundError(error)) throw error
    return {
      headers: openAIAuthHeaders({
        apiKey: process.env.OPENAI_API_KEY,
        organization: process.env.OPENAI_ORGANIZATION,
        project: process.env.OPENAI_PROJECT,
      }),
      url: OPENAI_RESPONSES_WS_URL,
    }
  }
}

function isCodexAuthNotFoundError(error: unknown) {
  if (isRecord(error) && error.code === "ENOENT") return true
  if (!(error instanceof Error)) return false
  return (
    error.message.startsWith("No OpenAI OAuth credentials") ||
    error.message.startsWith("No usable OpenAI OAuth credentials")
  )
}

function sendOrQueueResponsesFrame(data: ResponsesRelayData, frame: string) {
  const upstream = data.upstream
  if (upstream?.readyState === WebSocket.OPEN) {
    upstream.send(frame)
    return
  }
  data.queue.push(frame)
}

function parseRelayConnectMessage(text: string) {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return undefined
  }
  if (!isRecord(parsed) || parsed.type !== "web_native.openai.relay.connect")
    return undefined
  return parsed
}

async function handleBrokerFetch(request: Request, url: URL) {
  if (request.method !== "POST")
    return new Response("Method not allowed", { status: 405 })

  if (url.pathname === "/__web-native-openai/api/responses") {
    return proxyJson(
      request,
      `${OPENAI_API_BASE_URL}/responses`,
      openAIHeaders(request),
    )
  }
  if (url.pathname === "/__web-native-openai/api/embeddings") {
    return proxyJson(
      request,
      `${OPENAI_API_BASE_URL}/embeddings`,
      openAIHeaders(request),
    )
  }
  if (url.pathname === "/__web-native-openai/api/realtime/session") {
    return proxyJson(
      request,
      `${OPENAI_API_BASE_URL}/realtime/sessions`,
      openAIHeaders(request),
    )
  }
  if (url.pathname === "/__web-native-openai/codex/responses") {
    return proxyJson(request, CODEX_RESPONSES_URL, await codexHeaders())
  }
  if (url.pathname === "/__web-native-openai/codex/embeddings") {
    return proxyJson(request, CODEX_EMBEDDINGS_URL, await codexHeaders())
  }
  if (url.pathname === "/__web-native-openai/codex/realtime/session") {
    return new Response("Codex realtime broker is not implemented yet.", {
      status: 501,
    })
  }

  return new Response("Not found", { status: 404 })
}

async function proxyJson(
  request: Request,
  endpoint: string,
  headers: HeadersInit,
) {
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
  return openAIAuthHeaders({
    apiKey:
      request.headers.get("x-openai-api-key") ?? process.env.OPENAI_API_KEY,
    organization:
      request.headers.get("openai-organization") ??
      process.env.OPENAI_ORGANIZATION,
    project:
      request.headers.get("openai-project") ?? process.env.OPENAI_PROJECT,
  })
}

function openAIAuthHeaders(options: {
  apiKey?: string
  organization?: string
  project?: string
}) {
  if (!options.apiKey)
    throw new Error("OPENAI_API_KEY is required for api-key broker calls")
  const headers: Record<string, string> = {
    authorization: `Bearer ${options.apiKey}`,
    "content-type": "application/json",
  }
  if (options.organization)
    headers["OpenAI-Organization"] = options.organization
  if (options.project) headers["OpenAI-Project"] = options.project
  return headers
}

async function codexHeaders() {
  const auth = await loadOpenAIOAuth()
  const accessToken =
    auth.expiresAt <= Date.now() + 60_000
      ? await refreshAccessToken(auth.refreshToken)
      : auth.accessToken
  const headers: Record<string, string> = {
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json",
    "user-agent": "web-native-openai",
  }
  if (auth.accountId) headers["ChatGPT-Account-Id"] = auth.accountId
  return headers
}

async function loadOpenAIOAuth(): Promise<OpenAIOAuth> {
  const authPath =
    process.env.OPENCODE_AUTH_FILE ??
    (process.env.XDG_DATA_HOME
      ? `${process.env.XDG_DATA_HOME}/opencode/auth.json`
      : `${homedir()}/.local/share/opencode/auth.json`)
  const parsed = JSON.parse(await readFile(authPath, "utf8")) as unknown
  if (!isRecord(parsed) || !isRecord(parsed.openai))
    throw new Error(`No OpenAI OAuth credentials in ${authPath}`)
  const openai = parsed.openai
  if (
    openai.type !== "oauth" ||
    typeof openai.access !== "string" ||
    typeof openai.refresh !== "string" ||
    typeof openai.expires !== "number"
  ) {
    throw new Error(
      `No usable OpenAI OAuth credentials in ${authPath}. Run: opencode auth login`,
    )
  }
  return {
    accessToken: openai.access,
    refreshToken: openai.refresh,
    expiresAt: openai.expires,
    ...(typeof openai.accountId === "string"
      ? { accountId: openai.accountId }
      : {}),
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
  if (!response.ok)
    throw new Error(
      body || `OpenAI OAuth refresh failed: HTTP ${response.status}`,
    )
  const payload = JSON.parse(body) as unknown
  if (!isRecord(payload) || typeof payload.access_token !== "string")
    throw new Error(
      "OpenAI OAuth refresh response did not include access_token",
    )
  return payload.access_token
}

function responseHeaders(response: Response) {
  const headers = new Headers()
  const contentType = response.headers.get("content-type")
  const requestId =
    response.headers.get("x-request-id") ??
    response.headers.get("x-oai-request-id")
  if (contentType) headers.set("content-type", contentType)
  if (requestId) headers.set("x-request-id", requestId)
  return headers
}

function authorized(request: Request, url: URL) {
  return (
    request.headers.get("x-web-native-openai-token") === token ||
    url.searchParams.get("t") === token
  )
}

function resolveLaunchPath(input: string) {
  const cwdPath = path.resolve(process.cwd(), input)
  if (existsSync(cwdPath)) return requirePackageRootPath(cwdPath, input)
  const packagePath = path.resolve(packageRoot, input)
  if (existsSync(packagePath)) return requirePackageRootPath(packagePath, input)
  throw new Error(`Demo file not found: ${input}`)
}

function requirePackageRootPath(filePath: string, input: string) {
  const relative = path.relative(packageRoot, filePath)
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) return filePath
  throw new Error(`Demo file must be inside ${packageRoot}: ${input}`)
}

function resolvePublicPath(pathname: string) {
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return undefined
  }
  if (decoded === "/")
    decoded = `/${path.relative(packageRoot, launchPath).split(path.sep).join("/")}`
  const filePath = path.resolve(packageRoot, `.${decoded}`)
  return filePath === packageRoot ||
    filePath.startsWith(`${packageRoot}${path.sep}`)
    ? filePath
    : undefined
}

function contentType(filePath: string) {
  const extension = path.extname(filePath)
  if (extension === ".css") return "text/css; charset=utf-8"
  if (extension === ".html" || extension === ".htm")
    return "text/html; charset=utf-8"
  if (extension === ".js" || extension === ".mjs" || extension === ".ts")
    return "text/javascript; charset=utf-8"
  if (extension === ".json") return "application/json; charset=utf-8"
  if (extension === ".svg") return "image/svg+xml"
  return "application/octet-stream"
}

function stop() {
  server.stop(true)
  process.exit(0)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isAddressInUse(error: unknown) {
  return isRecord(error) && error.code === "EADDRINUSE"
}
