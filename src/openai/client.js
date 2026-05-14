// @ts-check

export const OPENAI_API_BASE_URL = "https://api.openai.com/v1"
export const DEFAULT_BROKER_URL = "/__web-native-openai"
export const DEFAULT_TEXT_MODEL = "gpt-5.5"
export const DEFAULT_IMAGE_TEXT_MODEL = "gpt-5.2"
export const DEFAULT_IMAGE_MODEL = "gpt-image-2"
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"

/** @typedef {"api-key-direct" | "api-key-broker" | "codex-broker"} OpenAITransportName */
/** @typedef {(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>} FetchLike */
/** @typedef {{ addEventListener: EventTarget["addEventListener"], close: () => void, send: (data: string) => void }} WebSocketLike */
/** @typedef {new (url: string | URL, protocols?: string | string[]) => WebSocketLike} WebSocketConstructor */
/** @typedef {{ type?: "api-key", apiKey?: string, organization?: string, project?: string }} OpenAIKeyAuth */
/** @typedef {{ apiKey?: string, auth?: OpenAIKeyAuth, baseUrl?: string, brokerUrl?: string, fetchFn?: FetchLike, organization?: string, project?: string, transport?: OpenAITransportName }} OpenAIClientOptions */
/** @typedef {{ model?: string, instructions?: string, schema?: Record<string, unknown>, schemaName?: string, schemaStrict?: boolean, stream?: boolean, tools?: unknown[], toolChoice?: unknown }} TextRequestOptions */
/** @typedef {{ textModel?: string, imageModel?: string, size?: string, quality?: string, outputFormat?: string, background?: string, partialImages?: number, outputCompression?: number }} ImageRequestOptions */
/** @typedef {{ model?: string, dimensions?: number, encodingFormat?: "float" | "base64" }} EmbeddingRequestOptions */
/** @typedef {{ base64: string, dataUrl: string, mediaType: string, raw: string }} ImageResult */
/** @typedef {{ text?: string, image?: ImageResult, json?: unknown, error?: string, raw?: unknown, kind: "text" | "image" | "json" | "error" }} OpenAIResult */
/** @typedef {{ arguments?: string | Record<string, unknown>, call_id?: string, id?: string, name?: string, type?: string, function?: { arguments?: string | Record<string, unknown>, name?: string } }} OpenAIToolCall */
/** @typedef {{ call_id: string, output: string, type: "function_call_output" }} OpenAIToolOutput */
/** @typedef {(args: Record<string, unknown>, call: OpenAIToolCall) => unknown | Promise<unknown>} OpenAIToolHandler */
/** @typedef {{ protocols?: string | string[], url?: string, WebSocketCtor?: WebSocketConstructor }} RealtimeSocketOptions */

export class OpenAIClient {
  /** @type {OpenAIKeyAuth} */
  auth

  /** @type {string} */
  baseUrl

  /** @type {string} */
  brokerUrl

  /** @type {FetchLike} */
  fetchFn

  /** @type {OpenAITransportName} */
  transport

  /** @type {Map<string, OpenAIToolHandler>} */
  tools = new Map()

  /** @param {OpenAIClientOptions} [options] */
  constructor(options = {}) {
    this.auth = options.auth ?? {
      type: "api-key",
      apiKey: options.apiKey,
      organization: options.organization,
      project: options.project,
    }
    this.baseUrl = trimTrailingSlash(options.baseUrl ?? OPENAI_API_BASE_URL)
    this.brokerUrl = trimTrailingSlash(options.brokerUrl ?? DEFAULT_BROKER_URL)
    this.fetchFn = options.fetchFn ?? /** @type {FetchLike} */ (fetch.bind(globalThis))
    this.transport = options.transport ?? "api-key-direct"
  }

  get apiKey() {
    return this.auth.apiKey ?? ""
  }

  /** @param {string} value */
  set apiKey(value) {
    this.auth = { ...this.auth, type: "api-key", apiKey: value }
  }

