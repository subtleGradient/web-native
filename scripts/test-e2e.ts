import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import puppeteer from "puppeteer-core"
import { serveStatic } from "./static-server.ts"

type Browser = Awaited<ReturnType<typeof puppeteer.launch>>
type Page = Awaited<ReturnType<Browser["newPage"]>>

type E2EPage = {
  expectedElements: string[]
  exercise?: (page: Page) => Promise<string[]>
  minimumStories: number
  name: string
  path: string
  readyFlag: string
}

type PageDiagnostics = {
  customElements: string[]
  emptyStories: string[]
  horizontalOverflow: boolean
  missingElements: string[]
  storyCount: number
}

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const port = Number(process.env.E2E_PORT ?? process.env.PORT ?? "4180")
const timeout = Number(process.env.E2E_TIMEOUT ?? "20000")
const server = serveStatic({ root, port, defaultPath: "/src/base.web/checkbox/checkbox.stories.html" })
const baseUrl = `http://${server.hostname}:${server.port}`
const failures: string[] = []
let browser: Browser | undefined

const pages: E2EPage[] = [
  {
    name: "base-checkbox stories",
    path: "/src/base.web/checkbox/checkbox.stories.html",
    readyFlag: "__webNativeCheckboxStoriesReady",
    minimumStories: 3,
    expectedElements: ["base-checkbox"],
    exercise: exerciseCheckbox,
  },
  {
    name: "base-switch stories",
    path: "/src/base.web/switch/switch.stories.html",
    readyFlag: "__webNativeSwitchStoriesReady",
    minimumStories: 3,
    expectedElements: ["base-switch"],
    exercise: exerciseSwitch,
  },
  {
    name: "base-toggle stories",
    path: "/src/base.web/toggle/toggle.stories.html",
    readyFlag: "__webNativeToggleStoriesReady",
    minimumStories: 2,
    expectedElements: ["base-toggle"],
    exercise: exerciseToggle,
  },
  {
    name: "base-toggle-group stories",
    path: "/src/base.web/toggle-group/toggle-group.stories.html",
    readyFlag: "__webNativeToggleGroupStoriesReady",
    minimumStories: 4,
    expectedElements: ["base-toggle-group", "base-toggle-group-item"],
    exercise: exerciseToggleGroup,
  },
  {
    name: "base-radio-group stories",
    path: "/src/base.web/radio-group/radio-group.stories.html",
    readyFlag: "__webNativeRadioStoriesReady",
    minimumStories: 4,
    expectedElements: ["base-radio-group", "base-radio"],
    exercise: exerciseRadioGroup,
  },
  {
    name: "base-tabs stories",
    path: "/src/base.web/tabs/tabs.stories.html",
    readyFlag: "__webNativeTabsStoriesReady",
    minimumStories: 3,
    expectedElements: ["base-tabs", "base-tabs-list", "base-tab", "base-tabs-panel"],
    exercise: exerciseTabs,
  },
  {
    name: "base-progress stories",
    path: "/src/base.web/progress/progress.stories.html",
    readyFlag: "__webNativeProgressStoriesReady",
    minimumStories: 3,
    expectedElements: ["base-progress", "base-progress-track", "base-progress-indicator", "base-progress-label", "base-progress-value"],
    exercise: exerciseProgress,
  },
  {
    name: "base-separator stories",
    path: "/src/base.web/separator/separator.stories.html",
    readyFlag: "__webNativeSeparatorStoriesReady",
    minimumStories: 3,
    expectedElements: ["base-separator"],
    exercise: exerciseSeparator,
  },
  {
    name: "shadcn stories",
    path: "/src/shadcn.web/shadcn.stories.html",
    readyFlag: "__webNativeShadcnReady",
    minimumStories: 7,
    expectedElements: [
      "shadcn-button",
      "shadcn-toggle",
      "shadcn-toggle-group",
      "shadcn-toggle-group-item",
      "shadcn-checkbox",
      "shadcn-switch",
      "shadcn-radio-group",
      "shadcn-radio-group-item",
      "shadcn-tabs",
      "shadcn-tabs-list",
      "shadcn-tabs-trigger",
      "shadcn-tabs-content",
      "shadcn-progress",
      "shadcn-separator",
      "shadcn-badge",
      "shadcn-alert",
      "shadcn-card",
      "shadcn-field",
      "shadcn-input",
      "shadcn-textarea",
      "shadcn-native-select",
      "shadcn-table",
      "shadcn-table-element",
      "shadcn-avatar",
      "shadcn-skeleton",
      "shadcn-kbd",
    ],
    exercise: exerciseShadcn,
  },
  {
    name: "chat stories",
    path: "/src/chat.web/chat.stories.html",
    readyFlag: "__webNativeChatStoriesReady",
    minimumStories: 1,
    expectedElements: ["topic-transcript", "chat-summary", "chat-message"],
    exercise: exerciseChat,
  },
  {
    name: "deck-gl stories",
    path: "/src/deck-gl.web/deck-gl.stories.html",
    readyFlag: "__webNativeDeckStoriesReady",
    minimumStories: 1,
    expectedElements: ["deck-gl", "deck-layer-list", "deck-details-panel"],
    exercise: exerciseDeck,
  },
  {
    name: "AI stories",
    path: "/src/ai.web/ai.stories.html",
    readyFlag: "__webNativeAIStoriesReady",
    minimumStories: 2,
    expectedElements: ["openai-client", "openai-key-field", "openai-result"],
    exercise: exerciseOpenAI,
  },
]

