# chat transcript components

Plain custom elements for rendering lightweight archived chat transcripts.

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/subtleGradient/web-native@main/src/chat/define.js"></script>

<topic-transcript data-index=001 data-topic=example>
  <header>
    <h1>001 Example</h1>
  </header>
  <chat-summary data-scope=previous>
    <p>No previous topic.</p>
  </chat-summary>
  <chat-message data-turn=1 data-role=user data-created=2026-05-13T20:36:49.063Z>
    <pre># Raw message body

- Markdown-ish source
- Rendered inside the component shadow tree</pre>
  </chat-message>
</topic-transcript>
```

`chat-message` reads its light DOM body, preferring a nested `pre`, then renders common Markdown-like structures in shadow DOM: headings, paragraphs, lists, blockquotes, fenced code blocks, inline code, links, horizontal rules, and simple pipe tables.

Metadata from `data-*` attributes is shown in the message header. The original light DOM is left in place so transcript source remains portable and inspectable.
