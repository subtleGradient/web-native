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

    const text = await client.text("say hello", { model: "gpt-test", instructions: "Be brief" })

    expect(text).to.equal("hello")
    expect(calls).to.have.length(1)
    expect(calls[0]?.url).to.equal("https://api.openai.com/v1/responses")
    expect(calls[0]?.headers.authorization).to.equal("Bearer sk-test")
    expect(calls[0]?.body).to.deep.equal(buildTextRequest("say hello", { model: "gpt-test", instructions: "Be brief" }))
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

  it("runs function tool calls through registered handlers as an async generator", async () => {
    const client = new OpenAIClient()
    client.registerTool("add", (args) => Number(args.a) + Number(args.b))

    const calls = extractToolCalls(JSON.stringify({
      output: [{ type: "function_call", call_id: "call_1", name: "add", arguments: '{"a":2,"b":3}' }],
    }))
    const outputs = []
    for await (const output of client.runToolCalls(calls)) outputs.push(output)

    expect(outputs).to.deep.equal([
      { type: "function_call_output", call_id: "call_1", output: "5" },
    ])
  })

  it("wraps websocket messages as an async generator", async () => {
    MockWebSocket.instances = []
    const client = new OpenAIClient({ brokerUrl: "/broker" })
    const socket = client.realtimeSocket({ WebSocketCtor: MockWebSocket })
    const events = socket.events()
    const nextEvent = events.next()

    MockWebSocket.instances[0]?.emit("message", { data: '{"type":"ready"}' })
    socket.send({ type: "ping" })

    expect(await nextEvent).to.deep.equal({ value: { type: "ready" }, done: false })
    expect(MockWebSocket.instances[0]?.url).to.equal("ws://localhost:4173/broker/realtime")
    expect(MockWebSocket.instances[0]?.sent).to.deep.equal(['{"type":"ping"}'])
    MockWebSocket.instances[0]?.emit("close", {})
    expect(await events.next()).to.deep.equal({ value: undefined, done: true })
  })

  it("drives one-off calls from form markup through openai-client", async () => {
    /** @type {unknown[]} */
    const bodies = []
    const root = mount(html`
      <openai-client id="ai" model="gpt-test"></openai-client>
      <form onsubmit="ai.respond(event)">
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
    expect(bodies[0]).to.deep.equal(buildTextRequest("Hello", { model: "gpt-test", instructions: "Be brief" }))
    expect(root.querySelector("openai-result")?.shadowRoot?.textContent).to.contain("Hi")
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
