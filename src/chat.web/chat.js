// @ts-check

const pageStyleId = "web-native-chat-page-styles"
const renderQueued = Symbol("render-queued")

/** @typedef {{ omitMessageId?: string }} ChatSourceSerializeOptions */

const pageStyles = String.raw`
  :root {
    color-scheme: light dark;
  }

  :root:not([data-theme]) {
    background: Canvas;
    color: CanvasText;
  }

  body {
    background: color-mix(in oklch, Canvas 96%, CanvasText 4%);
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
    inline-size: 100%;
    margin: 0;
    max-inline-size: none;
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
  ::slotted(chat-message),
  ::slotted(chat-file-reference) {
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

  .summary-header {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: space-between;
  }

  .label {
    color: CanvasText;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .previous-link {
    align-items: center;
    background: color-mix(in oklch, Highlight 11%, Canvas);
    border: 1px solid color-mix(in oklch, Highlight 28%, transparent);
    border-radius: 999px;
    color: LinkText;
    display: inline-flex;
    font-size: 0.78rem;
    font-weight: 650;
    line-height: 1.2;
    padding: 0.28rem 0.55rem;
    text-decoration: none;
  }

  .previous-link:hover {
    text-decoration: underline;
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
    box-sizing: border-box;
    display: grid;
    gap: 0.625rem;
    grid-template-columns: minmax(7rem, 11rem) minmax(0, 1fr);
    padding-block: 0.25rem;
  }

  article[data-kind="tool"] {
    grid-template-columns: minmax(0, 1fr);
    padding-inline-start: clamp(0.75rem, 1.6vw, 1.5rem);
  }

  article[data-hidden="true"] {
    opacity: 0.66;
  }

  .message-header {
    align-self: start;
    color: color-mix(in oklch, CanvasText 58%, transparent);
    display: grid;
    gap: 0.2rem;
    justify-items: end;
    padding-block-start: 0.55rem;
    text-align: end;
  }

  .speaker {
    color: CanvasText;
    font-size: 0.8125rem;
    font-weight: 750;
    line-height: 1.2;
  }

  .time,
  .context {
    font-size: 0.72rem;
    line-height: 1.25;
  }

  .context {
    color: color-mix(in oklch, CanvasText 48%, transparent);
  }

  .content {
    background: color-mix(in oklch, Canvas 98%, CanvasText 2%);
    border: 1px solid color-mix(in oklch, CanvasText 11%, transparent);
    border-radius: 0.65rem;
    box-shadow: 0 1px 2px color-mix(in oklch, CanvasText 7%, transparent);
    color: CanvasText;
    display: grid;
    font-size: 0.9375rem;
    gap: 0.75rem;
    line-height: 1.6;
    min-width: 0;
    overflow-wrap: anywhere;
    padding: clamp(0.875rem, 1.7vw, 1.25rem);
  }

  article[data-kind="user"] .content {
    background: color-mix(in oklch, Highlight 10%, Canvas);
    border-color: color-mix(in oklch, Highlight 24%, CanvasText 8%);
  }

  article[data-kind="assistant"] .content {
    border-inline-start: 0.25rem solid color-mix(in oklch, CanvasText 32%, transparent);
  }

  article[data-editable="true"] {
    position: relative;
  }

  .message-actions {
    display: flex;
    gap: 0.3rem;
    inset-block-start: 0.35rem;
    inset-inline-end: 0.35rem;
    margin: 0;
    opacity: 0;
    padding: 0;
    position: absolute;
    transition: opacity 120ms ease;
  }

  article[data-editable="true"]:hover .message-actions,
  .message-actions:focus-within {
    opacity: 1;
  }

  .message-actions button {
    background: color-mix(in oklch, Canvas 88%, CanvasText 12%);
    border: 1px solid color-mix(in oklch, CanvasText 14%, transparent);
    border-radius: 0.4rem;
    color: CanvasText;
    cursor: pointer;
    font: inherit;
    font-size: 0.72rem;
    font-weight: 650;
    line-height: 1;
    padding: 0.32rem 0.45rem;
  }

  .message-actions button:hover {
    background: color-mix(in oklch, Highlight 14%, Canvas);
  }

  .tool-event {
    background: color-mix(in oklch, Canvas 94%, CanvasText 6%);
    border: 1px solid color-mix(in oklch, CanvasText 12%, transparent);
    border-radius: 0.65rem;
    display: grid;
    gap: 0.75rem;
    padding: 0.75rem;
  }

  .tool-header {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .event-dot {
    background: color-mix(in oklch, Highlight 65%, CanvasText 20%);
    border-radius: 999px;
    block-size: 0.5rem;
    inline-size: 0.5rem;
  }

  .tool-name {
    color: CanvasText;
    font-size: 0.8125rem;
    font-weight: 750;
  }

  .tool-status,
  .tool-chip {
    align-items: center;
    background: color-mix(in oklch, Canvas 82%, CanvasText 18%);
    border-radius: 999px;
    color: color-mix(in oklch, CanvasText 66%, transparent);
    display: inline-flex;
    font-size: 0.72rem;
    min-height: 1.35rem;
    padding-inline: 0.45rem;
    white-space: nowrap;
  }

  .tool-body {
    display: grid;
    gap: 0.625rem;
  }

  .tool-section {
    background: color-mix(in oklch, Canvas 97%, CanvasText 3%);
    border: 1px solid color-mix(in oklch, CanvasText 10%, transparent);
    border-radius: 0.5rem;
    display: grid;
    gap: 0.45rem;
    padding: 0.65rem;
  }

  .tool-section-title {
    color: color-mix(in oklch, CanvasText 62%, transparent);
    font-size: 0.72rem;
    font-weight: 760;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .tool-list {
    display: grid;
    gap: 0.4rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .tool-item {
    display: grid;
    gap: 0.15rem;
  }

  .tool-item-main {
    color: CanvasText;
    font-size: 0.9rem;
    line-height: 1.35;
  }

  .tool-item-meta {
    color: color-mix(in oklch, CanvasText 55%, transparent);
    font-size: 0.76rem;
    line-height: 1.3;
  }

  .tool-fields {
    display: grid;
    gap: 0.35rem;
    grid-template-columns: repeat(auto-fit, minmax(min(12rem, 100%), 1fr));
  }

  .tool-field {
    background: color-mix(in oklch, Canvas 94%, CanvasText 6%);
    border-radius: 0.4rem;
    display: grid;
    gap: 0.1rem;
    padding: 0.45rem 0.5rem;
  }

  .tool-key {
    color: color-mix(in oklch, CanvasText 52%, transparent);
    font-size: 0.68rem;
    font-weight: 760;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .tool-value {
    color: CanvasText;
    font-size: 0.86rem;
    overflow-wrap: anywhere;
  }

  .tool-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
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

  .citation {
    display: inline-flex;
    flex-wrap: wrap;
    font-style: normal;
    gap: 0.125rem;
    margin-inline: 0.1rem;
    vertical-align: 0.12em;
  }

  .citation-ref {
    align-items: center;
    background: color-mix(in oklch, Highlight 16%, Canvas);
    border: 1px solid color-mix(in oklch, Highlight 42%, transparent);
    border-radius: 999px;
    color: LinkText;
    display: inline-flex;
    font-size: 0.72em;
    font-weight: 700;
    justify-content: center;
    line-height: 1;
    min-width: 1.15rem;
    padding: 0.18rem 0.34rem;
  }

  @media (max-width: 48rem) {
    article {
      grid-template-columns: minmax(0, 1fr);
    }

    .message-header {
      justify-items: start;
      padding-block-start: 0;
      text-align: start;
    }
  }
`

