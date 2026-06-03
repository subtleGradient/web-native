// @ts-check

import { DEFAULT_TEXT_MODEL, OpenAIClient } from "./client.js"

const statusEventName = "openai:status"
const resultEventName = "openai:result"
const errorEventName = "openai:error"

const resultStyles = String.raw`
  :host {
    display: block;
  }

  .result {
    background: color-mix(in oklch, Canvas 94%, CanvasText 6%);
    border: 1px solid color-mix(in oklch, CanvasText 14%, transparent);
    border-radius: 0.75rem;
    color: CanvasText;
    display: grid;
    gap: 0.75rem;
    padding: 1rem;
  }

  .status {
    color: color-mix(in oklch, CanvasText 62%, transparent);
    font-size: 0.875rem;
  }

  pre {
    font: 0.875rem/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    margin: 0;
    overflow: auto;
    white-space: pre-wrap;
  }

  img {
    border-radius: 0.5rem;
    max-inline-size: 100%;
  }
`

const keyFieldStyles = String.raw`
  :host {
    display: block;
  }

  form {
    display: grid;
    gap: 0.5rem;
  }

  label {
    color: color-mix(in oklch, CanvasText 68%, transparent);
    font-size: 0.875rem;
    font-weight: 650;
  }

  .row {
    display: flex;
    gap: 0.5rem;
  }

  input {
    background: Canvas;
    border: 1px solid color-mix(in oklch, CanvasText 22%, transparent);
    border-radius: 0.5rem;
    color: CanvasText;
    flex: 1;
    font: inherit;
    min-inline-size: 0;
    padding: 0.55rem 0.65rem;
  }

  button {
    background: Highlight;
    border: 1px solid Highlight;
    border-radius: 0.5rem;
    color: HighlightText;
    font: inherit;
    font-weight: 650;
    padding: 0.55rem 0.75rem;
  }
`

export class OpenAIClientElement extends HTMLElement {
  static observedAttributes = ["auth", "base-url", "broker-url", "model", "transport"]

  /** @type {OpenAIClient} */
  client

  /** @type {import("./client.js").OpenAIResult | undefined} */
  lastResult

  /** @type {string | undefined} */
  lastError

  busy = false

  #runSequence = 0

  #pendingRuns = 0

  constructor() {
    super()
    this.client = this.#createClient()
  }

  connectedCallback() {
    this.#syncClient()
  }

  /** @param {string} name */
  attributeChangedCallback(name) {
    if (name === "model") return
    this.#syncClient()
  }

  get apiKey() {
    return this.client.apiKey
  }

  /** @param {string} value */
  set apiKey(value) {
    this.client.apiKey = value
  }

  get model() {
    return this.getAttribute("model") ?? undefined
  }

  /** @param {string | undefined} value */
  set model(value) {
    if (value === undefined) this.removeAttribute("model")
    else this.setAttribute("model", value)
  }

  get transport() {
    const value = this.getAttribute("transport") ?? this.getAttribute("auth")
    if (value === "codex" || value === "codex-broker") return "codex-broker"
    if (value === "broker" || value === "api-key-broker") return "api-key-broker"
    return "api-key-direct"
  }

