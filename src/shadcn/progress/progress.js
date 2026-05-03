// @ts-check

import { BaseProgress, BaseProgressIndicator, BaseProgressLabel, BaseProgressTrack, BaseProgressValue } from "../../progress/index.js"
import { setSlot, syncGeneratedClasses } from "../internal/classes.js"

export class ShadcnProgress extends BaseProgress {
  connectedCallback() {
    this.#ensureDefaultParts()
    super.connectedCallback()
    this.#syncShadcn()
  }

  attributeChangedCallback() {
    super.attributeChangedCallback()
    this.#syncShadcn()
  }

  update() {
    super.update()
    this.#syncShadcn()
  }

  #ensureDefaultParts() {
    if (this.querySelector("shadcn-progress-track, base-progress-track")) return

    const track = document.createElement("shadcn-progress-track")
    const indicator = document.createElement("shadcn-progress-indicator")
    track.append(indicator)
    this.append(track)
  }

  #syncShadcn() {
    setSlot(this, "progress")
    syncGeneratedClasses(this, ["cn-progress"])
  }
}

export class ShadcnProgressTrack extends BaseProgressTrack {
  connectedCallback() {
    super.connectedCallback()
    this.#syncShadcn()
  }

  #syncShadcn() {
    setSlot(this, "progress-track")
    syncGeneratedClasses(this, ["cn-progress-track"])
  }
}

export class ShadcnProgressIndicator extends BaseProgressIndicator {
  connectedCallback() {
    super.connectedCallback()
    this.#syncShadcn()
  }

  #syncShadcn() {
    setSlot(this, "progress-indicator")
    syncGeneratedClasses(this, ["cn-progress-indicator"])
  }
}

export class ShadcnProgressLabel extends BaseProgressLabel {
  connectedCallback() {
    super.connectedCallback()
    this.#syncShadcn()
  }

  #syncShadcn() {
    setSlot(this, "progress-label")
    syncGeneratedClasses(this, ["cn-progress-label"])
  }
}

export class ShadcnProgressValue extends BaseProgressValue {
  connectedCallback() {
    super.connectedCallback()
    this.#syncShadcn()
  }

  #syncShadcn() {
    setSlot(this, "progress-value")
    syncGeneratedClasses(this, ["cn-progress-value"])
  }
}

export function defineShadcnProgress() {
  defineCustomElement("shadcn-progress", ShadcnProgress)
  defineCustomElement("shadcn-progress-track", ShadcnProgressTrack)
  defineCustomElement("shadcn-progress-indicator", ShadcnProgressIndicator)
  defineCustomElement("shadcn-progress-label", ShadcnProgressLabel)
  defineCustomElement("shadcn-progress-value", ShadcnProgressValue)
}

/**
 * @param {string} name
 * @param {CustomElementConstructor} constructor
 */
function defineCustomElement(name, constructor) {
  if (!customElements.get(name)) customElements.define(name, constructor)
}
