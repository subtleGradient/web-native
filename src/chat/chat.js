// @ts-check

const pageStyleId = "web-native-chat-page-styles"
const renderQueued = Symbol("render-queued")

const pageStyles = String.raw`
  :root {
    color-scheme: light dark;
  }

  :root:not([data-theme]) {
    background: Canvas;
    color: CanvasText;
  }

  body {
    background:
      radial-gradient(circle at top left, color-mix(in oklch, Highlight 12%, transparent), transparent 28rem),
      Canvas;
    color: CanvasText;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    line-height: 1.5;
    margin: 0;
  }
`

const transcriptStyles = String.raw`
  :host {
    box-sizing: border-box;
    display: grid;
    gap: clamp(1rem, 2vw, 1.5rem);
    margin-inline: auto;
    max-width: 76rem;
    padding: clamp(1rem, 3vw, 2.5rem);
  }

  .shell {
    display: grid;
    gap: clamp(1rem, 2vw, 1.5rem);
  }

  ::slotted(header) {
    border-bottom: 1px solid color-mix(in oklch, CanvasText 14%, transparent);
    display: grid;
    gap: 0.5rem;
    padding-block-end: clamp(1rem, 2vw, 1.5rem);
  }

  ::slotted(chat-summary),
  ::slotted(chat-message) {
    min-width: 0;
  }
`

const summaryStyles = String.raw`
  :host {
    display: block;
  }

  .summary {
    background: color-mix(in oklch, Canvas 92%, CanvasText 8%);
    border: 1px solid color-mix(in oklch, CanvasText 14%, transparent);
    border-radius: 0.75rem;
    box-sizing: border-box;
    color: color-mix(in oklch, CanvasText 74%, transparent);
    display: grid;
    gap: 0.5rem;
    padding: 0.875rem 1rem;
  }

  .label {
    color: CanvasText;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  p {
    margin: 0;
  }
`

const messageStyles = String.raw`
  :host {
    display: block;
  }

  article {
    border: 1px solid color-mix(in oklch, CanvasText 14%, transparent);
    border-radius: 0.75rem;
    box-sizing: border-box;
    display: grid;
    overflow: clip;
  }

  article[data-role="user"] {
    background: color-mix(in oklch, Canvas 94%, CanvasText 6%);
  }

  article[data-role="assistant"] {
    background: color-mix(in oklch, Canvas 98%, CanvasText 2%);
  }

  article[data-hidden="true"] {
    opacity: 0.7;
  }

  header {
    align-items: center;
    background: color-mix(in oklch, Canvas 88%, CanvasText 12%);
    border-bottom: 1px solid color-mix(in oklch, CanvasText 10%, transparent);
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    padding: 0.625rem 0.75rem;
  }

  .badge,
  .meta {
    align-items: center;
    border-radius: 999px;
    display: inline-flex;
    min-height: 1.5rem;
    white-space: nowrap;
  }

  .badge {
    background: CanvasText;
    color: Canvas;
    font-size: 0.75rem;
    font-weight: 700;
    padding-inline: 0.625rem;
    text-transform: capitalize;
  }

  .meta {
    background: color-mix(in oklch, Canvas 78%, CanvasText 22%);
    color: color-mix(in oklch, CanvasText 70%, transparent);
    font-size: 0.75rem;
    padding-inline: 0.5rem;
  }

  .content {
    color: CanvasText;
    display: grid;
    font-size: 0.9375rem;
    gap: 0.75rem;
    line-height: 1.6;
    overflow-wrap: anywhere;
    padding: clamp(0.875rem, 2vw, 1.25rem);
  }

  .content > :first-child {
    margin-block-start: 0;
  }

  .content > :last-child {
    margin-block-end: 0;
  }

  h1,
  h2,
  h3,
  h4 {
    line-height: 1.2;
    margin: 0.5rem 0 0;
  }

  h1 { font-size: 1.45rem; }
  h2 { font-size: 1.25rem; }
  h3 { font-size: 1.1rem; }
  h4 { font-size: 1rem; }

  p,
  ul,
  ol,
  blockquote,
  pre,
  table {
    margin: 0;
  }

  ul,
  ol {
    padding-inline-start: 1.35rem;
  }

  li + li {
    margin-block-start: 0.25rem;
  }

  blockquote {
    border-inline-start: 0.25rem solid color-mix(in oklch, Highlight 55%, CanvasText 20%);
    color: color-mix(in oklch, CanvasText 72%, transparent);
    padding-inline-start: 0.875rem;
  }

  pre {
    background: color-mix(in oklch, CanvasText 9%, Canvas);
    border: 1px solid color-mix(in oklch, CanvasText 12%, transparent);
    border-radius: 0.5rem;
    color: CanvasText;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    font-size: 0.8125rem;
    line-height: 1.55;
    overflow-x: auto;
    padding: 0.75rem;
    white-space: pre;
  }

  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  }

  p code,
  li code,
  th code,
  td code {
    background: color-mix(in oklch, CanvasText 9%, Canvas);
    border-radius: 0.25rem;
    font-size: 0.875em;
    padding: 0.08rem 0.25rem;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    border-collapse: collapse;
    font-size: 0.875rem;
    min-width: 100%;
  }

  th,
  td {
    border: 1px solid color-mix(in oklch, CanvasText 14%, transparent);
    padding: 0.45rem 0.55rem;
    text-align: start;
    vertical-align: top;
  }

  th {
    background: color-mix(in oklch, Canvas 86%, CanvasText 14%);
    font-weight: 700;
  }

  hr {
    border: 0;
    border-block-start: 1px solid color-mix(in oklch, CanvasText 14%, transparent);
    margin: 0.25rem 0;
  }

  a {
    color: LinkText;
  }
`

