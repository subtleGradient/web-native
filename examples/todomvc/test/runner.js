import { scenarios } from "./scenarios.js"
import { storageKey } from "../todos/storage.js"

const results = document.querySelector("#results")
const summary = document.querySelector("#summary")
const frames = document.querySelector("#frames")

const failures = []

await run()

async function run() {
  for (const scenario of scenarios) {
    clearFrames()
    localStorage.removeItem(storageKey)

    const item = document.createElement("li")
    item.textContent = scenario.name
    item.dataset.status = "running"
    results.append(item)

    try {
      await scenario.run({ loadApp, waitFor })
      item.dataset.status = "pass"
      item.textContent = `${scenario.name}: pass`
    } catch (error) {
      failures.push(error)
      item.dataset.status = "fail"
      item.textContent = `${scenario.name}: ${error instanceof Error ? error.message : String(error)}`
      console.error(error)
    }
  }

  clearFrames()

  if (failures.length > 0) {
    summary.textContent = `${failures.length} failed, ${scenarios.length - failures.length} passed`
    throw new Error(`${failures.length} TodoMVC browser test${failures.length === 1 ? "" : "s"} failed`)
  }

  summary.textContent = `${scenarios.length} passed`
}

async function loadApp({ clearStorage = false, hash = "", height = 620, width = 920 } = {}) {
  if (clearStorage) localStorage.removeItem(storageKey)

  const iframe = document.createElement("iframe")
  iframe.title = "TodoMVC test app"
  iframe.style.width = `${width}px`
  iframe.style.minHeight = `${height}px`

  const url = new URL("../index.html", import.meta.url)
  url.searchParams.set("testRun", crypto.randomUUID?.() ?? String(Date.now()))
  if (hash) url.hash = hash

  const loaded = waitForFrameLoad(iframe)
  iframe.src = url.href
  frames.append(iframe)
  await loaded
  await waitFor(() => iframe.contentWindow?.__webNativeTodoMVCReady === true)

  return {
    iframe,
    get win() {
      return iframe.contentWindow
    },
    get doc() {
      return iframe.contentDocument
    },
    async reload() {
      const reloaded = waitForFrameLoad(iframe)
      iframe.contentWindow.location.reload()
      await reloaded
      await waitFor(() => iframe.contentWindow?.__webNativeTodoMVCReady === true)
    },
  }
}

function waitForFrameLoad(iframe) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("iframe load timed out")), 10000)
    iframe.addEventListener(
      "load",
      () => {
        clearTimeout(timeout)
        resolve()
      },
      { once: true },
    )
  })
}

async function waitFor(predicate, { timeout = 5000 } = {}) {
  const start = performance.now()

  while (performance.now() - start < timeout) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 16))
  }

  throw new Error("condition timed out")
}

function clearFrames() {
  frames.replaceChildren()
}
