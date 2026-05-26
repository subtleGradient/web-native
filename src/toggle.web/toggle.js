// @ts-check

const pressedChangeEventName = "base-ui:pressed-change"

export class BaseToggle extends HTMLElement {
  static observedAttributes = ["disabled", "pressed"]

  #spaceKeyDown = false

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
    if (this.disabled) {
      blockInteraction(event)
      return
    }

    this.#requestPressedChange(!this.pressed, event)
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

    this.#requestPressedChange(!this.pressed, event)
  }

  /** @param {KeyboardEvent} event */
  #handleKeyUp(event) {
    if (event.key === " ") {
      const shouldActivate = this.#spaceKeyDown && !this.disabled
      this.#spaceKeyDown = false

      if (shouldActivate) {
        this.#requestPressedChange(!this.pressed, event)
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
    if (this.disabled) this.#clearActive()
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
export function defineBaseToggle(name = "base-toggle") {
  if (!customElements.get(name)) {
    customElements.define(name, BaseToggle)
  }
}
