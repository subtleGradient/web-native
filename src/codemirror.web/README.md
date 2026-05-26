# codemirror.web

Progressively enhance a native textarea into a CodeMirror 6 editor while keeping the textarea as the form value and fallback UI.

```html
<script type="module" src="./define.js"></script>

<form>
  <codemirror-editor language="javascript">
    <textarea name="code" aria-label="Code">console.log("hi")</textarea>
  </codemirror-editor>
</form>
```

The wrapped textarea stays in light DOM. If CodeMirror cannot load, the textarea remains visible and usable. Once enhancement succeeds, CodeMirror edits update `textarea.value`, dispatch a native `input` event on the textarea, and dispatch `codemirror-editor:input` from the wrapper.

Convenience elements set the default language without custom JavaScript:

```html
<codemirror-json><textarea name="settings">{}</textarea></codemirror-json>
<codemirror-markdown><textarea name="body"># Draft</textarea></codemirror-markdown>
```

Supported attributes:

- `language`: `plaintext`, `javascript`, `typescript`, `json`, `html`, `css`, or `markdown`
- `line-wrapping`
- `readonly`
- `disabled`
- `placeholder`
- `tab-size`
- `indent-unit`
- `setup`: `basic` or `minimal`
- `cdn-base`: defaults to `https://esm.sh`

Useful APIs:

```js
editor.value
editor.textarea
editor.view
await editor.ready
await editor.refresh()
editor.focus()
```

`cdn-base` points at a CodeMirror-compatible ESM endpoint. The default imports URLs such as `https://esm.sh/codemirror@6` and `https://esm.sh/@codemirror/lang-json@6`.
