import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import puppeteer from "puppeteer-core"
import { serveStatic } from "./static-server.ts"
import { discoverVerifiableStandaloneHtmlFiles } from "./standalone-discovery.ts"
import { getGitHubRepo, localizeRepoCdnHtml } from "./standalone-rewriter.ts"

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const repo = await getGitHubRepo(root)
const port = Number(process.env.PORT ?? "4177")
const server = serveStatic({
  root,
  port,
  transformHtml: (html, htmlPath) => localizeRepoCdnHtml(html, { root, htmlPath, repo, localUrlStyle: "root" }),
})
const standalonePages = await discoverVerifiableStandaloneHtmlFiles(root, repo)

let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined

try {
  browser = await puppeteer.launch({
    args: ["--disable-setuid-sandbox", "--no-sandbox"],
    executablePath: findChromeExecutable(),
    headless: true,
  })

  for (const filePath of standalonePages) {
    const pagePath = path.relative(root, filePath)
    for (const preferredScheme of ["light", "dark"] as const) {
      const page = await browser.newPage()
      await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: preferredScheme }])
      await page.goto(`http://${server.hostname}:${server.port}/${pagePath}`, { timeout: 30000, waitUntil: "load" })
      await page.waitForFunction(
        () =>
          Reflect.get(globalThis, "__webNativeStandaloneDemoReady") === true ||
          Reflect.get(globalThis, "__webNativeGithubDemoReady") === true ||
          Reflect.get(globalThis, "__webNativeCompositeDemoReady") === true,
        { timeout: 30000 },
      )

      const result = await page.evaluate(() => ({
        dataTheme: document.documentElement.dataset.theme,
        customElements: Array.from(document.querySelectorAll("*"))
          .map((element) => element.localName)
          .filter((name) => name.includes("-"))
          .filter((name, index, names) => names.indexOf(name) === index),
      }))

      await page.close()

      if ((result.dataTheme && result.dataTheme !== preferredScheme) || result.customElements.length === 0) {
        console.error({ pagePath, preferredScheme, result })
        process.exitCode = 1
      }
    }
  }

  if (!process.exitCode) console.log("Standalone demos verified")
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
