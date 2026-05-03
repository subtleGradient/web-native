// @ts-check

const pressedChangeEventName = "base-ui:pressed-change"

export class BaseToggle extends HTMLElement {
  static observedAttributes = ["disabled", "pressed"]

  connectedCallback() {
    this.onclick = this.#handleClick.bind(this)
    this.onkeydown = this.#handleKeyDown.bind(this)
    this.#syncAttributes()
  }

  disconnectedCallback() {
    this.onclick = null
    this.onkeydown = null
  }

  attributeChangedCallback() {
    this.#syncAttributes()
  }

  get pressed() {
    return this.hasAttribute("pressed")
  }

  /** @param {boolean} value */
  set pressed(value) {
    setBooleanAttribute(this, "pressed", value)
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
    if (this.disabled) return
    this.#requestPressedChange(!this.pressed, event)
  }

  /** @param {KeyboardEvent} event */
  #handleKeyDown(event) {
    if (this.disabled) return
    if (event.key !== " " && event.key !== "Enter") return

    event.preventDefault()
    this.#requestPressedChange(!this.pressed, event)
  }

  /**
   * @param {boolean} nextPressed
   * @param {Event} nativeEvent
   */
  #requestPressedChange(nextPressed, nativeEvent) {
    const event = new CustomEvent(pressedChangeEventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: {
        pressed: nextPressed,
        reason: "none",
      },
    })

    if (!this.dispatchEvent(event)) return

    this.pressed = nextPressed
    nativeEvent.preventDefault()
  }

  #syncAttributes() {
    this.setAttribute("role", "button")
    this.setAttribute("aria-pressed", String(this.pressed))

    if (this.disabled) {
      this.setAttribute("aria-disabled", "true")
      this.setAttribute("tabindex", "-1")
    } else {
      this.removeAttribute("aria-disabled")
      this.setAttribute("tabindex", "0")
    }

    setBooleanAttribute(this, "data-pressed", this.pressed)
    setBooleanAttribute(this, "data-disabled", this.disabled)
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
export function defineBaseToggle(name = "base-toggle") {
  if (!customElements.get(name)) {
    customElements.define(name, BaseToggle)
  }
}