try {
  browser = await puppeteer.launch({
    args: ["--disable-setuid-sandbox", "--no-sandbox"],
    executablePath: findChromeExecutable(),
    headless: true,
  })

  for (const e2ePage of pages) {
    await verifyPage(e2ePage, { height: 900, label: "desktop", width: 1280 })
    await verifyPage(e2ePage, { height: 844, label: "mobile", width: 390 })
  }
} finally {
  await browser?.close()
  server.stop(true)
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure)
  process.exitCode = 1
} else {
  console.log(`E2E browser stories verified: ${pages.length} pages, ${pages.length * 2} viewport loads`)
}

async function verifyPage(e2ePage: E2EPage, viewport: { height: number; label: string; width: number }) {
  if (!browser) throw new Error("browser was not launched")

  const page = await browser.newPage()
  const browserErrors: string[] = []

  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text())
  })
  page.on("pageerror", (error) => {
    browserErrors.push(error instanceof Error ? (error.stack ?? error.message) : String(error))
  })

  try {
    await page.setViewport({ height: viewport.height, width: viewport.width })
    await page.goto(`${baseUrl}${e2ePage.path}`, { timeout, waitUntil: "load" })
    await page.waitForFunction((readyFlag) => Reflect.get(globalThis, readyFlag) === true, { timeout }, e2ePage.readyFlag)

    const diagnostics = await collectDiagnostics(page, e2ePage.expectedElements)
    failures.push(...diagnosticFailures(e2ePage, viewport.label, diagnostics, e2ePage.minimumStories))

    if (viewport.label === "desktop") {
      const axeFailures = await axeViolations(page)
      failures.push(...axeFailures.map((violation) => `[${e2ePage.name}] axe violation: ${violation}`))

      if (e2ePage.exercise) {
        const exerciseFailures = await e2ePage.exercise(page)
        failures.push(...exerciseFailures.map((failure) => `[${e2ePage.name}] ${failure}`))
      }
    }

    failures.push(...browserErrors.map((error) => `[${e2ePage.name} ${viewport.label}] browser error:\n${error}`))
  } catch (error) {
    failures.push(`[${e2ePage.name} ${viewport.label}] ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`)
  } finally {
    await page.close()
  }
}

async function collectDiagnostics(page: Page, expectedElements: string[]) {
  return (await page.evaluate((names) => {
    const storyElements = Array.from(document.querySelectorAll<HTMLElement>("[data-story]"))
    const renderedCustomElements = Array.from(document.querySelectorAll("*"))
      .map((element) => element.localName)
      .filter((name) => name.includes("-"))
      .filter((name, index, all) => all.indexOf(name) === index)
      .sort()

    return {
      customElements: renderedCustomElements,
      emptyStories: storyElements.filter((story) => story.textContent?.trim().length === 0).map((story) => story.dataset.story ?? "unknown"),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      missingElements: names.filter((name) => !customElements.get(name)),
      storyCount: storyElements.length,
    }
  }, expectedElements)) as PageDiagnostics
}

