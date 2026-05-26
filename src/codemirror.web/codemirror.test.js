// @ts-check

import { expect } from "chai"
import "./define.js"

const html = String.raw
const mockCdnBase = `data:text/javascript;charset=utf-8,${encodeURIComponent(String.raw`
class TextDoc {
  constructor(text) {
    this.text = String(text ?? "")
  }

  toString() {
    return this.text
  }

  get length() {
    return this.text.length
  }
}

function flatten(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.flatMap(flatten)
  if (value.type === "compartment" || value.type === "reconfigure") return flatten(value.extension)
  return [value]
}

function lastExtension(extensions, type) {
  return flatten(extensions).filter((extension) => extension.type === type).at(-1)
}

export class Compartment {
  of(extension) {
    return { type: "compartment", compartment: this, extension }
  }

  reconfigure(extension) {
    return { type: "reconfigure", compartment: this, extension }
  }
}

export class EditorState {
  constructor(doc, extensions) {
    this.doc = new TextDoc(doc)
    this.extensions = extensions
  }

  static create(config) {
    return new EditorState(config.doc, config.extensions ?? [])
  }
}

EditorState.readOnly = {
  of(value) {
    return { type: "readOnly", value: Boolean(value) }
  },
}

EditorState.tabSize = {
  of(value) {
    return { type: "tabSize", value }
  },
}

export class EditorView {
  constructor(config) {
    this.state = config.state
    this.parent = config.parent
    this.dom = document.createElement("div")
    this.dom.className = "cm-editor"
    this.contentDOM = document.createElement("textarea")
    this.contentDOM.className = "cm-content"
    this.contentDOM.value = this.state.doc.toString()
    this.dom.append(this.contentDOM)
    this.parent.append(this.dom)
    this.listeners = []
    this.applyExtensions()
    this.contentDOM.addEventListener("input", () => {
      this.dispatch({
        changes: { from: 0, to: this.state.doc.length, insert: this.contentDOM.value },
      })
    })
  }

  dispatch(spec) {
    if (spec.effects) this.state.extensions = [...this.state.extensions, ...spec.effects]
    let docChanged = false
    if (spec.changes) {
      const current = this.state.doc.toString()
      const from = Number(spec.changes.from ?? 0)
      const to = Number(spec.changes.to ?? current.length)
      const insert = String(spec.changes.insert ?? "")
      const next = current.slice(0, from) + insert + current.slice(to)
      this.state.doc = new TextDoc(next)
      this.contentDOM.value = next
      docChanged = true
    }
    this.applyExtensions()
    if (docChanged) {
      for (const listener of this.listeners) listener({ docChanged: true, state: this.state, view: this })
    }
  }

  applyExtensions() {
    const extensions = flatten(this.state.extensions)
    this.listeners = extensions.filter((extension) => extension.type === "updateListener").map((extension) => extension.fn)
    this.dom.classList.toggle("cm-lineWrapping", extensions.some((extension) => extension.type === "lineWrapping"))

    const editable = lastExtension(extensions, "editable")
    const readOnly = lastExtension(extensions, "readOnly")
    this.contentDOM.disabled = editable ? editable.value === false : false
    this.contentDOM.readOnly = readOnly ? readOnly.value === true : false

    const placeholder = lastExtension(extensions, "placeholder")
    this.contentDOM.placeholder = placeholder ? placeholder.value : ""

    const language = lastExtension(extensions, "language")
    if (language) this.dom.dataset.language = language.value
  }

  focus() {
    this.contentDOM.focus()
  }

  destroy() {
    this.dom.remove()
  }
}

EditorView.updateListener = {
  of(fn) {
    return { type: "updateListener", fn }
  },
}

EditorView.editable = {
  of(value) {
    return { type: "editable", value: Boolean(value) }
  },
}

EditorView.lineWrapping = { type: "lineWrapping" }

export const basicSetup = [{ type: "setup", value: "basic" }]
export const minimalSetup = [{ type: "setup", value: "minimal" }]
export const indentUnit = {
  of(value) {
    return { type: "indentUnit", value }
  },
}

export function placeholder(value) {
  return { type: "placeholder", value }
}

export function javascript(options = {}) {
  return { type: "language", value: options.typescript ? "typescript" : "javascript" }
}

export function json() {
  return { type: "language", value: "json" }
}

export function html() {
  return { type: "language", value: "html" }
}

export function css() {
  return { type: "language", value: "css" }
}

export function markdown() {
  return { type: "language", value: "markdown" }
}
`)}`
const failingCdnBase = `data:text/javascript;charset=utf-8,${encodeURIComponent("throw new Error('offline CodeMirror fixture')")}`

