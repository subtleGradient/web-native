import { existsSync } from "node:fs"
import { readFile, rm } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import puppeteer from "puppeteer-core"

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const port = Number(process.env.OPENAI_RECONCILIATION_SMOKE_PORT ?? "4182")
const pagePath = "src/openai/examples/openai.responses-websocket-reconciliation.demo.html"
const statePath = path.join(root, "src/openai/examples/openai.responses-websocket-reconciliation.demo.json5")
const runnerPath = path.join(root, "src/openai/Example OpenAI Codex Broker.webapp/openai-runner.ts")

let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined
let runner: ReturnType<typeof Bun.spawn> | undefined

try {
  await rm(statePath, { force: true })
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
  const pageErrors: string[] = []
  page.on("pageerror", (error) => {
    pageErrors.push(error instanceof Error ? (error.stack ?? error.message) : String(error))
  })

  await page.goto(launchUrl, { timeout: 30000, waitUntil: "load" })
  await page.waitForFunction(() => Reflect.get(globalThis, "reconciler") !== undefined, { timeout: 30000 })

  const editedProduct = [
    "# Product State",
    "",
    "A user can create a note with non-empty body text.",
    "Saved notes are shown newest-first.",
  ].join("\n")

  await page.evaluate((value) => {
    const textarea = document.querySelector<HTMLTextAreaElement>("#product-state")
    if (!textarea) throw new Error("Missing product textarea")
    textarea.value = value
    textarea.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }))
    const reconciler = Reflect.get(globalThis, "reconciler") as { gapTimer?: ReturnType<typeof setTimeout> }
    clearTimeout(reconciler.gapTimer)
  }, editedProduct)

  await waitForFileText(statePath, (text) => text.includes("Saved notes are shown newest-first."))
  await page.reload({ timeout: 30000, waitUntil: "load" })
  await page.waitForFunction(() => {
    return document.querySelector<HTMLTextAreaElement>("#product-state")?.value.includes("Saved notes are shown newest-first.") === true
  }, { timeout: 30000 })

  const saved = JSON.parse(await readFile(statePath, "utf8")) as Record<string, unknown>
  const snapshot = await page.evaluate(() => ({
    gapText: document.querySelector<HTMLTextAreaElement>("#gap-snapshot")?.value ?? "",
    okText: document.querySelector<HTMLTextAreaElement>("#ok-spec")?.value ?? "",
    productText: document.querySelector<HTMLTextAreaElement>("#product-state")?.value ?? "",
    saveStatus: document.querySelector("#save-status")?.textContent ?? "",
  }))
  const unavailableSnapshot = await page.evaluate(async () => {
    const originalFetch = globalThis.fetch
    let stateCalls = 0
    try {
      Reflect.set(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).includes("/__web-native-openai/state")) {
          stateCalls += 1
          return new Response("Method not allowed", { status: 405 })
        }
        return originalFetch(input, init)
      })
      const reconciler = Reflect.get(globalThis, "reconciler") as {
        persistNow: () => Promise<void>
        stateAvailable: boolean
        updateField: (field: string, value: string) => void
      }
      reconciler.stateAvailable = true
      await reconciler.persistNow()
      reconciler.updateField("productState", "retry suppression check")
      await new Promise((resolve) => setTimeout(resolve, 500))
      return {
        saveStatus: document.querySelector("#save-status")?.textContent ?? "",
        stateAvailable: reconciler.stateAvailable,
        stateCalls,
      }
    } finally {
      Reflect.set(globalThis, "fetch", originalFetch)
    }
  })
  const staleRunnerSnapshot = await page.evaluate(async () => {
    const originalFetch = globalThis.fetch
    let stateCalls = 0
    try {
      Reflect.set(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).includes("/__web-native-openai/state")) stateCalls += 1
        return originalFetch(input, init)
      })
      history.replaceState(null, "", location.pathname + "?t=stale-runner-token")
      const reconciler = Reflect.get(globalThis, "reconciler") as {
        init: () => Promise<void>
        persistNow: () => Promise<void>
        stateAvailable: boolean
        updateField: (field: string, value: string) => void
      }
      reconciler.stateAvailable = new URLSearchParams(location.search).get("state") === "1"
      await reconciler.init()
      await reconciler.persistNow()
      reconciler.updateField("productState", "stale runner no probe check")
      await new Promise((resolve) => setTimeout(resolve, 500))
      return {
        saveStatus: document.querySelector("#save-status")?.textContent ?? "",
        stateAvailable: reconciler.stateAvailable,
        stateCalls,
      }
    } finally {
      Reflect.set(globalThis, "fetch", originalFetch)
    }
  })

  const failures = [
    ...(saved.productState !== editedProduct ? ["state file did not persist productState"] : []),
    ...(snapshot.productText !== editedProduct ? ["page did not reload persisted productState"] : []),
    ...(snapshot.okText.includes("Notes Workbench .ok") ? [] : ["default .ok spec did not render"]),
    ...(snapshot.saveStatus.length === 0 ? ["save status is empty"] : []),
    ...(unavailableSnapshot.stateAvailable === false ? [] : ["405 state response did not disable persistence"]),
    ...(unavailableSnapshot.stateCalls === 1 ? [] : [`disabled persistence still retried state endpoint ${unavailableSnapshot.stateCalls} times`]),
    ...(unavailableSnapshot.saveStatus.includes("state persistence unavailable") ? [] : ["405 state response did not update save status"]),
    ...(staleRunnerSnapshot.stateAvailable === false ? [] : ["missing state capability flag did not disable persistence"]),
    ...(staleRunnerSnapshot.stateCalls === 0 ? [] : [`missing state capability flag still called state endpoint ${staleRunnerSnapshot.stateCalls} times`]),
    ...(staleRunnerSnapshot.saveStatus.includes("state persistence unavailable") ? [] : ["missing state capability flag did not update save status"]),
    ...(pageErrors.length > 0 ? [`page errors: ${pageErrors.join("\n")}`] : []),
  ]

  if (failures.length > 0) {
    throw new Error([
      "OpenAI reconciliation state smoke test failed.",
      ...failures.map((failure) => `- ${failure}`),
      "",
      "Snapshot:",
      JSON.stringify(snapshot, null, 2),
      "",
      "Saved:",
      JSON.stringify(saved, null, 2),
      "",
      "Unavailable:",
      JSON.stringify(unavailableSnapshot, null, 2),
      "",
      "Stale runner:",
      JSON.stringify(staleRunnerSnapshot, null, 2),
    ].join("\n"))
  }

  console.log("OpenAI reconciliation state smoke test passed")
  console.log(JSON.stringify({
    productLength: snapshot.productText.length,
    stateFile: path.relative(root, statePath),
  }, null, 2))
} finally {
  await browser?.close()
  runner?.kill()
  await runner?.exited.catch(() => {})
  await rm(statePath, { force: true })
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

async function waitForFileText(filePath: string, predicate: (text: string) => boolean) {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    try {
      const text = await readFile(filePath, "utf8")
      if (predicate(text)) return text
    } catch {
      // Keep polling until the runner writes the state file.
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`Timed out waiting for ${filePath}`)
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
