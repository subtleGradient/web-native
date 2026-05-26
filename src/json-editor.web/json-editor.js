// @ts-check

/** @typedef {null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }} JsonValue */
/** @typedef {{ message: string, path: Array<string | number>, schemaPath?: Array<string | number> }} JsonEditorIssue */
/** @typedef {{ [key: string]: unknown }} JsonSchema */
/** @typedef {{ valid: boolean, issues: JsonEditorIssue[], value: unknown }} JsonEditorValidationResult */
/** @typedef {{ message?: unknown, path?: readonly unknown[] }} StandardIssue */
/** @typedef {{ value?: unknown, issues?: readonly StandardIssue[] }} StandardResult */
/** @typedef {{ validate?: (value: unknown, options?: { libraryOptions?: Record<string, unknown> }) => StandardResult | Promise<StandardResult>, jsonSchema?: { input?: (options: { target: string, libraryOptions?: Record<string, unknown> }) => Record<string, unknown>, output?: (options: { target: string, libraryOptions?: Record<string, unknown> }) => Record<string, unknown> } }} StandardProps */
/** @typedef {{ root?: JsonSchema, documents: Map<string, JsonSchema>, anchors: Map<string, JsonSchema>, baseUris: WeakMap<object, string>, fetched: Set<string> }} SchemaContext */

const eventNames = {
  input: "json-editor:input",
  schemaLoad: "json-editor:schema-load",
  validation: "json-editor:validation",
  error: "json-editor:error",
}

const jsonTypes = ["object", "array", "string", "number", "integer", "boolean", "null"]
const schemaTargets = ["input", "output"]
const externalRefLimit = 64

const editorStyles = String.raw`
  :host {
    --json-editor-accent: Highlight;
    --json-editor-danger: oklch(55% 0.17 28);
    --json-editor-border: color-mix(in oklch, CanvasText 14%, transparent);
    --json-editor-muted-border: color-mix(in oklch, CanvasText 9%, transparent);
    --json-editor-surface: color-mix(in oklch, Canvas 96%, CanvasText 4%);
    --json-editor-surface-strong: color-mix(in oklch, Canvas 91%, CanvasText 9%);
    --json-editor-text-muted: color-mix(in oklch, CanvasText 64%, transparent);
    --json-editor-radius: 0.5rem;
    color: CanvasText;
    display: block;
    font-family: ui-sans-serif, system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  .json-editor {
    background: Canvas;
    border: 1px solid var(--json-editor-border);
    border-radius: var(--json-editor-radius);
    display: grid;
    gap: 0;
    overflow: clip;
  }

  .toolbar,
  .row,
  .add-row,
  .primitive {
    align-items: center;
    gap: 0.5rem;
  }

  .toolbar {
    background: color-mix(in oklch, Canvas 98%, CanvasText 2%);
    border-block-end: 1px solid var(--json-editor-muted-border);
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    padding: 0.5rem 0.625rem;
  }

  .status {
    align-items: center;
    color: var(--json-editor-text-muted);
    display: inline-flex;
    font-size: 0.8125rem;
    font-weight: 500;
    gap: 0.4rem;
    min-block-size: 1.625rem;
  }

  .status[data-invalid] {
    color: var(--json-editor-danger);
    font-weight: 650;
  }

  .status[hidden] + button {
    margin-inline-start: auto;
  }

  .tree {
    display: grid;
    gap: 0.75rem;
    min-inline-size: 0;
    overflow: auto;
    padding: 0.75rem 0.625rem;
  }

  details.node {
    border-inline-start: 2px solid var(--json-editor-muted-border);
    display: grid;
    gap: 0.5rem;
    min-inline-size: 0;
    padding-inline-start: 0.75rem;
  }

  details.node > summary {
    align-items: center;
    color: CanvasText;
    cursor: default;
    display: flex;
    font-size: 0.9375rem;
    font-weight: 600;
    gap: 0.5rem;
    list-style-position: inside;
    min-block-size: 1.75rem;
    overflow-wrap: anywhere;
  }

  .summary-meta {
    color: var(--json-editor-text-muted);
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .children {
    display: grid;
    gap: 0.5rem;
    margin-block-start: 0.25rem;
    min-inline-size: 0;
  }

  .row {
    align-items: start;
    border-block-start: 1px solid var(--json-editor-muted-border);
    display: grid;
    grid-template-columns: minmax(4.5rem, 8rem) minmax(0, 1fr) auto;
    min-inline-size: 0;
    padding-block-start: 0.5rem;
  }

  .key,
  .index {
    color: var(--json-editor-text-muted);
    font: 0.875rem/2 ui-sans-serif, system-ui, sans-serif;
    overflow-wrap: anywhere;
    padding-inline-end: 0.5rem;
  }

  .value {
    display: grid;
    gap: 0.4rem;
    min-inline-size: min(100%, 12rem);
  }

  .primitive {
    display: flex;
    flex-wrap: wrap;
    min-inline-size: 0;
  }

  input,
  select,
  button,
  textarea {
    border: 1px solid var(--json-editor-border);
    border-radius: 0.375rem;
    color: CanvasText;
    font: 0.875rem/1.4 ui-sans-serif, system-ui, sans-serif;
    min-block-size: 2rem;
    padding: 0.4rem 0.55rem;
  }

  input,
  select {
    background: Canvas;
    min-inline-size: 0;
  }

  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible {
    outline: 2px solid color-mix(in oklch, var(--json-editor-accent) 78%, CanvasText 22%);
    outline-offset: 0;
  }

  button:focus-visible {
    outline: 2px solid color-mix(in oklch, var(--json-editor-accent) 78%, CanvasText 22%);
    outline-offset: 2px;
  }

  input[data-json-kind="string"] {
    flex: 1;
    min-inline-size: min(100%, 12rem);
  }

  input[type="checkbox"] {
    accent-color: var(--json-editor-accent);
    block-size: 1rem;
    inline-size: 1rem;
  }

  select {
    padding-inline-end: 1.6rem;
  }

  button {
    background: var(--json-editor-surface);
    border-color: var(--json-editor-border);
    color: CanvasText;
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 650;
    min-block-size: 2rem;
  }

  button.primary {
    background: var(--json-editor-surface);
    border-color: var(--json-editor-border);
    color: CanvasText;
    padding-inline: 0.75rem;
  }

  button:hover {
    background: var(--json-editor-surface-strong);
  }

  button.primary:hover {
    background: var(--json-editor-surface-strong);
  }

  button.danger {
    background: transparent;
    border-color: transparent;
    color: var(--json-editor-text-muted);
    min-block-size: 1.875rem;
  }

  button.danger:hover {
    background: color-mix(in oklch, var(--json-editor-danger) 8%, transparent);
    border-color: color-mix(in oklch, var(--json-editor-danger) 14%, transparent);
    color: var(--json-editor-danger);
  }

  .issue-list {
    color: var(--json-editor-danger);
    display: grid;
    font-size: 0.8125rem;
    gap: 0.2rem;
    margin: 0;
    padding: 0;
  }

  .issue-list li {
    background: color-mix(in oklch, var(--json-editor-danger) 8%, transparent);
    border: 1px solid color-mix(in oklch, var(--json-editor-danger) 22%, transparent);
    border-radius: 0.375rem;
    list-style: none;
    padding: 0.35rem 0.45rem;
  }

  .empty,
  .invalid,
  .missing {
    color: var(--json-editor-text-muted);
    font-size: 0.875rem;
  }

  .invalid {
    background: color-mix(in oklch, var(--json-editor-danger) 8%, transparent);
    border: 1px solid color-mix(in oklch, var(--json-editor-danger) 22%, transparent);
    border-radius: 0.375rem;
    color: var(--json-editor-danger);
    margin: 0;
    padding: 0.6rem 0.7rem;
  }

  .add-row {
    background: var(--json-editor-surface);
    border: 1px dashed var(--json-editor-border);
    border-radius: 0.375rem;
    display: flex;
    flex-wrap: wrap;
    padding: 0.5rem;
  }

  .missing {
    background: color-mix(in oklch, var(--json-editor-danger) 7%, Canvas);
    border-color: color-mix(in oklch, var(--json-editor-danger) 24%, transparent);
  }

  .source {
    background: color-mix(in oklch, Canvas 98%, CanvasText 2%);
    border-block-start: 1px solid var(--json-editor-muted-border);
    display: grid;
    gap: 0.5rem;
    padding: 0.625rem 0.75rem 0.75rem;
  }

  .source > summary {
    color: var(--json-editor-text-muted);
    cursor: default;
    font-size: 0.875rem;
    font-weight: 650;
  }

  ::slotted(textarea) {
    box-sizing: border-box;
    font: 0.875rem/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    min-block-size: 7rem;
    inline-size: 100%;
  }

  @media (max-width: 42rem) {
    .toolbar {
      align-items: stretch;
      display: grid;
    }

    .row {
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .key,
    .index {
      grid-column: 1;
      grid-row: 1;
      padding-inline-end: 0;
    }

    .value {
      grid-column: 1 / -1;
      grid-row: 2;
      min-inline-size: 0;
    }

    .row > button.danger {
      grid-column: 2;
      grid-row: 1;
      justify-self: end;
    }

    .primitive {
      align-items: stretch;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
    }

    input[data-json-kind="string"],
    input[data-json-kind="number"],
    input[data-json-kind="integer"],
    select {
      inline-size: 100%;
      min-inline-size: 0;
    }
  }
`

