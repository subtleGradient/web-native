// @ts-check

import { expect } from "chai"
import { OpenAIClient, buildEmbeddingRequest, buildImageRequest, buildTextRequest, extractImageBase64, extractOutputText, extractToolCalls } from "./client.js"
import "./define.js"

const html = String.raw

describe("openai browser client", () => {
  afterEach(() => {
    document.querySelectorAll("[data-test-root]").forEach((element) => element.remove())
  })

  it("builds Responses text requests and extracts streamed output", async () => {
    /** @type {Array<{ url: string, body: unknown, headers: Record<string, string> }>} */
    const calls = []
    const client = new OpenAIClient({
      apiKey: "sk-test",
      fetchFn: async (input, init) => {
        calls.push({
          url: String(input),
          body: JSON.parse(String(init?.body)),
          headers: headersRecord(init?.headers),
        })
        return new Response([
          'data: {"type":"response.output_text.delta","delta":"hel"}',
          'data: {"type":"response.output_text.delta","delta":"lo"}',
          "data: [DONE]",
          "",
        ].join("\n"), { status: 200 })
      },
    })

    const text = await client.text("say hello", { model: "gpt-test", instructions: "Be brief", reasoning: { effort: "low" } })

    expect(text).to.equal("hello")
    expect(calls).to.have.length(1)
    expect(calls[0]?.url).to.equal("https://api.openai.com/v1/responses")
    expect(calls[0]?.headers.authorization).to.equal("Bearer sk-test")
    expect(calls[0]?.body).to.deep.equal(buildTextRequest("say hello", { model: "gpt-test", instructions: "Be brief", reasoning: { effort: "low" } }))
    expect(calls[0]?.body).to.have.deep.property("reasoning", { effort: "low" })
  })

  it("streams response events and text as async generators", async () => {
    const client = new OpenAIClient({
      apiKey: "sk-test",
      fetchFn: async () => new Response([
        'data: {"type":"response.output_text.delta","delta":"a"}',
        'data: {"type":"response.output_text.delta","delta":"b"}',
        "data: [DONE]",
        "",
      ].join("\n"), { status: 200 }),
    })

    const events = []
    for await (const event of client.streamResponse(buildTextRequest("go"))) events.push(event)

    const chunks = []
    for await (const chunk of client.streamText("go")) chunks.push(chunk)

    expect(events).to.deep.equal([
      { type: "response.output_text.delta", delta: "a" },
      { type: "response.output_text.delta", delta: "b" },
    ])
    expect(chunks.join("")).to.equal("ab")
  })

  it("yields streamed response events before the response body closes", async () => {
    /** @type {ReadableStreamDefaultController<Uint8Array> | undefined} */
    let streamController
    const encoder = new TextEncoder()
    const client = new OpenAIClient({
      apiKey: "sk-test",
      fetchFn: async () => new Response(new ReadableStream({
        start(controller) {
          streamController = controller
        },
      }), { status: 200 }),
    })
    const events = client.streamResponse(buildTextRequest("go"))
    const first = events.next()

    streamController?.enqueue(encoder.encode('data: {"type":"response.output_text.delta","delta":"a"}\n'))

    expect(await first).to.deep.equal({ value: { type: "response.output_text.delta", delta: "a" }, done: false })

    streamController?.close()

    expect(await events.next()).to.deep.equal({ value: undefined, done: true })
  })

  it("builds image-generation tool requests and returns data URLs", async () => {
    const client = new OpenAIClient({
      apiKey: "sk-test",
      fetchFn: async (_input, init) => {
        expect(JSON.parse(String(init?.body))).to.deep.equal(buildImageRequest("tiny robot", {
          background: "transparent",
          imageModel: "gpt-image-2",
          outputFormat: "webp",
          quality: "low",
          size: "1024x1024",
          textModel: "gpt-5.2",
        }))
        return new Response([
          'data: {"type":"response.output_item.done","item":{"type":"image_generation_call","result":"aGk="}}',
          "data: [DONE]",
          "",
        ].join("\n"), { status: 200 })
      },
    })

    const result = await client.image("tiny robot", {
      background: "transparent",
      imageModel: "gpt-image-2",
      outputFormat: "webp",
      quality: "low",
      size: "1024x1024",
      textModel: "gpt-5.2",
    })

    expect(result.base64).to.equal("aGk=")
    expect(result.dataUrl).to.equal("data:image/webp;base64,aGk=")
    expect(extractImageBase64(JSON.stringify({ output: [{ type: "image_generation_call", result: "abc" }] }))).to.equal("abc")
  })

  it("posts embeddings to the configured transport", async () => {
    /** @type {unknown[]} */
    const bodies = []
    const client = new OpenAIClient({
      apiKey: "sk-test",
      fetchFn: async (input, init) => {
        expect(String(input)).to.equal("https://api.openai.com/v1/embeddings")
        bodies.push(JSON.parse(String(init?.body)))
        return new Response(JSON.stringify({ data: [{ index: 0, embedding: [0.1] }], model: "text-embedding-3-small" }), { status: 200 })
      },
    })

    const result = await client.embeddings(["hello"], { dimensions: 128, model: "text-embedding-3-small" })

    expect(bodies).to.deep.equal([buildEmbeddingRequest(["hello"], { dimensions: 128, encodingFormat: "float", model: "text-embedding-3-small" })])
    expect(result.data?.[0]?.embedding).to.deep.equal([0.1])
  })

  it("uses broker endpoints for codex auth", async () => {
    const client = new OpenAIClient({
      transport: "codex-broker",
      brokerUrl: "/broker",
      fetchFn: async (input) => {
        expect(String(input)).to.equal("/broker/codex/responses")
        return new Response(JSON.stringify({ output_text: "proxied" }), { status: 200 })
      },
    })

    expect(await client.text("hello", { stream: false })).to.equal("proxied")
  })

  it("posts direct realtime session requests to OpenAI's plural endpoint", async () => {
    const client = new OpenAIClient({
      apiKey: "sk-test",
      fetchFn: async (input) => {
        expect(String(input)).to.equal("https://api.openai.com/v1/realtime/sessions")
        return new Response(JSON.stringify({ client_secret: { value: "rt-test" } }), { status: 200 })
      },
    })

    expect(await client.realtimeSession({ model: "gpt-realtime" })).to.deep.equal({ client_secret: { value: "rt-test" } })
  })

  it("forwards organization and project headers through broker transports", async () => {
    const client = new OpenAIClient({
      apiKey: "sk-test",
      brokerUrl: "/broker",
      organization: "org-test",
      project: "proj-test",
      transport: "api-key-broker",
      fetchFn: async (input, init) => {
        expect(String(input)).to.equal("/broker/api/responses")
        const headers = headersRecord(init?.headers)
        expect(headers["x-openai-api-key"]).to.equal("sk-test")
        expect(headers["openai-organization"]).to.equal("org-test")
        expect(headers["openai-project"]).to.equal("proj-test")
        return new Response(JSON.stringify({ output_text: "proxied" }), { status: 200 })
      },
    })

    expect(await client.text("hello", { stream: false })).to.equal("proxied")
  })

  it("runs function tool calls through registered handlers as an async generator", async () => {
    const client = new OpenAIClient()
    client.registerTool("add", (args) => Number(args.a) + Number(args.b))
    client.registerTool("noop", () => undefined)

    const calls = extractToolCalls(JSON.stringify({
      output: [
        { type: "function_call", call_id: "call_1", name: "add", arguments: '{"a":2,"b":3}' },
        { type: "function_call", call_id: "call_2", name: "noop", arguments: "{}" },
      ],
    }))
    const outputs = []
    for await (const output of client.runToolCalls(calls)) outputs.push(output)

    expect(outputs).to.deep.equal([
      { type: "function_call_output", call_id: "call_1", output: "5" },
      { type: "function_call_output", call_id: "call_2", output: "null" },
    ])
  })

  it("wraps websocket messages as an async generator", async () => {
    MockWebSocket.instances = []
    const client = new OpenAIClient({ brokerUrl: "/broker" })
    expect(() => client.realtimeSocket({ WebSocketCtor: MockWebSocket })).to.throw("No default realtime WebSocket route")

    const socket = client.realtimeSocket({ url: "ws://localhost:4173/realtime", WebSocketCtor: MockWebSocket })
    const events = socket.events()
    const nextEvent = events.next()

    MockWebSocket.instances[0]?.emit("message", { data: '{"type":"ready"}' })
    socket.send({ type: "ping" })

    expect(await nextEvent).to.deep.equal({ value: { type: "ready" }, done: false })
    expect(MockWebSocket.instances[0]?.url).to.equal("ws://localhost:4173/realtime")
    expect(MockWebSocket.instances[0]?.sent).to.deep.equal(['{"type":"ping"}'])
    MockWebSocket.instances[0]?.emit("close", {})
    expect(await events.next()).to.deep.equal({ value: undefined, done: true })
  })

  it("opens Responses WebSocket relay connections through the runner", () => {
    MockWebSocket.instances = []
    const originalUrl = location.href
    history.pushState(null, "", "/?t=runner-token")
    try {
      const client = new OpenAIClient({ brokerUrl: "/broker" })
      client.responsesSocket({ WebSocketCtor: MockWebSocket })

      expect(MockWebSocket.instances[0]?.url).to.equal(`ws://${location.host}/broker/api/responses/ws?t=runner-token`)
    } finally {
      history.replaceState(null, "", originalUrl)
    }
  })

  it("opens Codex Responses WebSocket relay connections through the runner", () => {
    MockWebSocket.instances = []
    const originalUrl = location.href
    history.pushState(null, "", "/?t=runner-token")
    try {
      const client = new OpenAIClient({ brokerUrl: "/broker", transport: "codex-broker" })
      client.responsesSocket({ WebSocketCtor: MockWebSocket })

      expect(MockWebSocket.instances[0]?.url).to.equal(`ws://${location.host}/broker/codex/responses/ws?t=runner-token`)
    } finally {
      history.replaceState(null, "", originalUrl)
    }
  })

  it("drives one-off calls from form markup through openai-client", async () => {
    /** @type {unknown[]} */
    const bodies = []
    const root = mount(html`
      <openai-client id="ai" model="gpt-test"></openai-client>
      <form onsubmit="ai.respond(event)">
        <input name="model" value="gpt-form" />
        <input name="reasoning_effort" value="low" />
        <input name="stream" value="false" />
        <textarea name="instructions">Be brief</textarea>
        <textarea name="prompt">Hello</textarea>
      </form>
      <openai-result for="ai"></openai-result>
    `)
    const controller = /** @type {import("./openai.js").OpenAIClientElement} */ (root.querySelector("openai-client"))
    controller.apiKey = "sk-test"
    controller.client.fetchFn = async (_input, init) => {
      bodies.push(JSON.parse(String(init?.body)))
      return new Response(JSON.stringify({ output_text: "Hi" }), { status: 200 })
    }

    const result = once(controller, "openai:result")
    root.querySelector("form")?.requestSubmit()
    await result

    expect(controller.lastResult?.text).to.equal("Hi")
    expect(bodies[0]).to.deep.equal(buildTextRequest("Hello", { model: "gpt-form", instructions: "Be brief", reasoning: { effort: "low" }, stream: false }))
    expect(root.querySelector("openai-result")?.shadowRoot?.textContent).to.contain("Hi")
  })

  it("streams form text results into openai-result before the body closes", async () => {
    /** @type {ReadableStreamDefaultController<Uint8Array> | undefined} */
    let streamController
    /** @type {unknown[]} */
    const bodies = []
    const encoder = new TextEncoder()
    const root = mount(html`
      <openai-client id="ai" model="gpt-test"></openai-client>
      <form onsubmit="ai.respondStreaming(event)">
        <input name="model" value="gpt-form" />
        <input name="reasoning_effort" value="medium" />
        <textarea name="instructions">Be brief</textarea>
        <textarea name="prompt">Hello</textarea>
      </form>
      <openai-result for="ai"></openai-result>
    `)
    const controller = /** @type {import("./openai.js").OpenAIClientElement} */ (root.querySelector("openai-client"))
    controller.apiKey = "sk-test"
    controller.client.fetchFn = async (_input, init) => {
      bodies.push(JSON.parse(String(init?.body)))
      return new Response(new ReadableStream({
        start(controller) {
          streamController = controller
        },
      }), { status: 200 })
    }

    const firstResult = once(controller, "openai:result")
    root.querySelector("form")?.requestSubmit()
    await flushMicrotasks()
    streamController?.enqueue(encoder.encode('data: {"type":"response.output_text.delta","delta":"Hel"}\n'))
    await firstResult

    expect(bodies[0]).to.deep.equal(buildTextRequest("Hello", { model: "gpt-form", instructions: "Be brief", reasoning: { effort: "medium" }, stream: true }))
    expect(controller.lastResult?.text).to.equal("Hel")
    expect(root.querySelector("openai-result")?.shadowRoot?.textContent).to.contain("Hel")

    const secondResult = once(controller, "openai:result")
    streamController?.enqueue(encoder.encode('data: {"type":"response.output_text.delta","delta":"lo"}\n'))
    await secondResult
    streamController?.close()
    await once(controller, "openai:status")

    expect(controller.lastResult?.text).to.equal("Hello")
    expect(root.querySelector("openai-result")?.shadowRoot?.textContent).to.contain("Hello")
  })

  it("drives raw Responses built-in tool demos from form markup", async () => {
    /** @type {unknown[]} */
    const bodies = []
    const root = mount(html`
      <openai-client id="ai" model="gpt-5.5"></openai-client>
      <form onsubmit="ai.respondWithTools(event)">
        <textarea name="instructions">Use the supplied hosted tool when it helps.</textarea>
        <textarea name="prompt">What was a positive news story from today?</textarea>
        <textarea name="tools">[{"type":"web_search"}]</textarea>
        <textarea name="include">["web_search_call.action.sources"]</textarea>
      </form>
    `)
    const controller = /** @type {import("./openai.js").OpenAIClientElement} */ (root.querySelector("openai-client"))
    controller.apiKey = "sk-test"
    controller.client.fetchFn = async (_input, init) => {
      bodies.push(JSON.parse(String(init?.body)))
      return new Response(JSON.stringify({ output_text: "Sourced result" }), { status: 200 })
    }

    const result = once(controller, "openai:result")
    root.querySelector("form")?.requestSubmit()
    await result

    expect(controller.lastResult?.json).to.deep.equal({ output_text: "Sourced result" })
    expect(bodies[0]).to.deep.equal({
      model: "gpt-5.5",
      instructions: "Use the supplied hosted tool when it helps.",
      input: "What was a positive news story from today?",
      tools: [{ type: "web_search" }],
      include: ["web_search_call.action.sources"],
      store: false,
    })
  })

  it("does not rebuild the OpenAI client when only the model attribute changes", () => {
    const root = mount(html`<openai-client id="ai" model="gpt-first"></openai-client>`)
    const controller = /** @type {import("./openai.js").OpenAIClientElement} */ (root.querySelector("openai-client"))
    const fetchFn = async () => new Response(JSON.stringify({ output_text: "ok" }), { status: 200 })
    controller.client.fetchFn = fetchFn
    controller.client.auth = { type: "api-key", apiKey: "sk-test", organization: "org-test", project: "proj-test" }
    controller.client.registerTool("keep", () => "kept")

    controller.setAttribute("model", "gpt-second")

    expect(controller.client.fetchFn).to.equal(fetchFn)
    expect(controller.client.auth).to.deep.equal({ type: "api-key", apiKey: "sk-test", organization: "org-test", project: "proj-test" })
    expect(controller.client.tools.has("keep")).to.equal(true)
  })

  it("keeps only the latest overlapping form submission result while busy tracks all in-flight work", async () => {
    /** @type {Array<{ body: Record<string, unknown>, resolve: (response: Response) => void }>} */
    const pending = []
    /** @type {unknown[]} */
    const results = []
    /** @type {Array<{ busy: boolean, pending: number }>} */
    const statuses = []
    const root = mount(html`
      <openai-client id="ai"></openai-client>
      <form id="first" onsubmit="ai.respond(event)"><textarea name="prompt">first</textarea></form>
      <form id="second" onsubmit="ai.respond(event)"><textarea name="prompt">second</textarea></form>
    `)
    const controller = /** @type {import("./openai.js").OpenAIClientElement} */ (root.querySelector("openai-client"))
    controller.apiKey = "sk-test"
    controller.client.fetchFn = async (_input, init) => new Promise((resolve) => {
      pending.push({ body: /** @type {Record<string, unknown>} */ (JSON.parse(String(init?.body))), resolve })
    })
    controller.addEventListener("openai:result", (event) => results.push(/** @type {CustomEvent} */ (event).detail))
    controller.addEventListener("openai:status", (event) => statuses.push(/** @type {CustomEvent} */ (event).detail))

    const firstForm = /** @type {HTMLFormElement} */ (root.querySelector("#first"))
    const secondForm = /** @type {HTMLFormElement} */ (root.querySelector("#second"))
    firstForm.requestSubmit()
    secondForm.requestSubmit()
    await flushMicrotasks()

    expect(pending.map((item) => item.body.input)).to.deep.equal([
      [{ role: "user", content: [{ type: "input_text", text: "first" }] }],
      [{ role: "user", content: [{ type: "input_text", text: "second" }] }],
    ])

    pending[1]?.resolve(new Response(JSON.stringify({ output_text: "second done" }), { status: 200 }))
    await once(controller, "openai:result")

    expect(controller.lastResult?.text).to.equal("second done")
    expect(controller.busy).to.equal(true)

    const idle = once(controller, "openai:status")
    pending[0]?.resolve(new Response(JSON.stringify({ output_text: "first stale" }), { status: 200 }))
    await idle

    expect(controller.lastResult?.text).to.equal("second done")
    expect(results).to.have.length(1)
    expect(statuses.at(-1)).to.deep.equal({ busy: false, pending: 0 })
  })

  it("extracts output text from common streamed and JSON response shapes", () => {
    expect(extractOutputText([
      'data: {"type":"response.output_text.delta","delta":"a"}',
      'data: {"type":"response.output_text.done","text":"abc"}',
      "",
    ].join("\n"))).to.equal("abc")

    expect(extractOutputText(JSON.stringify({ output: [{ content: [{ text: "json" }] }] }))).to.equal("json")
  })
})

class MockWebSocket extends EventTarget {
  /** @type {MockWebSocket[]} */
  static instances = []

  /** @type {string[]} */
  sent = []

  /** @param {string | URL} url */
  constructor(url) {
    super()
    this.url = String(url)
    MockWebSocket.instances.push(this)
  }

  /** @param {string} value */
  send(value) {
    this.sent.push(value)
  }

  close() {
    this.emit("close", {})
  }

  /**
   * @param {string} type
   * @param {Record<string, unknown>} init
   */
  emit(type, init) {
    this.dispatchEvent(new MessageEvent(type, init))
  }
}

/** @param {string} markup */
function mount(markup) {
  const root = document.createElement("div")
  root.setAttribute("data-test-root", "")
  root.innerHTML = markup
  document.body.append(root)
  return root
}

async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
}

/**
 * @param {EventTarget} target
 * @param {string} eventName
 */
function once(target, eventName) {
  return new Promise((resolve) => target.addEventListener(eventName, resolve, { once: true }))
}

/** @param {HeadersInit | undefined} headers */
function headersRecord(headers) {
  return Object.fromEntries(new Headers(headers).entries())
}
