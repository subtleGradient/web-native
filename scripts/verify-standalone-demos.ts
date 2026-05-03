import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import puppeteer from "puppeteer-core"

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const standalonePages = [
  "examples/standalone/shadcn-github.html",
  "examples/composite/settings-console.standalone.html",
  "src/checkbox/checkbox.standalone.html",
  "src/switch/switch.standalone.html",
  "src/toggle/toggle.standalone.html",
  "src/separator/separator.standalone.html",
  "src/tabs/tabs.standalone.html",
  "src/shadcn/shadcn.standalone.html",
  "src/shadcn/button/button.standalone.html",
  "src/shadcn/checkbox/checkbox.standalone.html",
  "src/shadcn/switch/switch.standalone.html",
  "src/shadcn/toggle/toggle.standalone.html",
  "src/shadcn/separator/separator.standalone.html",
  "src/shadcn/tabs/tabs.standalone.html",
  "src/shadcn/presentational/presentational.standalone.html",
]

let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined

try {
  browser = await puppeteer.launch({
    args: ["--disable-setuid-sandbox", "--no-sandbox"],
    executablePath: findChromeExecutable(),
    headless: true,
  })

  for (const pagePath of standalonePages) {
    for (const preferredScheme of ["light", "dark"] as const) {
      const page = await browser.newPage()
      await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: preferredScheme }])
      await page.goto(pathToFileURL(path.join(root, pagePath)).href, { timeout: 30000, waitUntil: "load" })
      await page.waitForFunction(
        () => Reflect.get(globalThis, "__webNativeStandaloneDemoReady") === true || Reflect.get(globalThis, "__webNativeGithubDemoReady") === true,
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

      if (result.dataTheme !== preferredScheme || result.customElements.length === 0) {
        console.error({ pagePath, preferredScheme, result })
        process.exitCode = 1
      }
    }
  }

  if (!process.exitCode) console.log("Standalone demos verified")
} finally {
  await browser?.close()
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