describe("codemirror-editor", () => {
  afterEach(() => {
    document.querySelectorAll("[data-test-root]").forEach((element) => element.remove())
  })

  it("preserves the wrapped textarea as the form value while enhancing", async () => {
    const root = mount(html`
      <form>
        <codemirror-editor cdn-base="${mockCdnBase}" language="javascript">
          <textarea name="code" aria-label="Code">console.log("hi")</textarea>
        </codemirror-editor>
      </form>
    `)
    const form = /** @type {HTMLFormElement} */ (root.querySelector("form"))
    const editor = getEditor(root)
    const textarea = getTextarea(editor)

    await editor.ready

    expect(new FormData(form).get("code")).to.equal('console.log("hi")')
    expect(textarea.hidden).to.equal(true)
    expect(editor.shadowRoot?.querySelector(".cm-editor")).to.not.equal(null)
  })

  it("syncs CodeMirror edits into the textarea and dispatches input events", async () => {
    const root = mount(html`
      <codemirror-editor cdn-base="${mockCdnBase}">
        <textarea name="code" aria-label="Code">before</textarea>
      </codemirror-editor>
    `)
    const editor = getEditor(root)
    const textarea = getTextarea(editor)
    let nativeInputs = 0
    let editorInputs = 0
    textarea.addEventListener("input", () => {
      nativeInputs += 1
    })
    editor.addEventListener("codemirror-editor:input", () => {
      editorInputs += 1
    })

    await editor.ready

    const control = getCodeControl(editor)
    control.value = "after"
    control.dispatchEvent(new Event("input", { bubbles: true }))
    await flushUpdates()

    expect(textarea.value).to.equal("after")
    expect(nativeInputs).to.equal(1)
    expect(editorInputs).to.equal(1)
  })

  it("syncs direct textarea edits back into CodeMirror", async () => {
    const root = mount(html`
      <codemirror-editor cdn-base="${mockCdnBase}">
        <textarea name="code" aria-label="Code">before</textarea>
      </codemirror-editor>
    `)
    const editor = getEditor(root)
    const textarea = getTextarea(editor)

    await editor.ready

    textarea.value = "from textarea"
    textarea.dispatchEvent(new Event("input", { bubbles: true }))
    await flushUpdates()

    expect(getCodeControl(editor).value).to.equal("from textarea")
  })

  it("leaves the textarea visible and usable when CodeMirror cannot load", async () => {
    const root = mount(html`
      <codemirror-editor cdn-base="${failingCdnBase}">
        <textarea name="code" aria-label="Code">fallback</textarea>
      </codemirror-editor>
    `)
    const editor = getEditor(root)
    const textarea = getTextarea(editor)
    /** @type {{ phase?: string } | undefined} */
    let errorDetail
    editor.addEventListener("codemirror-editor:error", (event) => {
      errorDetail = /** @type {CustomEvent} */ (event).detail
    })

    const view = await editor.ready

    expect(view).to.equal(null)
    expect(textarea.hidden).to.equal(false)
    expect(textarea.value).to.equal("fallback")
    expect(editor.shadowRoot?.querySelector(".cm-editor")).to.equal(null)
    expect(errorDetail?.phase).to.equal("load")
  })

  it("sets alias languages without custom JavaScript", async () => {
    const root = mount(html`
      <codemirror-json cdn-base="${mockCdnBase}">
        <textarea name="json" aria-label="JSON">{}</textarea>
      </codemirror-json>
    `)
    const editor = /** @type {import("./codemirror.js").CodeMirrorJson} */ (root.querySelector("codemirror-json"))

    await editor.ready

    expect(editor.language).to.equal("json")
    expect(editor.shadowRoot?.querySelector(".cm-editor")?.getAttribute("data-language")).to.equal("json")
  })

  it("applies readonly, disabled, placeholder, and wrapping state", async () => {
    const root = mount(html`
      <codemirror-editor cdn-base="${mockCdnBase}" readonly placeholder="Write code" line-wrapping>
        <textarea name="readonly" aria-label="Readonly code">readonly</textarea>
      </codemirror-editor>
      <codemirror-editor cdn-base="${mockCdnBase}" disabled>
        <textarea name="disabled" aria-label="Disabled code">disabled</textarea>
      </codemirror-editor>
    `)
    const readonlyEditor = /** @type {import("./codemirror.js").CodeMirrorEditor} */ (root.querySelector("codemirror-editor"))
    const disabledEditor = /** @type {import("./codemirror.js").CodeMirrorEditor} */ (root.querySelectorAll("codemirror-editor")[1])

    await Promise.all([readonlyEditor.ready, disabledEditor.ready])

    expect(getTextarea(readonlyEditor).readOnly).to.equal(true)
    expect(getCodeControl(readonlyEditor).readOnly).to.equal(true)
    expect(getCodeControl(readonlyEditor).placeholder).to.equal("Write code")
    expect(readonlyEditor.shadowRoot?.querySelector(".cm-editor")?.classList.contains("cm-lineWrapping")).to.equal(true)

    expect(getTextarea(disabledEditor).disabled).to.equal(true)
    expect(getCodeControl(disabledEditor).disabled).to.equal(true)
  })

  it("syncs form resets back into CodeMirror", async () => {
    const root = mount(html`
      <form>
        <codemirror-editor cdn-base="${mockCdnBase}">
          <textarea name="code" aria-label="Code">initial</textarea>
        </codemirror-editor>
      </form>
    `)
    const form = /** @type {HTMLFormElement} */ (root.querySelector("form"))
    const editor = getEditor(root)
    const textarea = getTextarea(editor)

    await editor.ready

    const control = getCodeControl(editor)
    control.value = "changed"
    control.dispatchEvent(new Event("input", { bubbles: true }))
    await flushUpdates()

    expect(textarea.value).to.equal("changed")
    form.reset()
    await flushUpdates()

    expect(textarea.value).to.equal("initial")
    expect(control.value).to.equal("initial")
  })
})

/** @param {string} source */
function mount(source) {
  const root = document.createElement("div")
  root.dataset.testRoot = ""
  root.innerHTML = source
  document.body.append(root)
  return root
}

/** @param {ParentNode} root */
function getEditor(root) {
  return /** @type {import("./codemirror.js").CodeMirrorEditor} */ (root.querySelector("codemirror-editor"))
}

/** @param {import("./codemirror.js").CodeMirrorEditor} editor */
function getTextarea(editor) {
  return /** @type {HTMLTextAreaElement} */ (editor.querySelector("textarea"))
}

/** @param {import("./codemirror.js").CodeMirrorEditor} editor */
function getCodeControl(editor) {
  return /** @type {HTMLTextAreaElement} */ (editor.shadowRoot?.querySelector(".cm-content"))
}

async function flushUpdates() {
  await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}
