# chat transcript components

Plain custom elements for rendering lightweight archived chat transcripts.

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/subtleGradient/web-native@main/src/chat.web/define.js"></script>

<topic-transcript editable>
  <header>
    <h1>001 Example</h1>
  </header>
  <chat-summary data-scope=previous data-previous-href=000-previous.topic.htm data-previous-title="000 Previous Topic">
    <p>No previous topic.</p>
  </chat-summary>
  <chat-message>
    <pre># Raw message body

- Markdown-ish source
- Rendered inside the component shadow tree</pre>
    <a rel=enclosure href=../../chat.web/README.md type=text/markdown>
      src/chat.web/README.md
    </a>
  </chat-message>
</topic-transcript>

<chat-composer placeholder="Add a message"></chat-composer>
<chat-message-editor></chat-message-editor>
```

`chat-message` reads its light DOM body, preferring a nested `pre`, then renders common Markdown-like structures in shadow DOM: headings, paragraphs, lists, blockquotes, fenced code blocks, inline code, links, horizontal rules, simple pipe tables, and ChatGPT-style citation tokens like `citeturn289313search1turn289313search21`.

User and assistant messages are inferred from transcript order when `from` is omitted, and are visually distinct without surfacing archival noise like turn numbers or model ids. Messages with `recipient` render as tool events; JSON payloads are parsed into action summaries instead of being dumped as raw JSON. The original light DOM is left in place so transcript source remains portable and inspectable.

When `chat-summary` has `data-previous-href`, it renders a compact link back to the previous topic.

Native links with `rel=enclosure`, `href`, and `type` are rendered as compact
file cards when nested directly in a `chat-message`. They intentionally do not
inline file contents; callers can set runtime-only `data-status`,
`data-current-bytes`, and `data-current-sha256` after checking the file
externally. The older `chat-file-reference` element remains supported as a
compatibility alias.

`topic-transcript` also exposes source-oriented methods for interactive shells:
`normalize()`, `serializeSource()`, `appendMessage()`, `deleteMessage()`,
`messageText()`, and `setMessageText()`. When the transcript has `editable`,
messages render edit/delete controls from shadow DOM and dispatch semantic
events; no action menu markup needs to be duplicated into the transcript HTML.

`chat-composer` and `chat-message-editor` provide generic controls for adding
and editing messages. They emit `chat-composer-submit` and `chat-editor-save`
events, leaving persistence and model calls to a wrapper component or page.
