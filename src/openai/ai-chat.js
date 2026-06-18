// @ts-check

import {
  defineChatTranscriptElements,
} from "../chat.web/chat.js"

const DEFAULT_SAVE_SOURCE_URL = "/__ai-chat/save-source"
const DEFAULT_RESPOND_URL = "/__ai-chat/respond"
const DEFAULT_FILE_STATUS_URL = "/__ai-chat/file-status"
const DEFAULT_MODEL = "gpt-5.5"
const DEFAULT_TRANSPORT_LABEL = "codex-broker"

export class AIChatApp extends HTMLElement {
  static observedAttributes = ["model", "transport-label"]

  /** @type {AbortController | undefined} */
  #controller

  connectedCallback() {
    defineChatTranscriptElements()
    this.#install()
    queueMicrotask(() => void this.boot())
  }

  disconnectedCallback() {
    this.#controller?.abort()
    this.#controller = undefined
  }

  attributeChangedCallback() {
    this.#syncStatus()
  }

  async boot() {
    await Promise.all([
      customElements.whenDefined("topic-transcript"),
      customElements.whenDefined("chat-message"),
      customElements.whenDefined("chat-file-reference"),
      customElements.whenDefined("chat-composer"),
      customElements.whenDefined("chat-message-editor"),
    ])
    this.transcript?.normalize()
    this.#syncStatus()
    await this.refreshFileStatuses()
  }

  get transcript() {
    const id = this.getAttribute("transcript")
    const element = id ? document.getElementById(id) : this.querySelector("topic-transcript")
    return element?.localName === "topic-transcript"
      ? /** @type {import("../chat.web/chat.js").TopicTranscript} */ (element)
      : null
  }

  get composer() {
    return /** @type {import("../chat.web/chat.js").ChatComposer | null} */ (this.querySelector("chat-composer"))
  }

  get editor() {
    return /** @type {import("../chat.web/chat.js").ChatMessageEditor | null} */ (this.querySelector("chat-message-editor"))
  }

  get model() {
    return this.getAttribute("model") ?? document.documentElement.dataset.model ?? DEFAULT_MODEL
  }

  get transportLabel() {
    return this.getAttribute("transport-label") ?? DEFAULT_TRANSPORT_LABEL
  }

  get saveSourceUrl() {
    return this.getAttribute("save-source-url") ?? DEFAULT_SAVE_SOURCE_URL
  }

  get respondUrl() {
    return this.getAttribute("respond-url") ?? DEFAULT_RESPOND_URL
  }

  get fileStatusUrl() {
    return this.getAttribute("file-status-url") ?? DEFAULT_FILE_STATUS_URL
  }

  #install() {
    this.#controller?.abort()
    this.#controller = new AbortController()
    const signal = this.#controller.signal
    this.addEventListener("chat-composer-submit", this.#handleComposerSubmit, { signal })
    this.addEventListener("chat-message-edit-request", this.#handleEditRequest, { signal })
    this.addEventListener("chat-message-delete-request", this.#handleDeleteRequest, { signal })
    this.addEventListener("chat-editor-save", this.#handleEditorSave, { signal })
  }

  #syncStatus() {
    const composer = this.composer
    if (composer && !composer.status) composer.status = `Ready: ${this.transportLabel}`
  }

  /** @param {Event} event */
  #handleComposerSubmit = (event) => {
    if (!(event instanceof CustomEvent) || !isRecord(event.detail)) return
    event.stopPropagation()
    const text = typeof event.detail.text === "string" ? event.detail.text : ""
    const send = event.detail.send !== false
    void this.#addComposerMessage(text, send)
  }

  /** @param {Event} event */
  #handleEditRequest = (event) => {
    if (!(event instanceof CustomEvent) || !isRecord(event.detail)) return
    event.stopPropagation()
    const transcript = this.transcript
    const editor = this.editor
    const message = event.detail.message instanceof Element
      ? event.detail.message
      : typeof event.detail.id === "string"
        ? transcript?.messageElement(event.detail.id)
        : null
    if (!transcript || !editor || !message) return
    editor.edit(message, transcript.messageText(message))
  }

