// @ts-check

const checkedChangeEventName = "base-ui:checked-change"

export class BaseCheckbox extends HTMLElement {
  static observedAttributes = ["checked", "disabled", "indeterminate"]

  connectedCallback() {
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
    return this.hasAttribute("disabled")
  }

  /** @param {boolean} value */
  set disabled(value) {
    setBooleanAttribute(this, "disabled", value)
  }

  /** @param {MouseEvent} event */
  #handleClick(event) {
    if (this.disabled) {
      event.preventDefault()
      event.stopImmediatePropagation()
      return
    }

    this.#requestCheckedChange(this.indeterminate ? true : !this.checked, false, event)
  }

  /** @param {KeyboardEvent} event */
  #handleKeyDown(event) {
    if (this.disabled) return
    if (event.key !== " ") return

    event.preventDefault()
    this.#setActive(true)
    this.#requestCheckedChange(this.indeterminate ? true : !this.checked, false, event)
  }

  /** @param {KeyboardEvent} event */
  #handleKeyUp(event) {
    if (event.key === " ") this.#clearActive()
  }

  /** @param {PointerEvent} event */
  #handlePointerDown(event) {
    if (this.disabled || event.button !== 0) return
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
  }

  /** @param {boolean} active */
  #setActive(active) {
    setBooleanAttribute(this, "data-active", active && !this.disabled)
  }

  #clearActive() {
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

/** @param {string} [name] */
export function defineBaseCheckbox(name = "base-checkbox") {
  if (!customElements.get(name)) {
    customElements.define(name, BaseCheckbox)
  }
}
