// @ts-check

/** @typedef {{ EditorState: any, EditorView: any, Compartment: any, basicSetup: unknown, minimalSetup: unknown, placeholder?: (text: string) => unknown, indentUnit?: { of: (value: string) => unknown } }} CodeMirrorModules */
/** @typedef {{ setup: any, language: any, wrapping: any, readOnly: any, placeholder: any, tabSize: any, indentUnit: any }} CodeMirrorCompartments */

const eventNames = {
  ready: "codemirror-editor:ready",
  input: "codemirror-editor:input",
  error: "codemirror-editor:error",
}

const defaultCdnBase = "https://esm.sh"
const setups = ["basic", "minimal"]
const languageAliases = new Map([
  ["", "plaintext"],
  ["plain", "plaintext"],
  ["text", "plaintext"],
  ["plaintext", "plaintext"],
  ["js", "javascript"],
  ["javascript", "javascript"],
  ["jsx", "javascript"],
  ["ts", "typescript"],
  ["tsx", "typescript"],
  ["typescript", "typescript"],
  ["json", "json"],
  ["html", "html"],
  ["css", "css"],
  ["md", "markdown"],
  ["markdown", "markdown"],
])

const coreSpecifier = "codemirror@6"

const languageSpecifiers = {
  javascript: "@codemirror/lang-javascript@6",
  typescript: "@codemirror/lang-javascript@6",
  json: "@codemirror/lang-json@6",
  html: "@codemirror/lang-html@6",
  css: "@codemirror/lang-css@6",
  markdown: "@codemirror/lang-markdown@6",
}

const editorStyles = String.raw`
  :host {
    --codemirror-editor-accent: Highlight;
    --codemirror-editor-border: color-mix(in oklch, CanvasText 14%, transparent);
    --codemirror-editor-muted: color-mix(in oklch, CanvasText 62%, transparent);
    --codemirror-editor-surface: color-mix(in oklch, Canvas 97%, CanvasText 3%);
    --codemirror-editor-radius: 0.5rem;
    color: CanvasText;
    display: block;
    font-family: ui-sans-serif, system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  .shell {
    background: Canvas;
    border: 1px solid var(--codemirror-editor-border);
    border-radius: var(--codemirror-editor-radius);
    block-size: var(--codemirror-editor-block-size, var(--codemirror-editor-min-block-size, 12rem));
    box-sizing: border-box;
    display: grid;
    inline-size: 100%;
    min-block-size: var(--codemirror-editor-min-block-size, 12rem);
    min-inline-size: 0;
    overflow: clip;
  }

  .mount {
    block-size: 100%;
    display: none;
    inline-size: 100%;
    min-block-size: 0;
    min-inline-size: 0;
    overflow: hidden;
  }

  :host([data-enhanced]) .mount {
    display: block;
  }

  :host([data-enhanced]) .fallback {
    display: none;
  }

  .fallback {
    block-size: 100%;
    inline-size: 100%;
    min-block-size: 0;
    min-inline-size: 0;
    overflow: hidden;
  }

  ::slotted(textarea) {
    background: Canvas;
    block-size: 100%;
    border: 0;
    box-sizing: border-box;
    color: CanvasText;
    display: block;
    font: 0.875rem/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    inline-size: 100%;
    min-block-size: 100%;
    min-inline-size: 0;
    outline: 0;
    overflow: auto;
    padding: 0.75rem;
    resize: none;
    tab-size: var(--codemirror-editor-tab-size, 2);
  }

  ::slotted(textarea:focus-visible) {
    outline: 2px solid color-mix(in oklch, var(--codemirror-editor-accent) 76%, CanvasText 24%);
    outline-offset: -2px;
  }

  .cm-editor {
    background: Canvas;
    block-size: 100%;
    color: CanvasText;
    min-block-size: 0;
    min-inline-size: 0;
  }

  .cm-scroller {
    block-size: 100%;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    min-block-size: 0;
    min-inline-size: 0;
    overflow: auto;
  }

  .cm-content {
    caret-color: CanvasText;
    min-block-size: 100%;
    min-inline-size: 0;
  }

  .cm-focused {
    outline: 2px solid color-mix(in oklch, var(--codemirror-editor-accent) 76%, CanvasText 24%);
    outline-offset: -2px;
  }

  .cm-placeholder {
    color: var(--codemirror-editor-muted);
  }

  :host([data-disabled]) .cm-editor {
    background: var(--codemirror-editor-surface);
    color: var(--codemirror-editor-muted);
  }
`

