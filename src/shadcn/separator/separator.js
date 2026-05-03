// @ts-check

import { BaseSeparator, defineBaseSeparator } from "../../separator/index.js"
import { setSlot, syncGeneratedClasses } from "../internal/classes.js"

export class ShadcnSeparator extends BaseSeparator {
  connectedCallback() {
    super.connectedCallback()
    this.#syncShadcn()
  }

  attributeChangedCallback() {
    super.attributeChangedCallback()
    this.#syncShadcn()
  }

  #syncShadcn() {
    setSlot(this, "separator")
    syncGeneratedClasses(this, ["cn-separator", "cn-separator-" + this.orientation])
  }
}

/** @param {string} [name] */
export function defineShadcnSeparator(name = "shadcn-separator") {
  defineBaseSeparator()
  if (!customElements.get(name)) customElements.define(name, ShadcnSeparator)
}
