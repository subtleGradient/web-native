// @ts-check

/** @typedef {"horizontal" | "vertical"} RadioGroupOrientation */

const valueChangeEventName = "base-ui:value-change"

export class BaseRadioGroup extends HTMLElement {
  static formAssociated = true
  static observedAttributes = ["disabled", "name", "orientation", "readonly", "required", "value"]

  /** @type {ElementInternals | undefined} */
  #internals = typeof this.attachInternals === "function" ? this.attachInternals() : undefined

  /** @type {MutationObserver | undefined} */
  #observer

  /** @type {BaseRadio | undefined} */
  #highlightedRadio

  /** @type {string | null} */
  #defaultValue = null

  #defaultsCaptured = false

  #formDisabled = false

  connectedCallback() {
    if (!this.#defaultsCaptured) {
      this.#defaultValue = this.value
      this.#defaultsCaptured = true
    }

    if (!this.#observer) {
      this.#observer = new MutationObserver(() => this.update())
      this.#observer.observe(this, { childList: true, subtree: true })
    }

    this.onkeydown = this.#handleKeyDown.bind(this)
    this.update()
  }

  disconnectedCallback() {
    this.#observer?.disconnect()
    this.#observer = undefined
    this.onkeydown = null
  }

  attributeChangedCallback() {
    this.update()
  }

  /** @returns {string | null} */
  get value() {
    return this.getAttribute("value")
  }

  /** @param {string | null | undefined} value */
  set value(value) {
    if (value == null) this.removeAttribute("value")
    else this.setAttribute("value", String(value))
  }

  get name() {
    return this.getAttribute("name") ?? ""
  }

  /** @param {string | null | undefined} value */
  set name(value) {
    if (value == null) this.removeAttribute("name")
    else this.setAttribute("name", String(value))
  }

  /** @returns {RadioGroupOrientation} */
  get orientation() {
    return this.getAttribute("orientation") === "vertical" ? "vertical" : "horizontal"
  }

  /** @param {RadioGroupOrientation} value */
  set orientation(value) {
    this.setAttribute("orientation", value === "vertical" ? "vertical" : "horizontal")
  }

  get disabled() {
    return this.hasAttribute("disabled") || this.#formDisabled
  }

  /** @param {boolean} value */
  set disabled(value) {
    setBooleanAttribute(this, "disabled", value)
  }

  get readonly() {
    return this.hasAttribute("readonly")
  }

  /** @param {boolean} value */
  set readonly(value) {
    setBooleanAttribute(this, "readonly", value)
  }

  get required() {
    return this.hasAttribute("required")
  }

  /** @param {boolean} value */
  set required(value) {
    setBooleanAttribute(this, "required", value)
  }

  /** @param {boolean} disabled */
  formDisabledCallback(disabled) {
    this.#formDisabled = disabled
    this.update()
  }

  formResetCallback() {
    this.value = this.#defaultValue
    this.update()
  }

  /** @returns {BaseRadio[]} */
  get radios() {
    return Array.from(this.querySelectorAll("*"))
      .filter(isBaseRadio)
      .filter((radio) => getRadioGroupRoot(radio) === this)
  }

  update() {
    const radios = this.radios
    const activeRadio = radios.find((radio) => radio.value === this.value && !radio.disabled)
    const firstEnabledRadio = radios.find((radio) => !radio.disabled)

    if (!this.#highlightedRadio || !radios.includes(this.#highlightedRadio) || this.#highlightedRadio.disabled) {
      this.#highlightedRadio = activeRadio ?? firstEnabledRadio
    }

    this.setAttribute("role", "radiogroup")
    this.setAttribute("data-orientation", this.orientation)
    setBooleanAttribute(this, "data-disabled", this.disabled)
    setBooleanAttribute(this, "data-readonly", this.readonly)
    setBooleanAttribute(this, "data-required", this.required)
    setOptionalBooleanAria(this, "aria-disabled", this.disabled)
    setOptionalBooleanAria(this, "aria-readonly", this.readonly)
    setOptionalBooleanAria(this, "aria-required", this.required)

    for (const radio of radios) {
      const checked = radio === activeRadio
      const disabled = this.disabled || radio.disabled

      radio.setAttribute("role", "radio")
      radio.setAttribute("aria-checked", String(checked))
      radio.setAttribute("data-orientation", this.orientation)
      radio.tabIndex = !disabled && radio === this.#highlightedRadio ? 0 : -1

      setOptionalBooleanAria(radio, "aria-disabled", disabled)
      setBooleanAttribute(radio, "data-checked", checked)
      setBooleanAttribute(radio, "data-unchecked", !checked)
      setBooleanAttribute(radio, "data-disabled", disabled)
      setBooleanAttribute(radio, "data-readonly", this.readonly)
      radio.setAttribute("data-state", checked ? "checked" : "unchecked")
    }

    this.#syncFormValue(activeRadio)
  }

  /** @param {BaseRadio} radio */
  focusRadio(radio) {
    if (radio.disabled || this.disabled) return
    this.#highlightedRadio = radio
    this.#syncTabIndexes()
    radio.focus()
  }

