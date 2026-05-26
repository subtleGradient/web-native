// @ts-check

import { BaseCheckbox } from "../../checkbox.web/index.js"
import { normalizeToken, setDataAttributes, setSlot, syncGeneratedClasses } from "../internal/classes.js"

const sizes = ["default", "sm", "lg"]

export class ShadcnCheckbox extends BaseCheckbox {
  static observedAttributes = [...BaseCheckbox.observedAttributes, "size"]

  /** @type {((event: Event) => void) | undefined} */
  #translateCheckedChange

  connectedCallback() {
    super.connectedCallback()
    this.#translateCheckedChange ??= (event) => this.#handleBaseCheckedChange(event)
    this.addEventListener("base-ui:checked-change", this.#translateCheckedChange)
    this.#syncShadcn()
  }

  disconnectedCallback() {
    if (this.#translateCheckedChange) this.removeEventListener("base-ui:checked-change", this.#translateCheckedChange)
    super.disconnectedCallback()
  }

  attributeChangedCallback() {
    super.attributeChangedCallback()
    this.#syncShadcn()
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
  #handleBaseCheckedChange(event) {
    if (event.target !== this) return

    const baseEvent = /** @type {CustomEvent<{ checked: boolean, indeterminate: boolean, previousChecked: boolean, previousIndeterminate: boolean, reason: string }>} */ (event)
    const shadcnEvent = new CustomEvent("shadcn:checked-change", {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: baseEvent.detail,
    })

    event.stopImmediatePropagation()
    if (!this.dispatchEvent(shadcnEvent)) event.preventDefault()
  }

  #syncShadcn() {
    setSlot(this, "checkbox")
    setDataAttributes(this, { size: this.size })
    syncGeneratedClasses(this, ["cn-checkbox", "cn-checkbox-size-" + this.size])
  }
}

/** @param {string} [name] */
export function defineShadcnCheckbox(name = "shadcn-checkbox") {
  if (!customElements.get(name)) customElements.define(name, ShadcnCheckbox)
}
