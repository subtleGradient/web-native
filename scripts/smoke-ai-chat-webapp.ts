import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const appPath = path.resolve(Bun.argv[2] ?? path.join(root, "src/ai-example.chat.webapp"))
const port = Number(process.env.PORT ?? "4182")
const timeoutMs = Number(process.env.TEST_TIMEOUT ?? "20000")
const runnerPath = process.env.WEB_NATIVE_AI_CHAT_RUNNER
const launchPath = process.env.WEB_NATIVE_AI_CHAT_LAUNCH ?? "index.html"

let runner: ReturnType<typeof Bun.spawn> | undefined

try {
  runner = Bun.spawn({
    cmd: runnerPath ? ["bun", runnerPath, launchPath] : ["bun", "dev"],
    cwd: appPath,
    env: { ...process.env, PORT: String(port) },
    stderr: "pipe",
    stdout: "pipe",
  })
  const stderr = collectStream(readablePipe(runner.stderr, "runner stderr"))
  const launchUrl = await waitForLaunchUrl(readablePipe(runner.stdout, "runner stdout"))
  const parsedLaunchUrl = new URL(launchUrl)
  const expectedPathname = `/${path.basename(appPath)}/index.html`
  if (decodeURIComponent(parsedLaunchUrl.pathname) !== expectedPathname)
    throw new Error(`launch URL used ${parsedLaunchUrl.pathname}, expected ${expectedPathname}`)
  const page = await fetch(launchUrl)
  if (!page.ok) throw new Error(`chat page failed: HTTP ${page.status}`)
  const html = await page.text()
  if (!html.includes("<topic-transcript")) throw new Error("chat transcript was not served")
  if (!html.includes("<ai-chat-app")) throw new Error("ai-chat-app markup was not served")
  await verifyLocalModuleScripts(html, launchUrl)

  const token = parsedLaunchUrl.searchParams.get("t")
  if (!token) throw new Error("launch URL did not include runner token")
  const referencePath = firstEnclosurePath(html) ?? "../chat.web/README.md"
  await verifyFileStatus(referencePath, token)

  const stderrText = await Promise.race([
    stderr,
    new Promise<string>((resolve) => setTimeout(() => resolve(""), 50)),
  ])
  if (stderrText.trim()) console.warn(stderrText.trim())
  console.log(`AI chat webapp smoke verified: ${appPath}`)
} finally {
  runner?.kill()
  await runner?.exited.catch(() => {})
}

async function verifyFileStatus(referencePath: string, token: string) {
  const statusUrl = new URL(`http://localhost:${port}/__ai-chat/file-status`)
  statusUrl.searchParams.set("path", referencePath)
  statusUrl.searchParams.set("t", token)
  const statusResponse = await fetch(statusUrl)
  if (!statusResponse.ok)
    throw new Error(`file-status failed: HTTP ${statusResponse.status}`)
  const status = await statusResponse.json() as { exists?: unknown; path?: unknown }
  if (status.exists !== true) throw new Error(`referenced file was unavailable for ${referencePath}: ${JSON.stringify(status)}`)
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

async function waitForLaunchUrl(stream: ReadableStream<Uint8Array>) {
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
  throw new Error(`runner did not print a launch URL within ${timeoutMs}ms. Output: ${output}`)
}

async function collectStream(stream: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder()
  const reader = stream.getReader()
  let output = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    output += decoder.decode(value, { stream: true })
  }
  output += decoder.decode()
  return output
}