const moduleCache = new Map()

export class CodeMirrorEditor extends HTMLElement {
  static observedAttributes = [
    "cdn-base",
    "disabled",
    "indent-unit",
    "language",
    "line-wrapping",
    "placeholder",
    "readonly",
    "setup",
    "tab-size",
  ]

  static defaultLanguage = "plaintext"

  /** @type {HTMLTextAreaElement | null} */
  #textarea = null

  /** @type {HTMLFormElement | null} */
  #form = null

  /** @type {MutationObserver | undefined} */
  #observer

  /** @type {HTMLElement | null} */
  #mount = null

  /** @type {any | undefined} */
  #view

  /** @type {CodeMirrorModules | undefined} */
  #modules

  /** @type {CodeMirrorCompartments | undefined} */
  #compartments

  /** @type {Promise<unknown | null>} */
  #readyPromise = Promise.resolve(null)

  #refreshVersion = 0
  #syncingTextarea = false
  #syncingView = false

  /** @type {boolean | "until-found" | undefined} */
  #textareaHiddenBeforeEnhance

  /** @type {(event: Event) => void} */
  #handleTextareaInput = () => {
    if (this.#syncingTextarea) return
    this.#syncViewFromTextarea()
  }

  /** @type {(event: Event) => void} */
  #handleFormReset = () => {
    setTimeout(() => {
      if (this.isConnected) this.#syncViewFromTextarea()
    }, 0)
  }

  connectedCallback() {
    this.#ensureShadow()
    this.#connectTextarea()
    this.#syncTextareaAttributes()

    if (!this.#observer) {
      this.#observer = new MutationObserver(() => {
        this.#connectTextarea()
        this.#syncTextareaAttributes()
        void this.refresh()
      })
      this.#observer.observe(this, { childList: true })
    }

    void this.refresh()
  }

  disconnectedCallback() {
    this.#observer?.disconnect()
    this.#observer = undefined
    this.#disconnectTextarea()
    this.#destroyView()
  }

  /**
   * @param {string} name
   * @param {string | null} oldValue
   * @param {string | null} newValue
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return

    this.#syncTextareaAttributes(name)
    if (this.isConnected) void this.refresh()
  }

  /** @returns {string} */
  get value() {
    return this.#textarea?.value ?? ""
  }

  /** @param {string | null | undefined} value */
  set value(value) {
    this.#ensureTextarea().value = value == null ? "" : String(value)
    this.#syncViewFromTextarea()
  }

  /** @returns {HTMLTextAreaElement | null} */
  get textarea() {
    return this.#textarea
  }

  /** @returns {unknown | undefined} */
  get view() {
    return this.#view
  }

  /** @returns {Promise<unknown | null>} */
  get ready() {
    return this.#readyPromise
  }

  /** @returns {string} */
  get cdnBase() {
    return (this.getAttribute("cdn-base") ?? defaultCdnBase).trim() || defaultCdnBase
  }

  /** @param {string | null | undefined} value */
  set cdnBase(value) {
    if (value == null) this.removeAttribute("cdn-base")
    else this.setAttribute("cdn-base", String(value))
  }

  /** @returns {string} */
  get language() {
    const fallback = /** @type {typeof CodeMirrorEditor} */ (this.constructor).defaultLanguage
    return normalizeLanguage(this.getAttribute("language") ?? fallback)
  }

  /** @param {string | null | undefined} value */
  set language(value) {
    if (value == null) this.removeAttribute("language")
    else this.setAttribute("language", normalizeLanguage(value))
  }

  /** @returns {"basic" | "minimal"} */
  get setup() {
    return /** @type {"basic" | "minimal"} */ (normalizeToken(this.getAttribute("setup"), "basic", setups))
  }

  /** @param {string | null | undefined} value */
  set setup(value) {
    if (value == null) this.removeAttribute("setup")
    else this.setAttribute("setup", normalizeToken(value, "basic", setups))
  }

  /** @returns {boolean} */
  get lineWrapping() {
    return this.hasAttribute("line-wrapping")
  }

  /** @param {boolean} value */
  set lineWrapping(value) {
    setBooleanAttribute(this, "line-wrapping", value)
  }

  /** @returns {boolean} */
  get readonly() {
    return this.hasAttribute("readonly") || Boolean(this.#textarea?.readOnly)
  }

  /** @param {boolean} value */
  set readonly(value) {
    setBooleanAttribute(this, "readonly", value)
    if (this.#textarea) this.#textarea.readOnly = value
  }

  /** @returns {boolean} */
  get disabled() {
    return this.hasAttribute("disabled") || Boolean(this.#textarea?.disabled)
  }

  /** @param {boolean} value */
  set disabled(value) {
    setBooleanAttribute(this, "disabled", value)
    if (this.#textarea) this.#textarea.disabled = value
  }

  /** @returns {string} */
  get placeholder() {
    return this.getAttribute("placeholder") ?? this.#textarea?.placeholder ?? ""
  }

  /** @param {string | null | undefined} value */
  set placeholder(value) {
    if (value == null) this.removeAttribute("placeholder")
    else this.setAttribute("placeholder", String(value))
  }

  /** @returns {number} */
  get tabSize() {
    const parsed = Number(this.getAttribute("tab-size"))
    return Number.isFinite(parsed) && parsed > 0 ? Math.max(1, Math.floor(parsed)) : 2
  }

  /** @param {number | string | null | undefined} value */
  set tabSize(value) {
    if (value == null || value === "") this.removeAttribute("tab-size")
    else this.setAttribute("tab-size", String(value))
  }

  /** @returns {string} */
  get indentUnit() {
    return this.getAttribute("indent-unit") ?? ""
  }

  /** @param {string | null | undefined} value */
  set indentUnit(value) {
    if (value == null) this.removeAttribute("indent-unit")
    else this.setAttribute("indent-unit", String(value))
  }

  /** @returns {Promise<unknown | null>} */
  refresh() {
    this.#readyPromise = this.#refresh(++this.#refreshVersion)
    return this.#readyPromise
  }

  /** @param {FocusOptions} [options] */
  focus(options) {
    if (this.#view && typeof this.#view.focus === "function") {
      this.#view.focus()
    } else {
      this.#ensureTextarea().focus(options)
    }
  }

  /** @param {number} version */
  async #refresh(version) {
    this.#ensureShadow()
    const textarea = this.#ensureTextarea()
    this.#syncTextareaAttributes()

    try {
      if (!this.#modules || this.#viewCdnBase !== this.cdnBase) {
        this.#destroyView()
        this.#modules = await loadCoreModules(this.cdnBase)
        this.#viewCdnBase = this.cdnBase
      }

      if (version !== this.#refreshVersion || !this.isConnected) return null

      if (!this.#view) {
        await this.#createView(textarea)
      } else {
        await this.#reconfigureView()
        this.#syncViewFromTextarea()
      }

      if (version !== this.#refreshVersion || !this.#view) return null

      this.#setEnhanced(true)
      this.#applyHostState()
      this.dispatchEvent(new CustomEvent(eventNames.ready, {
        bubbles: true,
        composed: true,
        detail: { view: this.#view, language: this.language },
      }))
      return this.#view
    } catch (error) {
      if (version !== this.#refreshVersion) return null
      this.#destroyView()
      this.#dispatchError(error, "load")
      return null
    }
  }

  /** @type {string | undefined} */
  #viewCdnBase

  /** @param {HTMLTextAreaElement} textarea */
  async #createView(textarea) {
    const modules = /** @type {CodeMirrorModules} */ (this.#modules)
    const compartments = createCompartments(modules.Compartment)
    this.#compartments = compartments

    const state = modules.EditorState.create({
      doc: textarea.value,
      extensions: await this.#extensions(),
    })

    const mount = /** @type {HTMLElement} */ (this.#mount)
    mount.replaceChildren()
    this.#view = new modules.EditorView({ state, parent: mount })
  }

  async #reconfigureView() {
    if (!this.#view || !this.#compartments) return
    const compartments = this.#compartments
    const effects = [
      compartments.setup.reconfigure(this.#setupExtension()),
      compartments.language.reconfigure(await this.#languageExtension()),
      compartments.wrapping.reconfigure(this.#wrappingExtension()),
      compartments.readOnly.reconfigure(this.#readOnlyExtension()),
      compartments.placeholder.reconfigure(this.#placeholderExtension()),
      compartments.tabSize.reconfigure(this.#tabSizeExtension()),
      compartments.indentUnit.reconfigure(this.#indentUnitExtension()),
    ]
    this.#view.dispatch({ effects })
  }

  async #extensions() {
    const compartments = /** @type {CodeMirrorCompartments} */ (this.#compartments)
    return [
      compartments.setup.of(this.#setupExtension()),
      compartments.language.of(await this.#languageExtension()),
      compartments.wrapping.of(this.#wrappingExtension()),
      compartments.readOnly.of(this.#readOnlyExtension()),
      compartments.placeholder.of(this.#placeholderExtension()),
      compartments.tabSize.of(this.#tabSizeExtension()),
      compartments.indentUnit.of(this.#indentUnitExtension()),
      this.#updateListenerExtension(),
    ]
  }

  #setupExtension() {
    const modules = /** @type {CodeMirrorModules} */ (this.#modules)
    return this.setup === "minimal" ? modules.minimalSetup : modules.basicSetup
  }

  async #languageExtension() {
    const language = this.language
    if (language === "plaintext") return []
    if (!Object.hasOwn(languageSpecifiers, language)) return []

    try {
      const specifier = languageSpecifiers[/** @type {keyof typeof languageSpecifiers} */ (language)]
      const module = await importModule(this.cdnBase, specifier)
      if (language === "javascript" && typeof module.javascript === "function") return module.javascript()
      if (language === "typescript" && typeof module.javascript === "function") return module.javascript({ typescript: true })
      if (language === "json" && typeof module.json === "function") return module.json()
      if (language === "html" && typeof module.html === "function") return module.html()
      if (language === "css" && typeof module.css === "function") return module.css()
      if (language === "markdown" && typeof module.markdown === "function") return module.markdown()
      throw new Error(`CodeMirror language package did not export ${language}.`)
    } catch (error) {
      this.#dispatchError(error, "language")
      return []
    }
  }

  #wrappingExtension() {
    const modules = /** @type {CodeMirrorModules} */ (this.#modules)
    return this.lineWrapping ? modules.EditorView.lineWrapping ?? [] : []
  }

  #readOnlyExtension() {
    const modules = /** @type {CodeMirrorModules} */ (this.#modules)
    const readOnly = this.readonly || this.disabled
    const editable = !readOnly
    return [
      modules.EditorState.readOnly?.of(readOnly) ?? [],
      modules.EditorView.editable?.of(editable) ?? [],
    ]
  }

  #placeholderExtension() {
    const modules = /** @type {CodeMirrorModules} */ (this.#modules)
    return this.placeholder && modules.placeholder ? modules.placeholder(this.placeholder) : []
  }

  #tabSizeExtension() {
    const modules = /** @type {CodeMirrorModules} */ (this.#modules)
    return modules.EditorState.tabSize?.of(this.tabSize) ?? []
  }

  #indentUnitExtension() {
    const modules = /** @type {CodeMirrorModules} */ (this.#modules)
    return this.indentUnit && modules.indentUnit ? modules.indentUnit.of(this.indentUnit) : []
  }

  #updateListenerExtension() {
    const modules = /** @type {CodeMirrorModules} */ (this.#modules)
    return modules.EditorView.updateListener.of((/** @type {{ docChanged?: boolean, state: { doc: { toString: () => string } } }} */ update) => {
      if (!update.docChanged || this.#syncingView) return
      this.#commitViewText(update.state.doc.toString())
    })
  }

  #syncViewFromTextarea() {
    if (!this.#view || !this.#textarea) return
    const nextText = this.#textarea.value
    const currentText = this.#view.state.doc.toString()
    if (nextText === currentText) return

    this.#syncingView = true
    try {
      this.#view.dispatch({
        changes: { from: 0, to: currentText.length, insert: nextText },
      })
    } finally {
      this.#syncingView = false
    }
  }

  /** @param {string} text */
  #commitViewText(text) {
    const textarea = this.#ensureTextarea()
    if (textarea.value === text) return

    textarea.value = text
    this.#syncingTextarea = true
    textarea.dispatchEvent(createTextInputEvent())
    this.#syncingTextarea = false

    this.dispatchEvent(new CustomEvent(eventNames.input, {
      bubbles: true,
      composed: true,
      detail: { value: text, view: this.#view },
    }))
  }

  #ensureShadow() {
    if (this.shadowRoot) {
      this.#mount = /** @type {HTMLElement | null} */ (this.shadowRoot.querySelector("[part='editor']"))
      return
    }

    const shadow = this.attachShadow({ mode: "open" })
    const style = document.createElement("style")
    style.textContent = editorStyles

    const shell = document.createElement("section")
    shell.className = "shell"
    shell.setAttribute("part", "shell")

    const mount = document.createElement("div")
    mount.className = "mount"
    mount.setAttribute("part", "editor")

    const fallback = document.createElement("div")
    fallback.className = "fallback"
    fallback.setAttribute("part", "fallback")

    const slot = document.createElement("slot")
    slot.name = "source"
    fallback.append(slot)
    shell.append(mount, fallback)
    shadow.append(style, shell)
    this.#mount = mount
  }

  /** @returns {HTMLTextAreaElement} */
  #ensureTextarea() {
    this.#connectTextarea()
    if (this.#textarea) return this.#textarea

    const textarea = document.createElement("textarea")
    this.append(textarea)
    this.#connectTextarea()
    return textarea
  }

  #connectTextarea() {
    const textarea = this.querySelector("textarea")
    if (textarea === this.#textarea) {
      this.#connectForm()
      return
    }

    this.#disconnectTextarea()
    this.#textarea = textarea

    if (this.#textarea) {
      if (this.#textarea.getAttribute("slot") !== "source") this.#textarea.setAttribute("slot", "source")
      this.#textarea.addEventListener("input", this.#handleTextareaInput)
      this.#connectForm()
    }
  }

  #disconnectTextarea() {
    if (this.#textarea) {
      this.#textarea.removeEventListener("input", this.#handleTextareaInput)
      this.#restoreTextareaVisibility()
    }
    if (this.#form) this.#form.removeEventListener("reset", this.#handleFormReset)
    this.#form = null
    this.#textarea = null
  }

  #connectForm() {
    const form = this.#textarea?.form ?? null
    if (form === this.#form) return
    if (this.#form) this.#form.removeEventListener("reset", this.#handleFormReset)
    this.#form = form
    if (this.#form) this.#form.addEventListener("reset", this.#handleFormReset)
  }

  /** @param {string} [changedName] */
  #syncTextareaAttributes(changedName) {
    if (!this.#textarea) return

    if (this.hasAttribute("disabled") || changedName === "disabled") this.#textarea.disabled = this.hasAttribute("disabled")
    if (this.hasAttribute("readonly") || changedName === "readonly") this.#textarea.readOnly = this.hasAttribute("readonly")
    if (this.hasAttribute("placeholder") || changedName === "placeholder") this.#textarea.placeholder = this.getAttribute("placeholder") ?? ""
  }

  #applyHostState() {
    this.toggleAttribute("data-disabled", this.disabled)
    this.toggleAttribute("data-readonly", this.readonly)
    if (!this.#view?.dom) return

    this.#view.dom.toggleAttribute("aria-disabled", this.disabled)
    this.#view.dom.setAttribute("aria-readonly", String(this.readonly || this.disabled))
    this.#view.dom.dataset.language = this.language
    this.#view.dom.dataset.setup = this.setup
  }

  /** @param {boolean} enhanced */
  #setEnhanced(enhanced) {
    this.toggleAttribute("data-enhanced", enhanced)
    if (!this.#textarea) return

    if (enhanced) {
      if (this.#textareaHiddenBeforeEnhance === undefined) this.#textareaHiddenBeforeEnhance = this.#textarea.hidden
      this.#textarea.hidden = true
    } else {
      this.#restoreTextareaVisibility()
    }
  }

  #restoreTextareaVisibility() {
    if (this.#textarea && this.#textareaHiddenBeforeEnhance !== undefined) {
      this.#textarea.hidden = this.#textareaHiddenBeforeEnhance
    }
    this.#textareaHiddenBeforeEnhance = undefined
  }

  #destroyView() {
    if (this.#view && typeof this.#view.destroy === "function") this.#view.destroy()
    this.#view = undefined
    this.#compartments = undefined
    this.#setEnhanced(false)
    this.#mount?.replaceChildren()
  }

  /**
   * @param {unknown} error
   * @param {string} phase
   */
  #dispatchError(error, phase) {
    this.dispatchEvent(new CustomEvent(eventNames.error, {
      bubbles: true,
      composed: true,
      detail: { error, message: errorMessage(error), phase },
    }))
  }
}

export class CodeMirrorJavaScript extends CodeMirrorEditor {
  static defaultLanguage = "javascript"
}

export class CodeMirrorTypeScript extends CodeMirrorEditor {
  static defaultLanguage = "typescript"
}

export class CodeMirrorJson extends CodeMirrorEditor {
  static defaultLanguage = "json"
}

export class CodeMirrorHtml extends CodeMirrorEditor {
  static defaultLanguage = "html"
}

export class CodeMirrorCss extends CodeMirrorEditor {
  static defaultLanguage = "css"
}

export class CodeMirrorMarkdown extends CodeMirrorEditor {
  static defaultLanguage = "markdown"
}

export function defineCodeMirrorElements() {
  define("codemirror-editor", CodeMirrorEditor)
  define("codemirror-javascript", CodeMirrorJavaScript)
  define("codemirror-typescript", CodeMirrorTypeScript)
  define("codemirror-json", CodeMirrorJson)
  define("codemirror-html", CodeMirrorHtml)
  define("codemirror-css", CodeMirrorCss)
  define("codemirror-markdown", CodeMirrorMarkdown)
}

/**
 * @param {string} name
 * @param {CustomElementConstructor} constructor
 */
function define(name, constructor) {
  if (!customElements.get(name)) customElements.define(name, constructor)
}

/** @param {string} base */
async function loadCoreModules(base) {
  const codemirror = await importModule(base, coreSpecifier)
  const EditorState = codemirror.EditorState
  const EditorView = codemirror.EditorView
  const Compartment = codemirror.Compartment
  if (!EditorState || !EditorView || !Compartment) throw new Error("CodeMirror core modules did not load the required EditorState, EditorView, and Compartment exports.")

  return {
    EditorState,
    EditorView,
    Compartment,
    basicSetup: codemirror.basicSetup ?? [],
    minimalSetup: codemirror.minimalSetup ?? [],
    placeholder: codemirror.placeholder,
    indentUnit: codemirror.indentUnit,
  }
}

/**
 * @param {string} base
 * @param {string} specifier
 * @returns {Promise<any>}
 */
async function importModule(base, specifier) {
  const url = moduleUrl(base, specifier)
  let promise = moduleCache.get(url)
  if (!promise) {
    promise = import(/* @vite-ignore */ url).catch((error) => {
      moduleCache.delete(url)
      throw error
    })
    moduleCache.set(url, promise)
  }
  return await promise
}

/**
 * @param {string} base
 * @param {string} specifier
 */
function moduleUrl(base, specifier) {
  const normalizedBase = (base || defaultCdnBase).trim() || defaultCdnBase
  if (normalizedBase.includes("{specifier}")) return normalizedBase.split("{specifier}").join(specifier)
  if (normalizedBase.includes("{encodedSpecifier}")) return normalizedBase.split("{encodedSpecifier}").join(encodeURIComponent(specifier))
  if (/^(?:data|blob):/i.test(normalizedBase)) return normalizedBase

  const separator = normalizedBase.endsWith("/") ? "" : "/"
  return `${normalizedBase}${separator}${specifier}`
}

/** @param {any} Compartment */
function createCompartments(Compartment) {
  return {
    setup: new Compartment(),
    language: new Compartment(),
    wrapping: new Compartment(),
    readOnly: new Compartment(),
    placeholder: new Compartment(),
    tabSize: new Compartment(),
    indentUnit: new Compartment(),
  }
}

/**
 * @param {string | null | undefined} value
 * @param {string} fallback
 * @param {string[]} allowed
 */
function normalizeToken(value, fallback, allowed) {
  const normalized = String(value ?? "").trim().toLowerCase()
  return allowed.includes(normalized) ? normalized : fallback
}

/** @param {string | null | undefined} value */
function normalizeLanguage(value) {
  const normalized = String(value ?? "").trim().toLowerCase()
  return languageAliases.get(normalized) ?? normalized
}

/**
 * @param {Element} element
 * @param {string} name
 * @param {boolean} value
 */
function setBooleanAttribute(element, name, value) {
  if (value) element.setAttribute(name, "")
  else element.removeAttribute(name)
}

function createTextInputEvent() {
  if (typeof InputEvent === "function") {
    return new InputEvent("input", {
      bubbles: true,
      composed: true,
      data: null,
      inputType: "insertText",
    })
  }

  return new Event("input", { bubbles: true, composed: true })
}

/** @param {unknown} error */
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}