const fileReferenceStyles = String.raw`
  :host {
    display: block;
  }

  .file {
    background: color-mix(in oklch, Canvas 96%, CanvasText 4%);
    border: 1px solid color-mix(in oklch, CanvasText 13%, transparent);
    border-radius: 0.5rem;
    color: CanvasText;
    display: grid;
    gap: 0.35rem;
    padding: 0.7rem 0.8rem;
  }

  .top {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    justify-content: space-between;
  }

  a {
    color: LinkText;
    font-weight: 700;
    overflow-wrap: anywhere;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  .badge {
    background: color-mix(in oklch, Highlight 12%, Canvas);
    border: 1px solid color-mix(in oklch, Highlight 25%, transparent);
    border-radius: 999px;
    color: color-mix(in oklch, CanvasText 70%, transparent);
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.16rem 0.45rem;
  }

  code {
    color: color-mix(in oklch, CanvasText 62%, transparent);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.76rem;
    overflow-wrap: anywhere;
  }

  .meta {
    color: color-mix(in oklch, CanvasText 56%, transparent);
    display: flex;
    flex-wrap: wrap;
    font-size: 0.76rem;
    gap: 0.45rem;
  }
`

const composerStyles = String.raw`
  :host {
    display: block;
  }

  form {
    background: Canvas;
    border-top: 1px solid color-mix(in oklch, CanvasText 14%, transparent);
    display: grid;
    gap: 0.75rem;
    padding: clamp(0.9rem, 2vw, 1.25rem);
  }

  textarea {
    background: color-mix(in oklch, Canvas 98%, CanvasText 2%);
    border: 1px solid color-mix(in oklch, CanvasText 14%, transparent);
    border-radius: 0.65rem;
    box-sizing: border-box;
    color: CanvasText;
    font: inherit;
    min-block-size: 5.5rem;
    padding: 0.85rem;
    resize: vertical;
    width: 100%;
  }

  .row {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: space-between;
  }

  .status {
    color: color-mix(in oklch, CanvasText 58%, transparent);
    font-size: 0.82rem;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  button {
    background: color-mix(in oklch, Canvas 92%, CanvasText 8%);
    border: 1px solid color-mix(in oklch, CanvasText 14%, transparent);
    border-radius: 0.5rem;
    color: CanvasText;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    padding: 0.55rem 0.85rem;
  }

  button[data-primary] {
    background: LinkText;
    border-color: LinkText;
    color: Canvas;
  }

  button:disabled,
  textarea:disabled {
    cursor: wait;
    opacity: 0.58;
  }
`

