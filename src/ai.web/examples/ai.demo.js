// @ts-check

import "../../shadcn.web/presentational/define.js"

const css = String.raw
const search = new URLSearchParams(location.search)

if (search.size > 0) {
  for (const link of document.querySelectorAll("a[data-preserve-search]")) {
    if (!(link instanceof HTMLAnchorElement)) continue
    const href = link.getAttribute("href")
    if (!href) continue
    const url = new URL(href, location.href)
    for (const [key, value] of search) {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value)
    }
    link.href = url.href
  }
}

if (!search.has("t")) showRunnerWarning()

function showRunnerWarning() {
  if (document.querySelector("[data-runner-warning]")) return
  const main = document.querySelector("main") ?? document.body
  const anchor = main.querySelector("header")?.nextSibling ?? main.firstChild
  const demoPath = currentDemoPath()
  const githubCommand = `bunx --bun -p https://github.com/subtleGradient/web-native/archive/refs/heads/main.tar.gz web-native-ai-broker ${demoPath}`
  const localCommand = `bun ./src/ai-broker.webapp/broker-runner.ts ${demoPath}`
  const warning = document.createElement("shadcn-alert")
  warning.className = "runner-warning"
  warning.dataset.runnerWarning = ""
  warning.setAttribute("variant", "destructive")

  const title = document.createElement("shadcn-alert-title")
  title.textContent = "Run this demo with the Codex broker"

  const description = document.createElement("shadcn-alert-description")
  const summary = document.createElement("span")
  summary.textContent = "These demos are hard-coded to the local Codex broker exposed by broker-runner."
  description.append(summary, commandBlock("GitHub", githubCommand), commandBlock("Local checkout", localCommand))

  warning.append(title, description)
  ensureRunnerWarningStyles()
  main.insertBefore(warning, anchor)
}

/**
 * @param {string} label
 * @param {string} command
 */
function commandBlock(label, command) {
  const row = document.createElement("span")
  row.className = "runner-warning-command-row"

  const labelElement = document.createElement("span")
  labelElement.className = "runner-warning-command-label"
  labelElement.textContent = `${label}:`

  const code = document.createElement("code")
  code.className = "runner-warning-command"
  code.textContent = command

  row.append(labelElement, code)
  return row
}

function currentDemoPath() {
  let pathname = "src/ai.web/examples/index.html"
  try {
    pathname = decodeURIComponent(location.pathname).replace(/^\/+/, "")
  } catch {
    return pathname
  }
  const marker = "src/ai.web/examples/"
  const markerIndex = pathname.lastIndexOf(marker)
  if (markerIndex >= 0) return pathname.slice(markerIndex)
  return pathname.endsWith(".demo.html") ? `src/ai.web/examples/${pathname.split("/").at(-1)}` : "src/ai.web/examples/index.html"
}

function ensureRunnerWarningStyles() {
  if (document.querySelector("style[data-runner-warning-style]")) return
  const style = document.createElement("style")
  style.dataset.runnerWarningStyle = ""
  style.textContent = css`
    shadcn-alert.runner-warning {
      background: color-mix(in oklch, Canvas 92%, CanvasText 8%);
      border: 1px solid color-mix(in oklch, Highlight 52%, CanvasText 18%);
      border-radius: 0.75rem;
      color: CanvasText;
      display: grid;
      gap: 0.625rem;
      padding: 1rem;
    }

    shadcn-alert.runner-warning shadcn-alert-title {
      display: block;
      font-weight: 750;
      line-height: 1.25;
    }

    shadcn-alert.runner-warning shadcn-alert-description {
      color: color-mix(in oklch, CanvasText 74%, transparent);
      display: grid;
      gap: 0.75rem;
    }

    .runner-warning-command-row {
      display: grid;
      gap: 0.25rem;
    }

    .runner-warning-command-label {
      font-size: 0.8125rem;
      font-weight: 700;
    }

    .runner-warning-command {
      background: color-mix(in oklch, Canvas 86%, CanvasText 14%);
      border: 1px solid color-mix(in oklch, CanvasText 14%, transparent);
      border-radius: 0.5rem;
      display: block;
      overflow-wrap: anywhere;
      padding: 0.55rem 0.65rem;
    }
  `
  document.head.append(style)
}
