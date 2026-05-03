// @ts-check

import { BaseTab, BaseTabs, BaseTabsList, BaseTabsPanel } from "../../tabs/index.js"
import { normalizeToken, setDataAttributes, setSlot, syncGeneratedClasses } from "../internal/classes.js"

const listVariants = ["default", "line"]

export class ShadcnTabs extends BaseTabs {
  static observedAttributes = [...BaseTabs.observedAttributes, "variant"]

  /** @type {((event: Event) => void) | undefined} */
  #translateValueChange

  connectedCallback() {
    this.#translateValueChange ??= (event) => this.#handleBaseValueChange(event)
    this.addEventListener("base-ui:value-change", this.#translateValueChange)
    super.connectedCallback()
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

  #syncShadcn() {
    setSlot(this, "tabs")
    syncGeneratedClasses(this, ["cn-tabs"])
  }

  /** @param {Event} event */
  #handleBaseValueChange(event) {
    if (event.target !== this) return

    const baseEvent = /** @type {CustomEvent<{ value: string | null, previousValue: string | null, reason: string, activationDirection: string }>} */ (event)
    const shadcnEvent = new CustomEvent("shadcn:value-change", {
      bubbles: true,
      cancelable: baseEvent.cancelable,
      composed: true,
      detail: baseEvent.detail,
    })

    event.stopImmediatePropagation()
    if (!this.dispatchEvent(shadcnEvent)) event.preventDefault()
  }
}

export class ShadcnTabsList extends BaseTabsList {
  static observedAttributes = ["variant"]

  connectedCallback() {
    super.connectedCallback()
    this.#syncShadcn()
  }

  attributeChangedCallback() {
    this.#syncShadcn()
  }

  /** @returns {string} */
  get variant() {
    return normalizeToken(this.getAttribute("variant"), "default", listVariants)
  }

  /** @param {string | null | undefined} value */
  set variant(value) {
    if (value == null) this.removeAttribute("variant")
    else this.setAttribute("variant", normalizeToken(value, "default", listVariants))
  }

  #syncShadcn() {
    setSlot(this, "tabs-list")
    setDataAttributes(this, { variant: this.variant })
    syncGeneratedClasses(this, ["cn-tabs-list", "cn-tabs-list-variant-" + this.variant])
  }
}

export class ShadcnTabsTrigger extends BaseTab {
  connectedCallback() {
    super.connectedCallback()
    this.#syncShadcn()
  }

  attributeChangedCallback() {
    super.attributeChangedCallback()
    this.#syncShadcn()
  }

  #syncShadcn() {
    setSlot(this, "tabs-trigger")
    syncGeneratedClasses(this, ["cn-tabs-trigger"])
  }
}

export class ShadcnTabsContent extends BaseTabsPanel {
  connectedCallback() {
    super.connectedCallback()
    this.#syncShadcn()
  }

  attributeChangedCallback() {
    super.attributeChangedCallback()
    this.#syncShadcn()
  }

  #syncShadcn() {
    setSlot(this, "tabs-content")
    syncGeneratedClasses(this, ["cn-tabs-content"])
  }
}

export function defineShadcnTabs() {
  if (!customElements.get("shadcn-tabs")) customElements.define("shadcn-tabs", ShadcnTabs)
  if (!customElements.get("shadcn-tabs-list")) customElements.define("shadcn-tabs-list", ShadcnTabsList)
  if (!customElements.get("shadcn-tabs-trigger")) customElements.define("shadcn-tabs-trigger", ShadcnTabsTrigger)
  if (!customElements.get("shadcn-tabs-content")) customElements.define("shadcn-tabs-content", ShadcnTabsContent)
}
