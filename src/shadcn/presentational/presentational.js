// @ts-check

import { normalizeToken, setDataAttributes, setSlot, syncGeneratedClasses } from "../internal/classes.js"

const badgeVariants = ["default", "secondary", "destructive", "outline", "ghost", "link"]
const alertVariants = ["default", "destructive"]
const cardSizes = ["default", "sm"]

class StyledElement extends HTMLElement {
  connectedCallback() {
    this.sync()
  }

  attributeChangedCallback() {
    this.sync()
  }

  sync() {}
}

export class ShadcnBadge extends StyledElement {
  static observedAttributes = ["variant"]

  /** @returns {string} */
  get variant() {
    return normalizeToken(this.getAttribute("variant"), "default", badgeVariants)
  }

  /** @param {string | null | undefined} value */
  set variant(value) {
    if (value == null) this.removeAttribute("variant")
    else this.setAttribute("variant", normalizeToken(value, "default", badgeVariants))
  }

  sync() {
    setSlot(this, "badge")
    setDataAttributes(this, { variant: this.variant })
    syncGeneratedClasses(this, ["cn-badge", "cn-badge-variant-" + this.variant])
  }
}

export class ShadcnCard extends StyledElement {
  static observedAttributes = ["size"]

  /** @returns {string} */
  get size() {
    return normalizeToken(this.getAttribute("size"), "default", cardSizes)
  }

  /** @param {string | null | undefined} value */
  set size(value) {
    if (value == null) this.removeAttribute("size")
    else this.setAttribute("size", normalizeToken(value, "default", cardSizes))
  }

  sync() {
    setSlot(this, "card")
    setDataAttributes(this, { size: this.size })
    syncGeneratedClasses(this, ["cn-card"])
  }
}

export class ShadcnCardHeader extends StyledElement {
  sync() {
    setSlot(this, "card-header")
    syncGeneratedClasses(this, ["cn-card-header"])
  }
}

export class ShadcnCardTitle extends StyledElement {
  sync() {
    setSlot(this, "card-title")
    syncGeneratedClasses(this, ["cn-card-title", "cn-font-heading"])
  }
}

export class ShadcnCardDescription extends StyledElement {
  sync() {
    setSlot(this, "card-description")
    syncGeneratedClasses(this, ["cn-card-description"])
  }
}

export class ShadcnCardContent extends StyledElement {
  sync() {
    setSlot(this, "card-content")
    syncGeneratedClasses(this, ["cn-card-content"])
  }
}

export class ShadcnCardFooter extends StyledElement {
  sync() {
    setSlot(this, "card-footer")
    syncGeneratedClasses(this, ["cn-card-footer"])
  }
}

export class ShadcnAlert extends StyledElement {
  static observedAttributes = ["variant"]

  /** @returns {string} */
  get variant() {
    return normalizeToken(this.getAttribute("variant"), "default", alertVariants)
  }

  /** @param {string | null | undefined} value */
  set variant(value) {
    if (value == null) this.removeAttribute("variant")
    else this.setAttribute("variant", normalizeToken(value, "default", alertVariants))
  }

  sync() {
    setSlot(this, "alert")
    setDataAttributes(this, { variant: this.variant })
    syncGeneratedClasses(this, ["cn-alert", "cn-alert-variant-" + this.variant])
    this.setAttribute("role", "alert")
  }
}

export class ShadcnAlertTitle extends StyledElement {
  sync() {
    setSlot(this, "alert-title")
    syncGeneratedClasses(this, ["cn-alert-title"])
  }
}

export class ShadcnAlertDescription extends StyledElement {
  sync() {
    setSlot(this, "alert-description")
    syncGeneratedClasses(this, ["cn-alert-description"])
  }
}

export class ShadcnSkeleton extends StyledElement {
  sync() {
    setSlot(this, "skeleton")
    syncGeneratedClasses(this, ["cn-skeleton"])
    this.setAttribute("aria-hidden", "true")
  }
}

export class ShadcnKbd extends StyledElement {
  sync() {
    setSlot(this, "kbd")
    syncGeneratedClasses(this, ["cn-kbd"])
  }
}

export class ShadcnKbdGroup extends StyledElement {
  sync() {
    setSlot(this, "kbd-group")
    syncGeneratedClasses(this, ["cn-kbd-group"])
  }
}

export function defineShadcnPresentational() {
  define("shadcn-badge", ShadcnBadge)
  define("shadcn-card", ShadcnCard)
  define("shadcn-card-header", ShadcnCardHeader)
  define("shadcn-card-title", ShadcnCardTitle)
  define("shadcn-card-description", ShadcnCardDescription)
  define("shadcn-card-content", ShadcnCardContent)
  define("shadcn-card-footer", ShadcnCardFooter)
  define("shadcn-alert", ShadcnAlert)
  define("shadcn-alert-title", ShadcnAlertTitle)
  define("shadcn-alert-description", ShadcnAlertDescription)
  define("shadcn-skeleton", ShadcnSkeleton)
  define("shadcn-kbd", ShadcnKbd)
  define("shadcn-kbd-group", ShadcnKbdGroup)
}

/**
 * @param {string} name
 * @param {CustomElementConstructor} constructor
 */
function define(name, constructor) {
  if (!customElements.get(name)) customElements.define(name, constructor)
}
