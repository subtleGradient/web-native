import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import puppeteer from "puppeteer-core"
import { serveStatic } from "./static-server.ts"

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const port = Number(process.env.OPENAI_FUNCTION_WORKBENCH_SMOKE_PORT ?? "4181")
const pagePath = "/src/openai/examples/openai.responses-websocket-functions.demo.html"

const server = serveStatic({
  root,
  port,
  defaultPath: pagePath,
})
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined

try {
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

  await page.goto(`http://${server.hostname}:${server.port}${pagePath}?t=test`, {
    timeout: 10000,
    waitUntil: "load",
  })
  await page.waitForFunction(() => {
    return Reflect.get(globalThis, "functionLab") !== undefined && document.querySelectorAll(".function-card").length === 3
  }, { timeout: 10000 })
  await page.waitForFunction(() => document.querySelector("#sandbox iframe") !== null, { timeout: 10000 })

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

  const failures = [
    ...(snapshot.cardCount !== 3 ? [`expected 3 default function cards, found ${snapshot.cardCount}`] : []),
    ...(!snapshot.bodyBackground.includes("0.15") ? [`dark background was not applied: ${snapshot.bodyBackground}`] : []),
    ...(!snapshot.bodyColor.includes("0.94") ? [`dark text color was not applied: ${snapshot.bodyColor}`] : []),
    ...(!functionResultIncludes(snapshot.calculate, "391") ? [`calculate did not return 391: ${JSON.stringify(snapshot.calculate)}`] : []),
    ...(!functionResultIncludes(snapshot.makeSeries, "4") || !functionResultIncludes(snapshot.makeSeries, "8") ? [`make_series did not return the expected range: ${JSON.stringify(snapshot.makeSeries)}`] : []),
    ...(!functionResultIncludes(snapshot.analyzeText, '"words": 7') ? [`analyze_text did not count 7 words: ${JSON.stringify(snapshot.analyzeText)}`] : []),
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
    ].join("\n"))
  }

  console.log("OpenAI function workbench smoke test passed")
  console.log(JSON.stringify({
    bodyBackground: snapshot.bodyBackground,
    bodyColor: snapshot.bodyColor,
    functionCards: snapshot.cardCount,
  }, null, 2))
} finally {
  await browser?.close()
  server.stop(true)
}

function functionResultIncludes(value: unknown, expected: string) {
  if (!isRecord(value)) return false
  if (value.ok !== true) return false
  return typeof value.result === "string" && value.result.includes(expected)
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
