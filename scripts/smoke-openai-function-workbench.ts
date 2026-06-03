import { existsSync } from "node:fs"
import { readFile, rm } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import puppeteer from "puppeteer-core"

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const port = Number(process.env.OPENAI_FUNCTION_WORKBENCH_SMOKE_PORT ?? "4181")
const pagePath = "src/openai/examples/openai.responses-websocket-functions.demo.html"
const statePath = path.join(root, "src/openai/examples/openai.responses-websocket-functions.demo.json5")
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
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }])

  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })
  page.on("pageerror", (error) => {
    pageErrors.push(error instanceof Error ? (error.stack ?? error.message) : String(error))
  })

  await page.goto(launchUrl, {
    timeout: 30000,
    waitUntil: "load",
  })
  await page.waitForFunction(() => {
    return Reflect.get(globalThis, "functionLab") !== undefined && document.querySelectorAll(".function-card").length === 3
  }, { timeout: 30000 })
  await page.waitForFunction(() => document.querySelector("#sandbox iframe") !== null, { timeout: 30000 })

  const snapshot = await page.evaluate(async () => {
    const lab = Reflect.get(globalThis, "functionLab") as {
      functions: Array<{ name: string }>
      callSandboxFunction: (definition: unknown, args: Record<string, unknown>) => Promise<unknown>
    }

    async function call(name: string, args: Record<string, unknown>) {
      const definition = lab.functions.find((item) => item.name === name)
      if (definition === undefined) return { ok: false, error: `Missing function: ${name}` }
      return await lab.callSandboxFunction(definition, args)
    }

    const body = getComputedStyle(document.body)
    return {
      bodyBackground: body.backgroundColor,
      bodyColor: body.color,
      cardCount: document.querySelectorAll(".function-card").length,
      calculate: await call("calculate", { expression: "17 * 23" }),
      makeSeries: await call("make_series", { start: 4, count: 5, step: 1 }),
      analyzeText: await call("analyze_text", { text: "Tools make streaming demos easier to trust." }),
    }
  })

  const persistedInstructions = "Persisted function workbench instructions."
  const persistedPrompt = "Persisted function workbench prompt."
  const persistedAnswer = "Persisted visible LLM result."
  const persistedModel = "gpt-state-smoke"
  const persistedThinkingLevel = "high"
  await page.evaluate(async ({ answer, instructions, model, prompt, thinkingLevel }) => {
    const modelField = document.querySelector<HTMLInputElement>('input[name="model"]')
    const effortField = document.querySelector<HTMLSelectElement>('select[name="effort"]')
    const instructionsField = document.querySelector<HTMLTextAreaElement>('textarea[name="instructions"]')
    const promptField = document.querySelector<HTMLTextAreaElement>('textarea[name="prompt"]')
    const answerElement = document.querySelector<HTMLElement>("#answer")
    const firstName = document.querySelector<HTMLInputElement>(".function-card input")
    const lab = Reflect.get(globalThis, "functionLab") as { persistNow: () => Promise<void> }
    if (!modelField) throw new Error("Missing model input")
    if (!effortField) throw new Error("Missing effort select")
    if (!instructionsField) throw new Error("Missing instructions textarea")
    if (!promptField) throw new Error("Missing prompt textarea")
    if (!answerElement) throw new Error("Missing answer element")
    if (!firstName) throw new Error("Missing first function name input")
    modelField.value = model
    modelField.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: model }))
    effortField.value = thinkingLevel
    effortField.dispatchEvent(new Event("change", { bubbles: true }))
    instructionsField.value = instructions
    instructionsField.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: instructions }))
    promptField.value = prompt
    promptField.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: prompt }))
    answerElement.textContent = answer
    firstName.value = "calculate_saved"
    firstName.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: "calculate_saved" }))
    await lab.persistNow()
  }, {
    answer: persistedAnswer,
    instructions: persistedInstructions,
    model: persistedModel,
    prompt: persistedPrompt,
    thinkingLevel: persistedThinkingLevel,
  })

  await waitForFileText(statePath, (text) => text.includes(persistedInstructions) && text.includes(persistedAnswer) && text.includes("calculate_saved"))
  await page.reload({ timeout: 30000, waitUntil: "load" })
  await page.waitForFunction(() => {
    return Reflect.get(globalThis, "functionLab") !== undefined && document.querySelectorAll(".function-card").length === 3
  }, { timeout: 30000 })

  const saved = JSON.parse(await readFile(statePath, "utf8")) as Record<string, unknown>
  const persisted = await page.evaluate(() => ({
    answer: document.querySelector("#answer")?.textContent ?? "",
    firstFunctionName: document.querySelector<HTMLInputElement>(".function-card input")?.value ?? "",
    instructions: document.querySelector<HTMLTextAreaElement>('textarea[name="instructions"]')?.value ?? "",
    model: document.querySelector<HTMLInputElement>('input[name="model"]')?.value ?? "",
    prompt: document.querySelector<HTMLTextAreaElement>('textarea[name="prompt"]')?.value ?? "",
    saveStatus: document.querySelector("#save-status")?.textContent ?? "",
    thinkingLevel: document.querySelector<HTMLSelectElement>('select[name="effort"]')?.value ?? "",
  }))
  const aliasStateUrl = new URL("/__web-native-openai/state", launchUrl)
  aliasStateUrl.searchParams.set("t", new URL(launchUrl).searchParams.get("t") ?? "")
  aliasStateUrl.searchParams.set("file", "/web-native/src/openai/examples/openai.responses-websocket-functions.demo.html")
  const aliasResponse = await fetch(aliasStateUrl, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ aliasPathCheck: true }),
  })
  const aliasSaved = aliasResponse.ok ? JSON.parse(await readFile(statePath, "utf8")) as Record<string, unknown> : undefined

  const failures = [
    ...(snapshot.cardCount !== 3 ? [`expected 3 default function cards, found ${snapshot.cardCount}`] : []),
    ...(!snapshot.bodyBackground.includes("0.15") ? [`dark background was not applied: ${snapshot.bodyBackground}`] : []),
    ...(!snapshot.bodyColor.includes("0.94") ? [`dark text color was not applied: ${snapshot.bodyColor}`] : []),
    ...(!functionResultIncludes(snapshot.calculate, "391") ? [`calculate did not return 391: ${JSON.stringify(snapshot.calculate)}`] : []),
    ...(!functionResultIncludes(snapshot.makeSeries, "4") || !functionResultIncludes(snapshot.makeSeries, "8") ? [`make_series did not return the expected range: ${JSON.stringify(snapshot.makeSeries)}`] : []),
    ...(!functionResultIncludes(snapshot.analyzeText, '"words": 7') ? [`analyze_text did not count 7 words: ${JSON.stringify(snapshot.analyzeText)}`] : []),
    ...(saved.instructions === persistedInstructions ? [] : ["state file did not persist instructions"]),
    ...(saved.prompt === persistedPrompt ? [] : ["state file did not persist prompt"]),
    ...(saved.model === persistedModel ? [] : ["state file did not persist model"]),
    ...(saved.thinkingLevel === persistedThinkingLevel && saved.effort === persistedThinkingLevel ? [] : ["state file did not persist thinking level"]),
    ...(isRecord(saved.request) && saved.request.prompt === persistedPrompt && saved.request.instructions === persistedInstructions && saved.request.thinkingLevel === persistedThinkingLevel ? [] : ["state file did not persist request snapshot"]),
    ...(saved.answer === persistedAnswer ? [] : ["state file did not persist answer"]),
    ...(isRecord(saved.llmResult) && saved.llmResult.text === persistedAnswer ? [] : ["state file did not persist llmResult text"]),
    ...(JSON.stringify(saved).includes("calculate_saved") ? [] : ["state file did not persist edited function"]),
    ...(persisted.instructions === persistedInstructions ? [] : ["page did not reload persisted instructions"]),
    ...(persisted.prompt === persistedPrompt ? [] : ["page did not reload persisted prompt"]),
    ...(persisted.model === persistedModel ? [] : ["page did not reload persisted model"]),
    ...(persisted.thinkingLevel === persistedThinkingLevel ? [] : ["page did not reload persisted thinking level"]),
    ...(persisted.answer === persistedAnswer ? [] : ["page did not reload persisted answer"]),
    ...(persisted.firstFunctionName === "calculate_saved" ? [] : ["page did not reload persisted function name"]),
    ...(persisted.saveStatus.length === 0 ? ["save status is empty"] : []),
    ...(aliasResponse.ok ? [] : [`/web-native state alias failed: ${aliasResponse.status} ${await aliasResponse.text()}`]),
    ...(aliasSaved?.aliasPathCheck === true ? [] : ["/web-native state alias did not write the real sibling state file"]),
    ...(consoleErrors.length > 0 ? [`console errors: ${consoleErrors.join("\n")}`] : []),
    ...(pageErrors.length > 0 ? [`page errors: ${pageErrors.join("\n")}`] : []),
  ]

  if (failures.length > 0) {
    throw new Error([
      "OpenAI function workbench smoke test failed.",
      ...failures.map((failure) => `- ${failure}`),
      "",
      "Snapshot:",
      JSON.stringify(snapshot, null, 2),
      "",
      "Persisted:",
      JSON.stringify(persisted, null, 2),
      "",
      "Saved:",
      JSON.stringify(saved, null, 2),
      "",
      "Alias saved:",
      JSON.stringify(aliasSaved, null, 2),
    ].join("\n"))
  }

  console.log("OpenAI function workbench smoke test passed")
  console.log(JSON.stringify({
    bodyBackground: snapshot.bodyBackground,
    bodyColor: snapshot.bodyColor,
    functionCards: snapshot.cardCount,
    stateFile: path.relative(root, statePath),
  }, null, 2))
} finally {
  await browser?.close()
  runner?.kill()
  await runner?.exited.catch(() => {})
  await rm(statePath, { force: true })
}

function functionResultIncludes(value: unknown, expected: string) {
  if (!isRecord(value)) return false
  if (value.ok !== true) return false
  return typeof value.result === "string" && value.result.includes(expected)
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
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
