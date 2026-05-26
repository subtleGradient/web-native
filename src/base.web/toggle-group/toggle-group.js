// @ts-check

/** @typedef {"horizontal" | "vertical"} ToggleGroupOrientation */

const valueChangeEventName = "base-ui:value-change"

export class BaseToggleGroup extends HTMLElement {
  static formAssociated = true
  static observedAttributes = ["disabled", "multiple", "name", "orientation", "value"]

  /** @type {ElementInternals | undefined} */
  #internals = typeof this.attachInternals === "function" ? this.attachInternals() : undefined

  /** @type {MutationObserver | undefined} */
  #observer

  /** @type {BaseToggleGroupItem | undefined} */
  #highlightedItem

  /** @type {string[]} */
  #defaultValues = []

  #defaultsCaptured = false

  #formDisabled = false

  connectedCallback() {
    if (!this.#defaultsCaptured) {
      this.#defaultValues = this.values
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

  /** @returns {string[]} */
  get values() {
    return parseValues(this.getAttribute("value"))
  }

  /** @param {string | string[] | null | undefined} value */
  set values(value) {
    this.#setValues(normalizeValues(value, this.multiple))
  }

  /** @returns {string[]} */
  get value() {
    return this.values
  }

  /** @param {string | string[] | null | undefined} value */
  set value(value) {
    this.values = value
  }

  get name() {
    return this.getAttribute("name") ?? ""
  }

  /** @param {string | null | undefined} value */
  set name(value) {
    if (value == null) this.removeAttribute("name")
    else this.setAttribute("name", String(value))
  }

  /** @returns {ToggleGroupOrientation} */
  get orientation() {
    return this.getAttribute("orientation") === "vertical" ? "vertical" : "horizontal"
  }

  /** @param {ToggleGroupOrientation} value */
  set orientation(value) {
    this.setAttribute("orientation", value === "vertical" ? "vertical" : "horizontal")
  }

  get multiple() {
    return this.hasAttribute("multiple")
  }

  /** @param {boolean} value */
  set multiple(value) {
    setBooleanAttribute(this, "multiple", value)
  }

  get disabled() {
    return this.hasAttribute("disabled") || this.#formDisabled
  }

  /** @param {boolean} value */
  set disabled(value) {
    setBooleanAttribute(this, "disabled", value)
  }

  /** @param {boolean} disabled */
  formDisabledCallback(disabled) {
    this.#formDisabled = disabled
    this.update()
  }

  formResetCallback() {
    this.#setValues(this.#defaultValues)
    this.update()
  }

  /** @returns {BaseToggleGroupItem[]} */
  get items() {
    return Array.from(this.querySelectorAll("*"))
      .filter(isBaseToggleGroupItem)
      .filter((item) => getToggleGroupRoot(item) === this)
  }

  update() {
    const items = this.items
    const firstEnabledItem = items.find((item) => !item.disabled)

    if (!this.#highlightedItem || !items.includes(this.#highlightedItem) || this.#highlightedItem.disabled) {
      this.#highlightedItem = firstEnabledItem
    }

    this.setAttribute("role", "group")
    this.setAttribute("data-orientation", this.orientation)
    setBooleanAttribute(this, "data-multiple", this.multiple)
    setBooleanAttribute(this, "data-disabled", this.disabled)
    setOptionalBooleanAria(this, "aria-disabled", this.disabled)

    const values = this.values
    for (const item of items) {
      const pressed = values.includes(item.value)
      const disabled = this.disabled || item.disabled

      item.setAttribute("role", "button")
      item.setAttribute("aria-pressed", String(pressed))
      item.setAttribute("data-orientation", this.orientation)
      item.tabIndex = !disabled && item === this.#highlightedItem ? 0 : -1

      setOptionalBooleanAria(item, "aria-disabled", disabled)
      setBooleanAttribute(item, "pressed", pressed)
      setBooleanAttribute(item, "data-pressed", pressed)
      setBooleanAttribute(item, "data-disabled", disabled)
      item.setAttribute("data-state", pressed ? "on" : "off")
    }

    this.#syncFormValue()
  }

  /** @param {BaseToggleGroupItem} item */
  focusItem(item) {
    if (item.disabled || this.disabled) return
    this.#highlightedItem = item
    this.#syncTabIndexes()
    item.focus()
  }

  /**
   * @param {BaseToggleGroupItem} item
   * @param {Event} nativeEvent
   */
  toggleItem(item, nativeEvent) {
    if (this.disabled || item.disabled) return false

    const previousValue = this.values
    const pressed = previousValue.includes(item.value)
    const nextValue = this.multiple
      ? pressed
        ? previousValue.filter((value) => value !== item.value)
        : [...previousValue, item.value]
      : pressed
        ? []
        : [item.value]

    const event = new CustomEvent(valueChangeEventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: { value: nextValue, previousValue, reason: "none" },
    })

    if (!this.dispatchEvent(event)) return false

    this.#highlightedItem = item
    this.#setValues(nextValue)
    this.update()
    nativeEvent.preventDefault()
    return true
  }

  /** @param {KeyboardEvent} event */
  #handleKeyDown(event) {
    const currentItem = event.target instanceof BaseToggleGroupItem ? event.target : undefined
    if (!currentItem || getToggleGroupRoot(currentItem) !== this) return

    const nextKey = this.orientation === "horizontal" ? "ArrowRight" : "ArrowDown"
    const previousKey = this.orientation === "horizontal" ? "ArrowLeft" : "ArrowUp"
    /** @type {BaseToggleGroupItem | undefined} */
    let nextItem

    if (event.key === nextKey) {
      nextItem = this.#getAdjacentEnabledItem(currentItem, 1)
    } else if (event.key === previousKey) {
      nextItem = this.#getAdjacentEnabledItem(currentItem, -1)
    } else if (event.key === "Home") {
      nextItem = this.items.find((item) => !item.disabled)
    } else if (event.key === "End") {
      nextItem = this.items.filter((item) => !item.disabled).at(-1)
    } else if (event.key === " " || event.key === "Enter") {
      this.toggleItem(currentItem, event)
      return
    } else {
      return
    }

    if (!nextItem) return
    event.preventDefault()
    this.focusItem(nextItem)
  }