  /** @param {Event} event */
  #handleDeleteRequest = (event) => {
    if (!(event instanceof CustomEvent) || !isRecord(event.detail)) return
    event.stopPropagation()
    const id = typeof event.detail.id === "string" ? event.detail.id : ""
    if (!id) return
    if (typeof confirm === "function" && !confirm("Delete this message?")) return
    void this.#deleteMessage(id)
  }

  /** @param {Event} event */
  #handleEditorSave = (event) => {
    if (!(event instanceof CustomEvent) || !isRecord(event.detail)) return
    event.stopPropagation()
    const id = typeof event.detail.id === "string" ? event.detail.id : ""
    const text = typeof event.detail.text === "string" ? event.detail.text : ""
    if (!id) return
    void this.#saveEditedMessage(id, text)
  }

  /**
   * @param {string} text
   * @param {boolean} send
   */
  async #addComposerMessage(text, send) {
    const transcript = this.#requireTranscript()
    if (!text.trim()) return
    transcript.appendMessage({ role: "user", text })
    await this.saveSource()

    if (!send) return
    const sourceForModel = transcript.serializeSource()
    const assistant = transcript.appendMessage({
      role: "assistant",
      text: "",
      attrs: {
        "data-model": this.model,
        "data-streaming": "true",
      },
    })
    await this.#streamAssistantResponse(sourceForModel, assistant)
  }

  /** @param {string} id */
  async #deleteMessage(id) {
    const transcript = this.#requireTranscript()
    if (!transcript.deleteMessage(id)) return
    await this.saveSource()
  }

  /**
   * @param {string} id
   * @param {string} text
   */
  async #saveEditedMessage(id, text) {
    const transcript = this.#requireTranscript()
    if (!transcript.setMessageText(id, text)) return
    const message = transcript.messageElement(id)
    if (message instanceof HTMLElement) message.dataset.edited = new Date().toISOString()
    await this.saveSource()
  }

  async saveSource() {
    const transcript = this.#requireTranscript()
    this.#setBusy(true)
    this.#setStatus("Saving")
    try {
      const response = await fetch(this.#tokenUrl(this.saveSourceUrl), {
        method: "POST",
        headers: this.#runnerHeaders("text/html; charset=utf-8"),
        body: transcript.serializeSource(),
      })
      if (!response.ok) throw new Error(await response.text())
      this.#setStatus("Saved")
    } finally {
      this.#setBusy(false)
    }
  }

  async refreshFileStatuses() {
    const transcript = this.transcript
    if (!transcript) return
    const references = Array.from(transcript.querySelectorAll("chat-file-reference[data-path]"))
    for (const reference of references) {
      const path = reference.getAttribute("data-path") ?? ""
      try {
        const url = new URL(this.fileStatusUrl, location.href)
        url.searchParams.set("path", path)
        const response = await fetch(this.#tokenUrl(url), {
          headers: this.#runnerHeaders(),
        })
        const status = await response.json()
        if (!isRecord(status)) throw new Error("Invalid file status response.")
        reference.setAttribute("data-status", status.exists ? "available" : "missing")
        if (status.bytes !== undefined) reference.setAttribute("data-current-bytes", String(status.bytes))
        if (typeof status.sha256 === "string") reference.setAttribute("data-current-sha256", status.sha256)
      } catch {
        reference.setAttribute("data-status", "unknown")
      }
    }
  }

  /**
   * @param {string} sourceForModel
   * @param {Element} assistant
   */
  async #streamAssistantResponse(sourceForModel, assistant) {
    this.#setBusy(true)
    this.#setStatus("Thinking")
    try {
      const response = await fetch(this.#tokenUrl(this.respondUrl), {
        method: "POST",
        headers: this.#runnerHeaders("text/html; charset=utf-8"),
        body: sourceForModel,
      })
      if (!response.ok) throw new Error(await response.text())
      const reader = response.body?.getReader()
      if (!reader) throw new Error("Response body was empty.")
      const decoder = new TextDecoder()
      let text = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        this.#requireTranscript().setMessageText(assistant, text)
      }
      text += decoder.decode()
      this.#requireTranscript().setMessageText(assistant, text.trimEnd())
      assistant.removeAttribute("data-streaming")
      await this.saveSource()
      this.#setStatus("Saved")
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (assistant instanceof HTMLElement) {
        assistant.dataset.channel = "error"
        assistant.removeAttribute("data-streaming")
      }
      this.#requireTranscript().setMessageText(assistant, `Error: ${message}`)
      await this.saveSource()
      this.#setStatus("Error")
    } finally {
      this.#setBusy(false)
    }
  }

  #requireTranscript() {
    const transcript = this.transcript
    if (!transcript) throw new Error("Missing chat transcript.")
    return transcript
  }

  /** @param {boolean} busy */
  #setBusy(busy) {
    const composer = this.composer
    if (composer) composer.busy = busy
    this.toggleAttribute("busy", busy)
  }

  /** @param {string} text */
  #setStatus(text) {
    this.setAttribute("status", text)
    const composer = this.composer
    if (composer) composer.status = text
  }

  /** @param {string | URL} path */
  #tokenUrl(path) {
    const url = new URL(path, location.href)
    const token = runnerToken()
    if (token) url.searchParams.set("t", token)
    return url.href
  }

  /** @param {string} [contentType] */
  #runnerHeaders(contentType) {
    const headers = /** @type {Record<string, string>} */ ({})
    const token = runnerToken()
    if (contentType) headers["content-type"] = contentType
    if (token) headers["x-web-native-openai-token"] = token
    return headers
  }
}

/** @param {string} [name] */
export function defineAIChatApp(name = "ai-chat-app") {
  if (!customElements.get(name)) customElements.define(name, AIChatApp)
}

export function defineAIChatElements() {
  defineChatTranscriptElements()
  defineAIChatApp()
}

function runnerToken() {
  return new URL(location.href).searchParams.get("t") ?? ""
}

/** @param {unknown} value */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
