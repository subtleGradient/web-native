# openai

Browser-native OpenAI client helpers and custom elements for direct, brokered,
and Codex-backed workflows.

```html
<script type="module" src="./define.js"></script>

<openai-key-field target="ai"></openai-key-field>
<openai-client id="ai" model="gpt-5.5"></openai-client>

<form onsubmit="ai.respond(event)">
  <textarea name="instructions">Answer clearly and briefly.</textarea>
  <textarea name="prompt">Say hello.</textarea>
  <button>Ask</button>
</form>

<openai-result for="ai"></openai-result>
```

`OpenAIClient` supports direct official API-key calls for Responses, hosted tool calls through raw Responses requests, image generation through the Responses `image_generation` tool, embeddings, and streamed response events as async generators.

Semantic chat webapps can use the generic `ai-chat-app` element with
`chat.web` transcript components. The element name intentionally avoids an
OpenAI-specific prefix; it only orchestrates the local runner endpoints.

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/subtleGradient/web-native@main/src/openai/ai-chat.define.js"></script>

<ai-chat-app transcript="thread" model="gpt-5.5" transport-label="codex-broker">
  <topic-transcript id="thread" editable>
    <chat-message><pre>Hello</pre></chat-message>
  </topic-transcript>
  <chat-composer></chat-composer>
  <chat-message-editor></chat-message-editor>
</ai-chat-app>
```

`ai-chat-app` persists only serialized `<topic-transcript>` markup through
`/__ai-chat/save-source`, streams continuations through `/__ai-chat/respond`,
and refreshes nested `a[rel~="enclosure"]` file badges through
`/__ai-chat/file-status`.

```js
import { OpenAIClient } from "./client.js"

const client = new OpenAIClient({ apiKey: "sk-..." })

for await (const event of client.streamResponse({
  model: "gpt-5.5",
  input: [{ role: "user", content: [{ type: "input_text", text: "hello" }] }],
  stream: true,
})) {
  console.log(event)
}
```

The demo index links to focused executable pages for the current hosted tool shapes: `web_search`, `file_search`, `computer`, `code_interpreter`, `mcp` remote servers/connectors, `image_generation`, and `tool_search`. The checked-in demo pages are hard-coded to `transport="codex-broker"` and expect the local runner. Use `respondWithTools(event)` from markup when a page should pass a raw `tools` array to `/v1/responses`:

```html
<form onsubmit="ai.respondWithTools(event)">
  <textarea name="prompt">What was a positive news story from today?</textarea>
  <textarea name="tools">[{"type":"web_search"}]</textarea>
  <button>Search</button>
</form>
```

Optional form fields map directly to Responses parameters: `instructions`, `include` JSON, `reasoning` JSON, `tool_choice` JSON, `parallel_tool_calls`, `background`, `store`, and `model`. Demos default `store` to `false`.

Local function tools are registered as handlers and executed through async generators:

```js
client.registerTool("add", ({ a, b }) => Number(a) + Number(b))

for await (const output of client.runToolCalls(toolCalls)) {
  console.log(output)
}
```

Realtime session creation is available through `client.realtimeSession()`. WebSocket connections use `client.realtimeSocket({ url })`, which wraps incoming messages as an async generator. Browser WebSockets cannot set arbitrary auth headers, and the local runner only brokers session creation, so pass an explicit WebSocket URL from a negotiated realtime session or another realtime gateway.

Run the Codex-broker demos from GitHub:

```sh
bunx --bun -p https://github.com/subtleGradient/web-native/archive/refs/heads/openai.tar.gz web-native-openai src/openai/examples/index.html
```

Or from a local checkout:

```sh
bun ./src/openai/examples/scripts/openai-runner.ts src/openai/examples/index.html
```

To open one small demo directly, replace the path with a focused page such as `src/openai/examples/openai.web-search.demo.html`.

Responses WebSocket Mode demo with sandboxed local `eval_js` tool:

```sh
bun ./src/openai/examples/scripts/openai-runner.ts src/openai/examples/openai.responses-websocket-eval.demo.html
```

The runner serves demo pages from localhost and exposes guarded proxy endpoints under `/__web-native-openai`. `transport="codex-broker"` reads OpenCode OAuth auth from `OPENCODE_AUTH_FILE`, `$XDG_DATA_HOME/opencode/auth.json`, or `~/.local/share/opencode/auth.json`.

Transport can still be swapped in your own markup or client code:

```html
<openai-client id="direct" model="gpt-5.5" transport="api-key-direct"></openai-client>
<openai-client id="api-broker" model="gpt-5.5" transport="api-key-broker"></openai-client>
<openai-client id="codex" model="gpt-5.5" transport="codex-broker"></openai-client>
```

```js
import { OpenAIClient } from "./client.js"

const direct = new OpenAIClient({ apiKey: "sk-...", transport: "api-key-direct" })
const apiBroker = new OpenAIClient({ transport: "api-key-broker" })
const codexBroker = new OpenAIClient({ transport: "codex-broker" })
```

`api-key-direct` calls `https://api.openai.com/v1` from the browser and requires an API key. `api-key-broker` sends requests through `/__web-native-openai/api/*` and uses `OPENAI_API_KEY` or a key forwarded with `openai-key-field`. `codex-broker` sends requests through `/__web-native-openai/codex/*` and never needs a visible key control in the page.