function diagnosticFailures(e2ePage: E2EPage, viewport: string, diagnostics: PageDiagnostics, minimumStories: number) {
  const result: string[] = []
  const prefix = `[${e2ePage.name} ${viewport}]`

  if (diagnostics.storyCount < minimumStories) {
    result.push(`${prefix} expected at least ${minimumStories} stories, found ${diagnostics.storyCount}`)
  }
  if (diagnostics.missingElements.length > 0) {
    result.push(`${prefix} missing custom element definitions: ${diagnostics.missingElements.join(", ")}`)
  }
  if (diagnostics.emptyStories.length > 0) {
    result.push(`${prefix} empty stories: ${diagnostics.emptyStories.join(", ")}`)
  }
  if (diagnostics.horizontalOverflow) {
    result.push(`${prefix} page overflows horizontally`)
  }
  if (diagnostics.customElements.length === 0) {
    result.push(`${prefix} no custom elements rendered`)
  }

  return result
}

async function axeViolations(page: Page) {
  await page.addScriptTag({ path: path.join(root, "node_modules/axe-core/axe.min.js") })
  return (await page.evaluate(async () => {
    const axe = Reflect.get(globalThis, "axe") as {
      run(element: Element): Promise<{ violations: { id: string; impact: string | null; nodes: unknown[] }[] }>
    }
    const target = document.querySelector("main") ?? document.body
    const results = await axe.run(target)
    return results.violations
      .filter((violation) => violation.impact !== "minor")
      .map((violation) => `${violation.id} (${violation.impact ?? "unknown"}, ${violation.nodes.length} nodes: ${violation.nodes.map((node) => JSON.stringify(Reflect.get(node as object, "target"))).join("; ")})`)
  })) as string[]
}

async function exerciseCheckbox(page: Page) {
  const failures: string[] = []

  await page.click("#checkbox-interactive")
  await page.click("#checkbox-indeterminate")
  await page.click("#checkbox-cancel")
  await page.click("#checkbox-required")
  await page.click("#checkbox-form button")

  const state = await page.evaluate(() => ({
    canceledChecked: document.querySelector("#checkbox-cancel")?.hasAttribute("checked") ?? false,
    eventOutput: document.querySelector("#checkbox-event-output")?.textContent ?? "",
    formOutput: document.querySelector("#checkbox-form-output")?.textContent ?? "",
    indeterminateChecked: document.querySelector("#checkbox-indeterminate")?.hasAttribute("checked") ?? false,
    indeterminateMixed: document.querySelector("#checkbox-indeterminate")?.hasAttribute("indeterminate") ?? false,
    interactiveChecked: document.querySelector("#checkbox-interactive")?.hasAttribute("checked") ?? false,
  }))

  if (!state.interactiveChecked) failures.push("checkbox did not toggle on click")
  if (!state.indeterminateChecked || state.indeterminateMixed) failures.push("indeterminate checkbox did not resolve to checked")
  if (state.canceledChecked || !state.eventOutput.includes("Canceled")) failures.push("canceled checkbox committed a checked change")
  if (!state.formOutput.includes("required=on") || !state.formOutput.includes("explicit=no")) {
    failures.push(`checkbox form output did not include expected values: ${state.formOutput}`)
  }

  return failures
}

async function exerciseSwitch(page: Page) {
  const failures: string[] = []

  await page.focus("#switch-interactive")
  await page.keyboard.press("Space")
  await page.click("#switch-cancel")
  await page.click("#switch-form button")

  const state = await page.evaluate(() => ({
    canceledChecked: document.querySelector("#switch-cancel")?.hasAttribute("checked") ?? false,
    eventOutput: document.querySelector("#switch-event-output")?.textContent ?? "",
    formOutput: document.querySelector("#switch-form-output")?.textContent ?? "",
    interactiveChecked: document.querySelector("#switch-interactive")?.hasAttribute("checked") ?? false,
  }))

  if (!state.interactiveChecked) failures.push("switch did not toggle on Space")
  if (state.canceledChecked || !state.eventOutput.includes("Canceled")) failures.push("canceled switch committed a checked change")
  if (!state.formOutput.includes("security=on") || !state.formOutput.includes("beta=no")) {
    failures.push(`switch form output did not include expected values: ${state.formOutput}`)
  }

  return failures
}

