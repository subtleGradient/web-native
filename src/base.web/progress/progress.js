// @ts-check

const generatedIdPrefix = "base-progress-label"
let generatedId = 0

export class BaseProgress extends HTMLElement {
  static observedAttributes = ["max", "min", "value", "value-text"]

  /** @type {MutationObserver | undefined} */
  #observer

  connectedCallback() {
    if (!this.#observer) {
      this.#observer = new MutationObserver(() => this.update())
      this.#observer.observe(this, { childList: true })
    }

    this.update()
  }

  disconnectedCallback() {
    this.#observer?.disconnect()
    this.#observer = undefined
  }

  attributeChangedCallback() {
    this.update()
  }

  /** @returns {number} */
  get min() {
    return normalizeNumber(this.getAttribute("min"), 0)
  }

  /** @param {number | string | null | undefined} value */
  set min(value) {
    setOptionalNumberAttribute(this, "min", value)
  }

  /** @returns {number} */
  get max() {
    const min = this.min
    const max = normalizeNumber(this.getAttribute("max"), 100)
    return max > min ? max : min + 100
  }

  /** @param {number | string | null | undefined} value */
  set max(value) {
    setOptionalNumberAttribute(this, "max", value)
  }

  /** @returns {number | null} */
  get value() {
    if (!this.hasAttribute("value")) return null
    const value = Number(this.getAttribute("value"))
    if (!Number.isFinite(value)) return null
    return clamp(value, this.min, this.max)
  }

  /** @param {number | string | null | undefined} value */
  set value(value) {
    setOptionalNumberAttribute(this, "value", value)
  }

  get valueText() {
    return this.getAttribute("value-text")
  }

  /** @param {string | null | undefined} value */
  set valueText(value) {
    if (value == null) this.removeAttribute("value-text")
    else this.setAttribute("value-text", String(value))
  }

  update() {
    const min = this.min
    const max = this.max
    const value = this.value
    const percent = value == null ? null : getPercent(value, min, max)
    const state = getProgressState(value, max)
    const text = this.valueText ?? (value == null ? "indeterminate progress" : formatPercent(percent ?? 0))
    const label = this.labels[0]

    this.setAttribute("role", "progressbar")
    this.setAttribute("aria-valuemin", String(min))
    this.setAttribute("aria-valuemax", String(max))
    this.setAttribute("aria-valuetext", text)

    if (value == null) this.removeAttribute("aria-valuenow")
    else this.setAttribute("aria-valuenow", String(value))

    if (label) {
      ensureId(label, generatedIdPrefix)
      this.setAttribute("aria-labelledby", label.id)
    } else {
      this.removeAttribute("aria-labelledby")
    }

    syncProgressState(this, state)

    for (const part of this.parts) {
      syncProgressState(part, state)
    }

    for (const valuePart of this.values) {
      valuePart.setAttribute("aria-hidden", "true")
      valuePart.textContent = value == null ? "" : text
    }

    for (const indicator of this.indicators) {
      if (percent == null) indicator.style.removeProperty("width")
      else indicator.style.width = `${percent}%`
    }
  }

  /** @returns {BaseProgressLabel[]} */
  get labels() {
    return this.#getParts(BaseProgressLabel)
  }

  /** @returns {BaseProgressTrack[]} */
  get tracks() {
    return this.#getParts(BaseProgressTrack)
  }

  /** @returns {BaseProgressIndicator[]} */
  get indicators() {
    return this.#getParts(BaseProgressIndicator)
  }

  /** @returns {BaseProgressValue[]} */
  get values() {
    return this.#getParts(BaseProgressValue)
  }

  /** @returns {(BaseProgressLabel | BaseProgressTrack | BaseProgressIndicator | BaseProgressValue)[]} */
  get parts() {
    return [...this.labels, ...this.tracks, ...this.indicators, ...this.values]
  }

  /**
   * @template {typeof BaseProgressLabel | typeof BaseProgressTrack | typeof BaseProgressIndicator | typeof BaseProgressValue} T
   * @param {T} constructor
   * @returns {InstanceType<T>[]}
   */
  #getParts(constructor) {
    return /** @type {InstanceType<T>[]} */ (Array.from(this.querySelectorAll("*"))
      .filter((element) => element instanceof constructor)
      .filter((element) => getProgressRoot(element) === this))
  }
}

export class BaseProgressTrack extends HTMLElement {
  connectedCallback() {
    getProgressRoot(this)?.update()
  }

  disconnectedCallback() {
    getProgressRoot(this)?.update()
  }
}

export class BaseProgressIndicator extends HTMLElement {
  connectedCallback() {
    getProgressRoot(this)?.update()
  }

  disconnectedCallback() {
    getProgressRoot(this)?.update()
  }
}

export class BaseProgressLabel extends HTMLElement {
  connectedCallback() {
    this.setAttribute("role", "presentation")
    getProgressRoot(this)?.update()
  }

  disconnectedCallback() {
    getProgressRoot(this)?.update()
  }
}

export class BaseProgressValue extends HTMLElement {
  connectedCallback() {
    this.setAttribute("aria-hidden", "true")
    getProgressRoot(this)?.update()
  }

  disconnectedCallback() {
    getProgressRoot(this)?.update()
  }
}

export function defineBaseProgress() {
  defineCustomElement("base-progress", BaseProgress)
  defineCustomElement("base-progress-track", BaseProgressTrack)
  defineCustomElement("base-progress-indicator", BaseProgressIndicator)
  defineCustomElement("base-progress-label", BaseProgressLabel)
  defineCustomElement("base-progress-value", BaseProgressValue)
}

/**
 * @param {string} name
 * @param {CustomElementConstructor} constructor
 */
function defineCustomElement(name, constructor) {
  if (!customElements.get(name)) customElements.define(name, constructor)
}

/** @param {Element} element */
function getProgressRoot(element) {
  let parent = element.parentElement

  while (parent) {
    if (parent instanceof BaseProgress) return parent
    parent = parent.parentElement
  }

  return undefined
}

/**
 * @param {string | null | undefined} value
 * @param {number} fallback
 */
function normalizeNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

/**
 * @param {Element} element
 * @param {string} name
 * @param {number | string | null | undefined} value
 */
function setOptionalNumberAttribute(element, name, value) {
  if (value == null || value === "") element.removeAttribute(name)
  else element.setAttribute(name, String(value))
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function getPercent(value, min, max) {
  return clamp(((value - min) * 100) / (max - min), 0, 100)
}

/** @param {number} percent */
function formatPercent(percent) {
  return `${Math.round(percent)}%`
}

/**
 * @param {number | null} value
 * @param {number} max
 * @returns {"complete" | "indeterminate" | "progressing"}
 */
function getProgressState(value, max) {
  if (value == null) return "indeterminate"
  return value >= max ? "complete" : "progressing"
}

/**
 * @param {Element} element
 * @param {"complete" | "indeterminate" | "progressing"} state
 */
function syncProgressState(element, state) {
  setBooleanAttribute(element, "data-progressing", state === "progressing")
  setBooleanAttribute(element, "data-complete", state === "complete")
  setBooleanAttribute(element, "data-indeterminate", state === "indeterminate")
  element.setAttribute("data-state", state)
}

/**
 * @param {Element} element
 * @param {string} prefix
 */
function ensureId(element, prefix) {
  if (element.id) return
  generatedId += 1
  element.id = `${prefix}-${generatedId}`
}

/**
 * @param {Element} element
 * @param {string} name
 * @param {boolean} value
 */
function setBooleanAttribute(element, name, value) {
  if (value) element.setAttribute(name, "")
  else element.removeAttribute(name)
}