  /** @param {SubmitEvent | Event} event */
  respond(event) {
    event.preventDefault()
    const target = /** @type {HTMLFormElement | null} */ (event.target instanceof HTMLFormElement ? event.target : null)
    const data = target === null ? undefined : new FormData(target)
    const prompt = promptFromEvent(event)
    return this.#run(async () => {
      const text = await this.client.text(prompt, textRequestOptionsFromForm(data, this.model))
      return { kind: "text", text, raw: text }
    })
  }

  /** @param {SubmitEvent | Event} event */
  respondStreaming(event) {
    event.preventDefault()
    const target = /** @type {HTMLFormElement | null} */ (event.target instanceof HTMLFormElement ? event.target : null)
    const data = target === null ? undefined : new FormData(target)
    const prompt = promptFromEvent(event)
    const options = textRequestOptionsFromForm(data, this.model)
    return this.#runStreamingText(prompt, options)
  }

  /** @param {SubmitEvent | Event} event */
  generateImage(event) {
    event.preventDefault()
    const target = /** @type {HTMLFormElement | null} */ (event.target instanceof HTMLFormElement ? event.target : null)
    const data = target === null ? undefined : new FormData(target)
    const prompt = promptFromEvent(event)
    return this.#run(async () => {
      const image = await this.client.image(prompt, {
        outputFormat: stringFromFormData(data, "outputFormat") ?? stringFromFormData(data, "output_format") ?? undefined,
        quality: stringFromFormData(data, "quality") ?? undefined,
        size: stringFromFormData(data, "size") ?? undefined,
      })
      return { kind: "image", image, raw: image.raw }
    })
  }

  /** @param {SubmitEvent | Event} event */
  embed(event) {
    event.preventDefault()
    const prompt = promptFromEvent(event)
    return this.#run(async () => {
      const json = await this.client.embeddings([prompt])
      return { kind: "json", json, raw: json }
    })
  }

  /** @param {SubmitEvent | Event} event */
  respondWithTools(event) {
    event.preventDefault()
    const target = /** @type {HTMLFormElement | null} */ (event.target instanceof HTMLFormElement ? event.target : null)
    const data = target === null ? undefined : new FormData(target)
    const prompt = promptFromEvent(event)
    return this.#run(async () => {
      const json = await this.client.response(responseToolRequestFromForm(data, prompt, this.model))
      return { kind: "json", json, raw: json }
    })
  }

  /** @param {() => Promise<import("./client.js").OpenAIResult>} operation */
  async #run(operation) {
    const runId = ++this.#runSequence
    this.#pendingRuns += 1
    this.busy = true
    this.lastError = undefined
    this.dispatchEvent(new CustomEvent(statusEventName, { bubbles: true, composed: true, detail: { busy: true, pending: this.#pendingRuns } }))
    try {
      const result = await operation()
      if (runId === this.#runSequence) {
        this.lastResult = result
        this.dispatchEvent(new CustomEvent(resultEventName, { bubbles: true, composed: true, detail: result }))
      }
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const result = /** @type {import("./client.js").OpenAIResult} */ ({ kind: "error", error: message, raw: error })
      if (runId === this.#runSequence) {
        this.lastError = message
        this.lastResult = result
        this.dispatchEvent(new CustomEvent(errorEventName, { bubbles: true, composed: true, detail: result }))
      }
      return result
    } finally {
      this.#pendingRuns = Math.max(0, this.#pendingRuns - 1)
      if (this.#pendingRuns === 0) {
        this.busy = false
        this.dispatchEvent(new CustomEvent(statusEventName, { bubbles: true, composed: true, detail: { busy: false, pending: 0 } }))
      }
    }
  }

  /**
   * @param {string} prompt
   * @param {import("./client.js").TextRequestOptions} options
   */
  async #runStreamingText(prompt, options) {
    const runId = ++this.#runSequence
    this.#pendingRuns += 1
    this.busy = true
    this.lastError = undefined
    this.dispatchEvent(new CustomEvent(statusEventName, { bubbles: true, composed: true, detail: { busy: true, pending: this.#pendingRuns } }))
    let text = ""
    try {
      for await (const chunk of this.client.streamText(prompt, options)) {
        text += chunk
        if (runId === this.#runSequence) {
          const result = /** @type {import("./client.js").OpenAIResult} */ ({ kind: "text", text, raw: text })
          this.lastResult = result
          this.dispatchEvent(new CustomEvent(resultEventName, { bubbles: true, composed: true, detail: result }))
        }
      }
      const result = /** @type {import("./client.js").OpenAIResult} */ ({ kind: "text", text, raw: text })
      if (runId === this.#runSequence) this.lastResult = result
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const result = /** @type {import("./client.js").OpenAIResult} */ ({ kind: "error", error: message, raw: error })
      if (runId === this.#runSequence) {
        this.lastError = message
        this.lastResult = result
        this.dispatchEvent(new CustomEvent(errorEventName, { bubbles: true, composed: true, detail: result }))
      }
      return result
    } finally {
      this.#pendingRuns = Math.max(0, this.#pendingRuns - 1)
      if (this.#pendingRuns === 0) {
        this.busy = false
        this.dispatchEvent(new CustomEvent(statusEventName, { bubbles: true, composed: true, detail: { busy: false, pending: 0 } }))
      }
    }
  }

  #syncClient() {
    const previous = this.client
    const next = this.#createClient(previous)
    for (const [name, handler] of previous.tools) next.registerTool(name, handler)
    this.client = next
  }

  /** @param {OpenAIClient} [previous] */
  #createClient(previous) {
    return new OpenAIClient({
      auth: previous?.auth ? { ...previous.auth } : undefined,
      baseUrl: this.getAttribute("base-url") ?? undefined,
      brokerUrl: this.getAttribute("broker-url") ?? undefined,
      fetchFn: previous?.fetchFn,
      transport: /** @type {import("./client.js").OpenAITransportName} */ (this.transport),
    })
  }
}

export class OpenAIKeyField extends HTMLElement {
  static observedAttributes = ["label", "target"]

  connectedCallback() {
    this.#render()
  }

  attributeChangedCallback() {
    this.#render()
  }

  #render() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" })
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot)
    const label = this.getAttribute("label") ?? "OpenAI API key"
    shadow.innerHTML = String.raw`
      <style>${keyFieldStyles}</style>
      <form>
        <label for="key">${escapeHtml(label)}</label>
        <span class="row">
          <input id="key" name="key" type="password" autocomplete="off" placeholder="sk-..." />
          <button type="submit">Use key</button>
        </span>
      </form>
    `
    const form = shadow.querySelector("form")
    form?.addEventListener("submit", (event) => {
      event.preventDefault()
      const key = String(new FormData(form).get("key") ?? "")
      this.#setTargetKey(key)
      this.dispatchEvent(new CustomEvent("openai:key-change", { bubbles: true, composed: true, detail: { apiKey: key } }))
    })
  }

  /** @param {string} key */
  #setTargetKey(key) {
    const targetId = this.getAttribute("target")
    if (!targetId) return
    const target = /** @type {{ apiKey?: string } | null} */ (document.getElementById(targetId))
    if (target) target.apiKey = key
  }
}

export class OpenAIResultElement extends HTMLElement {
  static observedAttributes = ["for"]

  /** @type {HTMLElement | null} */
  #target = null

  connectedCallback() {
    this.#ensureShadow()
    this.#attachTarget()
    this.#render()
  }

  disconnectedCallback() {
    this.#detachTarget()
  }

  attributeChangedCallback() {
    this.#attachTarget()
    this.#render()
  }

  /** @param {CustomEvent} event */
  #onResult = (event) => {
    this.#render(event.detail)
  }

  /** @param {CustomEvent} event */
  #onError = (event) => {
    this.#render(event.detail)
  }

  /** @param {CustomEvent} event */
  #onStatus = (event) => {
    if (event.detail?.busy) this.#renderStatus("Working...")
  }

  #attachTarget() {
    this.#detachTarget()
    const targetId = this.getAttribute("for")
    this.#target = targetId ? document.getElementById(targetId) : null
    this.#target?.addEventListener(resultEventName, /** @type {EventListener} */ (this.#onResult))
    this.#target?.addEventListener(errorEventName, /** @type {EventListener} */ (this.#onError))
    this.#target?.addEventListener(statusEventName, /** @type {EventListener} */ (this.#onStatus))
  }

  #detachTarget() {
    this.#target?.removeEventListener(resultEventName, /** @type {EventListener} */ (this.#onResult))
    this.#target?.removeEventListener(errorEventName, /** @type {EventListener} */ (this.#onError))
    this.#target?.removeEventListener(statusEventName, /** @type {EventListener} */ (this.#onStatus))
    this.#target = null
  }

  #ensureShadow() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" })
  }

  /** @param {import("./client.js").OpenAIResult | undefined} [result] */
  #render(result) {
    result ??= resultFromTarget(this.#target)
    this.#ensureShadow()
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot)
    if (result === undefined) {
      this.#renderStatus("No result yet.")
      return
    }
    if (result.kind === "image" && result.image) {
      shadow.innerHTML = String.raw`<style>${resultStyles}</style><section class="result"><img alt="Generated image" src="${result.image.dataUrl}" /></section>`
      return
    }
    if (result.kind === "error") {
      shadow.innerHTML = String.raw`<style>${resultStyles}</style><section class="result"><strong>Error</strong><pre>${escapeHtml(result.error ?? "Unknown error")}</pre></section>`
      return
    }
    const text = result.text ?? (result.json === undefined ? String(result.raw ?? "") : JSON.stringify(result.json, null, 2))
    shadow.innerHTML = String.raw`<style>${resultStyles}</style><section class="result"><pre>${escapeHtml(text)}</pre></section>`
  }

  /** @param {string} status */
  #renderStatus(status) {
    this.#ensureShadow()
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot)
    shadow.innerHTML = String.raw`<style>${resultStyles}</style><section class="result"><span class="status">${escapeHtml(status)}</span></section>`
  }
}

