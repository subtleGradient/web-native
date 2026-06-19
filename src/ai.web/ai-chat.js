// @ts-check

import {
  defineChatTranscriptElements,
} from "../chat.web/chat.js"

const DEFAULT_SAVE_SOURCE_URL = "/__ai-chat/save-source"
const DEFAULT_ACTION_URL = "/v1/responses"
const DEFAULT_FILE_STATUS_URL = "/__ai-chat/file-status"
const DEFAULT_MODEL = "gpt-5.5"
const DEFAULT_TRANSPORT_LABEL = "responses"
const FORM_CONTROL_NAMES = new Set(["message", "prompt", "input", "intent"])

export class AIChatApp extends HTMLElement {
  static observedAttributes = ["action", "model", "transport-label"]

  /** @type {RequestInit | undefined} */
  requestInit

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

  get action() {
    return this.getAttribute("action") ?? DEFAULT_ACTION_URL
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

  /** @param {SubmitEvent | Event} event */
  respond(event) {
    event.preventDefault()
    const form = formFromSubmitEvent(event) ?? this.closest("form")
    const submitter = event instanceof SubmitEvent ? event.submitter : undefined
    void this.#respondToForm(form, submitter).catch((error) => this.#reportError(error))
  }

  /** @param {Event} event */
  #handleComposerSubmit = (event) => {
    if (!(event instanceof CustomEvent) || !isRecord(event.detail)) return
    event.stopPropagation()
    const text = typeof event.detail.text === "string" ? event.detail.text : ""
    const send = event.detail.send !== false
    void this.#addComposerMessage(text, send).catch((error) => this.#reportError(error))
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
    const target = event.detail.message instanceof Element
      ? event.detail.message
      : typeof event.detail.id === "string"
        ? event.detail.id
        : null
    if (!target) return
    if (typeof confirm === "function" && !confirm("Delete this message?")) return
    void this.#deleteMessage(target).catch((error) => this.#reportError(error))
  }