const editorStyles = String.raw`
  :host {
    display: contents;
  }

  dialog {
    background: Canvas;
    border: 1px solid color-mix(in oklch, CanvasText 18%, transparent);
    border-radius: 0.75rem;
    color: CanvasText;
    max-inline-size: min(42rem, calc(100vw - 2rem));
    padding: 0;
    width: 42rem;
  }

  dialog::backdrop {
    background: color-mix(in oklch, CanvasText 24%, transparent);
  }

  form {
    display: grid;
    gap: 0.85rem;
    padding: 1rem;
  }

  h2 {
    font-size: 1rem;
    margin: 0;
  }

  textarea {
    background: color-mix(in oklch, Canvas 98%, CanvasText 2%);
    border: 1px solid color-mix(in oklch, CanvasText 14%, transparent);
    border-radius: 0.65rem;
    box-sizing: border-box;
    color: CanvasText;
    font: inherit;
    min-block-size: 13rem;
    padding: 0.85rem;
    width: 100%;
  }

  .row {
    align-items: center;
    display: flex;
    gap: 0.5rem;
    justify-content: end;
  }

  button {
    background: color-mix(in oklch, Canvas 92%, CanvasText 8%);
    border: 1px solid color-mix(in oklch, CanvasText 14%, transparent);
    border-radius: 0.5rem;
    color: CanvasText;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    padding: 0.55rem 0.85rem;
  }

  button[data-primary] {
    background: LinkText;
    border-color: LinkText;
    color: Canvas;
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

  messages() {
    return chatMessageChildren(this)
  }

  normalize() {
    normalizeTranscriptElement(this)
    return this
  }

  /** @param {ChatSourceSerializeOptions} [options] */
  serializeSource(options = {}) {
    this.normalize()
    const clone = this.cloneNode(true)
    if (!(clone instanceof HTMLElement)) throw new Error("Could not clone chat transcript.")
    if (options.omitMessageId) removeMessageFromTranscriptElement(clone, options.omitMessageId)
    normalizeTranscriptElement(clone)
    clone.querySelectorAll("[data-ephemeral]").forEach((element) => element.remove())
    clone.querySelectorAll("chat-file-reference").forEach((element) => {
      element.removeAttribute("data-status")
      element.removeAttribute("data-current-bytes")
      element.removeAttribute("data-current-sha256")
    })
    clone.querySelectorAll("chat-message").forEach((element) => {
      element.removeAttribute("data-streaming")
    })
    return clone.outerHTML
  }

  /**
   * @param {{ role?: string, text?: string, attrs?: Record<string, string | undefined> }} [options]
   */
  appendMessage(options = {}) {
    const role = options.role ?? "user"
    const message = document.createElement("chat-message")
    message.id = options.attrs?.id ?? nextMessageId()
    message.dataset.role = role
    message.dataset.created = new Date().toISOString()
    for (const [name, value] of Object.entries(options.attrs ?? {})) {
      if (value !== undefined && name !== "id") message.setAttribute(name, value)
    }
    const pre = document.createElement("pre")
    pre.textContent = options.text ?? ""
    message.append(pre)
    this.append(message)
    this.normalize()
    message.scrollIntoView({ block: "nearest" })
    this.#dispatchChange("append", message)
    return message
  }

  /** @param {string | Element} target */
  deleteMessage(target) {
    const message = this.messageElement(target)
    if (!message) return false
    const id = message.id
    for (const reference of Array.from(this.querySelectorAll("chat-file-reference"))) {
      if (reference.getAttribute("data-for") === id) reference.remove()
    }
    message.remove()
    this.normalize()
    this.#dispatchChange("delete", message)
    return true
  }

  /** @param {string | Element} target */
  messageText(target) {
    const message = this.messageElement(target)
    return message?.querySelector("pre")?.textContent ?? ""
  }

  /**
   * @param {string | Element} target
   * @param {string} text
   */
  setMessageText(target, text) {
    const message = this.messageElement(target)
    if (!message) return false
    let pre = message.querySelector("pre")
    if (!pre) {
      pre = document.createElement("pre")
      message.replaceChildren(pre)
    }
    pre.textContent = text
    this.#dispatchChange("edit", message)
    return true
  }

  /** @param {string | Element} target */
  messageElement(target) {
    if (target instanceof Element) {
      return target.localName === "chat-message" && target.parentElement === this
        ? target
        : null
    }
    const element = document.getElementById(target)
    return element?.localName === "chat-message" && element.parentElement === this
      ? element
      : null
  }

  /**
   * @param {string} action
   * @param {Element} message
   */
  #dispatchChange(action, message) {
    this.dispatchEvent(new CustomEvent("chat-transcript-change", {
      bubbles: true,
      composed: true,
      detail: { action, message },
    }))
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
    const previousHref = this.dataset.previousHref
    const previousTitle = this.dataset.previousTitle ?? "Previous topic"
    const shadow = this.shadowRoot ?? this.attachShadow({ mode: "open" })
    shadow.innerHTML = String.raw`
      <style>${summaryStyles}</style>
      <section class="summary" aria-label="Previous context">
        <header class="summary-header">
          <strong class="label">Previous context</strong>
          ${previousHref ? `<a class="previous-link" href="${escapeAttribute(previousHref)}">Back to ${escapeHtml(previousTitle)}</a>` : ""}
        </header>
        ${text ? `<p>${renderInline(text)}</p>` : ""}
      </section>
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
    const kind = this.dataset.recipient ? "tool" : role === "user" ? "user" : "assistant"
    const body = getRawMessageBody(this)
    const editable = isMessageEditable(this)
    const shadow = this.shadowRoot ?? this.attachShadow({ mode: "open" })
    shadow.innerHTML = String.raw`
      <style>${messageStyles}</style>
      <article data-kind="${escapeAttribute(kind)}" data-role="${escapeAttribute(role)}" data-hidden="${hidden ? "true" : "false"}" data-editable="${editable ? "true" : "false"}">
        ${kind === "tool"
          ? renderToolEvent(this, body)
          : `${renderMessageHeader(this, kind)}<section class="content">${renderMarkdown(body)}</section>`}
        ${editable ? renderMessageActions() : ""}
      </article>
    `
    shadow.querySelector("[data-chat-action='edit']")?.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("chat-message-edit-request", {
        bubbles: true,
        composed: true,
        detail: { id: ensureMessageId(this), message: this },
      }))
    })
    shadow.querySelector("[data-chat-action='delete']")?.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("chat-message-delete-request", {
        bubbles: true,
        composed: true,
        detail: { id: ensureMessageId(this), message: this },
      }))
    })
  }
}

