#!/usr/bin/env bun

import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { readFile, rename, stat, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

type OpenAIOAuth = {
  accessToken: string
  refreshToken: string
  expiresAt: number
  accountId?: string
}

type ChatMessage = {
  id: string
  references: FileReference[]
  role: string
  text: string
}

type FileReference = {
  forId?: string
  label: string
  mime?: string
  path: string
}

const HOST = "localhost"
const DEFAULT_PORT = 4175
const DEFAULT_DEMO_PATH = "index.html"
const DEFAULT_MODEL = "gpt-5.5"
const MAX_REFERENCED_FILE_BYTES = 500_000
const OPENAI_API_BASE_URL = "https://api.openai.com/v1"
const CODEX_RESPONSES_URL = "https://chatgpt.com/backend-api/codex/responses"
const AUTH_URL = "https://auth.openai.com/oauth/token"
const OPENAI_OAUTH_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann"
const CHAT_SOURCE_START = "<!-- CHAT_SOURCE_START -->"
const CHAT_SOURCE_END = "<!-- CHAT_SOURCE_END -->"

const launchPath = resolveLaunchPath(process.argv[2] ?? DEFAULT_DEMO_PATH)
const appRoot = path.dirname(launchPath)
const packageRoot = findWorkspaceRoot(appRoot) ?? appRoot
const sourcePath = launchPath
const token = crypto.randomUUID()
const explicitPort =
  process.env.PORT !== undefined ||
  process.env.WEB_NATIVE_OPENAI_PORT !== undefined
const requestedPort = readPort()

const server = serveOpenAIRunner(requestedPort, explicitPort)
const launchUrl = `http://${HOST}:${server.port}/${publicUrlPath(launchPath)}?t=${encodeURIComponent(token)}`

if (!explicitPort && server.port !== requestedPort)
  console.warn(`Port ${requestedPort} is in use; using ${server.port}.`)
console.log(`${path.basename(launchPath)}: ${launchUrl}`)

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
      })
    } catch (error) {
      if (!isAddressInUse(error) || fixedPort) throw error
    }
  }
  throw new Error(
    `No available port found from ${requestedPort} to ${Math.min(65535, requestedPort + attempts - 1)}`,
  )
}

async function handleFetch(request: Request) {
  const url = new URL(request.url)

  if (url.pathname === "/favicon.ico")
    return new Response(null, { status: 204 })

  if (url.pathname.startsWith("/__ai-chat/")) {
    if (!authorized(request, url))
      return new Response("Forbidden", { status: 403 })
    if (url.pathname === "/__ai-chat/save-source")
      return handleSaveSource(request)
    if (url.pathname === "/__ai-chat/respond")
      return handleRespond(request)
    if (url.pathname === "/__ai-chat/file-status")
      return handleFileStatus(url)
    return new Response("Not found", { status: 404 })
  }

  const filePath = resolvePublicPath(url.pathname)
  if (!filePath) return new Response("Not found", { status: 404 })
  const file = Bun.file(filePath)
  if (!(await file.exists())) return new Response("Not found", { status: 404 })
  const type = contentType(filePath)
  if (type.startsWith("text/html")) {
    if (url.searchParams.get("t") !== token)
      return Response.redirect(sessionUrl(url), 302)
    const html = await readFile(filePath, "utf8")
    return new Response(localizeRepoCdnHtml(html), {
      headers: {
        "cache-control": "no-store",
        "content-type": type,
        "x-web-native-ai-chat-token": token,
      },
    })
  }
  return new Response(file, {
    headers: {
      "cache-control": "no-store",
      "content-type": type,
    },
  })
}

async function handleSaveSource(request: Request) {
  if (request.method !== "POST")
    return new Response("Method not allowed", { status: 405 })

  const source = (await request.text()).trim()
  if (!source.startsWith("<topic-transcript") || !source.includes("</topic-transcript>"))
    return new Response("Expected topic-transcript HTML.", { status: 400 })

  const html = await readFile(sourcePath, "utf8")
  const startIndex = html.indexOf(CHAT_SOURCE_START)
  const endIndex = html.indexOf(CHAT_SOURCE_END)
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex)
    return new Response("Chat source markers were not found.", { status: 500 })

  const before = html.slice(0, startIndex + CHAT_SOURCE_START.length)
  const after = html.slice(endIndex)
  const nextHtml = `${before}\n${source}\n${after}`
  const tempPath = `${sourcePath}.${process.pid}.${Date.now()}.tmp`
  await writeFile(tempPath, nextHtml)
  await rename(tempPath, sourcePath)
  return json({ ok: true })
}