  /** @param {Event} event */
  #handleEditorSave = (event) => {
    if (!(event instanceof CustomEvent) || !isRecord(event.detail)) return
    event.stopPropagation()
    const target = event.detail.message instanceof Element
      ? event.detail.message
      : typeof event.detail.id === "string"
        ? event.detail.id
        : null
    const text = typeof event.detail.text === "string" ? event.detail.text : ""
    if (!target) return
    void this.#saveEditedMessage(target, text).catch((error) => this.#reportError(error))
  }

  /**
   * @param {string} text
   * @param {boolean} send
   */
  async #addComposerMessage(text, send) {
    const transcript = this.#requireTranscript()
    if (!text.trim()) return
    const params = {
      model: this.model,
      store: false,
      stream: true,
    }
    const attrs = messageAttrsFromParams(params)
    transcript.appendMessage({ role: "user", text, attrs })
    await this.saveSource()

    if (!send) return
    const assistant = transcript.appendMessage({
      role: "assistant",
      text: "",
      attrs: {
        ...attrs,
        "data-streaming": "true",
      },
    })
    await this.#streamModelResponse(this.action, responsesRequest(transcript, params), assistant)
  }

  /**
   * @param {HTMLFormElement | null} form
   * @param {HTMLElement | null | undefined} submitter
   */
  async #respondToForm(form, submitter) {
    const transcript = this.#requireTranscript()
    const data = formDataFrom(form, submitter)
    const text = messageTextFromFormData(data) ?? this.composer?.textarea?.value.trim() ?? ""
    if (!text.trim()) return

    const params = requestParamsFromFormData(data)
    if (params.model === undefined) params.model = this.model
    if (params.store === undefined) params.store = false
    params.stream = true

    const attrs = messageAttrsFromParams(params)
    transcript.appendMessage({ role: "user", text, attrs })
    clearMessageControls(form, this.composer)
    await this.saveSource()

    if (formIntent(data, submitter) === "save") return

    const assistant = transcript.appendMessage({
      role: "assistant",
      text: "",
      attrs: {
        ...attrs,
        "data-streaming": "true",
      },
    })
    await this.#streamModelResponse(
      actionFrom(form, this.action),
      responsesRequest(transcript, params),
      assistant,
    )
  }

  /** @param {string | Element} target */
  async #deleteMessage(target) {
    const transcript = this.#requireTranscript()
    const message = transcript.messageElement(target)
    if (!message) return
    const index = transcript.messages().indexOf(message)
    await this.saveSource(transcript.serializeSource(message.id
      ? { omitMessageId: message.id }
      : { omitMessageIndex: index }))
    transcript.deleteMessage(message)
    this.#setStatus("Saved")
  }

  /**
   * @param {string | Element} target
   * @param {string} text
   */
  async #saveEditedMessage(target, text) {
    const transcript = this.#requireTranscript()
    if (!transcript.setMessageText(target, text)) return
    const message = transcript.messageElement(target)
    if (message instanceof HTMLElement) message.setAttribute("edited", new Date().toISOString())
    await this.saveSource()
  }

  /** @param {string} [source] */
  async saveSource(source) {
    const transcript = this.#requireTranscript()
    this.#setBusy(true)
    this.#setStatus("Saving")
    try {
      const response = await this.#fetchRunner(this.saveSourceUrl, {
        method: "POST",
        headers: this.#runnerHeaders("text/html; charset=utf-8"),
        body: source ?? transcript.serializeSource(),
      })
      if (!response.ok) throw new Error(await response.text())
      this.#setStatus("Saved")
    } catch (error) {
      this.#setStatus("Save failed")
      throw error
    } finally {
      this.#setBusy(false)
    }
  }

  async refreshFileStatuses() {
    const transcript = this.transcript
    if (!transcript) return
    const references = Array.from(transcript.querySelectorAll("chat-file-reference[data-path], chat-file-reference[path], chat-file-reference[href], a[rel~='enclosure'][href]"))
    for (const reference of references) {
      const path = fileReferencePath(reference)
      if (!path) continue
      try {
        const url = new URL(this.fileStatusUrl, location.href)
        url.searchParams.set("path", path)
        const response = await this.#fetchRunner(url, {
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
   * @param {string} action
   * @param {Record<string, unknown>} request
   * @param {Element} assistant
   */
  async #streamModelResponse(action, request, assistant) {
    this.#setBusy(true)
    this.#setStatus("Thinking")
    try {
      const response = await this.#fetchModel(action, request)
      if (!response.ok) throw new Error(await response.text())
      let text = ""
      await streamResponseText(response, (chunk) => {
        text += chunk
        this.#requireTranscript().setMessageText(assistant, text)
      })
      this.#requireTranscript().setMessageText(assistant, text.trimEnd())
      assistant.removeAttribute("data-streaming")
      await this.saveSource()
      this.#setStatus("Saved")
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (assistant instanceof HTMLElement) {
        assistant.setAttribute("channel", "error")
        assistant.removeAttribute("data-streaming")
      }
      this.#requireTranscript().setMessageText(assistant, `Error: ${message}`)
      await this.saveSource()
      this.#setStatus("Error")
    } finally {
      this.#setBusy(false)
    }
  }

  /**
   * @param {string} action
   * @param {Record<string, unknown>} body
   */
  async #fetchModel(action, body) {
    const headers = new Headers(this.requestInit?.headers)
    headers.set("content-type", "application/json")
    const init = {
      ...this.requestInit,
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }
    const response = await fetch(this.#tokenUrl(action), init)
    if (response.status !== 403 || !(await this.#refreshRunnerToken())) return response
    return fetch(this.#tokenUrl(action), init)
  }

  #requireTranscript() {
    const transcript = this.transcript
    if (!transcript) throw new Error("Missing chat transcript.")
    return transcript
  }

  /** @param {unknown} error */
  #reportError(error) {
    console.error(error)
    if ((this.getAttribute("status") ?? "") !== "Save failed") this.#setStatus("Error")
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
    if (token && url.origin === location.origin) url.searchParams.set("t", token)
    return url.href
  }

  /**
   * @param {string | URL} path
   * @param {RequestInit} [init]
   */
  async #fetchRunner(path, init) {
    const response = await fetch(this.#tokenUrl(path), init)
    if (response.status !== 403 || !(await this.#refreshRunnerToken())) return response
    return fetch(this.#tokenUrl(path), init)
  }

  async #refreshRunnerToken() {
    try {
      const url = new URL(location.href)
      url.searchParams.delete("t")
      const response = await fetch(url.href, {
        cache: "no-store",
        headers: { accept: "text/html" },
      })
      const token =
        response.headers.get("x-web-native-ai-chat-token") ??
        new URL(response.url).searchParams.get("t")
      if (!token) return false
      const nextUrl = new URL(location.href)
      nextUrl.searchParams.set("t", token)
      history.replaceState(null, "", nextUrl)
      return true
    } catch {
      return false
    }
  }

  /** @param {string} [contentType] */
  #runnerHeaders(contentType) {
    const headers = /** @type {Record<string, string>} */ ({})
    const token = runnerToken()
    if (contentType) headers["content-type"] = contentType
    if (token) headers["x-web-native-ai-token"] = token
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

/** @param {SubmitEvent | Event} event */
function formFromSubmitEvent(event) {
  if (event.currentTarget instanceof HTMLFormElement) return event.currentTarget
  if (event.target instanceof HTMLFormElement) return event.target
  return undefined
}

/**
 * @param {HTMLFormElement | null} form
 * @param {HTMLElement | null | undefined} submitter
 */
function formDataFrom(form, submitter) {
  if (!form) return new FormData()
  if (submitter instanceof HTMLElement) {
    try {
      return new FormData(form, submitter)
    } catch {
      return new FormData(form)
    }
  }
  return new FormData(form)
}

/** @param {FormData} data */
function messageTextFromFormData(data) {
  for (const name of ["message", "prompt", "input"]) {
    const value = data.get(name)
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

/**
 * @param {HTMLFormElement | null} form
 * @param {import("../chat.web/chat.js").ChatComposer | null} composer
 */
function clearMessageControls(form, composer) {
  const controls = form
    ? Array.from(form.elements).filter((element) => element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement)
    : composer?.textarea ? [composer.textarea] : []
  for (const control of controls) {
    if (!(control instanceof HTMLTextAreaElement || control instanceof HTMLInputElement)) continue
    if (!["message", "prompt", "input"].includes(control.name)) continue
    control.value = ""
  }
}

/**
 * @param {FormData} data
 * @param {HTMLElement | null | undefined} submitter
 */
function formIntent(data, submitter) {
  const intent = data.get("intent")
  if (typeof intent === "string" && intent) return intent
  if (submitter instanceof HTMLButtonElement && submitter.value) return submitter.value
  if (submitter instanceof HTMLInputElement && submitter.value) return submitter.value
  return "send"
}

/**
 * @param {HTMLFormElement | null} form
 * @param {string} fallback
 */
function actionFrom(form, fallback) {
  return form?.getAttribute("action") || fallback
}

/** @param {FormData} data */
function requestParamsFromFormData(data) {
  /** @type {Record<string, unknown>} */
  const params = {}
  for (const [rawName, rawValue] of data) {
    if (rawValue instanceof File) continue
    const field = parseFieldName(rawName)
    if (!field || isInternalFormField(field.path)) continue
    const value = coerceFormValue(rawValue, field.type)
    if (value === undefined) continue
    setNestedParam(params, field.path, value)
  }
  return params
}

/** @param {string} name */
function parseFieldName(name) {
  const [pathName, typeName] = name.split(":", 2)
  const path = pathName.split(".").filter(Boolean)
  if (path.length === 0) return undefined
  return { path, type: typeName }
}

/** @param {string[]} path */
function isInternalFormField(path) {
  const first = path[0] ?? ""
  return FORM_CONTROL_NAMES.has(first) || first === "ai"
}

/**
 * @param {string} value
 * @param {string | undefined} type
 */
function coerceFormValue(value, type) {
  if (value === "") return undefined
  if (type === "json") return JSON.parse(value)
  if (type === "number") return Number(value)
  if (type === "boolean") return value === "true" || value === "1" || value === "on"
  return value
}

/**
 * @param {Record<string, unknown>} target
 * @param {string[]} path
 * @param {unknown} value
 */
function setNestedParam(target, path, value) {
  let parent = target
  for (const segment of path.slice(0, -1)) {
    const current = parent[segment]
    if (isRecord(current)) {
      parent = current
      continue
    }
    const next = /** @type {Record<string, unknown>} */ ({})
    parent[segment] = next
    parent = next
  }
  const key = path.at(-1)
  if (key) parent[key] = value
}

/** @param {Record<string, unknown>} params */
function messageAttrsFromParams(params) {
  /** @type {Record<string, string>} */
  const attrs = {}
  const model = stringParam(params.model)
  if (model) attrs.model = model
  const reasoning = isRecord(params.reasoning) ? params.reasoning : undefined
  const effort = stringParam(reasoning?.effort)
  if (effort) attrs["thinking-effort"] = effort
  const text = isRecord(params.text) ? params.text : undefined
  const verbosity = stringParam(text?.verbosity)
  if (verbosity) attrs["text-verbosity"] = verbosity

  for (const [key, value] of Object.entries(params)) {
    if (["input", "instructions", "model", "reasoning", "stream", "store", "text"].includes(key)) continue
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") continue
    attrs[attributeNameForParam(key)] = String(value)
  }
  return attrs
}

/** @param {unknown} value */
function stringParam(value) {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

/** @param {string} key */
function attributeNameForParam(key) {
  return key.replace(/_/g, "-").replace(/[^a-zA-Z0-9.-]/g, "-").toLowerCase()
}

/**
 * @param {import("../chat.web/chat.js").TopicTranscript} transcript
 * @param {Record<string, unknown>} params
 */
function responsesRequest(transcript, params) {
  return {
    ...params,
    input: [
      ...opaqueInputItems(transcript),
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: transcriptPrompt(transcript),
          },
        ],
      },
    ],
  }
}

/**
 * @param {import("../chat.web/chat.js").TopicTranscript} transcript
 */
function transcriptPrompt(transcript) {
  const messages = transcript.messages()
    .map((message) => `${messageRole(message).toUpperCase()}:\n${message.querySelector("pre")?.textContent?.trim() ?? ""}`)
    .join("\n\n---\n\n")
  return `Conversation transcript:\n\n${messages}\n\n---\n\nWrite the next assistant message.`
}

/** @param {Element} message */
function messageRole(message) {
  return message.getAttribute("from") ?? message.getAttribute("data-role") ?? "message"
}

/** @param {Element} transcript */
function opaqueInputItems(transcript) {
  /** @type {unknown[]} */
  const items = []
  for (const element of transcript.querySelectorAll("input[type='hidden'][name='ai.input:json'], textarea[hidden][name='ai.input:json'], script[type='application/json'][data-ai-input]")) {
    const raw = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
      ? element.value
      : element.textContent ?? ""
    const parsed = parseJson(raw)
    if (Array.isArray(parsed)) items.push(...parsed)
    else if (parsed !== undefined) items.push(parsed)
  }
  return items
}

/**
 * @param {Response} response
 * @param {(text: string) => void} emit
 */
async function streamResponseText(response, emit) {
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("text/event-stream")) {
    await streamPlainText(response, emit)
    return
  }
  await streamSseText(response, emit)
}

/**
 * @param {Response} response
 * @param {(text: string) => void} emit
 */
async function streamPlainText(response, emit) {
  const reader = response.body?.getReader()
  if (!reader) {
    emit(await response.text())
    return
  }
  const decoder = new TextDecoder()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      emit(decoder.decode(value, { stream: true }))
    }
    const rest = decoder.decode()
    if (rest) emit(rest)
  } finally {
    reader.releaseLock()
  }
}

/**
 * @param {Response} response
 * @param {(text: string) => void} emit
 */
async function streamSseText(response, emit) {
  const reader = response.body?.getReader()
  if (!reader) return
  const decoder = new TextDecoder()
  let buffer = ""
  let sentDelta = false
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      buffer = consumeSseBuffer(buffer, (event) => {
        const text = textFromResponseEvent(event, sentDelta)
        if (!text) return
        sentDelta = true
        emit(text)
      })
    }
    buffer += decoder.decode()
    consumeSseBuffer(`${buffer}\n\n`, (event) => {
      const text = textFromResponseEvent(event, sentDelta)
      if (!text) return
      sentDelta = true
      emit(text)
    })
  } finally {
    reader.releaseLock()
  }
}

