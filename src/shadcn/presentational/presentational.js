// @ts-check

import { normalizeToken, setBooleanAttribute, setDataAttributes, setSlot, syncGeneratedClasses } from "../internal/classes.js"

const badgeVariants = ["default", "secondary", "destructive", "outline", "ghost", "link"]
const alertVariants = ["default", "destructive"]
const cardSizes = ["default", "sm"]
const fieldLegendVariants = ["legend", "label"]
const fieldOrientations = ["vertical", "horizontal", "responsive"]
const nativeSelectSizes = ["default", "sm"]
const avatarSizes = ["default", "sm", "lg"]
const commonTextControlAttributes = ["autocomplete", "disabled", "maxlength", "minlength", "placeholder", "readonly", "required", "aria-invalid"]
const inputControlAttributes = [...commonTextControlAttributes, "accept", "capture", "max", "min", "multiple", "pattern", "step", "type", "value"]
const textareaControlAttributes = [...commonTextControlAttributes, "cols", "rows", "wrap", "value"]

/** @typedef {HTMLInputElement | HTMLTextAreaElement} TextControlElement */

class StyledElement extends HTMLElement {
  connectedCallback() {
    this.sync()
  }

  /**
   * @param {string} _name
   * @param {string | null} _oldValue
   * @param {string | null} _newValue
   */
  attributeChangedCallback(_name, _oldValue, _newValue) {
    this.sync()
  }

  sync() {}
}

export class ShadcnBadge extends StyledElement {
  static observedAttributes = ["variant"]

  /** @returns {string} */
  get variant() {
    return normalizeToken(this.getAttribute("variant"), "default", badgeVariants)
  }

  /** @param {string | null | undefined} value */
  set variant(value) {
    if (value == null) this.removeAttribute("variant")
    else this.setAttribute("variant", normalizeToken(value, "default", badgeVariants))
  }

  sync() {
    setSlot(this, "badge")
    setDataAttributes(this, { variant: this.variant })
    syncGeneratedClasses(this, ["cn-badge", "cn-badge-variant-" + this.variant])
  }
}

export class ShadcnCard extends StyledElement {
  static observedAttributes = ["size"]

  /** @returns {string} */
  get size() {
    return normalizeToken(this.getAttribute("size"), "default", cardSizes)
  }

  /** @param {string | null | undefined} value */
  set size(value) {
    if (value == null) this.removeAttribute("size")
    else this.setAttribute("size", normalizeToken(value, "default", cardSizes))
  }

  sync() {
    setSlot(this, "card")
    setDataAttributes(this, { size: this.size })
    syncGeneratedClasses(this, ["cn-card"])
  }
}

export class ShadcnCardHeader extends StyledElement {
  sync() {
    setSlot(this, "card-header")
    syncGeneratedClasses(this, ["cn-card-header"])
  }
}

export class ShadcnCardTitle extends StyledElement {
  sync() {
    setSlot(this, "card-title")
    syncGeneratedClasses(this, ["cn-card-title", "cn-font-heading"])
  }
}

export class ShadcnCardDescription extends StyledElement {
  sync() {
    setSlot(this, "card-description")
    syncGeneratedClasses(this, ["cn-card-description"])
  }
}

export class ShadcnCardContent extends StyledElement {
  sync() {
    setSlot(this, "card-content")
    syncGeneratedClasses(this, ["cn-card-content"])
  }
}

export class ShadcnCardFooter extends StyledElement {
  sync() {
    setSlot(this, "card-footer")
    syncGeneratedClasses(this, ["cn-card-footer"])
  }
}

export class ShadcnCardAction extends StyledElement {
  sync() {
    setSlot(this, "card-action")
    syncGeneratedClasses(this, ["cn-card-action"])
  }
}

export class ShadcnAlert extends StyledElement {
  static observedAttributes = ["variant"]

  /** @returns {string} */
  get variant() {
    return normalizeToken(this.getAttribute("variant"), "default", alertVariants)
  }

  /** @param {string | null | undefined} value */
  set variant(value) {
    if (value == null) this.removeAttribute("variant")
    else this.setAttribute("variant", normalizeToken(value, "default", alertVariants))
  }