async function handleRespond(request: Request) {
  if (request.method !== "POST")
    return new Response("Method not allowed", { status: 405 })

  const source = await request.text()
  const parsed = await parseTranscriptForPrompt(source)
  if (parsed.messages.length === 0)
    return new Response("No chat messages found.", { status: 400 })

  const requestBody = {
    model: DEFAULT_MODEL,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: transcriptPrompt(parsed.messages),
          },
        ],
      },
    ],
    instructions:
      "Continue the provided conversation as the assistant. Use expanded referenced files as context, but do not claim their contents were embedded in the HTML transcript.",
    stream: true,
    store: false,
  }

  const upstream = await fetchResponses(requestBody)
  if (!upstream.ok)
    return new Response(await upstream.text(), {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: { "content-type": "text/plain; charset=utf-8" },
    })

  return new Response(streamPlainTextDeltas(upstream), {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    },
  })
}

async function handleFileStatus(url: URL) {
  const requestedPath = url.searchParams.get("path")
  if (!requestedPath)
    return json({ exists: false, error: "path is required" }, 400)
  const resolved = resolveAllowedFile(requestedPath)
  if (!resolved)
    return json({ exists: false, error: "path is not allowed" }, 403)
  try {
    const info = await stat(resolved)
    if (!info.isFile()) return json({ exists: false, error: "not a file" })
    const bytes = await readFile(resolved)
    return json({
      exists: true,
      bytes: info.size,
      path: resolved,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    })
  } catch {
    return json({ exists: false })
  }
}

async function parseTranscriptForPrompt(source: string) {
  const messages = parseChatMessages(source)
  const references = parseDetachedFileReferences(source)
  const referencesByMessage = new Map<string, FileReference[]>()
  for (const reference of references) {
    const key = reference.forId ?? ""
    const bucket = referencesByMessage.get(key) ?? []
    bucket.push(reference)
    referencesByMessage.set(key, bucket)
  }

  const expandedMessages: ChatMessage[] = []
  for (const message of messages) {
    const attached = [
      ...message.references,
      ...(referencesByMessage.get(message.id) ?? []),
      ...(referencesByMessage.get("") ?? []),
    ]
    const text = attached.length
      ? `${message.text.trimEnd()}\n\n${await expandReferences(attached)}`
      : message.text
    expandedMessages.push({ ...message, text })
  }
  return { messages: expandedMessages }
}

function parseChatMessages(source: string): ChatMessage[] {
  const messages: ChatMessage[] = []
  const messagePattern = /<chat-message\b([^>]*)>([\s\S]*?)<\/chat-message>/gi
  let match: RegExpExecArray | null
  while ((match = messagePattern.exec(source)) !== null) {
    const attrs = parseAttributes(match[1])
    const pre = match[2].match(/<pre\b[^>]*>([\s\S]*?)<\/pre>/i)
    const text = decodeHtml(pre?.[1] ?? stripTags(stripFileReferences(match[2]))).trim()
    messages.push({
      id: attrs.id ?? attrs["data-id"] ?? attrs.source ?? attrs["data-source"] ?? `message-${messages.length + 1}`,
      references: parseFileReferences(match[2], attrs.id ?? attrs["data-id"] ?? attrs.source ?? attrs["data-source"] ?? `message-${messages.length + 1}`),
      role: attrs.from ?? attrs["data-role"] ?? inferredRole(messages),
      text,
    })
  }
  return messages
}

function parseDetachedFileReferences(source: string): FileReference[] {
  return parseFileReferences(source.replace(/<chat-message\b[^>]*>[\s\S]*?<\/chat-message>/gi, ""))
}

