import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const appPath = path.resolve(Bun.argv[2] ?? path.join(root, "src/ai-example.chat.webapp"))
const port = Number(process.env.PORT ?? "4182")
const timeoutMs = Number(process.env.TEST_TIMEOUT ?? "20000")
const runnerPath = process.env.WEB_NATIVE_AI_CHAT_RUNNER
const launchPath = process.env.WEB_NATIVE_AI_CHAT_LAUNCH ?? "index.html"
const verifyWarningLogs = process.env.WEB_NATIVE_AI_CHAT_VERIFY_WARNING_LOGS === "1"

let runner: ReturnType<typeof Bun.spawn> | undefined
const stderrChunks: string[] = []

try {
  runner = Bun.spawn({
    cmd: runnerPath ? ["bun", runnerPath, launchPath] : ["bun", "dev"],
    cwd: appPath,
    env: { ...process.env, PORT: String(port) },
    stderr: "pipe",
    stdout: "pipe",
  })
  const stderr = collectStream(readablePipe(runner.stderr, "runner stderr"), stderrChunks)
  const launchUrl = await waitForLaunchUrl(readablePipe(runner.stdout, "runner stdout"), stderrChunks)
  const parsedLaunchUrl = new URL(launchUrl)
  if (parsedLaunchUrl.hostname !== "127.0.0.1")
    throw new Error(`launch URL used host ${parsedLaunchUrl.hostname}, expected 127.0.0.1`)
  const expectedPathname = `/${path.basename(appPath)}/index.html`
  if (decodeURIComponent(parsedLaunchUrl.pathname) !== expectedPathname)
    throw new Error(`launch URL used ${parsedLaunchUrl.pathname}, expected ${expectedPathname}`)
  const html = await verifyChatPage(launchUrl, "chat page")
  await verifyChatPage(new URL("./", launchUrl).href, "chat directory")
  await verifyChatPage(extensionlessUrl(parsedLaunchUrl).href, "chat directory without slash")
  await verifyLocalModuleScripts(html, launchUrl)

  const token = parsedLaunchUrl.searchParams.get("t")
  if (!token) throw new Error("launch URL did not include runner token")
  await verifyResponsesRoute(parsedLaunchUrl, token)
  const referencePath = firstEnclosurePath(html) ?? "../chat.web/README.md"
  await verifyFileStatus(referencePath, token, parsedLaunchUrl.origin)
  if (verifyWarningLogs) await verifyMissingFileWarningLog(launchUrl)

  const stderrText = await Promise.race([
    stderr,
    new Promise<string>((resolve) => setTimeout(() => resolve(stderrChunks.join("")), 50)),
  ])
  const unexpectedStderr = stripExpectedSmokeLogs(stderrText)
  if (unexpectedStderr.trim()) console.warn(unexpectedStderr.trim())
  console.log(`AI chat webapp smoke verified: ${appPath}`)
} finally {
  runner?.kill()
  await runner?.exited.catch(() => {})
}

function stripExpectedSmokeLogs(text: string) {
  return text
    .split("\n")
    .filter((line) => !line.includes("responses proxy requires POST"))
    .join("\n")
}

async function verifyChatPage(url: string, label: string) {
  const page = await fetch(url)
  if (!page.ok) throw new Error(`${label} failed: HTTP ${page.status}`)
  const html = await page.text()
  if (!html.includes("<topic-transcript")) throw new Error(`${label} did not serve chat transcript`)
  if (!html.includes("<ai-chat-app")) throw new Error(`${label} did not serve ai-chat-app markup`)
  return html
}

function extensionlessUrl(url: URL) {
  const next = new URL(url)
  next.pathname = next.pathname.replace(/\/index\.html$/, "")
  next.search = ""
  return next
}

async function verifyResponsesRoute(launchUrl: URL, token: string) {
  const responsesUrl = new URL("/v1/responses", launchUrl)
  responsesUrl.searchParams.set("t", token)
  const response = await fetch(responsesUrl)
  if (response.status !== 405)
    throw new Error(`responses route expected HTTP 405 for GET, got HTTP ${response.status}`)
}