/** @param {string} [name] */
export function defineOpenAIClient(name = "openai-client") {
  if (!customElements.get(name)) customElements.define(name, OpenAIClientElement)
}

/** @param {string} [name] */
export function defineOpenAIKeyField(name = "openai-key-field") {
  if (!customElements.get(name)) customElements.define(name, OpenAIKeyField)
}

/** @param {string} [name] */
export function defineOpenAIResult(name = "openai-result") {
  if (!customElements.get(name)) customElements.define(name, OpenAIResultElement)
}

export function defineOpenAIElements() {
  defineOpenAIClient()
  defineOpenAIKeyField()
  defineOpenAIResult()
}

/** @param {Event} event */
function promptFromEvent(event) {
  const target = event.target
  if (target instanceof HTMLFormElement) {
    const data = new FormData(target)
    return stringFromFormData(data, "prompt") ?? stringFromFormData(data, "input") ?? ""
  }
  if (target instanceof HTMLElement) return target.textContent?.trim() ?? ""
  return ""
}

/**
 * @param {FormData | undefined} data
 * @param {string} name
 */
function stringFromFormData(data, name) {
  const value = data?.get(name)
  return typeof value === "string" && value.length > 0 ? value : undefined
}

/**
 * @param {FormData | undefined} data
 * @param {string} prompt
 * @param {string | undefined} model
 */