function stripFileReferences(source: string) {
  return source
    .replace(/<chat-file-reference\b[^>]*>[\s\S]*?<\/chat-file-reference>/gi, "")
    .replace(/<a\b(?=[^>]*\brel\s*=\s*(?:"[^"]*\benclosure\b[^"]*"|'[^']*\benclosure\b[^']*'|[^\s"'=<>`]*\benclosure\b[^\s"'=<>`]*))[^>]*>[\s\S]*?<\/a>/gi, "")
}

function parseFileReferences(source: string, defaultForId?: string): FileReference[] {
  const references: FileReference[] = []
  const referencePattern = /<chat-file-reference\b([^>]*)>([\s\S]*?)<\/chat-file-reference>/gi
  let match: RegExpExecArray | null
  while ((match = referencePattern.exec(source)) !== null) {
    const attrs = parseAttributes(match[1])
    const filePath = attrs.path ?? attrs.href ?? attrs["data-path"]
    if (!filePath) continue
    references.push({
      forId: attrs.for ?? attrs["data-for"] ?? defaultForId,
      label: decodeHtml(stripTags(match[2])).trim() || filePath,
      mime: attrs.type ?? attrs.mime ?? attrs["data-mime"],
      path: filePath,
    })
  }
  const enclosurePattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi
  while ((match = enclosurePattern.exec(source)) !== null) {
    const attrs = parseAttributes(match[1])
    if (!hasRel(attrs.rel, "enclosure")) continue
    const filePath = attrs.href
    if (!filePath) continue
    references.push({
      forId: attrs.for ?? attrs["data-for"] ?? defaultForId,
      label: decodeHtml(stripTags(match[2])).trim() || filePath,
      mime: attrs.type ?? attrs.mime ?? attrs["data-mime"],
      path: filePath,
    })
  }
  return references
}

function inferredRole(messages: ChatMessage[]) {
  const ordinaryCount = messages.filter((message) => message.role !== "system" && message.role !== "tool").length
  return ordinaryCount % 2 === 0 ? "user" : "assistant"
}

function hasRel(value: string | undefined, token: string) {
  return (value ?? "").split(/\s+/).includes(token)
}

async function expandReferences(references: FileReference[]) {
  const sections: string[] = []
  for (const reference of references) {
    const resolved = resolveAllowedFile(reference.path)
    if (!resolved) {
      sections.push(`Referenced file unavailable: ${reference.label}\nPath: ${reference.path}\nReason: path is outside the allowed repo root.`)
      continue
    }
    try {
      const bytes = await readFile(resolved)
      const truncated = bytes.length > MAX_REFERENCED_FILE_BYTES
      const body = bytes.subarray(0, MAX_REFERENCED_FILE_BYTES).toString("utf8")
      sections.push([
        `Referenced file: ${reference.label}`,
        `Path: ${reference.path}`,
        `MIME: ${reference.mime ?? "application/octet-stream"}`,
        truncated ? `Note: truncated to ${MAX_REFERENCED_FILE_BYTES} bytes for this request.` : "",
        "Content:",
        "```",
        body,
        "```",
      ].filter(Boolean).join("\n"))
    } catch (error) {
      sections.push(`Referenced file unavailable: ${reference.label}\nPath: ${reference.path}\nReason: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return sections.join("\n\n")
}

function transcriptPrompt(messages: ChatMessage[]) {
  const transcript = messages
    .map((message) => `${message.role.toUpperCase()}:\n${message.text.trim()}`)
    .join("\n\n---\n\n")
  return `Conversation transcript:\n\n${transcript}\n\n---\n\nWrite the next assistant message.`
}

async function fetchResponses(body: Record<string, unknown>) {
  try {
    return await fetch(CODEX_RESPONSES_URL, {
      method: "POST",
      headers: await codexHeaders(),
      body: JSON.stringify(body),
    })
  } catch (error) {
    if (!isCodexAuthNotFoundError(error) || !process.env.OPENAI_API_KEY)
      throw error
    return fetch(`${OPENAI_API_BASE_URL}/responses`, {
      method: "POST",
      headers: openAIAuthHeaders({
        apiKey: process.env.OPENAI_API_KEY,
        organization: process.env.OPENAI_ORGANIZATION,
        project: process.env.OPENAI_PROJECT,
      }),
      body: JSON.stringify(body),
    })
  }
}

function streamPlainTextDeltas(response: Response) {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  let sentDelta = false

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = response.body?.getReader()
      if (!reader) {
        controller.close()
        return
      }
      let buffer = ""
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          buffer = consumeSseBuffer(buffer, (text) => {
            sentDelta = true
            controller.enqueue(encoder.encode(text))
          }, () => sentDelta)
        }
        buffer += decoder.decode()
        consumeSseBuffer(`${buffer}\n\n`, (text) => {
          sentDelta = true
          controller.enqueue(encoder.encode(text))
        }, () => sentDelta)
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })
}

function consumeSseBuffer(
  buffer: string,
  emit: (text: string) => void,
  hasSentDelta: () => boolean,
) {
  let remaining = buffer
  while (true) {
    const separator = remaining.search(/\r?\n\r?\n/)
    if (separator === -1) return remaining
    const rawEvent = remaining.slice(0, separator)
    const delimiter = remaining.slice(separator).match(/^\r?\n\r?\n/)?.[0] ?? "\n\n"
    remaining = remaining.slice(separator + delimiter.length)
    const data = rawEvent
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trimStart())
      .join("\n")
    if (!data || data === "[DONE]") continue
    const event = parseJson(data)
    const text = textFromResponseEvent(event, hasSentDelta())
    if (text) emit(text)
  }
}

function textFromResponseEvent(event: unknown, alreadySentDelta: boolean) {
  if (!isRecord(event)) return ""
  if (event.type === "response.output_text.delta" && typeof event.delta === "string")
    return event.delta
  if (!alreadySentDelta && event.type === "response.output_text.done" && typeof event.text === "string")
    return event.text
  if (!alreadySentDelta && event.type === "response.completed" && isRecord(event.response))
    return textFromResponseObject(event.response) ?? ""
  return ""
}

function textFromResponseObject(response: unknown) {
  if (!isRecord(response)) return undefined
  if (typeof response.output_text === "string") return response.output_text
  if (!Array.isArray(response.output)) return undefined
  const chunks: string[] = []
  for (const item of response.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue
    for (const part of item.content) {
      if (isRecord(part) && typeof part.text === "string") chunks.push(part.text)
    }
  }
  return chunks.length > 0 ? chunks.join("") : undefined
}

function resolveAllowedFile(input: string) {
  const resolved = path.isAbsolute(input)
    ? path.resolve(input)
    : path.resolve(appRoot, input)
  const relative = path.relative(packageRoot, resolved)
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative))
    return undefined
  const segments = relative.split(path.sep)
  if (segments.includes(".git") || segments.includes("node_modules"))
    return undefined
  if (path.basename(resolved).startsWith(".env"))
    return undefined
  return resolved
}

function resolveLaunchPath(input: string) {
  const cwdPath = path.resolve(process.cwd(), input)
  if (existsSync(cwdPath)) return cwdPath
  const runnerPackageRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)))
  const packagePath = path.resolve(runnerPackageRoot, input)
  if (existsSync(packagePath)) return packagePath
  throw new Error(`Demo file not found: ${input}`)
}

function publicUrlPath(filePath: string) {
  return path
    .relative(packageRoot, filePath)
    .split(path.sep)
    .map((segment) => encodeURIComponent(segment))
    .join("/")
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

function findWorkspaceRoot(start: string) {
  let current = path.resolve(start)
  while (true) {
    if (existsSync(path.join(current, ".git"))) return current
    const parent = path.dirname(current)
    if (parent === current) return undefined
    current = parent
  }
}

function sessionUrl(url: URL) {
  const next = new URL(url)
  next.searchParams.set("t", token)
  return next.href
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
    "user-agent": "web-native-ai-chat",
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
    throw new Error("OpenAI OAuth refresh response did not include access_token")
  return payload.access_token
}

function openAIAuthHeaders(options: {
  apiKey?: string
  organization?: string
  project?: string
}) {
  if (!options.apiKey)
    throw new Error("OPENAI_API_KEY is required for API key fallback calls")
  const headers: Record<string, string> = {
    authorization: `Bearer ${options.apiKey}`,
    "content-type": "application/json",
  }
  if (options.organization)
    headers["OpenAI-Organization"] = options.organization
  if (options.project) headers["OpenAI-Project"] = options.project
  return headers
}

function isCodexAuthNotFoundError(error: unknown) {
  if (isRecord(error) && error.code === "ENOENT") return true
  if (!(error instanceof Error)) return false
  return (
    error.message.startsWith("No OpenAI OAuth credentials") ||
    error.message.startsWith("No usable OpenAI OAuth credentials")
  )
}

function authorized(request: Request, url: URL) {
  return (
    request.headers.get("x-web-native-ai-token") === token ||
    request.headers.get("x-web-native-openai-token") === token ||
    url.searchParams.get("t") === token
  )
}

function parseAttributes(raw: string) {
  const attrs: Record<string, string> = {}
  const pattern = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(raw)) !== null) {
    attrs[match[1]] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "")
  }
  return attrs
}

function stripTags(raw: string) {
  return raw.replace(/<[^>]*>/g, "")
}

function decodeHtml(raw: string) {
  return raw
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
}

function parseJson(value: string) {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return undefined
  }
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  })
}

function contentType(filePath: string) {
  const extension = path.extname(filePath)
  if (extension === ".css") return "text/css; charset=utf-8"
  if (extension === ".html" || extension === ".htm")
    return "text/html; charset=utf-8"
  if (extension === ".js" || extension === ".mjs" || extension === ".ts")
    return "text/javascript; charset=utf-8"
  if (extension === ".json") return "application/json; charset=utf-8"
  if (extension === ".md") return "text/markdown; charset=utf-8"
  if (extension === ".svg") return "image/svg+xml"
  return "application/octet-stream"
}

function localizeRepoCdnHtml(html: string) {
  if (!existsSync(path.join(packageRoot, "src"))) return html
  return html.replace(
    /https:\/\/cdn\.jsdelivr\.net\/gh\/subtleGradient\/web-native@[^/]+\/src\//g,
    "/src/",
  )
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