async function verifyFileStatus(referencePath: string, token: string, origin: string) {
  const statusUrl = new URL("/__ai-chat/file-status", origin)
  statusUrl.searchParams.set("path", referencePath)
  statusUrl.searchParams.set("t", token)
  const statusResponse = await fetch(statusUrl)
  if (!statusResponse.ok)
    throw new Error(`file-status failed: HTTP ${statusResponse.status}`)
  const status = await statusResponse.json() as { exists?: unknown; path?: unknown }
  if (status.exists !== true) throw new Error(`referenced file was unavailable for ${referencePath}: ${JSON.stringify(status)}`)
}

async function verifyMissingFileWarningLog(launchUrl: string) {
  const missingUrl = new URL("./__missing-chat-runner-smoke__.js", launchUrl)
  const response = await fetch(missingUrl)
  if (response.status !== 404)
    throw new Error(`missing file smoke expected HTTP 404, got HTTP ${response.status}`)
  await waitForLog("Public file was not found")
}

async function waitForLog(text: string) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (stderrChunks.join("").includes(text)) return
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  throw new Error(`runner did not log ${JSON.stringify(text)} within ${timeoutMs}ms. Stderr: ${stderrChunks.join("")}`)
}

function firstEnclosurePath(html: string) {
  const match = html.match(/<a\b(?=[^>]*\brel\s*=\s*(?:"[^"]*\benclosure\b[^"]*"|'[^']*\benclosure\b[^']*'|[^\s"'=<>`]*\benclosure\b[^\s"'=<>`]*))[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i)
  return decodeHtml(match?.[1] ?? match?.[2] ?? match?.[3] ?? "") || undefined
}

async function verifyLocalModuleScripts(html: string, launchUrl: string) {
  const launch = new URL(launchUrl)
  for (const src of moduleScriptSources(html)) {
    const scriptUrl = new URL(src, launch)
    if (scriptUrl.origin !== launch.origin) continue
    const response = await fetch(scriptUrl)
    if (!response.ok)
      throw new Error(`module script failed: ${scriptUrl.href} HTTP ${response.status}`)
    const source = await response.text()
    if (!source.trim()) throw new Error(`module script was empty: ${scriptUrl.href}`)
  }
}

function moduleScriptSources(html: string) {
  const sources: string[] = []
  const pattern = /<script\b(?=[^>]*\btype\s*=\s*(?:"module"|'module'|module))[^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi
  let match: RegExpExecArray | null
  while ((match = pattern.exec(html)) !== null) {
    const src = decodeHtml(match[1] ?? match[2] ?? match[3] ?? "")
    if (src) sources.push(src)
  }
  return sources
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
}

function readablePipe(value: ReadableStream<Uint8Array> | number | undefined, name: string) {
  if (value instanceof ReadableStream) return value
  throw new Error(`${name} was not piped`)
}

async function waitForLaunchUrl(stream: ReadableStream<Uint8Array>, stderrChunks: string[]) {
  const decoder = new TextDecoder()
  const reader = stream.getReader()
  let output = ""
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const { done, value } = await reader.read()
    if (done) break
    output += decoder.decode(value, { stream: true })
    const match = output.match(/https?:\/\/\S+/)
    if (match) return match[0]
  }
  throw new Error(`runner did not print a launch URL within ${timeoutMs}ms. Output: ${output} Stderr: ${stderrChunks.join("")}`)
}

async function collectStream(stream: ReadableStream<Uint8Array>, chunks: string[] = []) {
  const decoder = new TextDecoder()
  const reader = stream.getReader()
  let output = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const text = decoder.decode(value, { stream: true })
    chunks.push(text)
    output += text
  }
  const rest = decoder.decode()
  if (rest) chunks.push(rest)
  output += rest
  return output
}
