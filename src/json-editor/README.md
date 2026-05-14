# json-editor

Progressively enhance a native textarea into a JSON tree editor while keeping the textarea as the form value.

```html
<script type="module" src="./define.js"></script>

<script type="application/schema+json" id="tool-schema">
{
  "type": "object",
  "required": ["type"],
  "properties": {
    "type": { "enum": ["web_search", "file_search"] },
    "max_num_results": { "type": "integer", "minimum": 1 }
  },
  "additionalProperties": false
}
</script>

<form>
  <json-editor schema="#tool-schema">
    <textarea name="tool">{"type":"web_search"}</textarea>
  </json-editor>
</form>
```

`json-editor` supports inline JSON schema text, `script` elements by `#id` or bare id, and fetchable relative or absolute schema URIs. Programmatic `editor.schema` values may be raw JSON Schema, Standard Schema V1 validators, Standard JSON Schema V1 converters, or a combined `~standard` implementation.

The textarea remains in light DOM and is never replaced, so browser form submission and `FormData` keep working. Edits made in the tree update `textarea.value` with formatted JSON and dispatch native `input` plus `json-editor:input`. Direct textarea edits are parsed back into the tree when valid and reported without clobbering the source when invalid.

Useful APIs:

```js
editor.value
editor.json
editor.issues
await editor.validate()
await editor.refresh()
editor.format()
```