  /**
   * @param {BaseRadio} radio
   * @param {Event} nativeEvent
   */
  selectRadio(radio, nativeEvent) {
    if (this.disabled || this.readonly || radio.disabled) return false

    const previousValue = this.value
    const nextValue = radio.value

    if (previousValue === nextValue) {
      this.focusRadio(radio)
      nativeEvent.preventDefault()
      return true
    }

    const event = new CustomEvent(valueChangeEventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: { value: nextValue, previousValue, reason: "none" },
    })

    if (!this.dispatchEvent(event)) return false

    this.#highlightedRadio = radio
    this.value = nextValue
    this.update()
    nativeEvent.preventDefault()
    return true
  }

  /** @param {KeyboardEvent} event */
  #handleKeyDown(event) {
    const currentRadio = event.target instanceof BaseRadio ? event.target : undefined
    if (!currentRadio || getRadioGroupRoot(currentRadio) !== this) return

    /** @type {BaseRadio | undefined} */
    let nextRadio

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextRadio = this.#getAdjacentEnabledRadio(currentRadio, 1)
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextRadio = this.#getAdjacentEnabledRadio(currentRadio, -1)
    } else if (event.key === "Home") {
      nextRadio = this.radios.find((radio) => !radio.disabled)
    } else if (event.key === "End") {
      nextRadio = this.radios.filter((radio) => !radio.disabled).at(-1)
    } else if (event.key === " ") {
      this.selectRadio(currentRadio, event)
      return
    } else {
      return
    }

    if (!nextRadio) return

    event.preventDefault()
    this.focusRadio(nextRadio)
    if (!this.readonly) this.selectRadio(nextRadio, event)
  }

  #syncTabIndexes() {
    for (const radio of this.radios) {
      radio.tabIndex = !this.disabled && !radio.disabled && radio === this.#highlightedRadio ? 0 : -1
    }
  }

  /**
   * @param {BaseRadio} currentRadio
   * @param {1 | -1} offset
   */
  #getAdjacentEnabledRadio(currentRadio, offset) {
    const radios = this.radios.filter((radio) => !radio.disabled)
    const currentIndex = radios.indexOf(currentRadio)
    if (currentIndex === -1) return radios[0]

    const nextIndex = currentIndex + offset
    if (nextIndex >= 0 && nextIndex < radios.length) return radios[nextIndex]
    if (this.getAttribute("loop-focus") === "false") return undefined
    return offset > 0 ? radios[0] : radios.at(-1)
  }

  /** @param {BaseRadio | undefined} activeRadio */
  #syncFormValue(activeRadio) {
    const value = activeRadio?.value ?? null
    this.#internals?.setFormValue(this.disabled ? null : value)

    if (this.required && !this.disabled && value == null) {
      this.#internals?.setValidity({ valueMissing: true }, "Please select an option.", this)
    } else {
      this.#internals?.setValidity({})
    }
  }
}

export class BaseRadio extends HTMLElement {
  static observedAttributes = ["disabled", "value"]

  /** @type {BaseRadioGroup | undefined} */
  #root

  connectedCallback() {
    this.#root = getRadioGroupRoot(this)
    this.setAttribute("role", "radio")
    this.onclick = this.#handleClick.bind(this)
    this.onfocus = () => getRadioGroupRoot(this)?.focusRadio(this)
    requestRadioGroupUpdate(this)
  }

  disconnectedCallback() {
    this.onclick = null
    this.onfocus = null
    this.#root?.update()
    this.#root = undefined
  }

  attributeChangedCallback() {
    requestRadioGroupUpdate(this)
  }

  /** @returns {string} */
  get value() {
    const explicitValue = this.getAttribute("value")
    if (explicitValue != null) return explicitValue
    const root = getRadioGroupRoot(this)
    return String(root?.radios.indexOf(this) ?? 0)
  }

  /** @param {string | null | undefined} value */
  set value(value) {
    if (value == null) this.removeAttribute("value")
    else this.setAttribute("value", String(value))
  }

  get disabled() {
    return this.hasAttribute("disabled")
  }

  /** @param {boolean} value */
  set disabled(value) {
    setBooleanAttribute(this, "disabled", value)
  }

  /** @param {MouseEvent} event */
  #handleClick(event) {
    const root = getRadioGroupRoot(this)

    if (!root || root.disabled || this.disabled) {
      blockInteraction(event)
      return
    }

    root.selectRadio(this, event)
  }
}

export function defineBaseRadioGroup() {
  defineCustomElement("base-radio-group", BaseRadioGroup)
  defineCustomElement("base-radio", BaseRadio)
}

/**
 * @param {string} name
 * @param {CustomElementConstructor} constructor
 */
function defineCustomElement(name, constructor) {
  if (!customElements.get(name)) customElements.define(name, constructor)
}

/** @param {Element} element */
function isBaseRadio(element) {
  return element instanceof BaseRadio
}

/** @param {Element} element */
function getRadioGroupRoot(element) {
  let parent = element.parentElement

  while (parent) {
    if (parent instanceof BaseRadioGroup) return parent
    parent = parent.parentElement
  }

  return undefined
}

/** @param {Element} element */
function requestRadioGroupUpdate(element) {
  getRadioGroupRoot(element)?.update()
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

/**
 * @param {Element} element
 * @param {string} name
 * @param {boolean} value
 */
function setOptionalBooleanAria(element, name, value) {
  if (value) element.setAttribute(name, "true")
  else element.removeAttribute(name)
}

/** @param {Event} event */
function blockInteraction(event) {
  event.preventDefault()
  event.stopImmediatePropagation()
}
