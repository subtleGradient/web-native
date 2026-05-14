// @ts-check

import { BaseToggleGroup, BaseToggleGroupItem } from "../../toggle-group/index.js"
import { normalizeToken, setDataAttributes, setSlot, syncGeneratedClasses } from "../internal/classes.js"

const variants = ["default", "outline"]
const sizes = ["default", "sm", "lg"]

export class ShadcnToggleGroup extends BaseToggleGroup {
  static observedAttributes = [...BaseToggleGroup.observedAttributes, "size", "spacing", "variant"]

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

  /** @returns {string} */
  get spacing() {
    return this.getAttribute("spacing") ?? "0"
  }

  /** @param {string | number | null | undefined} value */
  set spacing(value) {
    if (value == null) this.removeAttribute("spacing")
    else this.setAttribute("spacing", String(value))
  }

  /** @param {Event} event */
  #handleBaseValueChange(event) {
    if (event.target !== this) return

    const baseEvent = /** @type {CustomEvent<{ value: string[], previousValue: string[], reason: string }>} */ (event)
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
    setSlot(this, "toggle-group")
    setDataAttributes(this, { variant: this.variant, size: this.size, spacing: this.spacing })
    this.style.setProperty("--cn-toggle-group-gap", `${Number(this.spacing) * 0.25}rem`)
    syncGeneratedClasses(this, ["cn-toggle-group", "cn-toggle-group-size-" + this.size, "cn-toggle-group-variant-" + this.variant])
  }
}

export class ShadcnToggleGroupItem extends BaseToggleGroupItem {
  connectedCallback() {
    super.connectedCallback()
    this.#syncShadcn()
  }

  attributeChangedCallback() {
    super.attributeChangedCallback()
    this.#syncShadcn()
  }

  #syncShadcn() {
    const root = getShadcnToggleGroupRoot(this)
    const variant = root?.variant ?? "default"
    const size = root?.size ?? "default"

    setSlot(this, "toggle-group-item")
    setDataAttributes(this, { variant, size })
    syncGeneratedClasses(this, [
      "cn-toggle",
      "cn-toggle-group-item",
      "cn-toggle-variant-" + variant,
      "cn-toggle-size-" + size,
    ])
  }
}

export function defineShadcnToggleGroup() {
  defineCustomElement("shadcn-toggle-group", ShadcnToggleGroup)
  defineCustomElement("shadcn-toggle-group-item", ShadcnToggleGroupItem)
}

/**
 * @param {string} name
 * @param {CustomElementConstructor} constructor
 */
function defineCustomElement(name, constructor) {
  if (!customElements.get(name)) customElements.define(name, constructor)
}

/** @param {Element} element */
function getShadcnToggleGroupRoot(element) {
  let parent = element.parentElement

  while (parent) {
    if (parent instanceof ShadcnToggleGroup) return parent
    parent = parent.parentElement
  }

  return undefined
}
