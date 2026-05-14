// @ts-check

const checkedChangeEventName = "base-ui:checked-change"
const defaultFormValue = "on"

export class BaseCheckbox extends HTMLElement {
  static formAssociated = true
  static observedAttributes = [
    "checked",
    "disabled",
    "indeterminate",
    "name",
    "required",
    "unchecked-value",
    "value",
  ]

  /** @type {ElementInternals | undefined} */
  #internals = typeof this.attachInternals === "function" ? this.attachInternals() : undefined

  #defaultChecked = false

  #defaultIndeterminate = false

  #defaultsCaptured = false

  #formDisabled = false

  #spaceKeyDown = false

  connectedCallback() {
    if (!this.#defaultsCaptured) {
      this.#defaultChecked = this.checked
      this.#defaultIndeterminate = this.indeterminate
      this.#defaultsCaptured = true
    }

    this.onclick = this.#handleClick.bind(this)
    this.onkeydown = this.#handleKeyDown.bind(this)
    this.onkeyup = this.#handleKeyUp.bind(this)
    this.onpointerdown = this.#handlePointerDown.bind(this)
    this.onpointerup = this.#clearActive.bind(this)
    this.onpointercancel = this.#clearActive.bind(this)
    this.onpointerleave = this.#clearActive.bind(this)
    this.onblur = this.#clearActive.bind(this)
    this.#syncAttributes()
  }

  disconnectedCallback() {
    this.onclick = null
    this.onkeydown = null
    this.onkeyup = null
    this.onpointerdown = null
    this.onpointerup = null
    this.onpointercancel = null
    this.onpointerleave = null
    this.onblur = null
  }

  attributeChangedCallback() {
    this.#syncAttributes()
  }

  get checked() {
    return this.hasAttribute("checked")
  }

  /** @param {boolean} value */
  set checked(value) {
    setBooleanAttribute(this, "checked", value)
  }

  get indeterminate() {
    return this.hasAttribute("indeterminate")
  }

  /** @param {boolean} value */
  set indeterminate(value) {
    setBooleanAttribute(this, "indeterminate", value)
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

  get name() {
    return this.getAttribute("name") ?? ""
  }

  /** @param {string | null | undefined} value */
  set name(value) {
    if (value == null) this.removeAttribute("name")
    else this.setAttribute("name", String(value))
  }

  get value() {
    return this.getAttribute("value") ?? defaultFormValue
  }

  /** @param {string | null | undefined} value */
  set value(value) {
    if (value == null) this.removeAttribute("value")
    else this.setAttribute("value", String(value))
  }

  get uncheckedValue() {
    return this.getAttribute("unchecked-value")
  }

  /** @param {string | null | undefined} value */
  set uncheckedValue(value) {
    if (value == null) this.removeAttribute("unchecked-value")
    else this.setAttribute("unchecked-value", String(value))
  }

  /** @param {boolean} disabled */
  formDisabledCallback(disabled) {
    this.#formDisabled = disabled
    this.#syncAttributes()
  }

  formResetCallback() {
    this.checked = this.#defaultChecked
    this.indeterminate = this.#defaultIndeterminate
  }

  /** @param {MouseEvent} event */
  #handleClick(event) {
    if (this.disabled) {
      blockInteraction(event)
      return
    }

    this.#requestCheckedChange(this.indeterminate ? true : !this.checked, false, event)
  }

  /** @param {KeyboardEvent} event */
  #handleKeyDown(event) {
    const isActivationKey = event.key === " " || event.key === "Enter"

    if (this.disabled) {
      if (isActivationKey) blockInteraction(event)
      return
    }

    if (!isActivationKey) return

    event.preventDefault()
    this.#setActive(true)

    if (event.key === " ") {
      this.#spaceKeyDown = true
      return
    }

    this.#requestCheckedChange(this.indeterminate ? true : !this.checked, false, event)
  }

  /** @param {KeyboardEvent} event */
  #handleKeyUp(event) {
    if (event.key === " ") {
      const shouldActivate = this.#spaceKeyDown && !this.disabled
      this.#spaceKeyDown = false

      if (shouldActivate) {
        this.#requestCheckedChange(this.indeterminate ? true : !this.checked, false, event)
      }

      this.#clearActive()
    } else if (event.key === "Enter") {
      this.#clearActive()
    }
  }

  /** @param {PointerEvent} event */
  #handlePointerDown(event) {
    if (event.button !== 0) return

    if (this.disabled) {
      blockInteraction(event)
      return
    }

    this.#setActive(true)
  }

  /**
   * @param {boolean} nextChecked
   * @param {boolean} nextIndeterminate
   * @param {Event} nativeEvent
   */
  #requestCheckedChange(nextChecked, nextIndeterminate, nativeEvent) {
    const previousChecked = this.checked
    const previousIndeterminate = this.indeterminate
    const event = new CustomEvent(checkedChangeEventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: {
        checked: nextChecked,
        indeterminate: nextIndeterminate,
        previousChecked,
        previousIndeterminate,
        reason: "none",
      },
    })

    if (!this.dispatchEvent(event)) return

    this.checked = nextChecked
    this.indeterminate = nextIndeterminate
    nativeEvent.preventDefault()
  }

  #syncAttributes() {
    const state = this.indeterminate ? "indeterminate" : this.checked ? "checked" : "unchecked"

    this.setAttribute("role", "checkbox")
    this.setAttribute("aria-checked", this.indeterminate ? "mixed" : String(this.checked))
    this.setAttribute("data-state", state)

    if (this.disabled) {
      this.setAttribute("aria-disabled", "true")
      this.setAttribute("tabindex", "-1")
    } else {
      this.removeAttribute("aria-disabled")
      this.setAttribute("tabindex", "0")
    }

    setBooleanAttribute(this, "data-checked", this.checked && !this.indeterminate)
    setBooleanAttribute(this, "data-unchecked", !this.checked && !this.indeterminate)
    setBooleanAttribute(this, "data-indeterminate", this.indeterminate)
    setBooleanAttribute(this, "data-disabled", this.disabled)
    if (this.disabled) this.#clearActive()
    this.#syncFormValue()
  }

  #syncFormValue() {
    const formValue = this.checked ? this.value : this.uncheckedValue
    this.#internals?.setFormValue(this.disabled ? null : (formValue ?? null))

    if (this.required && !this.checked && !this.disabled) {
      this.#internals?.setValidity({ valueMissing: true }, "Please check this box.", this)
    } else {
      this.#internals?.setValidity({})
    }
  }

  /** @param {boolean} active */
  #setActive(active) {
    setBooleanAttribute(this, "data-active", active && !this.disabled)
  }

  #clearActive() {
    this.#spaceKeyDown = false
    this.#setActive(false)
  }
}

/**
 * @param {Element} element
 * @param {string} name
 * @param {boolean} value
 */
function setBooleanAttribute(element, name, value) {
  if (value) {
    element.setAttribute(name, "")
  } else {
    element.removeAttribute(name)
  }
}

/** @param {Event} event */
function blockInteraction(event) {
  event.preventDefault()
  event.stopImmediatePropagation()
}

/** @param {string} [name] */
export function defineBaseCheckbox(name = "base-checkbox") {
  if (!customElements.get(name)) {
    customElements.define(name, BaseCheckbox)
  }
}
