# chat transcript components

Plain custom elements for rendering lightweight archived chat transcripts.

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/subtleGradient/web-native@main/src/chat.web/define.js"></script>

<topic-transcript data-index=001 data-topic=example>
  <header>
    <h1>001 Example</h1>
  </header>
  <chat-summary data-scope=previous data-previous-href=000-previous.topic.htm data-previous-title="000 Previous Topic">
    <p>No previous topic.</p>
  </chat-summary>
  <chat-message data-turn=1 data-role=user data-created=2026-05-13T20:36:49.063Z>
    <pre># Raw message body

- Markdown-ish source
- Rendered inside the component shadow tree</pre>
  </chat-message>
</topic-transcript>
```

`chat-message` reads its light DOM body, preferring a nested `pre`, then renders common Markdown-like structures in shadow DOM: headings, paragraphs, lists, blockquotes, fenced code blocks, inline code, links, horizontal rules, simple pipe tables, and ChatGPT-style citation tokens like `citeturn289313search1turn289313search21`.

User and assistant messages are visually distinct without surfacing archival noise like turn numbers or model ids. Messages with `data-recipient` render as tool events; JSON payloads are parsed into action summaries instead of being dumped as raw JSON. The original light DOM is left in place so transcript source remains portable and inspectable.

When `chat-summary` has `data-previous-href`, it renders a compact link back to the previous topic.
