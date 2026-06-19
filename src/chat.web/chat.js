// @ts-check

import { defineCodeMirrorElements } from "../codemirror.web/codemirror.js"

const pageStyleId = "web-native-chat-page-styles"
const renderQueued = Symbol("render-queued")
const css = String.raw
const html = String.raw

/** @typedef {{ omitMessageId?: string, omitMessageIndex?: number }} ChatSourceSerializeOptions */
/** @typedef {{ bytes?: string, hash?: string, label: string, mime?: string, path: string, status: string }} ChatFileReferenceData */

const pageStyles = css`
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

const transcriptStyles = css`
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

const summaryStyles = css`
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

const fileReferenceCardStyles = css`
  .file {
    background: color-mix(in oklch, Canvas 96%, CanvasText 4%);
    border: 1px solid color-mix(in oklch, CanvasText 13%, transparent);
    border-radius: 0.5rem;
    color: CanvasText;
    display: grid;
    gap: 0.35rem;
    padding: 0.7rem 0.8rem;
  }

  .file .top {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    justify-content: space-between;
  }

  .file a {
    color: LinkText;
    font-weight: 700;
    overflow-wrap: anywhere;
    text-decoration: none;
  }

  .file a:hover {
    text-decoration: underline;
  }

  .file .badge {
    background: color-mix(in oklch, Highlight 12%, Canvas);
    border: 1px solid color-mix(in oklch, Highlight 25%, transparent);
    border-radius: 999px;
    color: color-mix(in oklch, CanvasText 70%, transparent);
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.16rem 0.45rem;
  }

  .file code {
    color: color-mix(in oklch, CanvasText 62%, transparent);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.76rem;
    overflow-wrap: anywhere;
  }

  .file .meta {
    color: color-mix(in oklch, CanvasText 56%, transparent);
    display: flex;
    flex-wrap: wrap;
    font-size: 0.76rem;
    gap: 0.45rem;
  }
`

const messageStyles = css`
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

  .message-actions {
    display: flex;
    gap: 0.3rem;
    justify-content: end;
    margin: 0;
    padding: 0;
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

  .inline-editor {
    display: grid;
    gap: 0.65rem;
  }

  .inline-editor codemirror-editor {
    --codemirror-editor-block-size: clamp(12rem, 32vh, 22rem);
    --codemirror-editor-min-block-size: 12rem;
    --codemirror-editor-radius: 0.45rem;
  }

  .inline-editor-actions {
    display: flex;
    gap: 0.45rem;
    justify-content: end;
  }

  .inline-editor-actions button {
    background: color-mix(in oklch, Canvas 92%, CanvasText 8%);
    border: 1px solid color-mix(in oklch, CanvasText 14%, transparent);
    border-radius: 0.45rem;
    color: CanvasText;
    cursor: pointer;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 700;
    padding: 0.45rem 0.7rem;
  }

  .inline-editor-actions button[data-primary] {
    background: LinkText;
    border-color: LinkText;
    color: Canvas;
  }

  .attachments {
    display: grid;
    gap: 0.5rem;
  }

  article:not([data-kind="tool"]) .attachments {
    grid-column: 2;
  }

  ${fileReferenceCardStyles}

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

    article:not([data-kind="tool"]) .attachments {
      grid-column: 1;
    }
  }
`

const fileReferenceStyles = css`
  :host {
    display: block;
  }

  ${fileReferenceCardStyles}
