import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import puppeteer from "puppeteer-core"
import { serveStatic } from "./static-server.ts"

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const port = Number(process.env.PORT ?? "4174")
const server = serveStatic({ root, port, defaultPath: "/examples/shadcn-github/index.html" })
const cdnPrefix = "https://cdn.jsdelivr.net/gh/subtleGradient/web-native@"
const requestedUrls = new Set<string>()

let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined

try {
  browser = await puppeteer.launch({
    args: ["--disable-setuid-sandbox", "--no-sandbox"],
    executablePath: findChromeExecutable(),
    headless: true,
  })

  const page = await browser.newPage()
  page.on("request", (request) => requestedUrls.add(request.url()))

  await page.goto(`http://${server.hostname}:${server.port}/examples/shadcn-github/index.html`, {
    timeout: 20000,
    waitUntil: "load",
  })

  await page.waitForFunction(() => Reflect.get(globalThis, "__webNativeGithubDemoReady") === true, {
    timeout: 20000,
  })

  await page.click("#bold-toggle")
  await page.waitForFunction(() => document.querySelector("#bold-toggle")?.getAttribute("aria-pressed") === "true")
  await page.click('shadcn-tabs-trigger[value="security"]')
  await page.waitForFunction(() => document.querySelector("#settings-tabs")?.getAttribute("value") === "security")

  const result = await page.evaluate(() => ({
    buttonDefined: customElements.get("shadcn-button")?.name,
    buttonClass: document.querySelector("#save-button")?.classList.contains("cn-button") ?? false,
    toggleLog: document.querySelector("#toggle-log")?.textContent,
    tabsValue: document.querySelector("#settings-tabs")?.getAttribute("value"),
    activeSecurity: document.querySelector('shadcn-tabs-trigger[value="security"]')?.hasAttribute("data-active") ?? false,
  }))

  const loadedFromGithub = Array.from(requestedUrls).some((url) => url.startsWith(cdnPrefix) && url.includes("/src/shadcn.web/define.js"))
  const loadedCssFromGithub = Array.from(requestedUrls).some((url) => url.startsWith(cdnPrefix) && url.includes("/src/shadcn.web/styles/base-nova.css"))

  if (!loadedFromGithub || !loadedCssFromGithub || !result.buttonClass || result.toggleLog !== "Pressed: true" || result.tabsValue !== "security" || !result.activeSecurity) {
    console.error({ loadedFromGithub, loadedCssFromGithub, result })
    process.exitCode = 1
  } else {
    console.log("GitHub import-map demo verified")
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