export class JsonEditor extends HTMLElement {
  static observedAttributes = ["schema", "schema-target"]

  /** @type {HTMLTextAreaElement | null} */
  #textarea = null

  /** @type {MutationObserver | undefined} */
  #observer

  /** @type {unknown} */
  #schemaInput

  #hasProgrammaticSchema = false

  #ignoreAttributeChange = false

  /** @type {SchemaContext} */
  #schemaContext = createSchemaContext()

  /** @type {JsonSchema | undefined} */
  #jsonSchema

  /** @type {StandardProps["validate"] | undefined} */
  #standardValidate

  /** @type {JsonEditorIssue[]} */
  #issues = []

  /** @type {JsonValue | undefined} */
  #parsedValue

  /** @type {JsonEditorIssue | undefined} */
  #parseIssue

  /** @type {JsonEditorIssue | undefined} */
  #schemaIssue

  #refreshVersion = 0

  #validationVersion = 0

  #syncingTextarea = false

  connectedCallback() {
    this.#ensureShadow()
    this.#connectTextarea()

    if (!this.#observer) {
      this.#observer = new MutationObserver(() => {
        this.#connectTextarea()
        void this.refresh()
      })
      this.#observer.observe(this, { childList: true })
    }

    void this.refresh()
  }

  disconnectedCallback() {
    this.#observer?.disconnect()
    this.#observer = undefined
    if (this.#textarea) this.#textarea.oninput = null
    this.#textarea = null
  }

  /**
   * @param {string} name
   * @param {string | null} oldValue
   * @param {string | null} newValue
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || this.#ignoreAttributeChange) return

    if (name === "schema") {
      this.#schemaInput = undefined
      this.#hasProgrammaticSchema = false
    }

    if (this.isConnected) void this.refresh()
  }

  /** @returns {string} */
  get value() {
    return this.#textarea?.value ?? ""
  }

  /** @param {string | null | undefined} value */
  set value(value) {
    this.#ensureTextarea().value = value == null ? "" : String(value)
    this.#readTextarea()
    void this.#validateAndMaybeRender(true)
  }

  /** @returns {JsonValue} */
  get json() {
    return /** @type {JsonValue} */ (JSON.parse(String(this.value)))
  }

  /** @param {JsonValue} value */
  set json(value) {
    this.#commitJson(value, { render: true })
  }

  /** @returns {unknown} */
  get schema() {
    return this.#hasProgrammaticSchema ? this.#schemaInput : this.getAttribute("schema")
  }

  /** @param {unknown} value */
  set schema(value) {
    if (value == null) {
      this.#schemaInput = undefined
      this.#hasProgrammaticSchema = false
      this.#setSchemaAttribute(null)
    } else if (typeof value === "string") {
      this.#schemaInput = undefined
      this.#hasProgrammaticSchema = false
      this.#setSchemaAttribute(value)
    } else {
      this.#schemaInput = value
      this.#hasProgrammaticSchema = true
      this.#setSchemaAttribute(null)
    }

    if (this.isConnected) void this.refresh()
  }

  /** @returns {string} */
  get schemaTarget() {
    return normalizeToken(this.getAttribute("schema-target"), "input", schemaTargets)
  }

  /** @param {string | null | undefined} value */
  set schemaTarget(value) {
    if (value == null) this.removeAttribute("schema-target")
    else this.setAttribute("schema-target", normalizeToken(value, "input", schemaTargets))
  }

  /** @returns {JsonEditorIssue[]} */
  get issues() {
    return this.#issues.map(copyIssue)
  }

  format() {
    const parsed = JSON.parse(String(this.value))
    this.#commitJson(/** @type {JsonValue} */ (parsed), { render: true })
  }

  /** @returns {Promise<JsonEditorValidationResult>} */
  async validate() {
    const version = ++this.#validationVersion
    const computed = await this.#computeValidation()
    if (version !== this.#validationVersion) return cloneValidationResult(computed.validation)
    return this.#applyValidation(computed)
  }

  /** @returns {Promise<{ parsedValue: JsonValue | undefined, parseIssue: JsonEditorIssue | undefined, validation: JsonEditorValidationResult }>} */
  async #computeValidation() {
    const parsed = parseJson(this.value)
    if (!parsed.ok) {
      const issue = { message: parsed.error, path: [] }
      const issues = this.#schemaIssue ? [this.#schemaIssue, issue] : [issue]
      return { parsedValue: undefined, parseIssue: issue, validation: { valid: false, issues: issues.map(copyIssue), value: undefined } }
    }

    let value = /** @type {unknown} */ (parsed.value)
    /** @type {JsonEditorIssue[]} */
    const issues = this.#schemaIssue ? [this.#schemaIssue] : []

    if (this.#standardValidate) {
      try {
        const result = await this.#standardValidate(value)
        if (result && Array.isArray(result.issues) && result.issues.length > 0) {
          issues.push(...result.issues.map(standardIssueToJsonEditorIssue))
        } else if (result && "value" in result) {
          value = result.value
        }
      } catch (error) {
        issues.push({ message: errorMessage(error), path: [] })
      }
    } else if (this.#jsonSchema) {
      issues.push(...validateJsonSchema(parsed.value, this.#jsonSchema, this.#schemaContext))
    }

    return { parsedValue: parsed.value, parseIssue: undefined, validation: { valid: issues.length === 0, issues: issues.map(copyIssue), value } }
  }

  /** @param {{ parsedValue: JsonValue | undefined, parseIssue: JsonEditorIssue | undefined, validation: JsonEditorValidationResult }} computed */
  #applyValidation(computed) {
    this.#parsedValue = computed.parsedValue
    this.#parseIssue = computed.parseIssue
    this.#issues = computed.validation.issues.map(copyIssue)
    const validation = {
      valid: this.#issues.length === 0,
      issues: this.issues,
      value: computed.validation.value,
    }
    this.#dispatchValidation(validation)
    return validation
  }

  async refresh() {
    const version = ++this.#refreshVersion
    this.#ensureShadow()
    this.#connectTextarea()

    try {
      const resolved = await this.#resolveSchema()
      if (version !== this.#refreshVersion) return
      this.#schemaContext = resolved.context
      this.#jsonSchema = resolved.jsonSchema
      this.#standardValidate = resolved.standardValidate
      this.#schemaIssue = undefined
      this.dispatchEvent(new CustomEvent(eventNames.schemaLoad, {
        bubbles: true,
        composed: true,
        detail: { schema: this.#jsonSchema, standard: Boolean(this.#standardValidate) },
      }))
    } catch (error) {
      if (version !== this.#refreshVersion) return
      this.#schemaContext = createSchemaContext()
      this.#jsonSchema = undefined
      this.#standardValidate = undefined
      this.#schemaIssue = { message: `Schema load failed: ${errorMessage(error)}`, path: [] }
      this.#dispatchError(error)
    }

    this.#readTextarea()
    await this.#validateAndMaybeRender(false)
    if (version === this.#refreshVersion) this.#render()
  }

  /**
   * @param {Array<string | number>} path
   * @param {JsonValue} value
   * @param {{ render?: boolean }} [options]
   */
  setJsonPath(path, value, options = {}) {
    const root = cloneJson(this.#parsedValue ?? null)
    const next = setJsonPath(root, path, value)
    this.#commitJson(next, { render: options.render !== false })
  }

  /**
   * @param {Array<string | number>} path
   * @param {{ render?: boolean }} [options]
   */
  removeJsonPath(path, options = {}) {
    if (path.length === 0) return
    const root = cloneJson(this.#parsedValue ?? null)
    const next = removeJsonPath(root, path)
    this.#commitJson(next, { render: options.render !== false })
  }

  /**
   * @param {Array<string | number>} path
   * @param {string} key
   */
  addObjectProperty(path, key) {
    if (!key) return
    const root = cloneJson(this.#parsedValue ?? {})
    const object = getValueAtPath(root, path)
    if (!isRecord(object)) return
    const schema = schemaForPath(this.#jsonSchema, this.#schemaContext, this.#parsedValue, path)
    object[key] = defaultValueForSchema(schemaForObjectProperty(schema, key, this.#schemaContext), this.#schemaContext)
    this.#commitJson(root, { render: true })
  }

  /** @param {Array<string | number>} path */
  addArrayItem(path) {
    const root = cloneJson(this.#parsedValue ?? [])
    const array = getValueAtPath(root, path)
    if (!Array.isArray(array)) return
    const schema = schemaForPath(this.#jsonSchema, this.#schemaContext, this.#parsedValue, path)
    array.push(defaultValueForSchema(schemaForArrayItem(schema, array.length, this.#schemaContext), this.#schemaContext))
    this.#commitJson(root, { render: true })
  }

  #ensureShadow() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" })
  }

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
    if (textarea === this.#textarea) return

    if (this.#textarea) this.#textarea.oninput = null
    this.#textarea = textarea

    if (this.#textarea) {
      if (this.#textarea.getAttribute("slot") !== "source") this.#textarea.setAttribute("slot", "source")
      this.#textarea.oninput = () => {
        if (this.#syncingTextarea) return
        this.#readTextarea()
        void this.#validateAndMaybeRender(true)
      }
    }
  }

  #readTextarea() {
    const parsed = parseJson(this.value)
    if (parsed.ok) {
      this.#parsedValue = parsed.value
      this.#parseIssue = undefined
    } else {
      this.#parsedValue = undefined
      this.#parseIssue = { message: parsed.error, path: [] }
      this.#issues = [this.#parseIssue]
    }
  }

  /**
   * @param {JsonValue} value
   * @param {{ render: boolean }} options
   */
  #commitJson(value, options) {
    this.#parsedValue = value
    this.#parseIssue = undefined
    const textarea = this.#ensureTextarea()
    const nextText = JSON.stringify(value, null, 2)
    textarea.value = nextText

    this.#syncingTextarea = true
    textarea.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      composed: true,
      data: null,
      inputType: "insertReplacementText",
    }))
    this.#syncingTextarea = false

    this.dispatchEvent(new CustomEvent(eventNames.input, {
      bubbles: true,
      composed: true,
      detail: { value, text: nextText },
    }))

    void this.#validateAndMaybeRender(options.render)
  }

  /** @param {boolean} render */
  async #validateAndMaybeRender(render) {
    const version = ++this.#validationVersion
    const computed = await this.#computeValidation()
    if (version !== this.#validationVersion) return cloneValidationResult(computed.validation)
    const result = this.#applyValidation(computed)
    if (render && this.isConnected) this.#render()
    return result
  }

  async #resolveSchema() {
    const source = this.#hasProgrammaticSchema ? this.#schemaInput : this.getAttribute("schema")
    if (source == null || source === "") {
      return { context: createSchemaContext(), jsonSchema: undefined, standardValidate: undefined }
    }

    const schema = typeof source === "string" ? await schemaFromStringSource(source) : source
    return resolveSchemaValue(schema, this.schemaTarget)
  }

  /** @param {string | null} value */
  #setSchemaAttribute(value) {
    this.#ignoreAttributeChange = true
    try {
      if (value == null) this.removeAttribute("schema")
      else this.setAttribute("schema", value)
    } finally {
      this.#ignoreAttributeChange = false
    }
  }

  /** @param {unknown} error */
  #dispatchError(error) {
    this.dispatchEvent(new CustomEvent(eventNames.error, {
      bubbles: true,
      composed: true,
      detail: { error, message: errorMessage(error) },
    }))
  }

  /** @param {JsonEditorValidationResult} validation */
  #dispatchValidation(validation) {
    this.dispatchEvent(new CustomEvent(eventNames.validation, {
      bubbles: true,
      composed: true,
      detail: validation,
    }))
  }

  #render() {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot)
    const style = document.createElement("style")
    style.textContent = editorStyles

    const editor = document.createElement("section")
    editor.className = "json-editor"
    editor.setAttribute("part", "editor")

    const toolbar = document.createElement("div")
    toolbar.className = "toolbar"

    const status = document.createElement("span")
    status.className = "status"
    status.setAttribute("part", "status")
    if (this.#issues.length > 0) {
      status.dataset.invalid = ""
      status.textContent = `${this.#issues.length} issue${this.#issues.length === 1 ? "" : "s"}`
    } else {
      status.hidden = true
      status.textContent = ""
    }

    const formatButton = document.createElement("button")
    formatButton.type = "button"
    formatButton.className = "primary"
    formatButton.textContent = "Format"
    formatButton.onclick = () => this.format()

    toolbar.append(status, formatButton)
    editor.append(toolbar)

    const tree = document.createElement("div")
    tree.className = "tree"
    tree.setAttribute("part", "tree")

    if (this.#parseIssue) {
      const invalid = document.createElement("p")
      invalid.className = "invalid"
      invalid.textContent = this.#parseIssue.message
      tree.append(invalid)
    } else if (this.#parsedValue === undefined) {
      const empty = document.createElement("p")
      empty.className = "empty"
      empty.textContent = "No JSON value."
      tree.append(empty)
    } else {
      tree.append(renderValue(this, this.#parsedValue, [], this.#jsonSchema, this.#schemaContext, this.#issues, this.#parsedValue))
    }

    editor.append(tree)

    const source = document.createElement("details")
    source.className = "source"
    source.setAttribute("part", "source")

    const summary = document.createElement("summary")
    summary.textContent = "Text value"
    const slot = document.createElement("slot")
    slot.name = "source"
    source.append(summary, slot)
    editor.append(source)

    shadow.replaceChildren(style, editor)
  }
}

/** @param {string} [name] */
export function defineJsonEditor(name = "json-editor") {
  if (!customElements.get(name)) customElements.define(name, JsonEditor)
}

/** @returns {SchemaContext} */
function createSchemaContext() {
  return { documents: new Map(), anchors: new Map(), baseUris: new WeakMap(), fetched: new Set() }
}

/**
 * @param {unknown} schema
 * @param {string} schemaTarget
 * @returns {Promise<{ context: SchemaContext, jsonSchema: JsonSchema | undefined, standardValidate: StandardProps["validate"] | undefined }>}
 */
async function resolveSchemaValue(schema, schemaTarget) {
  const standard = getStandardProps(schema)
  const standardValidate = typeof standard?.validate === "function" ? standard.validate : undefined
  const converted = standard?.jsonSchema ? convertStandardJsonSchema(standard, schemaTarget) : undefined
  const rawJsonSchema = converted !== undefined ? converted : (!standard?.validate && !standard?.jsonSchema ? schema : undefined)
  const jsonSchema = normalizeJsonSchema(rawJsonSchema)
  const context = jsonSchema ? await buildSchemaContext(jsonSchema, document.baseURI) : createSchemaContext()
  return { context, jsonSchema, standardValidate }
}

/** @param {unknown} schema */
function normalizeJsonSchema(schema) {
  if (schema === true) return /** @type {JsonSchema} */ ({})
  if (schema === false) return /** @type {JsonSchema} */ ({ not: {} })
  return isRecord(schema) ? /** @type {JsonSchema} */ (schema) : undefined
}

/**
 * @param {StandardProps} standard
 * @param {string} schemaTarget
 * @returns {JsonSchema | undefined}
 */
function convertStandardJsonSchema(standard, schemaTarget) {
  const converter = schemaTarget === "output" ? standard.jsonSchema?.output : standard.jsonSchema?.input
  if (!converter) return undefined

  try {
    return /** @type {JsonSchema} */ (converter({ target: "draft-2020-12" }))
  } catch (error2020) {
    try {
      return /** @type {JsonSchema} */ (converter({ target: "draft-07" }))
    } catch {
      throw error2020
    }
  }
}

/** @param {string} source */
async function schemaFromStringSource(source) {
  const text = source.trim()
  if (text === "") return undefined
  if (text.startsWith("{") || text.startsWith("[") || text === "true" || text === "false") return JSON.parse(text)

  const element = schemaElementFromSource(text)
  if (element) return JSON.parse(element.textContent ?? "")

  const response = await fetch(new URL(text, document.baseURI).href)
  if (!response.ok) throw new Error(`Could not load JSON schema from ${text}: ${response.status} ${response.statusText}`)
  return response.json()
}

/** @param {string} source */
function schemaElementFromSource(source) {
  const id = source.startsWith("#") ? source.slice(1) : source
  if (!id || id.includes("/") || id.includes(":")) return null
  return document.getElementById(id)
}

/**
 * @param {JsonSchema} root
 * @param {string} baseUri
 */
async function buildSchemaContext(root, baseUri) {
  const context = createSchemaContext()
  registerSchema(context, root, baseUri, new WeakSet())
  await loadExternalRefs(context, root, baseUri, 0, new WeakSet())
  return context
}

/**
 * @param {SchemaContext} context
 * @param {unknown} value
 * @param {string} baseUri
 * @param {WeakSet<object>} seen
 */
function registerSchema(context, value, baseUri, seen) {
  if (!isRecord(value) || seen.has(value)) return
  seen.add(value)

  let currentBase = baseUri
  if (typeof value.$id === "string" && value.$id.length > 0) currentBase = new URL(value.$id, stripHash(baseUri)).href

  context.baseUris.set(value, currentBase)
  const documentUri = stripHash(currentBase)
  if (!context.root) context.root = value
  if (!context.documents.has(documentUri) || typeof value.$id === "string") context.documents.set(documentUri, value)

  if (typeof value.$anchor === "string" && value.$anchor.length > 0) {
    context.anchors.set(`${documentUri}#${value.$anchor}`, value)
  }

  for (const child of Object.values(value)) {
    if (isRecord(child)) registerSchema(context, child, currentBase, seen)
    else if (Array.isArray(child)) {
      for (const item of child) registerSchema(context, item, currentBase, seen)
    }
  }
}

/**
 * @param {SchemaContext} context
 * @param {unknown} value
 * @param {string} fallbackBaseUri
 * @param {number} count
 * @param {WeakSet<object>} seen
 * @returns {Promise<number>}
 */
async function loadExternalRefs(context, value, fallbackBaseUri, count, seen) {
  if (!isRecord(value) || seen.has(value)) return count
  seen.add(value)

  const baseUri = context.baseUris.get(value) ?? fallbackBaseUri

  if (typeof value.$ref === "string" && value.$ref.length > 0) {
    const url = new URL(value.$ref, baseUri)
    const documentUri = stripHash(url.href)
    if (documentUri !== stripHash(baseUri) && !context.documents.has(documentUri)) {
      if (count >= externalRefLimit) throw new Error("Too many external JSON Schema references.")
      context.fetched.add(documentUri)
      const response = await fetch(documentUri)
      if (!response.ok) throw new Error(`Could not load JSON schema reference ${documentUri}: ${response.status} ${response.statusText}`)
      const schema = await response.json()
      if (!isRecord(schema)) throw new Error(`JSON schema reference ${documentUri} must be an object.`)
      registerSchema(context, schema, documentUri, new WeakSet())
      count = await loadExternalRefs(context, schema, documentUri, count + 1, new WeakSet())
    }
  }

  for (const child of Object.values(value)) {
    if (isRecord(child)) count = await loadExternalRefs(context, child, context.baseUris.get(child) ?? baseUri, count, seen)
    else if (Array.isArray(child)) {
      for (const item of child) count = await loadExternalRefs(context, item, isRecord(item) ? context.baseUris.get(item) ?? baseUri : baseUri, count, seen)
    }
  }

  return count
}

/**
 * @param {JsonEditor} editor
 * @param {JsonValue} value
 * @param {Array<string | number>} path
 * @param {JsonSchema | undefined} schema
 * @param {SchemaContext} context
 * @param {JsonEditorIssue[]} issues
 * @param {JsonValue | undefined} rootValue
 * @returns {HTMLElement}
 */
function renderValue(editor, value, path, schema, context, issues, rootValue) {
  const effectiveSchema = chooseSchemaForValue(resolveEffectiveSchema(schema, context), value, context)
  if (isPlainObject(value)) return renderObject(editor, value, path, effectiveSchema, context, issues, rootValue)
  if (Array.isArray(value)) return renderArray(editor, value, path, effectiveSchema, context, issues, rootValue)
  return renderPrimitive(editor, value, path, effectiveSchema, context, issues)
}

/**
 * @param {Array<string | number>} path
 * @param {string} rootLabel
 */
function summaryLabel(path, rootLabel) {
  if (path.length === 0) return rootLabel
  const last = path.at(-1)
  return typeof last === "number" ? `Item ${last + 1}` : String(last)
}

/** @param {string} text */
function summaryMeta(text) {
  const span = document.createElement("span")
  span.className = "summary-meta"
  span.textContent = text
  return span
}

/** @param {Array<string | number>} path */
function controlLabel(path) {
  if (path.length === 0) return "Value"
  const last = path.at(-1)
  return typeof last === "number" ? `Item ${last + 1}` : String(last)
}

/**
 * @param {JsonEditor} editor
 * @param {{ [key: string]: JsonValue }} value
 * @param {Array<string | number>} path
 * @param {JsonSchema | undefined} schema
 * @param {SchemaContext} context
 * @param {JsonEditorIssue[]} issues
 * @param {JsonValue | undefined} rootValue
 */
function renderObject(editor, value, path, schema, context, issues, rootValue) {
  const details = document.createElement("details")
  details.className = "node object"
  details.open = true
  details.dataset.jsonPath = jsonPointer(path)

  const summary = document.createElement("summary")
  summary.append(summaryLabel(path, "Object"), summaryMeta(`${Object.keys(value).length} field${Object.keys(value).length === 1 ? "" : "s"}`))
  details.append(summary, renderIssues(issuesForPath(issues, path)))

  const children = document.createElement("div")
  children.className = "children"

  for (const [key, child] of Object.entries(value)) {
    const row = document.createElement("div")
    row.className = "row"
    row.dataset.jsonPath = jsonPointer([...path, key])

    const keyElement = document.createElement("span")
    keyElement.className = "key"
    keyElement.textContent = key

    const valueElement = document.createElement("div")
    valueElement.className = "value"
    valueElement.append(renderValue(editor, child, [...path, key], schemaForObjectProperty(schema, key, context), context, issues, rootValue))

    row.append(keyElement, valueElement)

    if (!isRequiredObjectProperty(schema, key)) {
      const remove = document.createElement("button")
      remove.type = "button"
      remove.className = "danger"
      remove.textContent = "Remove"
      remove.setAttribute("aria-label", `Remove ${key}`)
      remove.onclick = () => editor.removeJsonPath([...path, key])
      row.append(remove)
    }

    children.append(row)
  }

  for (const key of missingRequiredKeys(value, schema)) {
    const row = document.createElement("div")
    row.className = "add-row missing"
    const label = document.createElement("span")
    label.textContent = `Required field "${key}" is missing.`
    const button = document.createElement("button")
    button.type = "button"
    button.textContent = `Add ${key}`
    button.onclick = () => editor.addObjectProperty(path, key)
    row.append(label, button)
    children.append(row)
  }

  const addRow = renderObjectAddRow(editor, value, path, schema, context)
  if (addRow) children.append(addRow)
  details.append(children)
  return details
}

/**
 * @param {JsonEditor} editor
 * @param {JsonValue[]} value
 * @param {Array<string | number>} path
 * @param {JsonSchema | undefined} schema
 * @param {SchemaContext} context
 * @param {JsonEditorIssue[]} issues
 * @param {JsonValue | undefined} rootValue
 */
function renderArray(editor, value, path, schema, context, issues, rootValue) {
  const details = document.createElement("details")
  details.className = "node array"
  details.open = true
  details.dataset.jsonPath = jsonPointer(path)

  const summary = document.createElement("summary")
  summary.append(summaryLabel(path, "Items"), summaryMeta(`${value.length} item${value.length === 1 ? "" : "s"}`))
  details.append(summary, renderIssues(issuesForPath(issues, path)))

  const children = document.createElement("div")
  children.className = "children"

  value.forEach((child, index) => {
    const row = document.createElement("div")
    row.className = "row"
    row.dataset.jsonPath = jsonPointer([...path, index])

    const indexElement = document.createElement("span")
    indexElement.className = "index"
    indexElement.textContent = `Item ${index + 1}`

    const valueElement = document.createElement("div")
    valueElement.className = "value"
    valueElement.append(renderValue(editor, child, [...path, index], schemaForArrayItem(schema, index, context), context, issues, rootValue))

    const remove = document.createElement("button")
    remove.type = "button"
    remove.className = "danger"
    remove.textContent = "Remove"
    remove.setAttribute("aria-label", `Remove item ${index}`)
    remove.onclick = () => editor.removeJsonPath([...path, index])

    row.append(indexElement, valueElement, remove)
    children.append(row)
  })

  const add = document.createElement("button")
  add.type = "button"
  add.textContent = "Add item"
  add.onclick = () => editor.addArrayItem(path)
  children.append(add)

  details.append(children)
  return details
}

/**
 * @param {JsonEditor} editor
 * @param {JsonValue} value
 * @param {Array<string | number>} path
 * @param {JsonSchema | undefined} schema
 * @param {SchemaContext} context
 * @param {JsonEditorIssue[]} issues
 */
function renderPrimitive(editor, value, path, schema, context, issues) {
  const wrapper = document.createElement("div")
  wrapper.className = "primitive"
  wrapper.dataset.jsonPath = jsonPointer(path)

  const enumValues = enumValuesForSchema(schema)
  if (enumValues) {
    const select = document.createElement("select")
    select.dataset.jsonPath = jsonPointer(path)
    select.dataset.jsonKind = "enum"
    select.setAttribute("aria-label", controlLabel(path))
    for (const item of enumValues) {
      const option = document.createElement("option")
      option.value = JSON.stringify(item)
      option.textContent = JSON.stringify(item)
      option.selected = deepEqual(item, value)
      select.append(option)
    }
    select.onchange = () => editor.setJsonPath(path, /** @type {JsonValue} */ (JSON.parse(select.value)))
    wrapper.append(select, renderIssues(issuesForPath(issues, path)))
    return wrapper
  }

  if (shouldRenderTypeSelect(value, schema)) wrapper.append(createTypeSelect(editor, value, path, schema, context))

  const type = jsonTypeOf(value)
  if (type === "boolean") {
    const input = document.createElement("input")
    input.type = "checkbox"
    input.checked = value === true
    input.dataset.jsonPath = jsonPointer(path)
    input.dataset.jsonKind = "boolean"
    input.setAttribute("aria-label", controlLabel(path))
    input.onchange = () => editor.setJsonPath(path, input.checked)
    wrapper.append(input)
  } else if (type === "number" || type === "integer") {
    const input = document.createElement("input")
    input.type = "number"
    input.value = String(value)
    input.step = type === "integer" ? "1" : "any"
    input.dataset.jsonPath = jsonPointer(path)
    input.dataset.jsonKind = type
    input.setAttribute("aria-label", controlLabel(path))
    input.oninput = () => {
      if (input.value === "") return
      const number = Number(input.value)
      if (Number.isFinite(number)) editor.setJsonPath(path, number, { render: false })
    }
    input.onchange = () => {
      const number = Number(input.value)
      if (Number.isFinite(number)) editor.setJsonPath(path, number)
    }
    wrapper.append(input)
  } else if (type === "string") {
    const input = document.createElement("input")
    input.type = "text"
    input.value = String(value)
    input.dataset.jsonPath = jsonPointer(path)
    input.dataset.jsonKind = "string"
    input.setAttribute("aria-label", controlLabel(path))
    input.oninput = () => editor.setJsonPath(path, input.value, { render: false })
    input.onchange = () => editor.setJsonPath(path, input.value)
    wrapper.append(input)
  } else {
    const span = document.createElement("span")
    span.className = "empty"
    span.textContent = "null"
    wrapper.append(span)
  }

  wrapper.append(renderIssues(issuesForPath(issues, path)))
  return wrapper
}

/**
 * @param {JsonValue} value
 * @param {JsonSchema | undefined} schema
 */
function shouldRenderTypeSelect(value, schema) {
  const allowedTypes = allowedTypesForSchema(schema)
  if (!allowedTypes || allowedTypes.length !== 1) return true
  return !jsonTypeMatches(allowedTypes[0], jsonTypeOf(value))
}

/**
 * @param {JsonEditor} editor
 * @param {JsonValue} value
 * @param {Array<string | number>} path
 * @param {JsonSchema | undefined} schema
 * @param {SchemaContext} context
 */
function createTypeSelect(editor, value, path, schema, context) {
  const select = document.createElement("select")
  select.dataset.jsonPath = jsonPointer(path)
  select.dataset.jsonKind = "type"
  select.setAttribute("aria-label", "JSON value type")

  const allowedTypes = allowedTypesForSchema(schema) ?? jsonTypes
  const currentType = jsonTypeOf(value)
  const types = allowedTypes.some((type) => jsonTypeMatches(type, currentType)) ? allowedTypes : [currentType, ...allowedTypes]

  for (const type of types) {
    const option = document.createElement("option")
    option.value = type
    option.textContent = type
    option.selected = type === currentType
    select.append(option)
  }

  select.onchange = () => {
    editor.setJsonPath(path, defaultValueForSchema({ type: select.value }, context))
  }

  return select
}

/**
 * @param {JsonEditor} editor
 * @param {{ [key: string]: JsonValue }} value
 * @param {Array<string | number>} path
 * @param {JsonSchema | undefined} schema
 * @param {SchemaContext} context
 * @returns {HTMLElement | undefined}
 */
function renderObjectAddRow(editor, value, path, schema, context) {
  const row = document.createElement("div")
  row.className = "add-row"

  const available = availableSchemaPropertyKeys(value, schema)
  if (available.length > 0) {
    const select = document.createElement("select")
    select.setAttribute("aria-label", "Field to add")
    for (const key of available) {
      const option = document.createElement("option")
      option.value = key
      option.textContent = key
      select.append(option)
    }

    const button = document.createElement("button")
    button.type = "button"
    button.textContent = "Add field"
    button.onclick = () => editor.addObjectProperty(path, select.value)
    row.append(select, button)
  }

  if (allowsAdditionalProperties(schema, context)) {
    const input = document.createElement("input")
    input.type = "text"
    input.placeholder = "Field name"
    input.setAttribute("aria-label", "Custom field")

    const button = document.createElement("button")
    button.type = "button"
    button.textContent = "Add"
    button.onclick = () => {
      editor.addObjectProperty(path, input.value.trim())
      input.value = ""
    }

    row.append(input, button)
  }

  return row.hasChildNodes() ? row : undefined
}

/** @param {JsonEditorIssue[]} issues */
function renderIssues(issues) {
  const list = document.createElement("ul")
  list.className = "issue-list"
  if (issues.length === 0) return list

  for (const issue of issues) {
    const item = document.createElement("li")
    item.textContent = issue.message
    list.append(item)
  }
  return list
}

/**
 * @param {{ [key: string]: JsonValue }} value
 * @param {JsonSchema | undefined} schema
 */
function missingRequiredKeys(value, schema) {
  if (!schema || !Array.isArray(schema.required)) return []
  return schema.required.filter((key) => typeof key === "string" && !(key in value))
}

/**
 * @param {JsonSchema | undefined} schema
 * @param {string} key
 */
function isRequiredObjectProperty(schema, key) {
  return Array.isArray(schema?.required) && schema.required.includes(key)
}

/**
 * @param {{ [key: string]: JsonValue }} value
 * @param {JsonSchema | undefined} schema
 */
function availableSchemaPropertyKeys(value, schema) {
  const properties = isRecord(schema?.properties) ? schema.properties : undefined
  if (!properties) return []
  return Object.keys(properties).filter((key) => !(key in value))
}

/**
 * @param {JsonSchema | undefined} schema
 * @param {SchemaContext} context
 */
function allowsAdditionalProperties(schema, context) {
  const effective = resolveEffectiveSchema(schema, context)
  return effective?.additionalProperties !== false
}

/**
 * @param {JsonSchema | undefined} schema
 * @param {SchemaContext} context
 */
function defaultValueForSchema(schema, context) {
  const effective = chooseSchemaForValue(resolveEffectiveSchema(schema, context), undefined, context)
  if (effective) {
    if ("default" in effective) return cloneJson(/** @type {JsonValue} */ (effective.default))
    if ("const" in effective) return cloneJson(/** @type {JsonValue} */ (effective.const))
    const enumValues = enumValuesForSchema(effective)
    if (enumValues?.length) return cloneJson(enumValues[0])

    const type = firstAllowedType(effective)
    if (type === "object") return {}
    if (type === "array") return []
    if (type === "boolean") return false
    if (type === "number" || type === "integer") return 0
    if (type === "null") return null
  }

  return ""
}

/**
 * @param {JsonSchema | undefined} schema
 * @param {string} key
 * @param {SchemaContext} context
 */
function schemaForObjectProperty(schema, key, context) {
  const effective = resolveEffectiveSchema(schema, context)
  const properties = isRecord(effective?.properties) ? effective.properties : undefined
  if (properties && isRecord(properties[key])) return properties[key]
  const additionalProperties = effective?.additionalProperties
  if (isRecord(additionalProperties)) return additionalProperties
  return undefined
}

/**
 * @param {JsonSchema | undefined} schema
 * @param {number} index
 * @param {SchemaContext} context
 */
function schemaForArrayItem(schema, index, context) {
  const effective = resolveEffectiveSchema(schema, context)
  const prefixItems = Array.isArray(effective?.prefixItems) ? effective.prefixItems : undefined
  if (prefixItems && isRecord(prefixItems[index])) return prefixItems[index]
  const items = effective?.items
  if (isRecord(items)) return items
  return undefined
}

/**
 * @param {JsonSchema | undefined} rootSchema
 * @param {SchemaContext} context
 * @param {JsonValue | undefined} rootValue
 * @param {Array<string | number>} path
 */
function schemaForPath(rootSchema, context, rootValue, path) {
  let schema = rootSchema
  let value = rootValue
  for (const segment of path) {
    schema = chooseSchemaForValue(resolveEffectiveSchema(schema, context), value, context)
    if (typeof segment === "number") schema = schemaForArrayItem(schema, segment, context)
    else schema = schemaForObjectProperty(schema, segment, context)
    value = value === undefined ? undefined : /** @type {JsonValue | undefined} */ (getValueAtPath(value, [segment]))
  }
  return schema
}

/**
 * @param {JsonSchema | undefined} schema
 * @param {JsonValue | undefined} value
 * @param {SchemaContext} context
 */
function chooseSchemaForValue(schema, value, context) {
  const effective = resolveEffectiveSchema(schema, context)
  if (!effective) return undefined

  for (const keyword of ["oneOf", "anyOf"]) {
    const options = Reflect.get(effective, keyword)
    if (!Array.isArray(options)) continue

    const discriminated = options.find((option) => isRecord(option) && schemaDiscriminatorMatches(option, value, context))
    if (isRecord(discriminated)) return chooseSchemaForValue(discriminated, value, context)
    const first = options.find(isRecord)
    if (first) return chooseSchemaForValue(first, value, context)
  }

  if (Array.isArray(effective.allOf)) {
    const merged = mergeSchemas(effective.allOf.filter(isRecord).map((item) => resolveEffectiveSchema(item, context)).filter(isRecord))
    return { ...effective, ...merged }
  }

  return effective
}

/**
 * @param {JsonSchema} schema
 * @param {JsonValue | undefined} value
 * @param {SchemaContext} context
 */
function schemaDiscriminatorMatches(schema, value, context) {
  if (!isPlainObject(value)) return false
  const effective = resolveEffectiveSchema(schema, context)
  const properties = isRecord(effective?.properties) ? effective.properties : undefined
  const typeSchema = properties && isRecord(properties.type) ? resolveEffectiveSchema(properties.type, context) : undefined
  if (!typeSchema) return false
  if ("const" in typeSchema) return deepEqual(typeSchema.const, value.type)
  if (Array.isArray(typeSchema.enum)) return typeSchema.enum.some((item) => deepEqual(item, value.type))
  return false
}

/** @param {JsonSchema[]} schemas */
function mergeSchemas(schemas) {
  /** @type {JsonSchema} */
  const merged = {}
  for (const schema of schemas) {
    Object.assign(merged, schema)
    if (isRecord(schema.properties)) {
      const previousProperties = isRecord(merged.properties) ? merged.properties : {}
      merged.properties = { ...previousProperties, ...schema.properties }
    }
    if (Array.isArray(schema.required)) merged.required = [...new Set([...(Array.isArray(merged.required) ? merged.required : []), ...schema.required])]
  }
  return merged
}

/**
 * @param {JsonSchema | undefined} schema
 * @param {SchemaContext} context
 * @param {Set<JsonSchema>} [seen]
 * @returns {JsonSchema | undefined}
 */
function resolveEffectiveSchema(schema, context, seen = new Set()) {
  if (!schema || seen.has(schema)) return schema
  seen.add(schema)
  if (typeof schema.$ref === "string") {
    const resolved = resolveRef(schema.$ref, schema, context)
    if (resolved) return resolveEffectiveSchema(resolved, context, seen)
  }
  return schema
}

/**
 * @param {JsonValue} value
 * @param {JsonSchema | undefined} schema
 * @param {SchemaContext} context
 */
function validateJsonSchema(value, schema, context) {
  return validateAgainstSchema(value, schema, context, [], [], new Set())
}

/**
 * @param {JsonValue} value
 * @param {JsonSchema | undefined} schema
 * @param {SchemaContext} context
 * @param {Array<string | number>} path
 * @param {Array<string | number>} schemaPath
 * @param {Set<string>} seen
 * @returns {JsonEditorIssue[]}
 */
function validateAgainstSchema(value, schema, context, path, schemaPath, seen) {
  if (!schema) return []

  /** @type {JsonEditorIssue[]} */
  const issues = []
  const seenKey = `${context.baseUris.get(schema) ?? ""}${jsonPointer(schemaPath)}:${jsonPointer(path)}`
  if (seen.has(seenKey)) return issues
  seen.add(seenKey)

  if (typeof schema.$ref === "string") {
    const resolved = resolveRef(schema.$ref, schema, context)
    if (!resolved) {
      issues.push({ message: `Unresolved schema reference ${schema.$ref}.`, path, schemaPath: [...schemaPath, "$ref"] })
      return issues
    }
    issues.push(...validateAgainstSchema(value, resolved, context, path, [...schemaPath, "$ref"], seen))
  }

  if (Array.isArray(schema.allOf)) {
    schema.allOf.forEach((child, index) => {
      if (isRecord(child)) issues.push(...validateAgainstSchema(value, child, context, path, [...schemaPath, "allOf", index], seen))
    })
  }

  if (Array.isArray(schema.anyOf)) {
    const valid = schema.anyOf.some((child, index) => isRecord(child) && validateAgainstSchema(value, child, context, path, [...schemaPath, "anyOf", index], new Set(seen)).length === 0)
    if (!valid) issues.push({ message: "Value must match at least one schema.", path, schemaPath: [...schemaPath, "anyOf"] })
  }

  if (Array.isArray(schema.oneOf)) {
    const matches = schema.oneOf.filter((child, index) => isRecord(child) && validateAgainstSchema(value, child, context, path, [...schemaPath, "oneOf", index], new Set(seen)).length === 0).length
    if (matches !== 1) issues.push({ message: "Value must match exactly one schema.", path, schemaPath: [...schemaPath, "oneOf"] })
  }

  if (isRecord(schema.not) && validateAgainstSchema(value, schema.not, context, path, [...schemaPath, "not"], new Set(seen)).length === 0) {
    issues.push({ message: "Value must not match this schema.", path, schemaPath: [...schemaPath, "not"] })
  }

  const allowedTypes = allowedTypesForSchema(schema)
  if (allowedTypes && !allowedTypes.some((type) => jsonTypeMatches(type, jsonTypeOf(value)))) {
    issues.push({ message: `Expected ${allowedTypes.join(" or ")}.`, path, schemaPath: [...schemaPath, "type"] })
    return issues
  }

  if ("const" in schema && !deepEqual(value, schema.const)) {
    issues.push({ message: `Expected ${JSON.stringify(schema.const)}.`, path, schemaPath: [...schemaPath, "const"] })
  }

  if (Array.isArray(schema.enum) && !schema.enum.some((item) => deepEqual(item, value))) {
    issues.push({ message: "Value must be one of the allowed options.", path, schemaPath: [...schemaPath, "enum"] })
  }

  if (typeof value === "string") validateString(value, schema, path, schemaPath, issues)
  if (typeof value === "number") validateNumber(value, schema, path, schemaPath, issues)
  if (Array.isArray(value)) validateArray(value, schema, context, path, schemaPath, seen, issues)
  if (isPlainObject(value)) validateObject(value, schema, context, path, schemaPath, seen, issues)

  return issues
}

/**
 * @param {string} value
 * @param {JsonSchema} schema
 * @param {Array<string | number>} path
 * @param {Array<string | number>} schemaPath
 * @param {JsonEditorIssue[]} issues
 */
function validateString(value, schema, path, schemaPath, issues) {
  if (typeof schema.minLength === "number" && value.length < schema.minLength) issues.push({ message: `Must be at least ${schema.minLength} characters.`, path, schemaPath: [...schemaPath, "minLength"] })
  if (typeof schema.maxLength === "number" && value.length > schema.maxLength) issues.push({ message: `Must be at most ${schema.maxLength} characters.`, path, schemaPath: [...schemaPath, "maxLength"] })
  if (typeof schema.pattern === "string") {
    try {
      if (!new RegExp(schema.pattern).test(value)) issues.push({ message: `Must match pattern ${schema.pattern}.`, path, schemaPath: [...schemaPath, "pattern"] })
    } catch {
      issues.push({ message: `Invalid schema pattern ${schema.pattern}.`, path, schemaPath: [...schemaPath, "pattern"] })
    }
  }
}

/**
 * @param {number} value
 * @param {JsonSchema} schema
 * @param {Array<string | number>} path
 * @param {Array<string | number>} schemaPath
 * @param {JsonEditorIssue[]} issues
 */
function validateNumber(value, schema, path, schemaPath, issues) {
  if (schema.type === "integer" && !Number.isInteger(value)) issues.push({ message: "Expected integer.", path, schemaPath: [...schemaPath, "type"] })
  if (typeof schema.minimum === "number" && value < schema.minimum) issues.push({ message: `Must be at least ${schema.minimum}.`, path, schemaPath: [...schemaPath, "minimum"] })
  if (typeof schema.maximum === "number" && value > schema.maximum) issues.push({ message: `Must be at most ${schema.maximum}.`, path, schemaPath: [...schemaPath, "maximum"] })
  if (typeof schema.exclusiveMinimum === "number" && value <= schema.exclusiveMinimum) issues.push({ message: `Must be greater than ${schema.exclusiveMinimum}.`, path, schemaPath: [...schemaPath, "exclusiveMinimum"] })
  if (typeof schema.exclusiveMaximum === "number" && value >= schema.exclusiveMaximum) issues.push({ message: `Must be less than ${schema.exclusiveMaximum}.`, path, schemaPath: [...schemaPath, "exclusiveMaximum"] })
  if (typeof schema.multipleOf === "number" && schema.multipleOf !== 0 && !isJsonMultipleOf(value, schema.multipleOf)) issues.push({ message: `Must be a multiple of ${schema.multipleOf}.`, path, schemaPath: [...schemaPath, "multipleOf"] })
}

/**
 * @param {JsonValue[]} value
 * @param {JsonSchema} schema
 * @param {SchemaContext} context
 * @param {Array<string | number>} path
 * @param {Array<string | number>} schemaPath
 * @param {Set<string>} seen
 * @param {JsonEditorIssue[]} issues
 */
function validateArray(value, schema, context, path, schemaPath, seen, issues) {
  if (typeof schema.minItems === "number" && value.length < schema.minItems) issues.push({ message: `Must contain at least ${schema.minItems} items.`, path, schemaPath: [...schemaPath, "minItems"] })
  if (typeof schema.maxItems === "number" && value.length > schema.maxItems) issues.push({ message: `Must contain at most ${schema.maxItems} items.`, path, schemaPath: [...schemaPath, "maxItems"] })
  if (schema.uniqueItems === true && hasDuplicateJsonValues(value)) issues.push({ message: "Items must be unique.", path, schemaPath: [...schemaPath, "uniqueItems"] })

  value.forEach((item, index) => {
    const childSchema = schemaForArrayItem(schema, index, context)
    if (childSchema) issues.push(...validateAgainstSchema(item, childSchema, context, [...path, index], [...schemaPath, "items"], seen))
    else if (Array.isArray(schema.prefixItems) && schema.items === false && index >= schema.prefixItems.length) issues.push({ message: "Additional array items are not allowed.", path: [...path, index], schemaPath: [...schemaPath, "items"] })
  })
}

/**
 * @param {{ [key: string]: JsonValue }} value
 * @param {JsonSchema} schema
 * @param {SchemaContext} context
 * @param {Array<string | number>} path
 * @param {Array<string | number>} schemaPath
 * @param {Set<string>} seen
 * @param {JsonEditorIssue[]} issues
 */
function validateObject(value, schema, context, path, schemaPath, seen, issues) {
  if (typeof schema.minProperties === "number" && Object.keys(value).length < schema.minProperties) issues.push({ message: `Must contain at least ${schema.minProperties} properties.`, path, schemaPath: [...schemaPath, "minProperties"] })
  if (typeof schema.maxProperties === "number" && Object.keys(value).length > schema.maxProperties) issues.push({ message: `Must contain at most ${schema.maxProperties} properties.`, path, schemaPath: [...schemaPath, "maxProperties"] })

  if (Array.isArray(schema.required)) {
    for (const key of schema.required) {
      if (typeof key === "string" && !(key in value)) issues.push({ message: `Missing required property "${key}".`, path: [...path, key], schemaPath: [...schemaPath, "required"] })
    }
  }

  for (const [key, child] of Object.entries(value)) {
    const childSchema = schemaForObjectProperty(schema, key, context)
    if (childSchema) {
      issues.push(...validateAgainstSchema(child, childSchema, context, [...path, key], [...schemaPath, "properties", key], seen))
    } else if (schema.additionalProperties === false && !(isRecord(schema.properties) && key in schema.properties)) {
      issues.push({ message: `Additional property "${key}" is not allowed.`, path: [...path, key], schemaPath: [...schemaPath, "additionalProperties"] })
    }
  }
}

/**
 * @param {string} ref
 * @param {JsonSchema} fromSchema
 * @param {SchemaContext} context
 * @returns {JsonSchema | undefined}
 */
function resolveRef(ref, fromSchema, context) {
  const baseUri = context.baseUris.get(fromSchema) ?? document.baseURI
  const url = new URL(ref, baseUri)
  const documentUri = stripHash(url.href)
  const fragment = decodeURIComponent(url.hash.slice(1))
  const documentSchema = context.documents.get(documentUri) ?? (documentUri === stripHash(baseUri) ? context.root : undefined)
  if (!documentSchema) return undefined
  if (!fragment) return documentSchema
  if (fragment.startsWith("/")) return getJsonPointer(documentSchema, fragment)
  return context.anchors.get(`${documentUri}#${fragment}`)
}

/**
 * @param {JsonSchema | undefined} schema
 * @returns {string[] | undefined}
 */
function allowedTypesForSchema(schema) {
  if (!schema) return undefined
  if (typeof schema.type === "string") return [schema.type]
  if (Array.isArray(schema.type)) return schema.type.filter((type) => typeof type === "string")
  return undefined
}

/** @param {JsonSchema | undefined} schema */
function firstAllowedType(schema) {
  return allowedTypesForSchema(schema)?.[0]
}

/** @param {JsonSchema | undefined} schema */
function enumValuesForSchema(schema) {
  if (Array.isArray(schema?.enum)) return /** @type {JsonValue[]} */ (schema.enum)
  if (schema && "const" in schema) return [/** @type {JsonValue} */ (schema.const)]
  return undefined
}

/**
 * @param {JsonEditorIssue[]} issues
 * @param {Array<string | number>} path
 */
function issuesForPath(issues, path) {
  return issues.filter((issue) => samePath(issue.path, path))
}

/**
 * @param {Array<string | number>} left
 * @param {Array<string | number>} right
 */
function samePath(left, right) {
  return left.length === right.length && left.every((segment, index) => segment === right[index])
}

/** @param {unknown} value */
function jsonTypeOf(value) {
  if (value === null) return "null"
  if (Array.isArray(value)) return "array"
  if (typeof value === "number" && Number.isInteger(value)) return "integer"
  if (typeof value === "object") return "object"
  return typeof value
}

/**
 * @param {string} expected
 * @param {string} actual
 */
function jsonTypeMatches(expected, actual) {
  return expected === actual || (expected === "number" && actual === "integer")
}

/**
 * @param {JsonValue} root
 * @param {Array<string | number>} path
 * @param {JsonValue} value
 */
function setJsonPath(root, path, value) {
  if (path.length === 0) return value
  const parent = getValueAtPath(root, path.slice(0, -1))
  const key = path[path.length - 1]
  if (Array.isArray(parent) && typeof key === "number") parent[key] = value
  else if (isRecord(parent) && typeof key === "string") parent[key] = value
  return root
}

/**
 * @param {JsonValue} root
 * @param {Array<string | number>} path
 */
function removeJsonPath(root, path) {
  const parent = getValueAtPath(root, path.slice(0, -1))
  const key = path[path.length - 1]
  if (Array.isArray(parent) && typeof key === "number") parent.splice(key, 1)
  else if (isRecord(parent) && typeof key === "string") delete parent[key]
  return root
}

/**
 * @param {unknown} root
 * @param {Array<string | number>} path
 */
function getValueAtPath(root, path) {
  let current = root
  for (const segment of path) {
    if (Array.isArray(current) && typeof segment === "number") current = current[segment]
    else if (isRecord(current) && typeof segment === "string") current = current[segment]
    else return undefined
  }
  return current
}

/**
 * @template T
 * @param {T} value
 * @returns {T}
 */
function cloneJson(value) {
  return /** @type {T} */ (value === undefined ? undefined : JSON.parse(JSON.stringify(value)))
}

/**
 * @param {unknown} value
 * @returns {{ ok: true, value: JsonValue } | { ok: false, error: string }}
 */
function parseJson(value) {
  try {
    return { ok: true, value: /** @type {JsonValue} */ (JSON.parse(String(value))) }
  } catch (error) {
    return { ok: false, error: `Invalid JSON: ${errorMessage(error)}` }
  }
}

/** @param {unknown} value */
function getStandardProps(value) {
  if (!isRecord(value)) return undefined
  const standard = value["~standard"]
  return isRecord(standard) ? /** @type {StandardProps} */ (standard) : undefined
}

/** @param {StandardIssue} issue */
function standardIssueToJsonEditorIssue(issue) {
  return {
    message: typeof issue.message === "string" ? issue.message : "Invalid value.",
    path: Array.isArray(issue.path) ? issue.path.map(standardPathSegment).filter(isStringOrNumber) : [],
  }
}

/** @param {unknown} segment */
function standardPathSegment(segment) {
  if (isRecord(segment) && "key" in segment) return standardPathSegment(segment.key)
  if (typeof segment === "symbol") return String(segment.description ?? segment)
  return segment
}

/** @param {unknown} value */
function isStringOrNumber(value) {
  return typeof value === "string" || typeof value === "number"
}

/**
 * @param {unknown} value
 * @param {string} fallback
 * @param {string[]} allowed
 */
function normalizeToken(value, fallback, allowed) {
  return typeof value === "string" && allowed.includes(value) ? value : fallback
}

/**
 * @param {unknown} value
 * @returns {value is JsonSchema}
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * @param {unknown} value
 * @returns {value is { [key: string]: JsonValue }}
 */
function isPlainObject(value) {
  return isRecord(value) && Object.getPrototypeOf(value) === Object.prototype
}

/**
 * @param {unknown} left
 * @param {unknown} right
 * @returns {boolean}
 */
function deepEqual(left, right) {
  if (Object.is(left, right)) return true
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false
    return left.every((item, index) => deepEqual(item, right[index]))
  }
  if (isRecord(left) || isRecord(right)) {
    if (!isRecord(left) || !isRecord(right)) return false
    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)
    if (leftKeys.length !== rightKeys.length) return false
    return leftKeys.every((key) => Object.hasOwn(right, key) && deepEqual(left[key], right[key]))
  }
  return false
}

/** @param {JsonValue[]} value */
function hasDuplicateJsonValues(value) {
  return value.some((item, index) => value.slice(index + 1).some((other) => deepEqual(item, other)))
}

/**
 * @param {number} value
 * @param {number} multipleOf
 */
function isJsonMultipleOf(value, multipleOf) {
  const quotient = value / multipleOf
  if (!Number.isFinite(quotient)) return false
  const nearestInteger = Math.round(quotient)
  return Math.abs(quotient - nearestInteger) <= 1e-12 * Math.max(1, Math.abs(quotient))
}

/** @param {JsonEditorIssue} issue */
function copyIssue(issue) {
  return { ...issue, path: [...issue.path], schemaPath: issue.schemaPath ? [...issue.schemaPath] : undefined }
}

/** @param {JsonEditorValidationResult} validation */
function cloneValidationResult(validation) {
  return { valid: validation.valid, issues: validation.issues.map(copyIssue), value: validation.value }
}

/** @param {Array<string | number>} path */
function jsonPointer(path) {
  return path.map((segment) => `/${String(segment).replaceAll("~", "~0").replaceAll("/", "~1")}`).join("")
}

/**
 * @param {unknown} root
 * @param {string} pointer
 * @returns {JsonSchema | undefined}
 */
function getJsonPointer(root, pointer) {
  const parts = pointer.split("/").slice(1).map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
  let current = root
  for (const part of parts) {
    if (Array.isArray(current)) current = current[Number(part)]
    else if (isRecord(current)) current = current[part]
    else return undefined
  }
  return isRecord(current) ? /** @type {JsonSchema} */ (current) : undefined
}

/** @param {string} url */
function stripHash(url) {
  const parsed = new URL(url, document.baseURI)
  parsed.hash = ""
  return parsed.href
}

/** @param {unknown} error */
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}