`

const composerStyles = css`
  :host {
    background: Canvas;
    border-top: 1px solid color-mix(in oklch, CanvasText 14%, transparent);
    display: grid;
    gap: 0.75rem;
    padding: clamp(0.9rem, 2vw, 1.25rem);
  }

  .composer-grid {
    display: grid;
    gap: 0.75rem;
  }

  .options,
  .footer {
    align-items: end;
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: space-between;
  }

  .options {
    align-items: stretch;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: end;
  }

  ::slotted(textarea),
  ::slotted(input:not([type="radio"]):not([type="checkbox"])) {
    background: color-mix(in oklch, Canvas 98%, CanvasText 2%);
    border: 1px solid color-mix(in oklch, CanvasText 14%, transparent);
    box-sizing: border-box;
    color: CanvasText;
    font: inherit;
    padding: 0.85rem;
    width: 100%;
  }

  ::slotted(textarea) {
    border-radius: 0.65rem;
    min-block-size: 5.5rem;
    resize: vertical;
  }

  ::slotted(input:not([type="radio"]):not([type="checkbox"])) {
    border-radius: 0.5rem;
    min-inline-size: min(18rem, 100%);
  }

  ::slotted(label),
  ::slotted(fieldset) {
    box-sizing: border-box;
    color: color-mix(in oklch, CanvasText 64%, transparent);
    font-size: 0.82rem;
  }

  ::slotted(label) {
    display: grid;
    gap: 0.35rem;
    min-inline-size: min(18rem, 100%);
  }

  ::slotted(fieldset) {
    align-content: start;
    border: 1px solid color-mix(in oklch, CanvasText 14%, transparent);
    border-radius: 0.5rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem 0.75rem;
    margin: 0;
    min-inline-size: min(18rem, 100%);
    padding: 0.45rem 0.65rem 0.6rem;
    width: 100%;
  }

  ::slotted(.status) {
    color: color-mix(in oklch, CanvasText 58%, transparent);
    font-size: 0.82rem;
  }

  ::slotted(button) {
    background: color-mix(in oklch, Canvas 92%, CanvasText 8%);
    border: 1px solid color-mix(in oklch, CanvasText 14%, transparent);
    border-radius: 0.5rem;
    color: CanvasText;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    padding: 0.55rem 0.85rem;
  }

  ::slotted(button[data-primary]) {
    background: LinkText;
    border-color: LinkText;
    color: Canvas;
  }

  ::slotted(button:disabled),
  ::slotted(input:disabled),
  ::slotted(textarea:disabled),
  ::slotted(select:disabled) {
    cursor: wait;
    opacity: 0.58;
  }
