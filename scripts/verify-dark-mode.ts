import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import puppeteer from "puppeteer-core"
import { serveStatic } from "./static-server.ts"

type ThemeSnapshot = {
  background: string
  foreground: string
  colorScheme: string
}

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const port = Number(process.env.PORT ?? "4175")
const server = serveStatic({ root, port, defaultPath: "/src/shadcn/shadcn.demo.html" })

let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined

try {
  browser = await puppeteer.launch({
    args: ["--disable-setuid-sandbox", "--no-sandbox"],
    executablePath: findChromeExecutable(),
    headless: true,
  })

  const light = await snapshotTheme("light")
  const dark = await snapshotTheme("dark")
  const explicitLightInDark = await snapshotTheme("dark", "light")
  const explicitDarkInLight = await snapshotTheme("light", "dark")

  assertTheme("light system", light, "oklch(1 0 0)", "oklch(0.145 0 0)")
  assertTheme("dark system", dark, "oklch(0.145 0 0)", "oklch(0.985 0 0)")
  assertTheme("explicit light in dark system", explicitLightInDark, "oklch(1 0 0)", "oklch(0.145 0 0)")
  assertTheme("explicit dark in light system", explicitDarkInLight, "oklch(0.145 0 0)", "oklch(0.985 0 0)")

  console.log("Default and explicit dark-mode support verified")
} finally {
  await browser?.close()
  server.stop(true)
}

/**
 * @param {"light" | "dark"} preferredScheme
 * @param {"light" | "dark"} [explicitTheme]
 */
async function snapshotTheme(preferredScheme: "light" | "dark", explicitTheme?: "light" | "dark") {
  if (!browser) throw new Error("Browser not started")

  const page = await browser.newPage()
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: preferredScheme }])
  await page.goto(`http://${server.hostname}:${server.port}/src/shadcn/shadcn.demo.html`, {
    timeout: 10000,
    waitUntil: "load",
  })

  if (explicitTheme) {
    await page.evaluate((theme) => {
      document.documentElement.className = theme
    }, explicitTheme)
  }

  const snapshot = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement)
    return {
      background: styles.getPropertyValue("--background").trim(),
      foreground: styles.getPropertyValue("--foreground").trim(),
      colorScheme: styles.colorScheme,
    }
  })

  await page.close()
  return snapshot
}

function assertTheme(name: string, snapshot: ThemeSnapshot, background: string, foreground: string) {
  if (snapshot.background === background && snapshot.foreground === foreground) return

  console.error(`${name} theme mismatch`)
  console.error({ expected: { background, foreground }, received: snapshot })
  process.exitCode = 1
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