async function exerciseToggle(page: Page) {
  const failures: string[] = []

  await page.click("#toggle-interactive")
  await page.click("#toggle-cancel")

  const state = await page.evaluate(() => ({
    cancelOutput: document.querySelector("#toggle-cancel-output")?.textContent ?? "",
    canceledPressed: document.querySelector("#toggle-cancel")?.hasAttribute("pressed") ?? false,
    interactivePressed: document.querySelector("#toggle-interactive")?.hasAttribute("pressed") ?? false,
  }))

  if (!state.interactivePressed) failures.push("toggle did not press on click")
  if (state.canceledPressed || !state.cancelOutput.includes("Canceled")) failures.push("canceled toggle committed a pressed change")

  return failures
}

async function exerciseToggleGroup(page: Page) {
  const failures: string[] = []

  await page.focus('#toggle-group-single base-toggle-group-item[value="left"]')
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("Enter")
  await page.click('#toggle-group-multiple base-toggle-group-item[value="italic"]')
  await page.click('#toggle-group-cancel base-toggle-group-item[value="blocked"]')
  await page.click("#toggle-group-form button")

  const state = await page.evaluate(() => ({
    cancelOutput: document.querySelector("#toggle-group-output")?.textContent ?? "",
    canceledValue: document.querySelector("#toggle-group-cancel")?.getAttribute("value"),
    formOutput: document.querySelector("#toggle-group-output")?.textContent ?? "",
    multipleValue: document.querySelector("#toggle-group-multiple")?.getAttribute("value"),
    singleValue: document.querySelector("#toggle-group-single")?.getAttribute("value"),
  }))

  if (state.singleValue !== "center") failures.push(`toggle group value was ${state.singleValue}`)
  if (state.multipleValue !== "bold italic") failures.push(`multiple toggle group value was ${state.multipleValue}`)
  if (state.canceledValue !== null) failures.push(`canceled toggle group value was ${state.canceledValue}`)
  if (!state.formOutput.includes("format=bold")) failures.push(`toggle group form output did not include expected values: ${state.formOutput}`)
  if (state.cancelOutput.length === 0) failures.push("toggle group output was empty")

  return failures
}

async function exerciseRadioGroup(page: Page) {
  const failures: string[] = []

  await page.focus('#radio-group base-radio[value="email"]')
  await page.keyboard.press("ArrowRight")
  await page.click('#radio-group-cancel base-radio[value="blocked"]')
  await page.click("#radio-form button")

  const state = await page.evaluate(() => ({
    canceledValue: document.querySelector("#radio-group-cancel")?.getAttribute("value"),
    formOutput: document.querySelector("#radio-output")?.textContent ?? "",
    readonlyValue: document.querySelector("#radio-group-readonly")?.getAttribute("value"),
    value: document.querySelector("#radio-group")?.getAttribute("value"),
  }))

  if (state.value !== "sms") failures.push(`radio group value was ${state.value}`)
  if (state.readonlyValue !== "compact") failures.push(`readonly radio group value was ${state.readonlyValue}`)
  if (state.canceledValue !== null) failures.push(`canceled radio group value was ${state.canceledValue}`)
  if (!state.formOutput.includes("plan=pro")) failures.push(`radio form output did not include expected values: ${state.formOutput}`)

  return failures
}

async function exerciseTabs(page: Page) {
  const failures: string[] = []

  await page.click('#tabs-manual base-tab[value="billing"]')
  await page.focus('#tabs-auto base-tab[value="one"]')
  await page.keyboard.press("ArrowDown")
  await page.click('#tabs-cancel base-tab[value="blocked"]')

  const state = await page.evaluate(() => ({
    autoValue: document.querySelector("#tabs-auto")?.getAttribute("value"),
    cancelOutput: document.querySelector("#tabs-output")?.textContent ?? "",
    cancelValue: document.querySelector("#tabs-cancel")?.getAttribute("value"),
    manualValue: document.querySelector("#tabs-manual")?.getAttribute("value"),
  }))

  if (state.manualValue !== "billing") failures.push(`manual tabs value was ${state.manualValue}`)
  if (state.autoValue !== "two") failures.push(`auto tabs value was ${state.autoValue}`)
  if (state.cancelValue !== "open" || !state.cancelOutput.includes("Canceled")) failures.push("canceled tabs activation committed")

  return failures
}

