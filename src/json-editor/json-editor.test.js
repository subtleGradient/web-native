// @ts-check

import { expect } from "chai"
import "./define.js"

const html = String.raw

describe("json-editor", () => {
  /** @type {typeof globalThis.fetch | undefined} */
  let originalFetch

  afterEach(() => {
    document.querySelectorAll("[data-test-root]").forEach((element) => element.remove())
    if (originalFetch) {
      globalThis.fetch = originalFetch
      originalFetch = undefined
    }
  })

  it("preserves the textarea as the form value while rendering a tree", async () => {
    const root = mount(html`
      <form>
        <json-editor>
          <textarea name="payload">{"name":"Ada","enabled":true}</textarea>
        </json-editor>
      </form>
    `)
    const form = /** @type {HTMLFormElement} */ (root.querySelector("form"))
    const editor = getEditor(root)

    await flushUpdates()

    expect(new FormData(form).get("payload")).to.equal('{"name":"Ada","enabled":true}')
    expect(editor.querySelector("textarea")?.getAttribute("slot")).to.equal("source")
    expect(editor.shadowRoot?.querySelector('input[data-json-path="/name"][data-json-kind="string"]')).to.not.equal(null)
    expect(editor.shadowRoot?.querySelector('input[data-json-path="/enabled"][data-json-kind="boolean"]')).to.not.equal(null)
  })

  it("syncs tree edits into the wrapped textarea and dispatches input", async () => {
    const root = mount(html`
      <json-editor>
        <textarea name="payload">{"name":"Ada"}</textarea>
      </json-editor>
    `)
    const editor = getEditor(root)
    const textarea = getTextarea(editor)
    let nativeInputs = 0
    let editorInputs = 0
    textarea.addEventListener("input", () => {
      nativeInputs += 1
    })
    editor.addEventListener("json-editor:input", () => {
      editorInputs += 1
    })

    await flushUpdates()

    const input = /** @type {HTMLInputElement} */ (editor.shadowRoot?.querySelector('input[data-json-path="/name"][data-json-kind="string"]'))
    input.value = "Grace"
    input.dispatchEvent(new Event("input", { bubbles: true }))
    await flushUpdates()

    expect(JSON.parse(textarea.value)).to.deep.equal({ name: "Grace" })
    expect(nativeInputs).to.equal(1)
    expect(editorInputs).to.equal(1)
  })

  it("parses direct textarea edits and reports invalid JSON without clobbering it", async () => {
    const root = mount(html`
      <json-editor>
        <textarea name="payload">{"name":"Ada"}</textarea>
      </json-editor>
    `)
    const editor = getEditor(root)
    const textarea = getTextarea(editor)

    await flushUpdates()

    textarea.value = "{bad"
    textarea.dispatchEvent(new Event("input", { bubbles: true }))
    await flushUpdates()

    expect(textarea.value).to.equal("{bad")
    expect(editor.issues[0]?.message).to.contain("Invalid JSON")
    expect(editor.shadowRoot?.textContent).to.contain("Invalid JSON")

    textarea.value = '{"name":"Fixed"}'
    textarea.dispatchEvent(new Event("input", { bubbles: true }))
    await flushUpdates()

    const input = /** @type {HTMLInputElement} */ (editor.shadowRoot?.querySelector('input[data-json-path="/name"][data-json-kind="string"]'))
    expect(input.value).to.equal("Fixed")
  })

  it("formats valid JSON through the public API", async () => {
    const root = mount(html`
      <json-editor>
        <textarea name="payload">{"b":1,"a":[true]}</textarea>
      </json-editor>
    `)
    const editor = getEditor(root)
    const textarea = getTextarea(editor)

    await flushUpdates()
    editor.format()

    expect(textarea.value).to.equal([
      "{",
      '  "b": 1,',
      '  "a": [',
      "    true",
      "  ]",
      "}",
    ].join("\n"))
  })

  it("loads schemas from inline JSON, script ids, bare ids, and URIs", async () => {
    originalFetch = globalThis.fetch
    globalThis.fetch = /** @type {typeof fetch} */ (/** @type {unknown} */ (async (/** @type {RequestInfo | URL} */ input) => {
      if (String(input).endsWith("/schema.json")) {
        return new Response(JSON.stringify({
          type: "object",
          required: ["uri"],
          properties: { uri: { type: "string" } },
          additionalProperties: false,
        }), { status: 200 })
      }
      return new Response("{}", { status: 404, statusText: "Not found" })
    }))

    const root = mount(html`
      <script id="tool-schema" type="application/schema+json">
        {
          "type": "object",
          "required": ["type"],
          "properties": { "type": { "enum": ["web_search", "file_search"] } },
          "additionalProperties": false
        }
      </script>
      <json-editor id="by-hash" schema="#tool-schema"><textarea>{"type":"bad"}</textarea></json-editor>
      <json-editor id="by-id" schema="tool-schema"><textarea>{"type":"web_search"}</textarea></json-editor>
      <json-editor id="by-inline" schema='{"type":"array","items":{"type":"string"}}'><textarea>[1]</textarea></json-editor>
      <json-editor id="by-uri" schema="/schema.json"><textarea>{}</textarea></json-editor>
    `)

    await flushUpdates()

    expect((await getEditorById(root, "by-hash").validate()).issues[0]?.path).to.deep.equal(["type"])
    expect((await getEditorById(root, "by-id").validate()).valid).to.equal(true)
    expect((await getEditorById(root, "by-inline").validate()).issues[0]?.path).to.deep.equal([0])
    expect((await getEditorById(root, "by-uri").validate()).issues[0]?.path).to.deep.equal(["uri"])
  })

  it("resolves local $defs, anchors, and external $refs", async () => {
    originalFetch = globalThis.fetch
    globalThis.fetch = /** @type {typeof fetch} */ (/** @type {unknown} */ (async (/** @type {RequestInfo | URL} */ input) => {
      if (String(input) === "https://schemas.example.test/external.json") {
        return new Response(JSON.stringify({
          $defs: {
            child: {
              type: "object",
              properties: { count: { type: "integer", minimum: 1 } },
              required: ["count"],
            },
          },
        }), { status: 200 })
      }
      return new Response("{}", { status: 404, statusText: "Not found" })
    }))

    const root = mount(html`
      <script id="ref-schema" type="application/schema+json">
        {
          "$id": "https://schemas.example.test/root.json",
          "type": "object",
          "properties": {
            "local": { "$ref": "#/$defs/local" },
            "anchored": { "$ref": "#named" },
            "external": { "$ref": "https://schemas.example.test/external.json#/$defs/child" }
          },
          "$defs": {
            "local": { "type": "string", "minLength": 2 },
            "anchorTarget": { "$anchor": "named", "type": "boolean" }
          }
        }
      </script>
      <json-editor schema="#ref-schema">
        <textarea>{"local":"x","anchored":"no","external":{"count":0}}</textarea>
      </json-editor>
    `)
    const editor = getEditor(root)

    await flushUpdates()
    const result = await editor.validate()

    expect(result.issues.map((issue) => issue.path)).to.deep.include.members([
      ["local"],
      ["anchored"],
      ["external", "count"],
    ])
  })

  it("accepts Standard Schema V1 validators", async () => {
    const root = mount(html`
      <json-editor>
        <textarea>{"ok":false}</textarea>
      </json-editor>
    `)
    const editor = getEditor(root)
    editor.schema = {
      "~standard": {
        version: 1,
        vendor: "test",
        /** @param {unknown} value */
        validate(value) {
          return isRecord(value) && value.ok === true
            ? { value }
            : { issues: [{ message: "ok must be true", path: [{ key: "ok" }] }] }
        },
      },
    }

    await editor.refresh()
    const result = await editor.validate()

    expect(result.valid).to.equal(false)
    expect(result.issues).to.deep.include({ message: "ok must be true", path: ["ok"], schemaPath: undefined })
  })

  it("accepts Standard JSON Schema V1 converters for UI and validation", async () => {
    const root = mount(html`
      <json-editor schema-target="input">
        <textarea>{"mode":"preview"}</textarea>
      </json-editor>
    `)
    const editor = getEditor(root)
    editor.schema = {
      "~standard": {
        version: 1,
        vendor: "test",
        jsonSchema: {
          input() {
            return {
              type: "object",
              properties: { mode: { enum: ["preview", "live"] } },
              additionalProperties: false,
            }
          },
          output() {
            return { type: "object" }
          },
        },
      },
    }

    await editor.refresh()

    const select = /** @type {HTMLSelectElement} */ (editor.shadowRoot?.querySelector('select[data-json-path="/mode"][data-json-kind="enum"]'))
    expect(Array.from(select.options).map((option) => option.textContent)).to.deep.equal(['"preview"', '"live"'])

    editor.json = { mode: "bad" }
    const result = await editor.validate()
    expect(result.valid).to.equal(false)
    expect(result.issues[0]?.path).to.deep.equal(["mode"])
  })

  it("validates common object, array, enum, and composition keywords", async () => {
    const root = mount(html`
      <json-editor schema='{
        "type": "object",
        "required": ["name"],
        "properties": {
          "mode": { "enum": ["preview", "live"] },
          "count": { "type": "integer", "minimum": 1 },
          "tags": { "type": "array", "items": { "type": "string" }, "uniqueItems": true },
          "choice": {
            "oneOf": [
              { "type": "object", "required": ["kind", "value"], "properties": { "kind": { "const": "text" }, "value": { "type": "string" } } },
              { "type": "object", "required": ["kind", "value"], "properties": { "kind": { "const": "count" }, "value": { "type": "integer" } } }
            ]
          }
        },
        "additionalProperties": false
      }'>
        <textarea>{"mode":"bad","count":0,"tags":["a","a"],"choice":{"kind":"text","value":1},"extra":true}</textarea>
      </json-editor>
    `)
    const editor = getEditor(root)

    await flushUpdates()
    const result = await editor.validate()
    const paths = result.issues.map((issue) => issue.path)

    expect(paths).to.deep.include.members([
      ["name"],
      ["mode"],
      ["count"],
      ["tags"],
      ["choice"],
      ["extra"],
    ])
  })
})

/** @param {string} markup */
function mount(markup) {
  const root = document.createElement("div")
  root.setAttribute("data-test-root", "")
  root.innerHTML = markup
  document.body.append(root)
  return root
}

/** @param {Element} root */
function getEditor(root) {
  return /** @type {import("./index.js").JsonEditor} */ (root.querySelector("json-editor"))
}

/**
 * @param {Element} root
 * @param {string} id
 */
function getEditorById(root, id) {
  return /** @type {import("./index.js").JsonEditor} */ (root.querySelector(`#${id}`))
}

/** @param {import("./index.js").JsonEditor} editor */
function getTextarea(editor) {
  return /** @type {HTMLTextAreaElement} */ (editor.querySelector("textarea"))
}

async function flushUpdates() {
  await Promise.resolve()
  await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await Promise.resolve()
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