  sync() {
    setSlot(this, "alert")
    setDataAttributes(this, { variant: this.variant })
    syncGeneratedClasses(this, ["cn-alert", "cn-alert-variant-" + this.variant])
    this.setAttribute("role", "alert")
  }
}

export class ShadcnAlertTitle extends StyledElement {
  sync() {
    setSlot(this, "alert-title")
    syncGeneratedClasses(this, ["cn-alert-title"])
  }
}

export class ShadcnAlertDescription extends StyledElement {
  sync() {
    setSlot(this, "alert-description")
    syncGeneratedClasses(this, ["cn-alert-description"])
  }
}

export class ShadcnSkeleton extends StyledElement {
  sync() {
    setSlot(this, "skeleton")
    syncGeneratedClasses(this, ["cn-skeleton"])
    this.setAttribute("aria-hidden", "true")
  }
}

export class ShadcnKbd extends StyledElement {
  sync() {
    setSlot(this, "kbd")
    syncGeneratedClasses(this, ["cn-kbd"])
  }
}

export class ShadcnKbdGroup extends StyledElement {
  sync() {
    setSlot(this, "kbd-group")
    syncGeneratedClasses(this, ["cn-kbd-group"])
  }
}

export class ShadcnLabel extends StyledElement {
  connectedCallback() {
    this.onclick = this.#handleClick.bind(this)
    super.connectedCallback()
  }

  disconnectedCallback() {
    this.onclick = null
  }

  get htmlFor() {
    return this.getAttribute("for") ?? ""
  }

  /** @param {string | null | undefined} value */
  set htmlFor(value) {
    if (value == null) this.removeAttribute("for")
    else this.setAttribute("for", String(value))
  }

  sync() {
    setSlot(this, "label")
    syncGeneratedClasses(this, ["cn-label"])
  }

  /** @param {MouseEvent} event */
  #handleClick(event) {
    if (event.defaultPrevented) return

    const target = this.htmlFor ? document.getElementById(this.htmlFor) : getFocusableDescendant(this)
    if (!target || target === this) return
    target.focus()
  }
}

class ShadcnTextControl extends StyledElement {
  static formAssociated = true

  /** @type {ElementInternals | undefined} */
  #internals = typeof this.attachInternals === "function" ? this.attachInternals() : undefined

  /** @type {TextControlElement | undefined} */
  #control

  #defaultValue = ""

  #defaultsCaptured = false

  #formDisabled = false

  /** @type {(event: Event) => void} */
  #handleInput = () => this.#syncFormValue()

  /** @returns {"input" | "textarea"} */
  get controlTag() {
    return "input"
  }

  /** @returns {string} */
  get hostSlot() {
    return "input-wrapper"
  }

  /** @returns {string} */
  get hostClass() {
    return "cn-input-wrapper"
  }

  /** @returns {string} */
  get controlSlot() {
    return "input"
  }

  /** @returns {string} */
  get controlClass() {
    return "cn-input"
  }

  /** @returns {string[]} */
  get controlAttributes() {
    return inputControlAttributes
  }