export class TopicTranscript extends HTMLElement {
  connectedCallback() {
    installChatTranscriptPageStyles()
    if (this.shadowRoot) return

    const shadow = this.attachShadow({ mode: "open" })
    shadow.innerHTML = String.raw`
      <style>${transcriptStyles}</style>
      <div class="shell">
        <slot></slot>
      </div>
    `
  }
}

export class ChatSummary extends HTMLElement {
  connectedCallback() {
    this.#queueRender()
  }

  /** @type {() => void} */
  #queueRender = () => {
    if (Reflect.get(this, renderQueued)) return
    Reflect.set(this, renderQueued, true)
    requestAnimationFrame(() => {
      Reflect.set(this, renderQueued, false)
      this.#render()
    })
  }

  #render() {
    const text = this.textContent?.trim() ?? ""
    const shadow = this.shadowRoot ?? this.attachShadow({ mode: "open" })
    shadow.innerHTML = String.raw`
      <style>${summaryStyles}</style>
      <aside class="summary">
        <strong class="label">Previous context</strong>
        ${text ? `<p>${renderInline(text)}</p>` : ""}
      </aside>
    `
  }
}

export class ChatMessage extends HTMLElement {
  static observedAttributes = [
    "data-channel",
    "data-content-type",
    "data-created",
    "data-hidden",
    "data-model",
    "data-recipient",
    "data-role",
    "data-source",
    "data-thinking",
    "data-thinking-effort",
    "data-turn",
  ]

  /** @type {MutationObserver | undefined} */
  #observer