export class ChatFileReference extends HTMLElement {
  static observedAttributes = [
    "data-current-bytes",
    "data-current-sha256",
    "data-mime",
    "data-path",
    "data-status",
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
    const filePath = this.dataset.path ?? ""
    const label = this.textContent?.trim() || filePath
    const status = this.dataset.status ?? "unchecked"
    const bytes = this.dataset.currentBytes
    const hash = this.dataset.currentSha256
    const shadow = this.shadowRoot ?? this.attachShadow({ mode: "open" })
    shadow.innerHTML = String.raw`
      <style>${fileReferenceStyles}</style>
      <section class="file" aria-label="Referenced file">
        <div class="top">
          <a href="${escapeAttribute(filePath)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>
          <span class="badge">${escapeHtml(status)}</span>
        </div>
        <code>${escapeHtml(filePath)}</code>
        <div class="meta">
          <span>${escapeHtml(this.dataset.mime ?? "file")}</span>
          ${bytes ? `<span>${escapeHtml(formatBytes(Number(bytes)))}</span>` : ""}
          ${hash ? `<span>${escapeHtml(hash.slice(0, 12))}</span>` : ""}
        </div>
      </section>
    `
  }
}

export class ChatComposer extends HTMLElement {
  static observedAttributes = ["busy", "placeholder", "status"]