  /**
   * @param {string} prompt
   * @param {TextRequestOptions} [options]
   */
  async text(prompt, options = {}) {
    const request = buildTextRequest(prompt, options)
    const body = await this.postText("responses", request)
    const text = extractOutputText(body)
    if (text === undefined) throw new Error("response did not include output text")
    return text
  }

  /**
   * @param {Record<string, unknown>} request
   * @param {{ raw?: boolean }} [options]
   */
  async response(request, options = {}) {
    const response = await this.post("responses", request)
    if (options.raw) return response
    const body = await response.text()
    if (!response.ok) throw new Error(responseErrorMessage(response, body))
    return parseJsonOrText(body)
  }

  /** @param {Record<string, unknown>} request */
  async *streamResponse(request) {
    const response = await this.post("responses", { ...request, stream: true })
    const body = await response.text()
    if (!response.ok) throw new Error(responseErrorMessage(response, body))
    const events = parseServerSentEvents(body)
    for (const event of events) yield event
  }

  /**
   * @param {string} prompt
   * @param {TextRequestOptions} [options]
   */
  async *streamText(prompt, options = {}) {
    for await (const event of this.streamResponse(buildTextRequest(prompt, { ...options, stream: true }))) {
      if (isRecord(event) && event.type === "response.output_text.delta" && typeof event.delta === "string") {
        yield event.delta
      }
    }
  }

  /**
   * @param {string} prompt
   * @param {ImageRequestOptions} [options]
   * @returns {Promise<ImageResult>}
   */
  async image(prompt, options = {}) {
    const outputFormat = options.outputFormat ?? "png"
    const request = buildImageRequest(prompt, options)
    const body = await this.postText("responses", request)
    const base64 = extractImageBase64(body)
    if (base64 === undefined || base64.length === 0) throw new Error("response did not include image data")
    const mediaType = mediaTypeForImageFormat(outputFormat)
    return {
      base64,
      dataUrl: `data:${mediaType};base64,${base64}`,
      mediaType,
      raw: body,
    }
  }

  /**
   * @param {string | string[]} input
   * @param {EmbeddingRequestOptions} [options]
   */
  async embeddings(input, options = {}) {
    const request = buildEmbeddingRequest(Array.isArray(input) ? input : [input], options)
    const response = await this.post("embeddings", request)
    const body = await response.text()
    if (!response.ok) throw new Error(responseErrorMessage(response, body))
    return /** @type {{ data?: Array<{ index?: number, embedding?: number[] | string }>, model?: string, usage?: unknown }} */ (JSON.parse(body))
  }

  /**
   * Browser WebSockets cannot attach arbitrary Authorization headers, so this
   * negotiates through the runner/broker rather than pretending direct auth works.
   * @param {Record<string, unknown>} [request]
   */
  async realtimeSession(request = {}) {
    const response = await this.post("realtime/session", request)
    const body = await response.text()
    if (!response.ok) throw new Error(responseErrorMessage(response, body))
    return parseJsonOrText(body)
  }

  /**
   * @param {string} name
   * @param {OpenAIToolHandler} handler
   */
  registerTool(name, handler) {
    this.tools.set(name, handler)
    return this
  }

  /** @param {OpenAIToolCall[]} calls */
  async *runToolCalls(calls) {
    for (const call of calls) yield await this.runToolCall(call)
  }

  /** @param {OpenAIToolCall} call */
  async runToolCall(call) {
    const name = toolCallName(call)
    if (name === undefined) throw new Error("tool call did not include a function name")
    const handler = this.tools.get(name)
    if (handler === undefined) throw new Error(`no handler registered for tool: ${name}`)
    const result = await handler(toolCallArguments(call), call)
    return {
      type: "function_call_output",
      call_id: toolCallId(call),
      output: typeof result === "string" ? result : JSON.stringify(result),
    }
  }

  /** @param {RealtimeSocketOptions} [options] */
  realtimeSocket(options = {}) {
    const WebSocketCtor = options.WebSocketCtor ?? WebSocket
    return new OpenAIRealtimeSocket({
      protocols: options.protocols,
      url: options.url ?? realtimeSocketUrl(this),
      WebSocketCtor,
    })
  }