  connectedCallback() {
    const control = this.#ensureControl()
    if (!this.#defaultsCaptured) {
      this.#defaultValue = this.getAttribute("value") ?? control.getAttribute("value") ?? control.value
      control.value = this.#defaultValue
      this.#defaultsCaptured = true
    }

    control.addEventListener("input", this.#handleInput)
    control.addEventListener("change", this.#handleInput)
    this.onclick = this.#handleClick.bind(this)
    this.sync()
  }

  disconnectedCallback() {
    this.#control?.removeEventListener("input", this.#handleInput)
    this.#control?.removeEventListener("change", this.#handleInput)
    this.onclick = null
  }

  /**
   * @param {string} name
   * @param {string | null} oldValue
   * @param {string | null} newValue
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "value" && oldValue !== newValue && this.#control) {
      this.#control.value = newValue ?? ""
    }

    this.sync()
  }

  get name() {
    return this.getAttribute("name") ?? ""
  }

  /** @param {string | null | undefined} value */
  set name(value) {
    if (value == null) this.removeAttribute("name")
    else this.setAttribute("name", String(value))
  }

  /** @returns {string} */
  get value() {
    return this.#control?.value ?? this.getAttribute("value") ?? ""
  }

  /** @param {string | null | undefined} value */
  set value(value) {
    const nextValue = value == null ? "" : String(value)
    if (this.#control) this.#control.value = nextValue
    this.setAttribute("value", nextValue)
    this.#syncFormValue()
  }

  get disabled() {
    return this.hasAttribute("disabled") || this.#formDisabled
  }

  /** @param {boolean} value */
  set disabled(value) {
    setBooleanAttribute(this, "disabled", value)
  }

  get required() {
    return this.hasAttribute("required")
  }

  /** @param {boolean} value */
  set required(value) {
    setBooleanAttribute(this, "required", value)
  }

  /** @param {boolean} disabled */
  formDisabledCallback(disabled) {
    this.#formDisabled = disabled
    this.sync()
  }

  formResetCallback() {
    this.value = this.#defaultValue
  }

  /** @param {FocusOptions} [options] */
  focus(options) {
    this.#ensureControl().focus(options)
  }

  sync() {
    const control = this.#ensureControl()
    setSlot(this, this.hostSlot)
    syncGeneratedClasses(this, [this.hostClass])
    setSlot(control, this.controlSlot)
    syncGeneratedClasses(control, [this.controlClass])
    this.#syncControlAttributes(control)
    this.#syncFormValue()
  }

  /** @param {MouseEvent} event */
  #handleClick(event) {
    if (event.defaultPrevented || event.target === this.#control) return
    this.#control?.focus()
  }

  /** @returns {TextControlElement} */
  #ensureControl() {
    if (this.#control && this.#control.isConnected) return this.#control

    const existing = getFirstElement(this, this.controlTag)
    if (existing) {
      this.#control = existing
      return existing
    }

    const control = document.createElement(this.controlTag)
    this.append(control)
    this.#control = control
    return control
  }

  /** @param {TextControlElement} control */
  #syncControlAttributes(control) {
    if (!this.hasAttribute("name") && control.name) this.name = control.name
    control.removeAttribute("name")

    for (const name of this.controlAttributes) {
      if (name === "value") continue

      if (this.hasAttribute(name)) control.setAttribute(name, this.getAttribute(name) ?? "")
      else control.removeAttribute(name)
    }

    setBooleanAttribute(control, "disabled", this.disabled)
    setBooleanAttribute(control, "readonly", this.hasAttribute("readonly"))
    setBooleanAttribute(control, "required", this.required)
    if (this.disabled) this.setAttribute("aria-disabled", "true")
    else this.removeAttribute("aria-disabled")
    if (this.hasAttribute("aria-invalid")) control.setAttribute("aria-invalid", this.getAttribute("aria-invalid") ?? "true")
  }

  #syncFormValue() {
    const value = this.value
    this.#internals?.setFormValue(this.disabled ? null : value)

    if (this.required && !value && !this.disabled) {
      this.#internals?.setValidity({ valueMissing: true }, "Please fill out this field.", this.#control)
    } else {
      this.#internals?.setValidity({})
    }
  }
}

export class ShadcnInput extends ShadcnTextControl {
  static observedAttributes = inputControlAttributes
}

export class ShadcnTextarea extends ShadcnTextControl {
  static observedAttributes = textareaControlAttributes

  /** @returns {"textarea"} */
  get controlTag() {
    return "textarea"
  }

  /** @returns {string} */
  get hostSlot() {
    return "textarea-wrapper"
  }

  /** @returns {string} */
  get hostClass() {
    return "cn-textarea-wrapper"
  }

  /** @returns {string} */
  get controlSlot() {
    return "textarea"
  }

  /** @returns {string} */
  get controlClass() {
    return "cn-textarea"
  }

  /** @returns {string[]} */
  get controlAttributes() {
    return textareaControlAttributes
  }
}

export class ShadcnNativeSelect extends StyledElement {
  static observedAttributes = ["size"]

