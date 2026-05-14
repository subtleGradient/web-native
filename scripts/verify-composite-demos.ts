import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import puppeteer from "puppeteer-core"
import { serveStatic } from "./static-server.ts"

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const port = Number(process.env.PORT ?? "4176")
const server = serveStatic({ root, port, defaultPath: "/examples/composite/settings-console.html" })

let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined

try {
  browser = await puppeteer.launch({
    args: ["--disable-setuid-sandbox", "--no-sandbox"],
    executablePath: findChromeExecutable(),
    headless: true,
  })

  const page = await browser.newPage()
  await page.goto(`http://${server.hostname}:${server.port}/examples/composite/settings-console.html`, {
    timeout: 10000,
    waitUntil: "load",
  })

  await page.waitForFunction(() => Reflect.get(globalThis, "__webNativeCompositeDemoReady") === true, {
    timeout: 10000,
  })

  await page.click('shadcn-tabs-trigger[value="notifications"]')
  await page.waitForFunction(() => document.querySelector("#settings-tabs")?.getAttribute("value") === "notifications")
  await page.click('shadcn-switch[aria-label="Incident alerts"]')
  await page.click('shadcn-checkbox[aria-label="Product updates"]')

  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  })

  for (let index = 0; index < 20; index += 1) {
    await page.keyboard.press("Tab")
    const activeLabel = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))
    if (activeLabel === "Product updates") break
  }

  const state = await page.evaluate(async () => {
    const checkbox = document.querySelector<HTMLElement>('shadcn-checkbox[aria-label="Product updates"]')
    const switchControl = document.querySelector<HTMLElement>('shadcn-switch[aria-label="Incident alerts"]')
    const disabledCheckbox = document.querySelector<HTMLElement>('shadcn-checkbox[aria-label="Partner offers"]')

    const checkboxFocusShadow = checkbox ? getComputedStyle(checkbox).boxShadow : ""
    checkbox?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }))
    await new Promise((resolve) => requestAnimationFrame(resolve))

    return {
      tabsValue: document.querySelector("#settings-tabs")?.getAttribute("value"),
      activity: document.querySelector("#activity")?.textContent,
      checkboxChecked: checkbox?.hasAttribute("checked") ?? false,
      checkboxFocused: document.activeElement === checkbox,
      checkboxFocusShadow,
      checkboxActive: checkbox?.hasAttribute("data-active") ?? false,
      checkboxActiveTransform: checkbox ? getComputedStyle(checkbox).transform : "",
      switchChecked: switchControl?.hasAttribute("checked") ?? false,
      disabledOpacity: disabledCheckbox ? getComputedStyle(disabledCheckbox).opacity : "",
    }
  })

  await page.addScriptTag({ path: path.join(root, "node_modules/axe-core/axe.min.js") })
  const seriousViolations = await page.evaluate(async () => {
    const axe = Reflect.get(globalThis, "axe") as { run(element: Element): Promise<{ violations: { id: string; impact: string | null }[] }> }
    const results = await axe.run(document.querySelector("main")!)
    return results.violations.filter((violation) => violation.impact !== "minor").map((violation) => violation.id)
  })

  if (
    state.tabsValue !== "notifications" ||
    state.activity !== "Product updates: off" ||
    state.checkboxChecked ||
    !state.checkboxFocused ||
    state.checkboxFocusShadow === "none" ||
    !state.checkboxActive ||
    state.checkboxActiveTransform === "none" ||
    state.switchChecked ||
    state.disabledOpacity !== "0.5" ||
    seriousViolations.length > 0
  ) {
    console.error({ state, seriousViolations })
    process.exitCode = 1
  } else {
    console.log("Composite demos verified")
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