  /**
   * @param {"responses" | "embeddings" | "realtime/session"} resource
   * @param {unknown} request
   */
  async postText(resource, request) {
    const response = await this.post(resource, request)
    const body = await response.text()
    if (!response.ok) throw new Error(responseErrorMessage(response, body))
    return body
  }

  /**
   * @param {"responses" | "embeddings" | "realtime/session"} resource
   * @param {unknown} request
   */
  async post(resource, request) {
    return this.fetchFn(endpointFor(this, resource), {
      method: "POST",
      headers: headersFor(this),
      body: JSON.stringify(request),
    })
  }
}

export class OpenAIRealtimeSocket {
  /** @type {WebSocketLike} */
  socket

  /** @type {unknown[]} */
  #queue = []

  /** @type {Array<(value: IteratorResult<unknown>) => void>} */
  #waiting = []

  #closed = false

  /** @param {{ protocols?: string | string[], url: string, WebSocketCtor: WebSocketConstructor }} options */
  constructor(options) {
    this.socket = new options.WebSocketCtor(options.url, options.protocols)
    this.socket.addEventListener("message", (event) => this.#push(parseWebSocketMessage(/** @type {MessageEvent} */ (event))))
    this.socket.addEventListener("close", () => this.#close())
    this.socket.addEventListener("error", () => this.#close())
  }

  /** @param {unknown} value */
  send(value) {
    this.socket.send(typeof value === "string" ? value : JSON.stringify(value))
  }

  close() {
    this.socket.close()
    this.#close()
  }

  async *events() {
    while (true) {
      const next = await this.#next()
      if (next.done) return
      yield next.value
    }
  }

  /** @param {unknown} value */
  #push(value) {
    const waiting = this.#waiting.shift()
    if (waiting) {
      waiting({ value, done: false })
      return
    }
    this.#queue.push(value)
  }

  #close() {
    if (this.#closed) return
    this.#closed = true
    for (const resolve of this.#waiting.splice(0)) resolve({ value: undefined, done: true })
  }

  /** @returns {Promise<IteratorResult<unknown>>} */
  #next() {
    const value = this.#queue.shift()
    if (value !== undefined) return Promise.resolve({ value, done: false })
    if (this.#closed) return Promise.resolve({ value: undefined, done: true })
    return new Promise((resolve) => this.#waiting.push(resolve))
  }
}

/**
 * @param {string} prompt
 * @param {TextRequestOptions} [options]
 */
export function buildTextRequest(prompt, options = {}) {
  const request = /** @type {Record<string, unknown>} */ ({
    model: options.model ?? DEFAULT_TEXT_MODEL,
    input: [inputTextMessage(prompt)],
    store: false,
    stream: options.stream ?? true,
  })
  if (options.instructions !== undefined) request.instructions = options.instructions
  if (options.schema !== undefined) {
    request.text = {
      format: {
        type: "json_schema",
        name: options.schemaName ?? "llm_output",
        schema: options.schema,
        strict: options.schemaStrict ?? true,
      },
    }
  }
  if (options.tools !== undefined) request.tools = options.tools
  if (options.toolChoice !== undefined) request.tool_choice = options.toolChoice
  return request
}

/**
 * @param {string} prompt
 * @param {ImageRequestOptions} [options]
 */
export function buildImageRequest(prompt, options = {}) {
  const imageTool = /** @type {Record<string, unknown>} */ ({
    type: "image_generation",
    model: options.imageModel ?? DEFAULT_IMAGE_MODEL,
    size: options.size ?? "1024x1024",
    quality: options.quality ?? "low",
    output_format: options.outputFormat ?? "png",
  })
  if (options.background !== undefined) imageTool.background = options.background
  if (options.partialImages !== undefined) imageTool.partial_images = options.partialImages
  if (options.outputCompression !== undefined) imageTool.output_compression = options.outputCompression

  return {
    model: options.textModel ?? DEFAULT_IMAGE_TEXT_MODEL,
    input: [inputTextMessage(prompt)],
    instructions: "Generate exactly one image. Do not answer with text unless the image generation tool fails.",
    tools: [imageTool],
    tool_choice: { type: "image_generation" },
    store: false,
    stream: true,
  }
}

/**
 * @param {string[]} input
 * @param {EmbeddingRequestOptions} [options]
 */
export function buildEmbeddingRequest(input, options = {}) {
  return {
    model: options.model ?? DEFAULT_EMBEDDING_MODEL,
    input,
    encoding_format: options.encodingFormat ?? "float",
    ...(options.dimensions !== undefined ? { dimensions: options.dimensions } : {}),
  }
}

/** @param {string} body */
export function parseServerSentEvents(body) {
  /** @type {unknown[]} */
  const events = []
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trimStart()
    if (!line.startsWith("data:")) continue
    const data = line.slice("data:".length).trim()
    if (data.length === 0 || data === "[DONE]") continue
    try {
      events.push(JSON.parse(data))
    } catch {
      // Keep scanning; streamed responses can include non-JSON keepalive noise.
    }
  }
  return events
}

/** @param {string} body */
export function extractOutputText(body) {
  let outputText = ""
  let sawText = false

  for (const event of parseServerSentEvents(body)) {
    if (!isRecord(event)) continue
    if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
      outputText += event.delta
      sawText = true
      continue
    }
    if (event.type === "response.output_text.done" && typeof event.text === "string") {
      outputText = event.text
      sawText = true
      continue
    }
    if (event.type === "response.completed" && isRecord(event.response)) {
      const text = textFromResponseObject(event.response)
      if (text !== undefined) {
        outputText = text
        sawText = true
      }
    }
  }
  if (sawText) return outputText
  return textFromResponseObject(tryParseJson(body))
}

/** @param {string} body */
export function extractImageBase64(body) {
  /** @type {string[]} */
  const results = []
  for (const event of parseServerSentEvents(body)) {
    if (!isRecord(event)) continue
    if (event.type === "response.output_item.done" && isRecord(event.item) && event.item.type === "image_generation_call" && typeof event.item.result === "string") {
      results.push(event.item.result)
      continue
    }
    if (event.type === "response.completed" && isRecord(event.response)) {
      const result = imageResultFromResponseObject(event.response)
      if (result !== undefined) results.push(result)
    }
  }
  if (results.length > 0) return results.at(-1)
  return imageResultFromResponseObject(tryParseJson(body))
}

/** @param {string} body */
export function extractToolCalls(body) {
  /** @type {OpenAIToolCall[]} */
  const calls = []
  for (const event of parseServerSentEvents(body)) {
    if (!isRecord(event)) continue
    if (event.type === "response.output_item.done" && isRecord(event.item) && isToolCall(event.item)) {
      calls.push(event.item)
      continue
    }
    if (event.type === "response.completed" && isRecord(event.response)) calls.push(...toolCallsFromResponseObject(event.response))
  }
  if (calls.length > 0) return calls
  return toolCallsFromResponseObject(tryParseJson(body))
}

/** @param {string} text */
function inputTextMessage(text) {
  return {
    role: "user",
    content: [{ type: "input_text", text }],
  }
}

/**
 * @param {OpenAIClient} client
 * @param {"responses" | "embeddings" | "realtime/session"} resource
 */
function endpointFor(client, resource) {
  if (client.transport === "api-key-direct") return `${client.baseUrl}/${resource}`
  if (client.transport === "codex-broker") return `${client.brokerUrl}/codex/${resource}`
  return `${client.brokerUrl}/api/${resource}`
}

/** @param {OpenAIClient} client */
function realtimeSocketUrl(client) {
  if (typeof location === "undefined") return `${client.brokerUrl}/realtime`
  const brokerUrl = new URL(`${client.brokerUrl}/realtime`, location.href)
  brokerUrl.protocol = brokerUrl.protocol === "https:" ? "wss:" : "ws:"
  const runnerToken = runnerTokenFromLocation()
  if (runnerToken !== undefined) brokerUrl.searchParams.set("t", runnerToken)
  return brokerUrl.href
}

/** @param {OpenAIClient} client */
function headersFor(client) {
  /** @type {Record<string, string>} */
  const headers = { "content-type": "application/json" }
  if (client.transport === "api-key-direct") {
    if (!client.apiKey) throw new Error("OpenAI API key is required for direct API calls")
    headers.authorization = `Bearer ${client.apiKey}`
    if (client.auth.organization !== undefined) headers["OpenAI-Organization"] = client.auth.organization
    if (client.auth.project !== undefined) headers["OpenAI-Project"] = client.auth.project
  } else {
    if (client.apiKey) headers["x-openai-api-key"] = client.apiKey
    const runnerToken = runnerTokenFromLocation()
    if (runnerToken !== undefined) headers["x-web-native-openai-token"] = runnerToken
  }
  return headers
}

/**
 * @param {Response} response
 * @param {string} body
 */
function responseErrorMessage(response, body) {
  const parsed = tryParseJson(body)
  if (isRecord(parsed)) {
    if (isRecord(parsed.error) && typeof parsed.error.message === "string") return parsed.error.message
    if (typeof parsed.message === "string") return parsed.message
  }
  return body.trim() || `HTTP ${response.status} ${response.statusText}`.trim()
}

/** @param {string} body */
function parseJsonOrText(body) {
  const parsed = tryParseJson(body)
  return parsed === undefined ? body : parsed
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

/** @param {unknown} response */
function imageResultFromResponseObject(response) {
  if (!isRecord(response) || !Array.isArray(response.output)) return undefined
  const results = response.output
    .filter((item) => isRecord(item) && item.type === "image_generation_call" && typeof item.result === "string")
    .map((item) => /** @type {string} */ (/** @type {Record<string, unknown>} */ (item).result))
  return results.at(-1)
}

/** @param {unknown} response */
function toolCallsFromResponseObject(response) {
  if (!isRecord(response) || !Array.isArray(response.output)) return []
  return response.output.filter(isToolCall)
}

/**
 * @param {unknown} value
 * @returns {value is OpenAIToolCall}
 */
function isToolCall(value) {
  if (!isRecord(value)) return false
  if (value.type !== "function_call" && value.type !== "tool_call") return false
  return typeof value.name === "string" || (isRecord(value.function) && typeof value.function.name === "string")
}

/** @param {OpenAIToolCall} call */
function toolCallName(call) {
  return call.name ?? call.function?.name
}

/** @param {OpenAIToolCall} call */
function toolCallId(call) {
  return call.call_id ?? call.id ?? toolCallName(call) ?? "tool_call"
}

/** @param {OpenAIToolCall} call */
function toolCallArguments(call) {
  const args = call.arguments ?? call.function?.arguments ?? {}
  if (typeof args === "string") {
    const parsed = tryParseJson(args)
    return isRecord(parsed) ? parsed : {}
  }
  return isRecord(args) ? args : {}
}

/** @param {MessageEvent} event */
function parseWebSocketMessage(event) {
  if (typeof event.data !== "string") return event.data
  const parsed = tryParseJson(event.data)
  return parsed === undefined ? event.data : parsed
}

/** @param {string} body */
function tryParseJson(body) {
  try {
    return JSON.parse(body)
  } catch {
    return undefined
  }
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** @param {string} value */
function trimTrailingSlash(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value
}

function runnerTokenFromLocation() {
  if (typeof location === "undefined") return undefined
  const token = new URLSearchParams(location.search).get("t")
  return token ?? undefined
}

/** @param {string} format */
function mediaTypeForImageFormat(format) {
  if (format === "jpg" || format === "jpeg") return "image/jpeg"
  if (format === "webp") return "image/webp"
  return "image/png"
}