  /** @returns {string} */
  get size() {
    return normalizeToken(this.getAttribute("size"), "default", nativeSelectSizes)
  }

  /** @param {string | null | undefined} value */
  set size(value) {
    if (value == null) this.removeAttribute("size")
    else this.setAttribute("size", normalizeToken(value, "default", nativeSelectSizes))
  }

  sync() {
    setSlot(this, "native-select-wrapper")
    setDataAttributes(this, { size: this.size })
    syncGeneratedClasses(this, ["cn-native-select-wrapper", "cn-native-select-wrapper-size-" + this.size])

    const select = getFirstElement(this, "select")
    if (select) {
      setSlot(select, "native-select")
      setDataAttributes(select, { size: this.size })
      syncGeneratedClasses(select, ["cn-native-select", "cn-native-select-size-" + this.size])
    }

    for (const option of this.querySelectorAll("option")) {
      setSlot(option, "native-select-option")
      syncGeneratedClasses(option, ["cn-native-select-option"])
    }

    for (const optgroup of this.querySelectorAll("optgroup")) {
      setSlot(optgroup, "native-select-optgroup")
      syncGeneratedClasses(optgroup, ["cn-native-select-optgroup"])
    }
  }
}

export class ShadcnFieldSet extends StyledElement {
  sync() {
    setSlot(this, "field-set")
    syncGeneratedClasses(this, ["cn-field-set"])
  }
}

export class ShadcnFieldLegend extends StyledElement {
  static observedAttributes = ["variant"]

  /** @returns {string} */
  get variant() {
    return normalizeToken(this.getAttribute("variant"), "legend", fieldLegendVariants)
  }

  /** @param {string | null | undefined} value */
  set variant(value) {
    if (value == null) this.removeAttribute("variant")
    else this.setAttribute("variant", normalizeToken(value, "legend", fieldLegendVariants))
  }

  sync() {
    setSlot(this, "field-legend")
    setDataAttributes(this, { variant: this.variant })
    syncGeneratedClasses(this, ["cn-field-legend", "cn-field-legend-variant-" + this.variant])
  }
}

export class ShadcnFieldGroup extends StyledElement {
  sync() {
    setSlot(this, "field-group")
    syncGeneratedClasses(this, ["cn-field-group"])
  }
}

export class ShadcnField extends StyledElement {
  static observedAttributes = ["orientation"]

  /** @returns {string} */
  get orientation() {
    return normalizeToken(this.getAttribute("orientation"), "vertical", fieldOrientations)
  }

  /** @param {string | null | undefined} value */
  set orientation(value) {
    if (value == null) this.removeAttribute("orientation")
    else this.setAttribute("orientation", normalizeToken(value, "vertical", fieldOrientations))
  }

