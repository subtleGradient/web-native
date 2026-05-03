// @ts-check

const checkedChangeEventName = "base-ui:checked-change"

export class BaseSwitch extends HTMLElement {
  static observedAttributes = ["checked", "disabled"]

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

    this.#requestCheckedChange(!this.checked, event)
  }

  /** @param {KeyboardEvent} event */
  #handleKeyDown(event) {
    if (this.disabled) return
    if (event.key !== " " && event.key !== "Enter") return

    event.preventDefault()
    this.#setActive(true)
    this.#requestCheckedChange(!this.checked, event)
  }

  /** @param {KeyboardEvent} event */
  #handleKeyUp(event) {
    if (event.key === " " || event.key === "Enter") this.#clearActive()
  }

  /** @param {PointerEvent} event */
  #handlePointerDown(event) {
    if (this.disabled || event.button !== 0) return
    this.#setActive(true)
  }

  /**
   * @param {boolean} nextChecked
   * @param {Event} nativeEvent
   */
  #requestCheckedChange(nextChecked, nativeEvent) {
    const previousChecked = this.checked
    const event = new CustomEvent(checkedChangeEventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: {
        checked: nextChecked,
        previousChecked,
        reason: "none",
      },
    })

    if (!this.dispatchEvent(event)) return

    this.checked = nextChecked
    nativeEvent.preventDefault()
  }

  #syncAttributes() {
    this.setAttribute("role", "switch")
    this.setAttribute("aria-checked", String(this.checked))
    this.setAttribute("data-state", this.checked ? "checked" : "unchecked")

    if (this.disabled) {
      this.setAttribute("aria-disabled", "true")
      this.setAttribute("tabindex", "-1")
    } else {
      this.removeAttribute("aria-disabled")
      this.setAttribute("tabindex", "0")
    }

    setBooleanAttribute(this, "data-checked", this.checked)
    setBooleanAttribute(this, "data-unchecked", !this.checked)
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
export function defineBaseSwitch(name = "base-switch") {
  if (!customElements.get(name)) {
    customElements.define(name, BaseSwitch)
  }
}