`

export class TopicTranscript extends HTMLElement {
  connectedCallback() {
    installChatTranscriptPageStyles()
    if (this.shadowRoot) return

    const shadow = this.attachShadow({ mode: "open" })
    shadow.innerHTML = html`
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
    if (options.omitMessageId || options.omitMessageIndex !== undefined) {
      removeMessageFromTranscriptElement(clone, {
        id: options.omitMessageId,
        index: options.omitMessageIndex,
      })
    }
    normalizeTranscriptElement(clone)
    clone.querySelectorAll("[data-ephemeral]").forEach((element) => element.remove())
    clone.querySelectorAll("chat-file-reference, a[rel~='enclosure']").forEach((element) => {
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
    if (options.attrs?.id) message.id = options.attrs.id
    message.setAttribute("from", role)
    message.setAttribute("created", new Date().toISOString())
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
    for (const reference of Array.from(this.querySelectorAll("chat-file-reference, a[rel~='enclosure']"))) {
      if (id && fileReferenceFor(reference) === id) reference.remove()
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
    shadow.innerHTML = html`
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
    "channel",
    "content-type",
    "created",
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
    "from",
    "model",
    "recipient",
    "source",
    "thinking",
    "thinking-effort",
    "turn",
  ]

  /** @type {MutationObserver | undefined} */
  #observer

  #editing = false

  connectedCallback() {
    this.#observer = new MutationObserver(this.#queueRender)
    this.#observer.observe(this, { attributes: true, childList: true, subtree: true, characterData: true })
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
    const role = messageFrom(this)
    const hidden = attributeValue(this, "hidden", "data-hidden") === "true"
    const kind = messageRecipient(this) ? "tool" : role === "user" ? "user" : role === "system" ? "system" : "assistant"
    const body = getRawMessageBody(this)
    const attachments = fileReferenceChildren(this)
    const editable = isMessageEditable(this)
    const shadow = this.shadowRoot ?? this.attachShadow({ mode: "open" })
    shadow.innerHTML = html`
      <style>${messageStyles}</style>
      <article data-kind="${escapeAttribute(kind)}" data-role="${escapeAttribute(role)}" data-hidden="${hidden ? "true" : "false"}" data-editable="${editable ? "true" : "false"}" data-editing="${this.#editing ? "true" : "false"}">
        ${this.#editing
          ? renderEditableMessage(this, kind, body)
          : kind === "tool"
            ? renderToolEvent(this, body)
            : `${renderMessageHeader(this, kind, editable)}<section class="content">${renderMarkdown(body)}</section>`}
        ${attachments.length ? renderFileAttachments(attachments) : ""}
        ${!this.#editing && kind === "tool" && editable ? renderMessageActions() : ""}
      </article>
    `
  }

  edit() {
    if (!isMessageEditable(this)) return
    this.#editing = true
    this.#queueRender()
    requestAnimationFrame(() => this.#focusEditor())
  }

  cancelEdit() {
    if (!this.#editing) return
    this.#editing = false
    this.#queueRender()
  }

  saveEdit() {
    if (!this.#editing) return
    const text = this.#inlineEditorText()
    this.#editing = false
    this.dispatchEvent(new CustomEvent("chat-editor-save", {
      bubbles: true,
      composed: true,
      detail: { id: this.id || undefined, message: this, text },
    }))
    this.#queueRender()
  }

  requestDelete() {
    this.dispatchEvent(new CustomEvent("chat-message-delete-request", {
      bubbles: true,
      composed: true,
      detail: { id: this.id || undefined, message: this },
    }))
  }

  #focusEditor() {
    const editor = this.shadowRoot?.querySelector("codemirror-editor")
    if (editor && "focus" in editor && typeof editor.focus === "function") {
      editor.focus()
      return
    }
    const textarea = this.shadowRoot?.querySelector("textarea")
    if (textarea instanceof HTMLTextAreaElement) textarea.focus()
  }

  #inlineEditorText() {
    const editor = this.shadowRoot?.querySelector("codemirror-editor")
    if (editor && "value" in editor) return String(editor.value ?? "")
    const textarea = this.shadowRoot?.querySelector("textarea")
    return textarea instanceof HTMLTextAreaElement ? textarea.value : getRawMessageBody(this)
  }
}

export class ChatFileReference extends HTMLElement {
  static observedAttributes = [
    "current-bytes",
    "current-sha256",
    "data-current-bytes",
    "data-current-sha256",
    "data-mime",
    "data-path",
    "data-status",
    "href",
    "mime",
    "path",
    "status",
    "type",
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
    const shadow = this.shadowRoot ?? this.attachShadow({ mode: "open" })
    shadow.innerHTML = html`
      <style>${fileReferenceStyles}</style>
      ${renderFileReferenceCard(fileReferenceData(this))}
    `
  }
}

export class ChatComposer extends HTMLElement {
  static observedAttributes = ["busy", "placeholder", "status"]

  /** @type {AbortController | undefined} */
  #controller

  connectedCallback() {
    if (!this.shadowRoot) {
      const shadow = this.attachShadow({ mode: "open" })
      shadow.innerHTML = html`
        <style>${composerStyles}</style>
        <section class="composer-grid">
          <slot name="message"></slot>
          <section class="options">
            <slot name="instructions"></slot>
            <slot name="reasoning"></slot>
            <slot></slot>
          </section>
          <footer class="footer">
            <slot name="status"></slot>
            <section class="actions">
              <slot name="actions"></slot>
            </section>
          </footer>
        </section>
      `
    }
    this.#ensureDefaultControls()
    this.#install()
    this.#sync()
  }

  disconnectedCallback() {
    this.#controller?.abort()
    this.#controller = undefined
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
    return /** @type {HTMLTextAreaElement | null} */ (this.querySelector("textarea[name='message']") ?? this.querySelector("textarea") ?? null)
  }

  #ensureDefaultControls() {
    this.#slotExistingControls()
    if (!this.querySelector(":scope > [slot='message']")) {
      this.insertAdjacentHTML("beforeend", html`
        <textarea slot="message" name="message"></textarea>
      `)
    }
    if (!this.querySelector(":scope > [slot='instructions']")) {
      this.insertAdjacentHTML("beforeend", html`
        <label slot="instructions">instructions
          <input type="text" name="instructions" placeholder="Optional instructions" />
        </label>
      `)
    }
    if (!this.querySelector(":scope > [slot='reasoning']")) {
      this.insertAdjacentHTML("beforeend", html`
        <fieldset slot="reasoning">
          <legend>thinking</legend>
          <label><input type="radio" name="reasoning.effort" value="minimal" /> minimal</label>
          <label><input type="radio" name="reasoning.effort" value="medium" checked /> medium</label>
          <label><input type="radio" name="reasoning.effort" value="high" /> high</label>
        </fieldset>
      `)
    }
    if (!this.querySelector(":scope > [slot='status']")) {
      this.insertAdjacentHTML("beforeend", html`
        <span slot="status" class="status" role="status"></span>
      `)
    }
    if (!this.querySelector(":scope > [slot='actions']")) {
      this.insertAdjacentHTML("beforeend", html`
        <button slot="actions" name="intent" value="save" formnovalidate data-save>Save</button>
        <button slot="actions" name="intent" value="send" data-send data-primary>Send</button>
      `)
    }
  }

  #slotExistingControls() {
    slotDirectChildren(this, "textarea", "message")
    slotDirectChildren(this, "input[name='instructions'], textarea[name='instructions']", "instructions")
    slotDirectChildren(this, "select[name='reasoning.effort'], input[name='reasoning.effort']", "reasoning")
    this.querySelectorAll(":scope > fieldset").forEach((element) => {
      if (element instanceof HTMLElement && !element.slot && element.querySelector("[name='reasoning.effort']")) {
        element.slot = "reasoning"
      }
    })
    slotDirectChildren(this, ".status, [role='status']", "status")
    slotDirectChildren(this, "button", "actions")
  }

  #install() {
    this.#controller?.abort()
    this.#controller = new AbortController()
    const signal = this.#controller.signal
    this.addEventListener("click", (event) => {
      const button = event.target instanceof Element
        ? event.target.closest("button")
        : null
      if (!button || !this.contains(button)) return
      const intent = buttonIntent(button)
      if (!intent) return
      if (button.form) return
      event.preventDefault()
      this.#submit(intent !== "save")
    }, { signal })
    this.addEventListener("keydown", (event) => {
      if (!(event instanceof KeyboardEvent)) return
      if (event.target !== this.textarea) return
      if (event.key !== "Enter") return
      if (!event.metaKey && !event.ctrlKey) return
      event.preventDefault()
      this.#submit(!event.altKey)
    }, { signal })
  }

  #sync() {
    const textarea = this.textarea
    const status = this.querySelector("[slot='status'], .status")
    const disabled = this.busy
    if (textarea) {
      textarea.placeholder = this.getAttribute("placeholder") ?? "Add a message"
      textarea.toggleAttribute("disabled", disabled)
    }
    if (status) status.textContent = this.status
    this.querySelectorAll("button, input, select, textarea").forEach((control) => control.toggleAttribute("disabled", disabled))
  }

  /** @param {boolean} send */
  #submit(send) {
    const textarea = this.textarea
    if (!(textarea instanceof HTMLTextAreaElement)) return
    const submitter = this.#intentButton(send)
    if (textarea.form) {
      textarea.form.requestSubmit(submitter?.form === textarea.form ? submitter : undefined)
      return
    }
    const text = textarea.value.trim()
    if (!text) return
    const data = formDataFromControls(this)
    if (!data.has("intent")) data.set("intent", send ? "send" : "save")
    const event = new CustomEvent("chat-composer-submit", {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: { formData: data, send, text },
    })
    if (this.dispatchEvent(event)) textarea.value = ""
  }

  /** @param {boolean} send */
  #intentButton(send) {
    const intent = send ? "send" : "save"
    return /** @type {HTMLButtonElement | null} */ (this.querySelector(`button[name='intent'][value='${intent}'], button[data-${intent}]`))
  }
}

/**
 * @param {HTMLElement} host
 * @param {string} selector
 * @param {string} slot
 */
function slotDirectChildren(host, selector, slot) {
  host.querySelectorAll(`:scope > ${selector}`).forEach((element) => {
    if (element instanceof HTMLElement && !element.slot) element.slot = slot
  })
}

/** @param {HTMLButtonElement} button */
function buttonIntent(button) {
  if (button.name === "intent" && button.value) return button.value
  if (button.hasAttribute("data-save")) return "save"
  if (button.hasAttribute("data-send")) return "send"
  return undefined
}

/** @param {HTMLElement} root */
function formDataFromControls(root) {
  const data = new FormData()
  const controls = root.querySelectorAll("input, select, textarea")
  for (const control of controls) {
    if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)) continue
    if (!control.name || control.disabled) continue
    if (control instanceof HTMLInputElement && (control.type === "radio" || control.type === "checkbox") && !control.checked) continue
    if (control instanceof HTMLSelectElement && control.multiple) {
      for (const option of control.selectedOptions) data.append(control.name, option.value)
      continue
    }
    data.append(control.name, control.value)
  }
  return data
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
  const clone = element.cloneNode(true)
  if (clone instanceof Element) {
    clone.querySelectorAll("chat-file-reference, a[rel~='enclosure']").forEach((reference) => reference.remove())
    return clone.textContent ?? ""
  }
  return element.textContent ?? ""
}

/**
 * @param {HTMLElement} element
 * @param {string} name
 * @param {string} [legacyName]
 */
function attributeValue(element, name, legacyName) {
  return element.getAttribute(name) ?? (legacyName ? element.getAttribute(legacyName) : null) ?? undefined
}

/** @param {HTMLElement} element */
function explicitMessageFrom(element) {
  return attributeValue(element, "from", "data-role")
}

/** @param {HTMLElement} element */
function messageFrom(element) {
  return explicitMessageFrom(element) ?? inferredMessageFrom(element)
}

/** @param {HTMLElement} element */
function inferredMessageFrom(element) {
  const parent = element.parentElement
  if (!parent || parent.localName !== "topic-transcript") return "message"
  let ordinaryCount = 0
  for (const message of chatMessageChildren(parent)) {
    if (message === element) break
    if (!(message instanceof HTMLElement)) continue
    const role = explicitMessageFrom(message)
    if (role === "system" || role === "tool" || messageRecipient(message)) continue
    ordinaryCount += 1
  }
  return ordinaryCount % 2 === 0 ? "user" : "assistant"
}

/** @param {HTMLElement} element */
function messageCreated(element) {
  return attributeValue(element, "created", "data-created")
}

/** @param {HTMLElement} element */
function messageRecipient(element) {
  return attributeValue(element, "recipient", "data-recipient")
}

/** @param {HTMLElement} element */
function messageContentType(element) {
  return attributeValue(element, "content-type", "data-content-type")
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
 * @param {boolean} [editable]
 */
function renderMessageHeader(element, kind, editable = false) {
  const created = formatCreated(messageCreated(element))
  const context = messageContext(element)
  return html`
    <header class="message-header">
      <strong class="speaker">${escapeHtml(displaySpeaker(kind))}</strong>
      ${created ? `<time class="time" datetime="${escapeAttribute(messageCreated(element) ?? "")}">${escapeHtml(created)}</time>` : ""}
      ${context ? `<span class="context">${escapeHtml(context)}</span>` : ""}
      ${editable ? renderMessageActions() : ""}
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
  if (attributeValue(element, "hidden", "data-hidden") === "true") return "hidden"
  if (attributeValue(element, "thinking", "data-thinking") === "true") return "working note"
  const channel = attributeValue(element, "channel", "data-channel")
  if (channel && channel !== "final") return channel
  return undefined
}

/** @param {Element[]} references */
function renderFileAttachments(references) {
  return html`
    <section class="attachments" aria-label="Referenced files">
      ${references.map((reference) => renderFileReferenceCard(fileReferenceData(reference))).join("")}
    </section>
  `
}

/** @param {ChatFileReferenceData} reference */
function renderFileReferenceCard(reference) {
  return html`
    <section class="file" aria-label="Referenced file">
      <div class="top">
        <a href="${escapeAttribute(reference.path)}" target="_blank" rel="noreferrer">${escapeHtml(reference.label)}</a>
        <span class="badge">${escapeHtml(reference.status)}</span>
      </div>
      <code>${escapeHtml(reference.path)}</code>
      <div class="meta">
        <span>${escapeHtml(reference.mime ?? "file")}</span>
        ${reference.bytes ? `<span>${escapeHtml(formatBytes(Number(reference.bytes)))}</span>` : ""}
        ${reference.hash ? `<span>${escapeHtml(reference.hash.slice(0, 12))}</span>` : ""}
      </div>
    </section>
  `
}

/** @param {Element} element */
function fileReferenceData(element) {
  const path = fileReferencePath(element)
  return {
    bytes: attributeValue(/** @type {HTMLElement} */ (element), "current-bytes", "data-current-bytes"),
    hash: attributeValue(/** @type {HTMLElement} */ (element), "current-sha256", "data-current-sha256"),
    label: element.textContent?.trim() || path,
    mime: fileReferenceMime(element),
    path,
    status: attributeValue(/** @type {HTMLElement} */ (element), "status", "data-status") ?? "unchecked",
  }
}

/** @param {Element} element */
function fileReferencePath(element) {
  if (element.localName === "a") return element.getAttribute("href") ?? ""
  return element.getAttribute("path") ?? element.getAttribute("href") ?? element.getAttribute("data-path") ?? ""
}

/** @param {Element} element */
function fileReferenceMime(element) {
  return element.getAttribute("type") ?? element.getAttribute("mime") ?? element.getAttribute("data-mime") ?? undefined
}

/** @param {Element} element */
function fileReferenceFor(element) {
  return element.getAttribute("for") ?? element.getAttribute("data-for") ?? undefined
}

/** @param {Element} element */
function isEnclosureLink(element) {
  return element.localName === "a" && Boolean(element.getAttribute("href")) && (element.getAttribute("rel") ?? "").split(/\s+/).includes("enclosure")
}

/** @param {Element} element */
function fileReferenceChildren(element) {
  return Array.from(element.children).filter((child) => child.localName === "chat-file-reference" || isEnclosureLink(child))
}

/** @param {Element} element */
function isMessageEditable(element) {
  return Boolean(element.closest("topic-transcript")?.hasAttribute("editable"))
}

function renderMessageActions() {
  return html`
    <menu class="message-actions" aria-label="Message actions">
      <button type="button" data-chat-action="edit" onclick="this.getRootNode().host.edit()">Edit</button>
      <button type="button" data-chat-action="delete" onclick="this.getRootNode().host.requestDelete()">Delete</button>
    </menu>
  `
}

/**
 * @param {HTMLElement} element
 * @param {string} kind
 * @param {string} body
 */
function renderEditableMessage(element, kind, body) {
  const editor = renderInlineMessageEditor(body)
  if (kind === "tool") return `<section class="content" data-editing="true">${editor}</section>`
  return `${renderMessageHeader(element, kind, false)}<section class="content" data-editing="true">${editor}</section>`
}

/** @param {string} body */
function renderInlineMessageEditor(body) {
  return html`
    <section class="inline-editor" aria-label="Edit message">
      <codemirror-editor
        language="markdown"
        line-wrapping
        setup="minimal"
        onkeydown="if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); this.getRootNode().host.saveEdit() } else if (event.key === 'Escape') { event.preventDefault(); this.getRootNode().host.cancelEdit() }"
      >
        <textarea name="message" aria-label="Message">${escapeHtml(body)}</textarea>
      </codemirror-editor>
      <div class="inline-editor-actions">
        <button type="button" onclick="this.getRootNode().host.cancelEdit()">Cancel</button>
        <button type="button" data-primary onclick="this.getRootNode().host.saveEdit()">Save</button>
      </div>
    </section>
  `
}

/**
 * @param {HTMLElement} element
 * @param {string} body
 */
function renderToolEvent(element, body) {
  const recipient = messageRecipient(element) ?? "tool"
  const created = formatCreated(messageCreated(element))
  const parsed = parseJson(body)

  return html`
    <section class="tool-event" aria-label="${escapeAttribute(`${recipient} event`)}">
      <header class="tool-header">
        <span class="event-dot" aria-hidden="true"></span>
        <strong class="tool-name">${escapeHtml(recipient)}</strong>
        <span class="tool-status">${escapeHtml(toolStatus(element))}</span>
        ${created ? `<time class="time" datetime="${escapeAttribute(messageCreated(element) ?? "")}">${escapeHtml(created)}</time>` : ""}
      </header>
      <section class="tool-body">
        ${parsed.ok ? renderToolPayload(parsed.value) : renderUnknownToolPayload(body)}
      </section>
    </section>
  `
}

/** @param {HTMLElement} element */
function toolStatus(element) {
  const contentType = messageContentType(element)
  if (contentType === "code") return "request"
  return contentType ?? "event"
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
    return html`
      <section class="tool-section">
        <strong class="tool-section-title">${escapeHtml(formatToolKey(key))}</strong>
        <ul class="tool-list">${items}</ul>
      </section>
    `
  }

  if (isRecord(value)) {
    return html`
      <section class="tool-section">
        <strong class="tool-section-title">${escapeHtml(formatToolKey(key))}</strong>
        ${renderToolFields(value)}
      </section>
    `
  }

  return html`
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
  return html`
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
  return html`
    <dl class="tool-fields">
      ${Object.entries(fields).map(([key, value]) => html`
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
  return html`
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
  return html`
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
  transcript.removeAttribute("data-start-message")
  transcript.removeAttribute("data-end-message")
  transcript.removeAttribute("data-message-count")
}

/**
 * @param {Element} transcript
 * @param {{ id?: string, index?: number }} target
 */
function removeMessageFromTranscriptElement(transcript, target) {
  const messages = chatMessageChildren(transcript)
  const message = target.index !== undefined
    ? messages[target.index]
    : messages.find((candidate) => target.id && candidate.id === target.id)
  const id = message?.id ?? target.id
  if (id) {
    for (const reference of Array.from(transcript.querySelectorAll("chat-file-reference, a[rel~='enclosure']"))) {
      if (fileReferenceFor(reference) === id) reference.remove()
    }
  }
  message?.remove()
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

export function defineChatTranscriptElements() {
  defineCodeMirrorElements()
  defineTopicTranscript()
  defineChatSummary()
  defineChatMessage()
  defineChatFileReference()
  defineChatComposer()
}
