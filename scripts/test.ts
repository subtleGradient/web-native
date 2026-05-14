import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import puppeteer from "puppeteer-core"
import { serveStatic } from "./static-server.ts"

type BrowserTestFailure = {
  title: string
  fullTitle: string
  message: string
  stack?: string
}

type BrowserTestResults = {
  done: true
  passed: boolean
  tests: number
  passes: number
  failures: number
  duration: number
  failureDetails: BrowserTestFailure[]
}

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const port = Number(process.env.PORT ?? "4173")
const timeout = Number(process.env.TEST_TIMEOUT ?? "10000")
const server = serveStatic({ root, port })
const browserErrors: string[] = []
const url = `http://${server.hostname}:${server.port}/test/`

let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined

try {
  browser = await puppeteer.launch({
    args: ["--disable-setuid-sandbox", "--no-sandbox"],
    executablePath: findChromeExecutable(),
    headless: true,
  })

  const page = await browser.newPage()

  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text())
  })

  page.on("pageerror", (error) => {
    browserErrors.push(error instanceof Error ? (error.stack ?? error.message) : String(error))
  })

  await page.goto(url, { timeout, waitUntil: "load" })
  await page.waitForFunction(() => Boolean(Reflect.get(globalThis, "__webNativeTestResults")?.done), {
    timeout,
  })

  const results = (await page.evaluate(() => Reflect.get(globalThis, "__webNativeTestResults"))) as BrowserTestResults

  console.log(`Browser tests: ${results.passes}/${results.tests} passed in ${results.duration}ms`)

  for (const failure of results.failureDetails) {
    console.error(`\n${failure.fullTitle}`)
    console.error(failure.stack ?? failure.message)
  }

  for (const error of browserErrors) {
    console.error(`\nBrowser error:\n${error}`)
  }

  if (!results.passed || browserErrors.length > 0) process.exitCode = 1
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