  connectedCallback() {
    this.#observer = new MutationObserver(this.#queueRender)
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true })
    this.#queueRender()
  }

  disconnectedCallback() {
    this.#observer?.disconnect()
    this.#observer = undefined
  }

  attributeChangedCallback() {
    this.#queueRender()
  }

  /** @type {() => void} */
  #queueRender = () => {
    if (Reflect.get(this, renderQueued)) return
    Reflect.set(this, renderQueued, true)
    requestAnimationFrame(() => {
      Reflect.set(this, renderQueued, false)
      this.#render()
    })
  }

  #render() {
    const role = this.dataset.role ?? "message"
    const hidden = this.dataset.hidden === "true"
    const source = this.dataset.source
    const body = getRawMessageBody(this)
    const shadow = this.shadowRoot ?? this.attachShadow({ mode: "open" })
    shadow.innerHTML = String.raw`
      <style>${messageStyles}</style>
      <article data-role="${escapeAttribute(role)}" data-hidden="${hidden ? "true" : "false"}">
        <header>
          <strong class="badge">${escapeHtml(role)}</strong>
          ${metaPill("turn", this.dataset.turn)}
          ${metaPill("created", formatCreated(this.dataset.created))}
          ${metaPill("model", this.dataset.model)}
          ${metaPill("channel", this.dataset.channel)}
          ${metaPill("recipient", this.dataset.recipient)}
          ${metaPill("type", this.dataset.contentType)}
          ${hidden ? metaPill("hidden", "true") : ""}
          ${source ? metaPill("source", source) : ""}
        </header>
        <div class="content">${renderMarkdown(body)}</div>
      </article>
    `
  }
}

export function installChatTranscriptPageStyles() {
  if (document.getElementById(pageStyleId)) return

  const style = document.createElement("style")
  style.id = pageStyleId
  style.textContent = pageStyles
  document.head.append(style)
}

/** @param {Element} element */
function getRawMessageBody(element) {
  const pre = element.querySelector("pre")
  if (pre) return pre.textContent ?? ""
  return element.textContent ?? ""
}

/**
 * @param {string} label
 * @param {string | undefined} value
 */
function metaPill(label, value) {
  if (!value) return ""
  return `<span class="meta">${escapeHtml(label)}: ${escapeHtml(value)}</span>`
}

/** @param {string | undefined} value */
function formatCreated(value) {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return value
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

/**
 * @param {string} markdown
 * @returns {string}
 */
export function renderMarkdown(markdown) {
  const blocks = parseBlocks(markdown.replace(/\r\n?/g, "\n").trimEnd())
  if (!blocks.length) return ""
  return blocks.map(renderBlock).join("")
}

/** @param {string} markdown */
function parseBlocks(markdown) {
  const lines = markdown.split("\n")
  /** @type {{ type: string, lines: string[], language?: string }[]} */
  const blocks = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) {
      index += 1
      continue
    }

    const fence = line.match(/^```([A-Za-z0-9_-]+)?\s*$/)
    if (fence) {
      const codeLines = []
      index += 1
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        codeLines.push(lines[index])
        index += 1
      }
      if (index < lines.length) index += 1
      blocks.push({ type: "code", language: fence[1], lines: codeLines })
      continue
    }

    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
      blocks.push({ type: "hr", lines: [] })
      index += 1
      continue
    }

    if (isTableStart(lines, index)) {
      const tableLines = []
      while (index < lines.length && isTableLine(lines[index])) {
        tableLines.push(lines[index])
        index += 1
      }
      blocks.push({ type: "table", lines: tableLines })
      continue
    }

    if (/^#{1,4}\s+/.test(line)) {
      blocks.push({ type: "heading", lines: [line] })
      index += 1
      continue
    }

    if (/^>\s?/.test(line)) {
      const quoteLines = []
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""))
        index += 1
      }
      blocks.push({ type: "blockquote", lines: quoteLines })
      continue
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const listLines = []
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) {
        listLines.push(lines[index].replace(/^\s*[-*+]\s+/, ""))
        index += 1
      }
      blocks.push({ type: "ul", lines: listLines })
      continue
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const listLines = []
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) {
        listLines.push(lines[index].replace(/^\s*\d+[.)]\s+/, ""))
        index += 1
      }
      blocks.push({ type: "ol", lines: listLines })
      continue
    }

    const paragraph = []
    while (index < lines.length && lines[index].trim()) {
      if (paragraph.length && startsNewBlock(lines, index)) break
      paragraph.push(lines[index])
      index += 1
    }
    blocks.push({ type: "paragraph", lines: paragraph })
  }

  return blocks
}

/**
 * @param {string[]} lines
 * @param {number} index
 */
function startsNewBlock(lines, index) {
  return /^```/.test(lines[index])
    || /^#{1,4}\s+/.test(lines[index])
    || /^>\s?/.test(lines[index])
    || /^\s*[-*+]\s+/.test(lines[index])
    || /^\s*\d+[.)]\s+/.test(lines[index])
    || isTableStart(lines, index)
    || /^(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[index].trim())
}

