import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import puppeteer from "puppeteer-core"
import { serveStatic } from "./static-server.ts"

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const port = Number(process.env.PORT ?? "4181")
const timeout = Number(process.env.TEST_TIMEOUT ?? "20000")
const server = serveStatic({ root, port })

let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined

try {
  browser = await puppeteer.launch({
    args: ["--disable-setuid-sandbox", "--no-sandbox"],
    executablePath: findChromeExecutable(),
    headless: true,
  })

  const page = await browser.newPage()
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  page.on("pageerror", (error) => {
    errors.push(error instanceof Error ? (error.stack ?? error.message) : String(error))
  })

  await page.goto(`http://${server.hostname}:${server.port}/src/ai.web/ai.stories.html`, {
    timeout,
    waitUntil: "load",
  })
  await page.waitForFunction(
    () => Reflect.get(globalThis, "__webNativeAIStoriesReady") === true,
    { timeout },
  )
  await page.evaluate(() => {
    const input = document.querySelector("#fixture-key")?.shadowRoot?.querySelector("input")
    const form = document.querySelector("#fixture-key")?.shadowRoot?.querySelector("form")
    if (input instanceof HTMLInputElement) input.value = "sk-story"
    form?.requestSubmit()
  })
  await page.click("#fixture-ai-form button")
  await page.waitForFunction(
    () => document.querySelector("#fixture-result")?.shadowRoot?.textContent?.includes("Fixture answer") === true,
    { timeout },
  )

  const result = await page.evaluate(() => ({
    errorText: document.querySelector("#error-result")?.shadowRoot?.textContent ?? "",
    imageRendered: document.querySelector("#image-result")?.shadowRoot?.querySelector("img") !== null,
    jsonText: document.querySelector("#json-result")?.shadowRoot?.textContent ?? "",
    key: Reflect.get(document.querySelector("#fixture-ai") ?? {}, "apiKey"),
    output: document.querySelector("#openai-output")?.textContent ?? "",
    resultText: document.querySelector("#fixture-result")?.shadowRoot?.textContent ?? "",
    stories: document.querySelectorAll("[data-story]").length,
    textResult: document.querySelector("#text-result")?.shadowRoot?.textContent ?? "",
  }))

  const failures = [
    result.key === "sk-story" ? "" : "openai-key-field did not update target apiKey",
    result.output.includes("gpt-fixture") ? "" : `fixture output was ${result.output}`,
    result.resultText.includes("Fixture answer") ? "" : "openai-result did not render fixture answer",
    result.textResult.includes("Fixture text") ? "" : "text result fixture did not render",
    result.jsonText.includes('"ok": true') ? "" : "JSON result fixture did not render",
    result.imageRendered ? "" : "image result fixture did not render an image",
    result.errorText.includes("Fixture error") ? "" : "error result fixture did not render",
    result.stories >= 4 ? "" : `expected at least 4 stories, found ${result.stories}`,
    ...errors,
  ].filter(Boolean)

  if (failures.length > 0) {
    for (const failure of failures) console.error(failure)
    process.exitCode = 1
  } else {
    console.log("AI stories smoke verified")
  }
} finally {
  await browser?.close()
  server.stop(true)
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