  connectedCallback() {
    if (!this.shadowRoot) {
      const shadow = this.attachShadow({ mode: "open" })
      shadow.innerHTML = String.raw`
        <style>${composerStyles}</style>
        <form>
          <textarea name="message"></textarea>
          <div class="row">
            <span class="status" role="status"></span>
            <span class="actions">
              <button type="button" data-save>Save</button>
              <button type="submit" data-primary>Send</button>
            </span>
          </div>
        </form>
      `
      shadow.querySelector("form")?.addEventListener("submit", (event) => {
        event.preventDefault()
        this.#submit(true)
      })
      shadow.querySelector("[data-save]")?.addEventListener("click", () => this.#submit(false))
      shadow.querySelector("textarea")?.addEventListener("keydown", (event) => {
        if (!(event instanceof KeyboardEvent)) return
        if (event.key !== "Enter") return
        if (!event.metaKey && !event.ctrlKey) return
        event.preventDefault()
        this.#submit(!event.altKey)
      })
    }
    this.#sync()
  }

  attributeChangedCallback() {
    this.#sync()
  }

  get busy() {
    return this.hasAttribute("busy")
  }

  /** @param {boolean} value */
  set busy(value) {
    this.toggleAttribute("busy", value)
  }

  get status() {
    return this.getAttribute("status") ?? ""
  }

  /** @param {string} value */
  set status(value) {
    this.setAttribute("status", value)
  }

  /** @returns {HTMLTextAreaElement | null} */
  get textarea() {
    return /** @type {HTMLTextAreaElement | null} */ (this.shadowRoot?.querySelector("textarea") ?? null)
  }

  #sync() {
    const textarea = this.textarea
    const status = this.shadowRoot?.querySelector(".status")
    const disabled = this.busy
    if (textarea) {
      textarea.placeholder = this.getAttribute("placeholder") ?? "Add a message"
      textarea.toggleAttribute("disabled", disabled)
    }
    if (status) status.textContent = this.status
    this.shadowRoot?.querySelectorAll("button").forEach((button) => {
      button.toggleAttribute("disabled", disabled)
    })
  }

  /** @param {boolean} send */
  #submit(send) {
    const textarea = this.textarea
    if (!(textarea instanceof HTMLTextAreaElement)) return
    const text = textarea.value.trim()
    if (!text) return
    const event = new CustomEvent("chat-composer-submit", {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: { send, text },
    })
    if (this.dispatchEvent(event)) textarea.value = ""
  }
}

export class ChatMessageEditor extends HTMLElement {
  #messageId = ""

  connectedCallback() {
    if (!this.shadowRoot) {
      const shadow = this.attachShadow({ mode: "open" })
      shadow.innerHTML = String.raw`
        <style>${editorStyles}</style>
        <dialog>
          <form method="dialog">
            <h2>Edit message</h2>
            <textarea name="message"></textarea>
            <div class="row">
              <button type="button" data-cancel>Cancel</button>
              <button type="submit" data-primary>Save</button>
            </div>
          </form>
        </dialog>
      `
      shadow.querySelector("form")?.addEventListener("submit", (event) => {
        event.preventDefault()
        this.#save()
      })
      shadow.querySelector("[data-cancel]")?.addEventListener("click", () => this.close())
    }
  }

  /**
   * @param {Element} message
   * @param {string} text
   */
  edit(message, text = message.querySelector("pre")?.textContent ?? "") {
    this.#messageId = ensureMessageId(message)
    const textarea = this.shadowRoot?.querySelector("textarea")
    const dialog = this.shadowRoot?.querySelector("dialog")
    if (textarea instanceof HTMLTextAreaElement) textarea.value = text
    if (dialog instanceof HTMLDialogElement) {
      dialog.showModal()
      textarea instanceof HTMLTextAreaElement && textarea.focus()
    }
  }

  close() {
    const dialog = this.shadowRoot?.querySelector("dialog")
    if (dialog instanceof HTMLDialogElement) dialog.close()
  }

