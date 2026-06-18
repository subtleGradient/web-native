import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const appPath = path.join(root, "src/ai-example.chat.webapp")
const port = Number(process.env.PORT ?? "4182")
const timeoutMs = Number(process.env.TEST_TIMEOUT ?? "20000")

let runner: ReturnType<typeof Bun.spawn> | undefined

try {
  runner = Bun.spawn({
    cmd: ["bun", "dev"],
    cwd: appPath,
    env: { ...process.env, PORT: String(port) },
    stderr: "pipe",
    stdout: "pipe",
  })
  const stderr = collectStream(readablePipe(runner.stderr, "runner stderr"))
  const launchUrl = await waitForLaunchUrl(readablePipe(runner.stdout, "runner stdout"))
  const page = await fetch(launchUrl)
  if (!page.ok) throw new Error(`chat page failed: HTTP ${page.status}`)
  const html = await page.text()
  if (!html.includes("<topic-transcript")) throw new Error("chat transcript was not served")
  if (!html.includes("<ai-chat-app")) throw new Error("ai-chat-app markup was not served")

  const token = new URL(launchUrl).searchParams.get("t")
  if (!token) throw new Error("launch URL did not include runner token")
  const statusUrl = new URL(`http://localhost:${port}/__ai-chat/file-status`)
  statusUrl.searchParams.set("path", "../chat.web/README.md")
  statusUrl.searchParams.set("t", token)
  const statusResponse = await fetch(statusUrl)
  if (!statusResponse.ok)
    throw new Error(`file-status failed: HTTP ${statusResponse.status}`)
  const status = await statusResponse.json() as { exists?: unknown; path?: unknown }
  if (status.exists !== true) throw new Error(`referenced file was unavailable: ${JSON.stringify(status)}`)

  const stderrText = await Promise.race([
    stderr,
    new Promise<string>((resolve) => setTimeout(() => resolve(""), 50)),
  ])
  if (stderrText.trim()) console.warn(stderrText.trim())
  console.log("AI chat webapp smoke verified")
} finally {
  runner?.kill()
  await runner?.exited.catch(() => {})
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