  sync() {
    setSlot(this, "field")
    setDataAttributes(this, { orientation: this.orientation })
    syncGeneratedClasses(this, ["cn-field", "cn-field-orientation-" + this.orientation])
    this.setAttribute("role", "group")
  }
}

export class ShadcnFieldContent extends StyledElement {
  sync() {
    setSlot(this, "field-content")
    syncGeneratedClasses(this, ["cn-field-content"])
  }
}

export class ShadcnFieldLabel extends ShadcnLabel {
  sync() {
    setSlot(this, "field-label")
    syncGeneratedClasses(this, ["cn-label", "cn-field-label"])
  }
}

export class ShadcnFieldTitle extends StyledElement {
  sync() {
    setSlot(this, "field-title")
    syncGeneratedClasses(this, ["cn-field-title"])
  }
}

export class ShadcnFieldDescription extends StyledElement {
  sync() {
    setSlot(this, "field-description")
    syncGeneratedClasses(this, ["cn-field-description"])
  }
}

export class ShadcnFieldError extends StyledElement {
  sync() {
    setSlot(this, "field-error")
    syncGeneratedClasses(this, ["cn-field-error"])
    this.setAttribute("role", "alert")
  }
}

export class ShadcnFieldSeparator extends StyledElement {
  sync() {
    setSlot(this, "field-separator")
    syncGeneratedClasses(this, ["cn-field-separator"])
    setDataAttributes(this, { content: this.textContent?.trim() ? "true" : "false" })
  }
}

export class ShadcnTable extends StyledElement {
  sync() {
    setSlot(this, "table-container")
    syncGeneratedClasses(this, ["cn-table-container"])
  }
}

export class ShadcnTableElement extends HTMLTableElement {
  connectedCallback() {
    setSlot(this, "table")
    syncGeneratedClasses(this, ["cn-table"])
  }
}

export class ShadcnTableHeader extends HTMLTableSectionElement {
  connectedCallback() {
    setSlot(this, "table-header")
    syncGeneratedClasses(this, ["cn-table-header"])
  }
}

export class ShadcnTableBody extends HTMLTableSectionElement {
  connectedCallback() {
    setSlot(this, "table-body")
    syncGeneratedClasses(this, ["cn-table-body"])
  }
}

export class ShadcnTableFooter extends HTMLTableSectionElement {
  connectedCallback() {
    setSlot(this, "table-footer")
    syncGeneratedClasses(this, ["cn-table-footer"])
  }
}

export class ShadcnTableRow extends HTMLTableRowElement {
  connectedCallback() {
    setSlot(this, "table-row")
    syncGeneratedClasses(this, ["cn-table-row"])
  }
}

export class ShadcnTableHead extends HTMLTableCellElement {
  connectedCallback() {
    setSlot(this, "table-head")
    syncGeneratedClasses(this, ["cn-table-head"])
  }
}

export class ShadcnTableCell extends HTMLTableCellElement {
  connectedCallback() {
    setSlot(this, "table-cell")
    syncGeneratedClasses(this, ["cn-table-cell"])
  }
}

export class ShadcnTableCaption extends HTMLTableCaptionElement {
  connectedCallback() {
    setSlot(this, "table-caption")
    syncGeneratedClasses(this, ["cn-table-caption"])
  }
}

export class ShadcnAvatar extends StyledElement {
  static observedAttributes = ["size"]

  /** @returns {string} */
  get size() {
    return normalizeToken(this.getAttribute("size"), "default", avatarSizes)
  }

  /** @param {string | null | undefined} value */
  set size(value) {
    if (value == null) this.removeAttribute("size")
    else this.setAttribute("size", normalizeToken(value, "default", avatarSizes))
  }

  sync() {
    setSlot(this, "avatar")
    setDataAttributes(this, { size: this.size })
    syncGeneratedClasses(this, ["cn-avatar", "cn-avatar-size-" + this.size])
  }
}

export class ShadcnAvatarImage extends StyledElement {
  connectedCallback() {
    super.connectedCallback()
    this.#syncImageState()
    const image = getFirstElement(this, "img")
    if (image) {
      image.onload = () => this.#syncImageState()
      image.onerror = () => this.#syncImageState(false)
    }
  }

  disconnectedCallback() {
    const image = getFirstElement(this, "img")
    if (image) {
      image.onload = null
      image.onerror = null
    }
  }

  sync() {
    setSlot(this, "avatar-image")
    syncGeneratedClasses(this, ["cn-avatar-image"])
    const image = getFirstElement(this, "img")
    if (image) syncGeneratedClasses(image, ["cn-avatar-img"])
  }

  /** @param {boolean} [loaded] */
  #syncImageState(loaded) {
    const image = getFirstElement(this, "img")
    const isLoaded = loaded ?? Boolean(image?.complete && image.naturalWidth > 0)
    setDataAttributes(this, { state: isLoaded ? "loaded" : "loading" })
  }
}

export class ShadcnAvatarFallback extends StyledElement {
  sync() {
    setSlot(this, "avatar-fallback")
    syncGeneratedClasses(this, ["cn-avatar-fallback"])
  }
}

export class ShadcnAvatarBadge extends StyledElement {
  sync() {
    setSlot(this, "avatar-badge")
    syncGeneratedClasses(this, ["cn-avatar-badge"])
  }
}

export class ShadcnAvatarGroup extends StyledElement {
  sync() {
    setSlot(this, "avatar-group")
    syncGeneratedClasses(this, ["cn-avatar-group"])
  }
}