  #save() {
    const textarea = this.shadowRoot?.querySelector("textarea")
    const text = textarea instanceof HTMLTextAreaElement ? textarea.value : ""
    const id = this.#messageId
    this.close()
    this.dispatchEvent(new CustomEvent("chat-editor-save", {
      bubbles: true,
      composed: true,
      detail: { id, text },
    }))
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
 * @param {HTMLElement} element
 * @param {string} kind
 */
function renderMessageHeader(element, kind) {
  const created = formatCreated(element.dataset.created)
  const context = messageContext(element)
  return String.raw`
    <header class="message-header">
      <strong class="speaker">${escapeHtml(displaySpeaker(kind))}</strong>
      ${created ? `<time class="time" datetime="${escapeAttribute(element.dataset.created ?? "")}">${escapeHtml(created)}</time>` : ""}
      ${context ? `<span class="context">${escapeHtml(context)}</span>` : ""}
    </header>
  `
}

/** @param {string} kind */
function displaySpeaker(kind) {
  if (kind === "user") return "You"
  if (kind === "assistant") return "Assistant"
  return titleCase(kind)
}

/** @param {HTMLElement} element */
function messageContext(element) {
  if (element.dataset.hidden === "true") return "hidden"
  if (element.dataset.thinking === "true") return "working note"
  if (element.dataset.channel && element.dataset.channel !== "final") return element.dataset.channel
  return undefined
}

/** @param {Element} element */
function isMessageEditable(element) {
  return Boolean(element.closest("topic-transcript")?.hasAttribute("editable"))
}

function renderMessageActions() {
  return String.raw`
    <menu class="message-actions" aria-label="Message actions">
      <button type="button" data-chat-action="edit">Edit</button>
      <button type="button" data-chat-action="delete">Delete</button>
    </menu>
  `
}

/**
 * @param {HTMLElement} element
 * @param {string} body
 */
function renderToolEvent(element, body) {
  const recipient = element.dataset.recipient ?? "tool"
  const created = formatCreated(element.dataset.created)
  const parsed = parseJson(body)

  return String.raw`
    <section class="tool-event" aria-label="${escapeAttribute(`${recipient} event`)}">
      <header class="tool-header">
        <span class="event-dot" aria-hidden="true"></span>
        <strong class="tool-name">${escapeHtml(recipient)}</strong>
        <span class="tool-status">${escapeHtml(toolStatus(element))}</span>
        ${created ? `<time class="time" datetime="${escapeAttribute(element.dataset.created ?? "")}">${escapeHtml(created)}</time>` : ""}
      </header>
      <section class="tool-body">
        ${parsed.ok ? renderToolPayload(parsed.value) : renderUnknownToolPayload(body)}
      </section>
    </section>
  `
}

/** @param {HTMLElement} element */
function toolStatus(element) {
  if (element.dataset.contentType === "code") return "request"
  return element.dataset.contentType ?? "event"
}

/** @param {string} body */
function parseJson(body) {
  try {
    return { ok: true, value: JSON.parse(body) }
  } catch {
    return { ok: false, value: undefined }
  }
}

/** @param {unknown} value */
function renderToolPayload(value) {
  if (Array.isArray(value)) {
    return renderToolSection("items", value)
  }

  if (!isRecord(value)) {
    return renderToolFields({ value })
  }

  const entries = Object.entries(value)
  const chips = entries
    .filter((entry) => isToolOption(entry[0]))
    .map(([key, option]) => `<span class="tool-chip">${escapeHtml(formatToolKey(key))}: ${escapeHtml(formatToolValue(option))}</span>`)
    .join("")
  const sections = entries
    .filter((entry) => !isToolOption(entry[0]))
    .map(([key, sectionValue]) => renderToolSection(key, sectionValue))
    .join("")

  return `${chips ? `<section class="tool-chips">${chips}</section>` : ""}${sections || renderToolFields(value)}`
}

/**
 * @param {string} key
 * @param {unknown} value
 */
function renderToolSection(key, value) {
  if (Array.isArray(value)) {
    const items = value.map((item) => renderToolItem(key, item)).join("")
    return String.raw`
      <section class="tool-section">
        <strong class="tool-section-title">${escapeHtml(formatToolKey(key))}</strong>
        <ul class="tool-list">${items}</ul>
      </section>
    `
  }

  if (isRecord(value)) {
    return String.raw`
      <section class="tool-section">
        <strong class="tool-section-title">${escapeHtml(formatToolKey(key))}</strong>
        ${renderToolFields(value)}
      </section>
    `
  }

  return String.raw`
    <section class="tool-section">
      <strong class="tool-section-title">${escapeHtml(formatToolKey(key))}</strong>
      <div class="tool-item-main">${escapeHtml(formatToolValue(value))}</div>
    </section>
  `
}

/**
 * @param {string} sectionKey
 * @param {unknown} item
 */
function renderToolItem(sectionKey, item) {
  if (!isRecord(item)) {
    return `<li class="tool-item"><span class="tool-item-main">${escapeHtml(formatToolValue(item))}</span></li>`
  }

  const summary = summarizeToolItem(sectionKey, item)
  return String.raw`
    <li class="tool-item">
      <span class="tool-item-main">${escapeHtml(summary.main)}</span>
      ${summary.meta ? `<span class="tool-item-meta">${escapeHtml(summary.meta)}</span>` : ""}
    </li>
  `
}

/**
 * @param {string} sectionKey
 * @param {Record<string, unknown>} item
 */
function summarizeToolItem(sectionKey, item) {
  if ((sectionKey === "search_query" || sectionKey === "image_query") && typeof item.q === "string") {
    return { main: item.q, meta: joinToolMeta(item, ["q"]) }
  }

  if (sectionKey === "open" && typeof item.ref_id === "string") {
    return { main: `Open ${item.ref_id}`, meta: joinToolMeta(item, ["ref_id"]) }
  }

  if (sectionKey === "find") {
    const pattern = typeof item.pattern === "string" ? `"${item.pattern}"` : "text"
    const target = typeof item.ref_id === "string" ? ` in ${item.ref_id}` : ""
    return { main: `Find ${pattern}${target}`, meta: joinToolMeta(item, ["pattern", "ref_id"]) }
  }

  if (sectionKey === "click") {
    const id = typeof item.id === "number" || typeof item.id === "string" ? ` ${item.id}` : ""
    const target = typeof item.ref_id === "string" ? ` in ${item.ref_id}` : ""
    return { main: `Click${id}${target}`, meta: joinToolMeta(item, ["id", "ref_id"]) }
  }

  if (sectionKey === "finance" && typeof item.ticker === "string") {
    return { main: item.ticker, meta: joinToolMeta(item, ["ticker"]) }
  }

  if (sectionKey === "weather" && typeof item.location === "string") {
    return { main: item.location, meta: joinToolMeta(item, ["location"]) }
  }

  if (sectionKey === "sports") {
    const main = [item.league, item.fn].filter((part) => typeof part === "string").join(" ")
    return { main: main || summarizeObject(item), meta: joinToolMeta(item, ["league", "fn"]) }
  }

  if (sectionKey === "time" && typeof item.utc_offset === "string") {
    return { main: item.utc_offset, meta: joinToolMeta(item, ["utc_offset"]) }
  }

  const preferredKey = ["q", "query", "url", "location", "ticker", "ref_id", "pattern", "name"].find((key) => typeof item[key] === "string")
  if (preferredKey) {
    return { main: String(item[preferredKey]), meta: joinToolMeta(item, [preferredKey]) }
  }

  return { main: summarizeObject(item), meta: "" }
}

/** @param {Record<string, unknown>} fields */
function renderToolFields(fields) {
  return String.raw`
    <dl class="tool-fields">
      ${Object.entries(fields).map(([key, value]) => String.raw`
        <div class="tool-field">
          <dt class="tool-key">${escapeHtml(formatToolKey(key))}</dt>
          <dd class="tool-value">${escapeHtml(formatToolValue(value))}</dd>
        </div>
      `).join("")}
    </dl>
  `
}

/**
 * @param {Record<string, unknown>} item
 * @param {string[]} omit
 */
function joinToolMeta(item, omit) {
  return Object.entries(item)
    .filter(([key, value]) => !omit.includes(key) && value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${formatToolKey(key)}: ${formatToolValue(value)}`)
    .join(" · ")
}

/** @param {string} body */
function renderUnknownToolPayload(body) {
  return String.raw`
    <section class="tool-section">
      <strong class="tool-section-title">Payload</strong>
      <div class="tool-item-main">${renderInline(body.trim())}</div>
    </section>
  `
}

/** @param {string} key */
function isToolOption(key) {
  return ["response_length", "recency", "locale"].includes(key)
}

/** @param {string} key */
function formatToolKey(key) {
  return titleCase(key.replace(/_/g, " "))
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function formatToolValue(value) {
  if (value === null) return "null"
  if (value === undefined) return ""
  if (Array.isArray(value)) return value.map(formatToolValue).filter(Boolean).join(", ")
  if (isRecord(value)) return summarizeObject(value)
  return String(value)
}

/**
 * @param {Record<string, unknown>} value
 * @returns {string}
 */
function summarizeObject(value) {
  return Object.entries(value)
    .map(([key, item]) => `${formatToolKey(key)}: ${formatToolValue(item)}`)
    .join(" · ")
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

/** @param {string} text */
function titleCase(text) {
  return text.replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
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
  /** @type {string[]} */
  const placeholders = []
  html = html.replace(/`([^`]+)`/g, (_, code) => stashInlineHtml(placeholders, `<code>${code}</code>`))
  html = html.replace(/\uE200cite(?:\uE202[^\uE201\uE202]+)+\uE201/g, renderCitation)
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>")
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" rel="noreferrer" target="_blank">$1</a>')
  html = html.replace(/(^|[\s(])(https?:\/\/[^\s)<]+)/g, '$1<a href="$2" rel="noreferrer" target="_blank">$2</a>')
  html = restoreInlineHtml(html, placeholders)
  return html
}

/**
 * @param {string[]} placeholders
 * @param {string} html
 */
function stashInlineHtml(placeholders, html) {
  const index = placeholders.push(html) - 1
  return `\uE000${index}\uE001`
}

/**
 * @param {string} html
 * @param {string[]} placeholders
 */
function restoreInlineHtml(html, placeholders) {
  return html.replace(/\uE000(\d+)\uE001/g, (_, index) => placeholders[Number(index)] ?? "")
}

/** @param {string} citation */
function renderCitation(citation) {
  const refs = citation
    .slice("\uE200cite".length, -"\uE201".length)
    .split("\uE202")
    .filter(Boolean)

  if (!refs.length) return ""

  const label = `Citations: ${refs.join(", ")}`
  const renderedRefs = refs.map((ref) => {
    const visible = formatCitationRef(ref)
    return `<span class="citation-ref" title="${escapeAttribute(ref)}">${escapeHtml(visible)}</span>`
  }).join("")

  return `<cite class="citation" data-citation-refs="${escapeAttribute(refs.join(" "))}" aria-label="${escapeAttribute(label)}">${renderedRefs}</cite>`
}

/** @param {string} ref */
function formatCitationRef(ref) {
  return ref.match(/(?:search|source|result|view|fetch|open)(\d+)$/i)?.[1]
    ?? ref.match(/(\d+)$/)?.[1]
    ?? ref
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

/** @param {number} value */
function formatBytes(value) {
  if (!Number.isFinite(value)) return ""
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

/** @param {Element} element */
function chatMessageChildren(element) {
  return Array.from(element.children).filter((child) => child.localName === "chat-message")
}

/** @param {HTMLElement} transcript */
function normalizeTranscriptElement(transcript) {
  const messages = chatMessageChildren(transcript)
  messages.forEach((message, index) => {
    const turn = String(index + 1)
    message.setAttribute("data-turn", turn)
    ensureMessageId(message)
    if (!message.getAttribute("data-source")) {
      const role = message.getAttribute("data-role") ?? "message"
      message.setAttribute("data-source", `${String(index + 1).padStart(4, "0")}-${role}.md`)
    }
  })
  transcript.dataset.startMessage = messages.length ? "0001" : ""
  transcript.dataset.endMessage = messages.length ? String(messages.length).padStart(4, "0") : ""
  transcript.dataset.messageCount = String(messages.length)
}

/**
 * @param {Element} transcript
 * @param {string} id
 */
function removeMessageFromTranscriptElement(transcript, id) {
  for (const reference of Array.from(transcript.querySelectorAll("chat-file-reference"))) {
    if (reference.getAttribute("data-for") === id) reference.remove()
  }
  for (const message of chatMessageChildren(transcript)) {
    if (message.id === id) message.remove()
  }
}

/** @param {Element} element */
function ensureMessageId(element) {
  if (!(element instanceof HTMLElement)) throw new Error("Expected an HTML message element.")
  if (!element.id) element.id = nextMessageId()
  return element.id
}

function nextMessageId() {
  return `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
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

/** @param {string} [referenceName] */
export function defineChatFileReference(referenceName = "chat-file-reference") {
  if (!customElements.get(referenceName)) {
    customElements.define(referenceName, ChatFileReference)
  }
}

/** @param {string} [composerName] */
export function defineChatComposer(composerName = "chat-composer") {
  if (!customElements.get(composerName)) {
    customElements.define(composerName, ChatComposer)
  }
}

/** @param {string} [editorName] */
export function defineChatMessageEditor(editorName = "chat-message-editor") {
  if (!customElements.get(editorName)) {
    customElements.define(editorName, ChatMessageEditor)
  }
}

export function defineChatTranscriptElements() {
  defineTopicTranscript()
  defineChatSummary()
  defineChatMessage()
  defineChatFileReference()
  defineChatComposer()
  defineChatMessageEditor()
}
