# openai

Browser-native OpenAI client helpers and custom elements for BYOK workflows.

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

The demo page includes executable Responses examples for the current hosted tool shapes: `web_search`, `file_search`, `computer`, `code_interpreter`, `mcp` remote servers/connectors, `image_generation`, and `tool_search`. Use `respondWithTools(event)` from markup when a demo should pass a raw `tools` array to `/v1/responses`:

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

Broker and Codex modes are available when the page is launched with the local runner:

```sh
bunx --bun -p https://github.com/subtleGradient/web-native/archive/refs/heads/openai.tar.gz web-native-openai src/openai/openai.demo.html
```

Local checkout usage:

```sh
bun ./src/openai/scripts/openai-runner.ts src/openai/openai.demo.html
```

The runner serves the demo from localhost and exposes guarded proxy endpoints under `/__web-native-openai`. `transport="api-key-broker"` uses `OPENAI_API_KEY` or an entered key. `transport="codex-broker"` reads OpenCode OAuth auth from `OPENCODE_AUTH_FILE`, `$XDG_DATA_HOME/opencode/auth.json`, or `~/.local/share/opencode/auth.json`.