async function exerciseProgress(page: Page) {
  const failures: string[] = []

  await page.evaluate(() => Reflect.get(globalThis, "ProgressStories").advance())

  const state = await page.evaluate(() => ({
    highNow: document.querySelector('[data-story="ranges-and-clamping"] base-progress[value="120"]')?.getAttribute("aria-valuenow"),
    liveNow: document.querySelector("#progress-live")?.getAttribute("aria-valuenow"),
    output: document.querySelector("#progress-output")?.textContent ?? "",
  }))

  if (state.liveNow !== "80" || state.output !== "80") failures.push(`progress live state was ${state.liveNow}/${state.output}`)
  if (state.highNow !== "100") failures.push(`clamped high progress aria-valuenow was ${state.highNow}`)

  return failures
}

async function exerciseSeparator(page: Page) {
  const failures: string[] = []

  await page.evaluate(() => Reflect.get(globalThis, "SeparatorStories").flip())

  const state = await page.evaluate(() => ({
    invalidOrientation: document.querySelector("#separator-invalid")?.getAttribute("aria-orientation"),
    liveOrientation: document.querySelector("#separator-live")?.getAttribute("aria-orientation"),
    output: document.querySelector("#separator-output")?.textContent ?? "",
  }))

  if (state.liveOrientation !== "vertical" || state.output !== "vertical") failures.push(`separator live orientation was ${state.liveOrientation}/${state.output}`)
  if (state.invalidOrientation !== "horizontal") failures.push(`invalid separator normalized to ${state.invalidOrientation}`)

  return failures
}

async function exerciseShadcn(page: Page) {
  const failures: string[] = []

  await page.click("#shadcn-action-button")
  await page.click("#shadcn-toggle-interactive")
  await page.click("#shadcn-checkbox-interactive")
  await page.focus("#shadcn-switch-interactive")
  await page.keyboard.press("Space")
  await page.click('#shadcn-toggle-group-single shadcn-toggle-group-item[value="center"]')
  await page.click('#shadcn-radio-group shadcn-radio-group-item[value="sms"]')
  await page.click('#shadcn-tabs shadcn-tabs-trigger[value="security"]')
  await page.evaluate(() => Reflect.get(globalThis, "ShadcnStories").advanceProgress())
  await page.click("#shadcn-profile-form button")

  const state = await page.evaluate(() => ({
    actionOutput: document.querySelector("#shadcn-action-output")?.textContent ?? "",
    checkboxChecked: document.querySelector("#shadcn-checkbox-interactive")?.hasAttribute("checked") ?? false,
    formOutput: document.querySelector("#shadcn-form-output")?.textContent ?? "",
    progressNow: document.querySelector("#shadcn-progress-live")?.getAttribute("aria-valuenow"),
    radioValue: document.querySelector("#shadcn-radio-group")?.getAttribute("value"),
    switchChecked: document.querySelector("#shadcn-switch-interactive")?.hasAttribute("checked") ?? false,
    tabsValue: document.querySelector("#shadcn-tabs")?.getAttribute("value"),
    toggleGroupValue: document.querySelector("#shadcn-toggle-group-single")?.getAttribute("value"),
    togglePressed: document.querySelector("#shadcn-toggle-interactive")?.hasAttribute("pressed") ?? false,
  }))

  if (state.actionOutput !== "1 actions") failures.push(`button output was ${state.actionOutput}`)
  if (!state.togglePressed) failures.push("toggle did not press on click")
  if (!state.checkboxChecked) failures.push("checkbox did not check on click")
  if (!state.switchChecked) failures.push("switch did not toggle on Space")
  if (state.toggleGroupValue !== "center") failures.push(`toggle group value was ${state.toggleGroupValue}`)
  if (state.radioValue !== "sms") failures.push(`radio group value was ${state.radioValue}`)
  if (state.tabsValue !== "security") failures.push(`tabs value was ${state.tabsValue}`)
  if (state.progressNow !== "88") failures.push(`progress aria-valuenow was ${state.progressNow}`)
  if (!state.formOutput.includes("email=team%40example.com") || !state.formOutput.includes("role=viewer") || !state.formOutput.includes("notes=Ready")) {
    failures.push(`form output did not include expected values: ${state.formOutput}`)
  }

  return failures
}

