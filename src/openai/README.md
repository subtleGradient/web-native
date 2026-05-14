# openai

Browser-native OpenAI client helpers and custom elements for BYOK workflows.

```html
<script type="module" src="./define.js"></script>

<openai-key-field target="ai"></openai-key-field>
<openai-client id="ai" model="gpt-5.5"></openai-client>

<form onsubmit="ai.respond(event)">
  <textarea name="prompt">Say hello.</textarea>
  <button>Ask</button>
</form>

<openai-result for="ai"></openai-result>
```

`OpenAIClient` supports direct official API-key calls for Responses, image generation through the Responses `image_generation` tool, embeddings, and streamed response events as async generators.

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

Broker and Codex modes are available when the page is launched with the local runner:

```sh
bunx --bun -p https://github.com/subtleGradient/web-native/archive/refs/heads/openai.tar.gz web-native-openai src/openai/openai.demo.html
```

Local checkout usage:

```sh
bun ./src/openai/scripts/openai-runner.ts src/openai/openai.demo.html
```

The runner serves the demo from localhost and exposes guarded proxy endpoints under `/__web-native-openai`. `transport="api-key-broker"` uses `OPENAI_API_KEY` or an entered key. `transport="codex-broker"` reads OpenCode OAuth auth from `OPENCODE_AUTH_FILE`, `$XDG_DATA_HOME/opencode/auth.json`, or `~/.local/share/opencode/auth.json`.