/**
 * @param {string} buffer
 * @param {(event: unknown) => void} emit
 */
function consumeSseBuffer(buffer, emit) {
  let remaining = buffer
  while (true) {
    const separator = remaining.search(/\r?\n\r?\n/)
    if (separator === -1) return remaining
    const rawEvent = remaining.slice(0, separator)
    const delimiter = remaining.slice(separator).match(/^\r?\n\r?\n/)?.[0] ?? "\n\n"
    remaining = remaining.slice(separator + delimiter.length)
    const data = rawEvent
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trimStart())
      .join("\n")
    if (!data || data === "[DONE]") continue
    emit(parseJson(data))
  }
}

/**
 * @param {unknown} event
 * @param {boolean} alreadySentDelta
 */
function textFromResponseEvent(event, alreadySentDelta) {
  if (!isRecord(event)) return ""
  if (event.type === "response.output_text.delta" && typeof event.delta === "string") return event.delta
  if (!alreadySentDelta && event.type === "response.output_text.done" && typeof event.text === "string") return event.text
  if (!alreadySentDelta && event.type === "response.completed" && isRecord(event.response)) return textFromResponseObject(event.response) ?? ""
  return ""
}

/** @param {unknown} response */
function textFromResponseObject(response) {
  if (!isRecord(response)) return undefined
  if (typeof response.output_text === "string") return response.output_text
  if (!Array.isArray(response.output)) return undefined
  /** @type {string[]} */
  const chunks = []
  for (const item of response.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue
    for (const part of item.content) {
      if (isRecord(part) && typeof part.text === "string") chunks.push(part.text)
    }
  }
  return chunks.length > 0 ? chunks.join("") : undefined
}

/** @param {string} value */
function parseJson(value) {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

function runnerToken() {
  return new URL(location.href).searchParams.get("t") ?? ""
}

/** @param {Element} element */
function fileReferencePath(element) {
  if (element.localName === "a") return element.getAttribute("href") ?? ""
  return element.getAttribute("path") ?? element.getAttribute("href") ?? element.getAttribute("data-path") ?? ""
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
