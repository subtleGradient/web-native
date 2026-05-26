// @ts-check

import { BaseRadio, BaseRadioGroup } from "../../base.web/radio-group/index.js"
import { setSlot, syncGeneratedClasses } from "../internal/classes.js"

export class ShadcnRadioGroup extends BaseRadioGroup {
  /** @type {((event: Event) => void) | undefined} */
  #translateValueChange

  connectedCallback() {
    super.connectedCallback()
    this.#translateValueChange ??= (event) => this.#handleBaseValueChange(event)
    this.addEventListener("base-ui:value-change", this.#translateValueChange)
    this.#syncShadcn()
  }

  disconnectedCallback() {
    if (this.#translateValueChange) this.removeEventListener("base-ui:value-change", this.#translateValueChange)
    super.disconnectedCallback()
  }

  attributeChangedCallback() {
    super.attributeChangedCallback()
    this.#syncShadcn()
  }

  /** @param {Event} event */
  #handleBaseValueChange(event) {
    if (event.target !== this) return

    const baseEvent = /** @type {CustomEvent<{ value: string, previousValue: string | null, reason: string }>} */ (event)
    const shadcnEvent = new CustomEvent("shadcn:value-change", {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: baseEvent.detail,
    })

    event.stopImmediatePropagation()
    if (!this.dispatchEvent(shadcnEvent)) event.preventDefault()
  }

  #syncShadcn() {
    setSlot(this, "radio-group")
    syncGeneratedClasses(this, ["cn-radio-group"])
  }
}

export class ShadcnRadioGroupItem extends BaseRadio {
  connectedCallback() {
    super.connectedCallback()
    this.#syncShadcn()
  }

  attributeChangedCallback() {
    super.attributeChangedCallback()
    this.#syncShadcn()
  }

  #syncShadcn() {
    setSlot(this, "radio-group-item")
    syncGeneratedClasses(this, ["cn-radio-group-item"])
  }
}

export function defineShadcnRadioGroup() {
  defineCustomElement("shadcn-radio-group", ShadcnRadioGroup)
  defineCustomElement("shadcn-radio-group-item", ShadcnRadioGroupItem)
}

/**
 * @param {string} name
 * @param {CustomElementConstructor} constructor
 */
function defineCustomElement(name, constructor) {
  if (!customElements.get(name)) customElements.define(name, constructor)
}