  #syncTabIndexes() {
    for (const item of this.items) {
      item.tabIndex = !this.disabled && !item.disabled && item === this.#highlightedItem ? 0 : -1
    }
  }

  /**
   * @param {BaseToggleGroupItem} currentItem
   * @param {1 | -1} offset
   */
  #getAdjacentEnabledItem(currentItem, offset) {
    const items = this.items.filter((item) => !item.disabled)
    const currentIndex = items.indexOf(currentItem)
    if (currentIndex === -1) return items[0]

    const nextIndex = currentIndex + offset
    if (nextIndex >= 0 && nextIndex < items.length) return items[nextIndex]
    if (this.getAttribute("loop-focus") === "false") return undefined
    return offset > 0 ? items[0] : items.at(-1)
  }

  /** @param {string[]} values */
  #setValues(values) {
    const nextValues = normalizeValues(values, this.multiple)
    if (nextValues.length === 0) this.removeAttribute("value")
    else this.setAttribute("value", nextValues.join(" "))
  }

  #syncFormValue() {
    const values = this.values
    const value = values.length === 0 ? null : values.join(" ")
    this.#internals?.setFormValue(this.disabled ? null : value)
  }
}

export class BaseToggleGroupItem extends HTMLElement {
  static observedAttributes = ["disabled", "value"]

  /** @type {BaseToggleGroup | undefined} */
  #root

  connectedCallback() {
    this.#root = getToggleGroupRoot(this)
    this.setAttribute("role", "button")
    this.onclick = this.#handleClick.bind(this)
    this.onfocus = () => getToggleGroupRoot(this)?.focusItem(this)
    requestToggleGroupUpdate(this)
  }

  disconnectedCallback() {
    this.onclick = null
    this.onfocus = null
    this.#root?.update()
    this.#root = undefined
  }

  attributeChangedCallback() {
    requestToggleGroupUpdate(this)
  }

  /** @returns {string} */
  get value() {
    const explicitValue = this.getAttribute("value")
    if (explicitValue != null) return explicitValue
    const root = getToggleGroupRoot(this)
    return String(root?.items.indexOf(this) ?? 0)
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

  get pressed() {
    return this.hasAttribute("pressed")
  }

  /** @param {boolean} value */
  set pressed(value) {
    setBooleanAttribute(this, "pressed", value)
  }

  /** @param {MouseEvent} event */
  #handleClick(event) {
    const root = getToggleGroupRoot(this)

    if (!root || root.disabled || this.disabled) {
      blockInteraction(event)
      return
    }

    root.toggleItem(this, event)
  }
}

export function defineBaseToggleGroup() {
  defineCustomElement("base-toggle-group", BaseToggleGroup)
  defineCustomElement("base-toggle-group-item", BaseToggleGroupItem)
}

/**
 * @param {string} name
 * @param {CustomElementConstructor} constructor
 */
function defineCustomElement(name, constructor) {
  if (!customElements.get(name)) customElements.define(name, constructor)
}

/** @param {Element} element */
function isBaseToggleGroupItem(element) {
  return element instanceof BaseToggleGroupItem
}

/** @param {Element} element */
function getToggleGroupRoot(element) {
  let parent = element.parentElement

  while (parent) {
    if (parent instanceof BaseToggleGroup) return parent
    parent = parent.parentElement
  }

  return undefined
}

/** @param {Element} element */
function requestToggleGroupUpdate(element) {
  getToggleGroupRoot(element)?.update()
}

/** @param {string | null | undefined} value */
function parseValues(value) {
  return value?.split(/\s+/).map((part) => part.trim()).filter(Boolean) ?? []
}

/**
 * @param {string | string[] | null | undefined} value
 * @param {boolean} multiple
 */
function normalizeValues(value, multiple) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? parseValues(value) : []
  const uniqueValues = values.filter((item, index) => values.indexOf(item) === index)
  return multiple ? uniqueValues : uniqueValues.slice(0, 1)
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
