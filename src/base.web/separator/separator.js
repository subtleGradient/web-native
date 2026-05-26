// @ts-check

/** @typedef {"horizontal" | "vertical"} SeparatorOrientation */

export class BaseSeparator extends HTMLElement {
  static observedAttributes = ["orientation"]

  connectedCallback() {
    this.#syncAttributes()
  }

  attributeChangedCallback() {
    this.#syncAttributes()
  }

  /** @returns {SeparatorOrientation} */
  get orientation() {
    return normalizeOrientation(this.getAttribute("orientation"))
  }

  /** @param {SeparatorOrientation} value */
  set orientation(value) {
    this.setAttribute("orientation", normalizeOrientation(value))
  }

  #syncAttributes() {
    const orientation = this.orientation

    this.setAttribute("role", "separator")
    this.setAttribute("aria-orientation", orientation)
    this.setAttribute("data-orientation", orientation)
  }
}

/**
 * @param {string | null | undefined} value
 * @returns {SeparatorOrientation}
 */
function normalizeOrientation(value) {
  return value === "vertical" ? "vertical" : "horizontal"
}

/** @param {string} [name] */
export function defineBaseSeparator(name = "base-separator") {
  if (!customElements.get(name)) {
    customElements.define(name, BaseSeparator)
  }
}
