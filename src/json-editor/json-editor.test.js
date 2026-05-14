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

  it("compares enum, const, and uniqueItems objects without object key-order sensitivity", async () => {
    const root = mount(html`
      <json-editor id="enum-order" schema='{"enum":[{"a":1,"b":2}]}'>
        <textarea>{"b":2,"a":1}</textarea>
      </json-editor>
      <json-editor id="const-order" schema='{"const":{"first":true,"second":false}}'>
        <textarea>{"second":false,"first":true}</textarea>
      </json-editor>
      <json-editor id="unique-order" schema='{"type":"array","uniqueItems":true}'>
        <textarea>[{"a":1,"b":2},{"b":2,"a":1}]</textarea>
      </json-editor>
    `)

    await flushUpdates()

    expect((await getEditorById(root, "enum-order").validate()).valid).to.equal(true)
    expect((await getEditorById(root, "const-order").validate()).valid).to.equal(true)
    expect((await getEditorById(root, "unique-order").validate()).issues[0]?.schemaPath).to.deep.equal(["uniqueItems"])
  })

  it("validates decimal multipleOf without floating-point modulo false positives", async () => {
    const root = mount(html`
      <json-editor schema='{"type":"number","multipleOf":0.1}'>
        <textarea>0.3</textarea>
      </json-editor>
    `)
    const editor = getEditor(root)

    await flushUpdates()

    expect((await editor.validate()).valid).to.equal(true)

    editor.value = "0.31"
    await flushUpdates()

    expect((await editor.validate()).issues[0]?.schemaPath).to.deep.equal(["multipleOf"])
  })

  it("does not let stale async Standard Schema validation overwrite newer issues", async () => {
    /** @type {(() => void) | undefined} */
    let resolveSlow
    const root = mount(html`
      <json-editor>
        <textarea>{"version":1}</textarea>
      </json-editor>
    `)
    const editor = getEditor(root)
    const textarea = getTextarea(editor)
    editor.schema = {
      "~standard": {
        version: 1,
        vendor: "test",
        /** @param {unknown} value */
        validate(value) {
          if (isRecord(value) && value.version === 1) {
            return new Promise((resolve) => {
              resolveSlow = () => resolve({ issues: [{ message: "stale", path: [{ key: "version" }] }] })
            })
          }
          return { value }
        },
      },
    }

    await Promise.resolve()
    textarea.value = '{"version":2}'
    textarea.dispatchEvent(new Event("input", { bubbles: true }))
    await flushUpdates()

    expect(editor.issues).to.deep.equal([])

    resolveSlow?.()
    await flushUpdates()

    expect(editor.issues).to.deep.equal([])
  })

  it("supports boolean JSON Schemas from programmatic and Standard JSON Schema sources", async () => {
    const root = mount(html`
      <json-editor id="programmatic-false"><textarea>{"anything":true}</textarea></json-editor>
      <json-editor id="standard-json-false"><textarea>{"anything":true}</textarea></json-editor>
    `)
    const programmatic = getEditorById(root, "programmatic-false")
    const standardJson = getEditorById(root, "standard-json-false")

    programmatic.schema = false
    standardJson.schema = {
      "~standard": {
        version: 1,
        vendor: "test",
        jsonSchema: {
          input() {
            return false
          },
        },
      },
    }

    await programmatic.refresh()
    await standardJson.refresh()

    expect((await programmatic.validate()).valid).to.equal(false)
    expect((await standardJson.validate()).valid).to.equal(false)
  })

  it("keeps schema load failures visible as validation issues", async () => {
    originalFetch = globalThis.fetch
    globalThis.fetch = /** @type {typeof fetch} */ (/** @type {unknown} */ (async () => new Response("missing", { status: 404, statusText: "Missing" })))
    const root = mount(html`
      <json-editor schema="/missing-schema.json">
        <textarea>{"ok":true}</textarea>
      </json-editor>
    `)
    const editor = getEditor(root)

    await flushUpdates()

    expect(editor.issues[0]?.message).to.contain("Schema load failed")
    expect(editor.shadowRoot?.textContent).to.not.contain("Valid JSON")
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