async function exerciseChat(page: Page) {
  const failures: string[] = []

  const state = await page.evaluate(() => ({
    messages: document.querySelectorAll("chat-message").length,
    summaryText: document.querySelector("chat-summary")?.shadowRoot?.textContent ?? "",
    transcriptText: document.querySelector("topic-transcript")?.textContent ?? "",
  }))

  if (state.messages < 4) failures.push(`expected at least 4 chat messages, found ${state.messages}`)
  if (!state.summaryText.includes("Previous context")) failures.push("chat summary did not render previous context")
  if (!state.transcriptText.includes("tool result")) failures.push("chat transcript did not include fixture tool result")

  return failures
}

async function exerciseDeck(page: Page) {
  const failures: string[] = []

  await page.evaluate(() => {
    const list = document.querySelector("#storybook-layers")
    const button = list?.shadowRoot?.querySelector<HTMLButtonElement>('button[data-layer-id="weather"]')
    button?.click()
  })

  const state = await page.evaluate(() => ({
    canvasCount: document.querySelector("#storybook-deck")?.shadowRoot?.querySelectorAll("canvas").length ?? 0,
    deckOutput: document.querySelector("#deck-output")?.textContent ?? "",
    deckLayerCount: Reflect.get(document.querySelector("#storybook-deck") ?? {}, "layers")?.length ?? 0,
    deckState: document.querySelector("#storybook-deck")?.getAttribute("data-deck-state"),
  }))

  if (state.deckState !== "ready") failures.push(`deck state was ${state.deckState}`)
  if (state.canvasCount === 0) failures.push("deck.gl canvas was not rendered")
  if (state.deckLayerCount < 4) failures.push(`expected deck.gl layers, found ${state.deckLayerCount}`)
  if (!state.deckOutput.includes("weather: visible")) failures.push(`deck output was ${state.deckOutput}`)

  return failures
}

async function exerciseOpenAI(page: Page) {
  const failures: string[] = []

  await page.evaluate(() => {
    const field = document.querySelector("#fixture-key")
    const input = field?.shadowRoot?.querySelector("input")
    const form = field?.shadowRoot?.querySelector("form")
    if (input instanceof HTMLInputElement) input.value = "sk-story"
    form?.requestSubmit()
  })
  await page.click("#fixture-ai-form button")
  await page.waitForFunction(() => document.querySelector("#fixture-result")?.shadowRoot?.textContent?.includes("Fixture answer") === true, {
    timeout,
  })

  const state = await page.evaluate(() => ({
    errorText: document.querySelector("#error-result")?.shadowRoot?.textContent ?? "",
    imageRendered: document.querySelector("#image-result")?.shadowRoot?.querySelector("img") !== null,
    jsonText: document.querySelector("#json-result")?.shadowRoot?.textContent ?? "",
    key: Reflect.get(document.querySelector("#fixture-ai") ?? {}, "apiKey"),
    openAiOutput: document.querySelector("#openai-output")?.textContent ?? "",
    resultText: document.querySelector("#fixture-result")?.shadowRoot?.textContent ?? "",
    textResult: document.querySelector("#text-result")?.shadowRoot?.textContent ?? "",
  }))

  if (state.key !== "sk-story") failures.push("openai-key-field did not update target apiKey")
  if (!state.openAiOutput.includes("gpt-fixture")) failures.push(`OpenAI fixture output was ${state.openAiOutput}`)
  if (!state.resultText.includes("Fixture answer")) failures.push("openai-result did not render fixture answer")
  if (!state.textResult.includes("Fixture text")) failures.push("text result fixture did not render")
  if (!state.jsonText.includes('"ok": true')) failures.push("JSON result fixture did not render")
  if (!state.imageRendered) failures.push("image result fixture did not render an image")
  if (!state.errorText.includes("Fixture error")) failures.push("error result fixture did not render")

  return failures
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