/**
 * @param {{ type: string, lines: string[], language?: string }} block
 * @returns {string}
 */
function renderBlock(block) {
  if (block.type === "code") {
    const language = block.language ? ` data-language="${escapeAttribute(block.language)}"` : ""
    return `<pre${language}><code>${escapeHtml(block.lines.join("\n"))}</code></pre>`
  }

  if (block.type === "hr") return "<hr>"

  if (block.type === "heading") {
    const match = block.lines[0].match(/^(#{1,4})\s+(.+)$/)
    const level = Math.min(match?.[1].length ?? 2, 4)
    return `<h${level}>${renderInline(match?.[2] ?? block.lines[0])}</h${level}>`
  }

  if (block.type === "blockquote") {
    return `<blockquote>${renderMarkdown(block.lines.join("\n"))}</blockquote>`
  }

  if (block.type === "ul" || block.type === "ol") {
    const tag = block.type
    const items = block.lines.map((line) => `<li>${renderInline(line)}</li>`).join("")
    return `<${tag}>${items}</${tag}>`
  }

  if (block.type === "table") {
    return renderTable(block.lines)
  }

  return `<p>${renderInline(block.lines.join(" "))}</p>`
}

/**
 * @param {string[]} lines
 * @param {number} index
 */
function isTableStart(lines, index) {
  return isTableLine(lines[index])
    && index + 1 < lines.length
    && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1])
}

/** @param {string} line */
function isTableLine(line) {
  return line.includes("|") && line.trim().length > 0
}

/** @param {string[]} lines */
function renderTable(lines) {
  const [headerLine, , ...bodyLines] = lines
  const headers = splitTableRow(headerLine)
  const body = bodyLines.map(splitTableRow)
  return String.raw`
    <section class="table-wrap">
      <table>
        <thead><tr>${headers.map((cell) => `<th>${renderInline(cell)}</th>`).join("")}</tr></thead>
        <tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </section>
  `
}

/** @param {string} line */
function splitTableRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim())
}

/** @param {string} text */
function renderInline(text) {
  let html = escapeHtml(text)
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>")
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>")
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" rel="noreferrer" target="_blank">$1</a>')
  html = html.replace(/(^|[\s(])(https?:\/\/[^\s)<]+)/g, '$1<a href="$2" rel="noreferrer" target="_blank">$2</a>')
  return html
}

/** @param {string} text */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

/** @param {string} text */
function escapeAttribute(text) {
  return escapeHtml(text).replace(/"/g, "&quot;")
}

/** @param {string} [topicName] */
export function defineTopicTranscript(topicName = "topic-transcript") {
  if (!customElements.get(topicName)) {
    customElements.define(topicName, TopicTranscript)
  }
}

/** @param {string} [summaryName] */
export function defineChatSummary(summaryName = "chat-summary") {
  if (!customElements.get(summaryName)) {
    customElements.define(summaryName, ChatSummary)
  }
}

/** @param {string} [messageName] */
export function defineChatMessage(messageName = "chat-message") {
  if (!customElements.get(messageName)) {
    customElements.define(messageName, ChatMessage)
  }
}

export function defineChatTranscriptElements() {
  defineTopicTranscript()
  defineChatSummary()
  defineChatMessage()
}