export class ShadcnAvatarGroupCount extends StyledElement {
  sync() {
    setSlot(this, "avatar-group-count")
    syncGeneratedClasses(this, ["cn-avatar-group-count"])
  }
}

export function defineShadcnPresentational() {
  define("shadcn-badge", ShadcnBadge)
  define("shadcn-card", ShadcnCard)
  define("shadcn-card-header", ShadcnCardHeader)
  define("shadcn-card-title", ShadcnCardTitle)
  define("shadcn-card-description", ShadcnCardDescription)
  define("shadcn-card-content", ShadcnCardContent)
  define("shadcn-card-footer", ShadcnCardFooter)
  define("shadcn-card-action", ShadcnCardAction)
  define("shadcn-alert", ShadcnAlert)
  define("shadcn-alert-title", ShadcnAlertTitle)
  define("shadcn-alert-description", ShadcnAlertDescription)
  define("shadcn-skeleton", ShadcnSkeleton)
  define("shadcn-kbd", ShadcnKbd)
  define("shadcn-kbd-group", ShadcnKbdGroup)
  define("shadcn-label", ShadcnLabel)
  define("shadcn-input", ShadcnInput)
  define("shadcn-textarea", ShadcnTextarea)
  define("shadcn-native-select", ShadcnNativeSelect)
  define("shadcn-field-set", ShadcnFieldSet)
  define("shadcn-field-legend", ShadcnFieldLegend)
  define("shadcn-field-group", ShadcnFieldGroup)
  define("shadcn-field", ShadcnField)
  define("shadcn-field-content", ShadcnFieldContent)
  define("shadcn-field-label", ShadcnFieldLabel)
  define("shadcn-field-title", ShadcnFieldTitle)
  define("shadcn-field-description", ShadcnFieldDescription)
  define("shadcn-field-error", ShadcnFieldError)
  define("shadcn-field-separator", ShadcnFieldSeparator)
  define("shadcn-table", ShadcnTable)
  defineBuiltIn("shadcn-table-element", ShadcnTableElement, { extends: "table" })
  defineBuiltIn("shadcn-table-header", ShadcnTableHeader, { extends: "thead" })
  defineBuiltIn("shadcn-table-body", ShadcnTableBody, { extends: "tbody" })
  defineBuiltIn("shadcn-table-footer", ShadcnTableFooter, { extends: "tfoot" })
  defineBuiltIn("shadcn-table-row", ShadcnTableRow, { extends: "tr" })
  defineBuiltIn("shadcn-table-head", ShadcnTableHead, { extends: "th" })
  defineBuiltIn("shadcn-table-cell", ShadcnTableCell, { extends: "td" })
  defineBuiltIn("shadcn-table-caption", ShadcnTableCaption, { extends: "caption" })
  define("shadcn-avatar", ShadcnAvatar)
  define("shadcn-avatar-image", ShadcnAvatarImage)
  define("shadcn-avatar-fallback", ShadcnAvatarFallback)
  define("shadcn-avatar-badge", ShadcnAvatarBadge)
  define("shadcn-avatar-group", ShadcnAvatarGroup)
  define("shadcn-avatar-group-count", ShadcnAvatarGroupCount)
}

/**
 * @param {string} name
 * @param {CustomElementConstructor} constructor
 */
function define(name, constructor) {
  if (!customElements.get(name)) customElements.define(name, constructor)
}

/**
 * @param {string} name
 * @param {CustomElementConstructor} constructor
 * @param {ElementDefinitionOptions} options
 */
function defineBuiltIn(name, constructor, options) {
  if (!customElements.get(name)) customElements.define(name, constructor, options)
}

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {ParentNode} parent
 * @param {K} selector
 * @returns {HTMLElementTagNameMap[K] | null}
 */
function getFirstElement(parent, selector) {
  return parent.querySelector(selector)
}

/** @param {ParentNode} parent */
function getFocusableDescendant(parent) {
  return /** @type {HTMLElement | null} */ (parent.querySelector("button, input, select, textarea, [href], [tabindex]:not([tabindex='-1'])"))
}
