// @ts-check

import { normalizeToken, setBooleanAttribute, setDataAttributes, setSlot, syncGeneratedClasses } from "../internal/classes.js"

const variants = ["default", "outline", "secondary", "ghost", "destructive", "link"]
const sizes = ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"]

export class ShadcnButton extends HTMLElement {
  static observedAttributes = ["disabled", "size", "variant"]

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
    this.#sync()
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
    this.#sync()
  }

  /** @returns {string} */
  get variant() {
    return normalizeToken(this.getAttribute("variant"), "default", variants)
  }

  /** @param {string | null | undefined} value */
  set variant(value) {
    if (value == null) this.removeAttribute("variant")
    else this.setAttribute("variant", normalizeToken(value, "default", variants))
  }

  /** @returns {string} */
  get size() {
    return normalizeToken(this.getAttribute("size"), "default", sizes)
  }

  /** @param {string | null | undefined} value */
  set size(value) {
    if (value == null) this.removeAttribute("size")
    else this.setAttribute("size", normalizeToken(value, "default", sizes))
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
    if (!this.disabled) return
    event.preventDefault()
    event.stopImmediatePropagation()
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

    this.click()
  }

  /** @param {KeyboardEvent} event */
  #handleKeyUp(event) {
    if (event.key === " ") {
      const shouldActivate = this.#spaceKeyDown && !this.disabled
      this.#spaceKeyDown = false

      if (shouldActivate) this.click()
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

  #sync() {
    setSlot(this, "button")
    setDataAttributes(this, { variant: this.variant, size: this.size })
    syncGeneratedClasses(this, [
      "cn-button",
      "cn-button-variant-" + this.variant,
      "cn-button-size-" + this.size,
    ])

    this.setAttribute("role", "button")
    this.setAttribute("tabindex", this.disabled ? "-1" : "0")

    if (this.disabled) this.setAttribute("aria-disabled", "true")
    else this.removeAttribute("aria-disabled")

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

/** @param {Event} event */
function blockInteraction(event) {
  event.preventDefault()
  event.stopImmediatePropagation()
}

/** @param {string} [name] */
export function defineShadcnButton(name = "shadcn-button") {
  if (!customElements.get(name)) customElements.define(name, ShadcnButton)
}
