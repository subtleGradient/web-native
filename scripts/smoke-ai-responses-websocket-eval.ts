import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import puppeteer from "puppeteer-core"

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const port = Number(process.env.OPENAI_WS_SMOKE_PORT ?? "4198")
const pagePath = "src/ai.web/examples/ai.responses-websocket-eval.demo.html"
const runnerPath = path.join(root, "src/ai-broker.webapp/broker-runner.ts")
const timeoutMs = Number(process.env.OPENAI_WS_SMOKE_TIMEOUT ?? "120000")

let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined
let runner: ReturnType<typeof Bun.spawn> | undefined

try {
  runner = Bun.spawn({
    cmd: ["bun", runnerPath, pagePath],
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      WEB_NATIVE_OPENAI_NO_OPEN: "1",
    },
    stderr: "pipe",
    stdout: "pipe",
  })
  void collectStream(readablePipe(runner.stderr, "runner stderr"))
  const launchUrl = await waitForLaunchUrl(readablePipe(runner.stdout, "runner stdout"))

  browser = await puppeteer.launch({
    args: ["--disable-setuid-sandbox", "--no-sandbox"],
    executablePath: findChromeExecutable(),
    headless: true,
  })

  const page = await browser.newPage()
  const consoleMessages: string[] = []
  const pageErrors: string[] = []
  page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`))
  page.on("pageerror", (error) => {
    pageErrors.push(error instanceof Error ? (error.stack ?? error.message) : String(error))
  })

  await page.goto(launchUrl, { timeout: 30000, waitUntil: "load" })
  await page.waitForFunction(() => Reflect.get(globalThis, "demo") !== undefined, { timeout: 30000 })
  await page.evaluate(() => {
    const instructions = document.querySelector<HTMLTextAreaElement>('textarea[name="instructions"]')
    const prompt = document.querySelector<HTMLTextAreaElement>('textarea[name="prompt"]')
    const effort = document.querySelector<HTMLSelectElement>('select[name="effort"]')
    if (instructions) {
      instructions.value = [
        "You are a concise JavaScript assistant.",
        "You must call eval_js exactly once before answering.",
        "Use eval_js to compute JSON.stringify([2, 3, 5].map((n) => n * n)).",
        "After the tool result returns, answer with only the resulting JSON array.",
      ].join(" ")
    }
    if (prompt) prompt.value = "Compute the requested array using eval_js, then return only the JSON array."
    if (effort) effort.value = "low"
  })
  await page.click('form button:not([type="button"])')

  await page.waitForFunction(() => {
    const status = document.querySelector("#status")
    const statusText = status?.textContent?.trim().toLowerCase() ?? ""
    return statusText === "complete" || status?.classList.contains("error") === true
  }, { timeout: timeoutMs })

  const snapshot = await page.evaluate(() => ({
    answer: document.querySelector("#answer")?.textContent ?? "",
    events: document.querySelector("#events")?.textContent ?? "",
    reasoning: document.querySelector("#reasoning")?.textContent ?? "",
    status: document.querySelector("#status")?.textContent ?? "",
    statusIsError: document.querySelector("#status")?.classList.contains("error") ?? false,
    tools: document.querySelector("#tools")?.textContent ?? "",
  }))

  const failures = [
    ...(snapshot.statusIsError ? [`page reported error: ${snapshot.status}`] : []),
    ...(snapshot.status.trim().toLowerCase() !== "complete" ? [`status did not complete: ${snapshot.status}`] : []),
    ...(snapshot.answer.trim().length === 0 ? ["assistant answer is empty"] : []),
    ...(!snapshot.tools.includes("call eval_js") ? ["tool log does not include eval_js call"] : []),
    ...(!snapshot.tools.includes('"ok": true') ? ["tool result was not successful"] : []),
    ...(!snapshot.tools.includes("[\n  4,\n  9,\n  25\n]") && !snapshot.tools.includes("[4,9,25") ? ["tool result did not include [4,9,25]"] : []),
    ...(!snapshot.events.includes("response.completed") ? ["raw events did not include response.completed"] : []),
    ...(pageErrors.length > 0 ? [`page errors: ${pageErrors.join("\n")}`] : []),
  ]

  if (failures.length > 0) {
    throw new Error([
      "Responses WebSocket eval smoke test failed.",
      ...failures.map((failure) => `- ${failure}`),
      "",
      "Status:", snapshot.status,
      "",
      "Answer:", snapshot.answer,
      "",
      "Tools:", snapshot.tools,
      "",
      "Console:", consoleMessages.join("\n"),
    ].join("\n"))
  }

  console.log("Responses WebSocket eval smoke test passed")
  console.log(JSON.stringify({
    answer: snapshot.answer.trim(),
    reasoningSummaryLength: snapshot.reasoning.trim().length,
    toolLogLength: snapshot.tools.trim().length,
  }, null, 2))
} finally {
  await browser?.close()
  runner?.kill()
  await runner?.exited.catch(() => {})
}

function readablePipe(value: ReadableStream<Uint8Array> | number | undefined, name: string) {
  if (value instanceof ReadableStream) return value
  throw new Error(`${name} was not piped`)
}

async function waitForLaunchUrl(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let text = ""
  const deadline = Date.now() + 10_000
  try {
    while (Date.now() < deadline) {
      const remaining = deadline - Date.now()
      const result = await withTimeout(reader.read(), remaining, "Timed out waiting for runner launch URL")
      if (result.done) break
      text += decoder.decode(result.value, { stream: true })
      const match = text.match(/https?:\/\/[^\s]+/)
      if (match) return match[0]
    }
  } finally {
    reader.releaseLock()
  }
  throw new Error(`Runner did not print a launch URL. Output:\n${text}`)
}

async function collectStream(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let text = ""
  try {
    while (true) {
      const result = await reader.read()
      if (result.done) return text
      text += decoder.decode(result.value, { stream: true })
    }
  } catch {
    return text
  }
}

function withTimeout<T>(promise: Promise<T>, timeout: number, message: string) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timed = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeout)
  })
  return Promise.race([promise, timed]).finally(() => {
    if (timer !== undefined) clearTimeout(timer)
  })
}

function findChromeExecutable() {
  const configured = process.env.PUPPETEER_EXECUTABLE_PATH ?? process.env.CHROME_BIN
  if (configured) return configured

  const candidates = [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ]
  const executable = candidates.find((candidate) => existsSync(candidate))
  if (executable) return executable
  throw new Error("No Chrome/Chromium executable found. Set PUPPETEER_EXECUTABLE_PATH or CHROME_BIN.")
}