function responseToolRequestFromForm(data, prompt, model) {
  /** @type {Record<string, unknown>} */
  const request = {
    model: stringFromFormData(data, "model") ?? model ?? DEFAULT_TEXT_MODEL,
    input: prompt,
    tools: jsonFromFormData(data, "tools") ?? [],
    store: booleanFromFormData(data, "store") ?? false,
  }
  const instructions = stringFromFormData(data, "instructions")
  if (instructions !== undefined) request.instructions = instructions
  const include = jsonFromFormData(data, "include")
  if (include !== undefined) request.include = include
  const reasoning = reasoningFromFormData(data)
  if (reasoning !== undefined) request.reasoning = reasoning
  const toolChoice = jsonFromFormData(data, "tool_choice") ?? jsonFromFormData(data, "toolChoice")
  if (toolChoice !== undefined) request.tool_choice = toolChoice
  const parallelToolCalls = booleanFromFormData(data, "parallel_tool_calls") ?? booleanFromFormData(data, "parallelToolCalls")
  if (parallelToolCalls !== undefined) request.parallel_tool_calls = parallelToolCalls
  const background = booleanFromFormData(data, "background")
  if (background !== undefined) request.background = background
  return request
}

/**
 * @param {FormData | undefined} data
 * @param {string | undefined} model
 */
function textRequestOptionsFromForm(data, model) {
  /** @type {import("./client.js").TextRequestOptions} */
  const options = {
    model: stringFromFormData(data, "model") ?? model,
  }
  const instructions = stringFromFormData(data, "instructions")
  if (instructions !== undefined) options.instructions = instructions
  const reasoning = reasoningFromFormData(data)
  if (reasoning !== undefined) options.reasoning = reasoning
  const stream = booleanFromFormData(data, "stream")
  if (stream !== undefined) options.stream = stream
  return options
}

/** @param {FormData | undefined} data */
function reasoningFromFormData(data) {
  const reasoning = jsonFromFormData(data, "reasoning")
  if (reasoning !== undefined) return reasoning
  const effort = stringFromFormData(data, "reasoning_effort")
  return effort === undefined ? undefined : { effort }
}

/**
 * @param {FormData | undefined} data
 * @param {string} name
 */
function jsonFromFormData(data, name) {
  const value = stringFromFormData(data, name)
  if (value === undefined) return undefined
  try {
    return JSON.parse(value)
  } catch (error) {
    throw new Error(`${name} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * @param {FormData | undefined} data
 * @param {string} name
 */
function booleanFromFormData(data, name) {
  const value = stringFromFormData(data, name)
  if (value === undefined) return undefined
  return value === "true" || value === "1" || value === "on"
}

/** @param {HTMLElement | null} target */
function resultFromTarget(target) {
  if (!target || !("lastResult" in target)) return undefined
  return /** @type {import("./client.js").OpenAIResult | undefined} */ (Reflect.get(target, "lastResult"))
}

/** @param {string} value */
function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
