// @ts-check

import { BaseToggle, defineBaseToggle } from "../../toggle/index.js"
import { normalizeToken, setDataAttributes, setSlot, syncGeneratedClasses } from "../internal/classes.js"

const variants = ["default", "outline"]
const sizes = ["default", "sm", "lg"]

export class ShadcnToggle extends BaseToggle {
  static observedAttributes = [...BaseToggle.observedAttributes, "size", "variant"]

  /** @type {((event: Event) => void) | undefined} */
  #translatePressedChange

  connectedCallback() {
    super.connectedCallback()
    this.#translatePressedChange ??= (event) => this.#handleBasePressedChange(event)
    this.addEventListener("base-ui:pressed-change", this.#translatePressedChange)
    this.#syncShadcn()
  }

  disconnectedCallback() {
    if (this.#translatePressedChange) this.removeEventListener("base-ui:pressed-change", this.#translatePressedChange)
    super.disconnectedCallback()
  }

  attributeChangedCallback() {
    super.attributeChangedCallback()
    this.#syncShadcn()
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

  /** @param {Event} event */
  #handleBasePressedChange(event) {
    if (event.target !== this) return

    const baseEvent = /** @type {CustomEvent<{ pressed: boolean, reason: string }>} */ (event)
    const shadcnEvent = new CustomEvent("shadcn:pressed-change", {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: baseEvent.detail,
    })

    event.stopImmediatePropagation()
    if (!this.dispatchEvent(shadcnEvent)) event.preventDefault()
  }

  #syncShadcn() {
    setSlot(this, "toggle")
    setDataAttributes(this, { variant: this.variant, size: this.size })
    syncGeneratedClasses(this, [
      "cn-toggle",
      "cn-toggle-variant-" + this.variant,
      "cn-toggle-size-" + this.size,
    ])
  }
}

/** @param {string} [name] */
export function defineShadcnToggle(name = "shadcn-toggle") {
  defineBaseToggle()
  if (!customElements.get(name)) customElements.define(name, ShadcnToggle)
}
