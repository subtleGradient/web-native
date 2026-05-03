// @ts-check

/** @typedef {"horizontal" | "vertical"} TabsOrientation */
/** @typedef {"left" | "right" | "up" | "down" | "none"} ActivationDirection */

const valueChangeEventName = "base-ui:value-change"
let generatedId = 0

export class BaseTabs extends HTMLElement {
  static observedAttributes = ["orientation", "value"]

  /** @type {MutationObserver | undefined} */
  #observer

  /** @type {BaseTab | undefined} */
  #highlightedTab

  /** @type {ActivationDirection} */
  #activationDirection = "none"

  #updateQueued = false

  #updating = false

  connectedCallback() {
    if (!this.#observer) {
      this.#observer = new MutationObserver(() => this.requestUpdate())
      this.#observer.observe(this, { childList: true, subtree: true })
    }

    this.requestUpdate()
  }

  disconnectedCallback() {
    this.#observer?.disconnect()
    this.#observer = undefined
  }

  attributeChangedCallback() {
    this.requestUpdate()
  }

  requestUpdate() {
    if (this.#updating || this.#updateQueued) return

    this.#updateQueued = true
    queueMicrotask(() => {
      this.#updateQueued = false
      if (this.isConnected) this.update()
    })
  }

  /** @returns {string | null} */
  get value() {
    return this.getAttribute("value")
  }

  /** @param {string | null | undefined} value */
  set value(value) {
    if (value == null) {
      this.removeAttribute("value")
    } else {
      this.setAttribute("value", String(value))
    }
  }

  /** @returns {TabsOrientation} */
  get orientation() {
    return normalizeOrientation(this.getAttribute("orientation"))
  }

  /** @param {TabsOrientation} value */
  set orientation(value) {
    this.setAttribute("orientation", normalizeOrientation(value))
  }

  /** @returns {BaseTab[]} */
  get tabs() {
    return Array.from(this.querySelectorAll("*"))
      .filter(isBaseTab)
      .filter((element) => getTabsRoot(element) === this)
  }

  /** @returns {BaseTabsPanel[]} */
  get panels() {
    return Array.from(this.querySelectorAll("*"))
      .filter(isBaseTabsPanel)
      .filter((element) => getTabsRoot(element) === this)
  }

  /** @returns {BaseTabsList[]} */
  get lists() {
    return Array.from(this.querySelectorAll("*"))
      .filter(isBaseTabsList)
      .filter((element) => getTabsRoot(element) === this)
  }

  update() {
    if (this.#updating) return

    this.#updating = true

    try {
      const orientation = this.orientation
      const tabs = this.tabs
      const panels = this.panels
      const lists = this.lists
      const firstEnabledTab = tabs.find((tab) => !tab.disabled)
      let activeTab = tabs.find((tab) => tab.value === this.value && !tab.disabled)
      let movedSelectionToFallback = false

      if (!activeTab) {
        const previousValue = this.value

        if (firstEnabledTab) {
          activeTab = firstEnabledTab
          movedSelectionToFallback = true
          this.#activationDirection = "none"
          this.value = activeTab.value

          if (previousValue !== activeTab.value) {
            this.#dispatchValueChange(activeTab.value, previousValue, getAutomaticChangeReason(tabs, previousValue), "none", false)
          }
        } else if (previousValue != null) {
          movedSelectionToFallback = true
          this.#activationDirection = "none"
          this.value = null
          this.#dispatchValueChange(null, previousValue, getAutomaticChangeReason(tabs, previousValue), "none", false)
        }
      }

      if (
        !this.#highlightedTab ||
        !tabs.includes(this.#highlightedTab) ||
        (movedSelectionToFallback && this.#highlightedTab.disabled)
      ) {
        this.#highlightedTab = activeTab ?? firstEnabledTab
      }

      this.setAttribute("data-orientation", orientation)
      this.setAttribute("data-activation-direction", this.#activationDirection)

      for (const list of lists) {
        list.setAttribute("role", "tablist")
        list.setAttribute("data-orientation", orientation)

        if (orientation === "vertical") {
          list.setAttribute("aria-orientation", "vertical")
        } else {
          list.removeAttribute("aria-orientation")
        }
      }

      for (const [index, tab] of tabs.entries()) {
        const active = tab === activeTab
        const panel = panels.find((candidate) => candidate.value === tab.value)

        ensureElementId(tab, "base-tab")
        tab.setAttribute("role", "tab")
        tab.setAttribute("aria-selected", String(active))
        tab.setAttribute("data-orientation", orientation)
        tab.setAttribute("data-activation-direction", this.#activationDirection)
        tab.tabIndex = tab === this.#highlightedTab ? 0 : -1

        if (panel) {
          ensureElementId(panel, "base-tabs-panel")
          tab.setAttribute("aria-controls", panel.id)
        } else {
          tab.removeAttribute("aria-controls")
        }

        if (tab.disabled) {
          tab.setAttribute("aria-disabled", "true")
        } else {
          tab.removeAttribute("aria-disabled")
        }

        setBooleanAttribute(tab, "data-active", active)
        setBooleanAttribute(tab, "data-disabled", tab.disabled)
        tab.setAttribute("data-index", String(index))
      }

      for (const [index, panel] of panels.entries()) {
        const tab = tabs.find((candidate) => candidate.value === panel.value)
        const active = Boolean(activeTab && panel.value === activeTab.value)

        ensureElementId(panel, "base-tabs-panel")
        panel.setAttribute("role", "tabpanel")
        panel.setAttribute("data-index", String(index))
        panel.setAttribute("data-orientation", orientation)
        panel.setAttribute("data-activation-direction", this.#activationDirection)
        panel.hidden = !active
        panel.tabIndex = active ? 0 : -1
        panel.inert = !active

        if (tab) {
          ensureElementId(tab, "base-tab")
          panel.setAttribute("aria-labelledby", tab.id)
        } else {
          panel.removeAttribute("aria-labelledby")
        }

        setBooleanAttribute(panel, "data-hidden", !active)
      }
    } finally {
      this.#updating = false
    }
  }

  /** @param {BaseTab} tab */
  focusTab(tab) {
    this.#highlightedTab = tab
    this.#syncTabIndexes()
    tab.focus()
  }

  /**
   * @param {BaseTab} tab
   * @param {Event} nativeEvent
   */
  activateTab(tab, nativeEvent) {
    if (tab.disabled) return false

    if (this.#updateQueued) {
      this.#updateQueued = false
      this.update()
    }

    const previousValue = this.value
    const nextValue = tab.value
    const activationDirection = computeActivationDirection(this.tabs, previousValue, nextValue, this.orientation)

    if (previousValue === nextValue) {
      this.focusTab(tab)
      return true
    }

    if (!this.#dispatchValueChange(nextValue, previousValue, "none", activationDirection, true)) return false

    this.#activationDirection = activationDirection
    this.#highlightedTab = tab
    this.value = nextValue
    this.update()
    nativeEvent.preventDefault()
    return true
  }

  /**
   * @param {string | null} nextValue
   * @param {string | null} previousValue
   * @param {string} reason
   * @param {ActivationDirection} activationDirection
   * @param {boolean} cancelable
   */
  #dispatchValueChange(nextValue, previousValue, reason, activationDirection, cancelable) {
    const event = new CustomEvent(valueChangeEventName, {
      bubbles: true,
      cancelable,
      composed: true,
      detail: {
        value: nextValue,
        previousValue,
        reason,
        activationDirection,
      },
    })

    return this.dispatchEvent(event)
  }

  /**
   * @param {BaseTab} currentTab
   * @param {1 | -1} offset
   * @param {boolean} loop
   */
  getAdjacentEnabledTab(currentTab, offset, loop) {
    const tabs = this.tabs
    const currentIndex = tabs.indexOf(currentTab)
    if (currentIndex === -1) return tabs[0]

    const nextIndex = currentIndex + offset
    if (nextIndex >= 0 && nextIndex < tabs.length) return tabs[nextIndex]
    if (!loop) return undefined
    return offset > 0 ? tabs[0] : tabs.at(-1)
  }

  getFirstEnabledTab() {
    return this.tabs[0]
  }

  getLastEnabledTab() {
    return this.tabs.at(-1)
  }

  #syncTabIndexes() {
    for (const tab of this.tabs) {
      tab.tabIndex = tab === this.#highlightedTab ? 0 : -1
    }
  }
}

export class BaseTabsList extends HTMLElement {
  /** @type {BaseTabs | undefined} */
  #root

  connectedCallback() {
    this.#root = getTabsRoot(this)
    this.setAttribute("role", "tablist")
    this.onkeydown = this.#handleKeyDown.bind(this)
    requestTabsUpdate(this)
  }

  disconnectedCallback() {
    this.onkeydown = null
    this.#root?.requestUpdate()
    this.#root = undefined
  }

  get activateOnFocus() {
    return this.hasAttribute("activate-on-focus")
  }

  get loopFocus() {
    return this.getAttribute("loop-focus") !== "false"
  }

  /** @param {KeyboardEvent} event */
  #handleKeyDown(event) {
    const root = getTabsRoot(this)
    const currentTab = event.target instanceof BaseTab ? event.target : undefined
    if (!root || !currentTab) return

    const nextKey = root.orientation === "horizontal" ? "ArrowRight" : "ArrowDown"
    const previousKey = root.orientation === "horizontal" ? "ArrowLeft" : "ArrowUp"
    /** @type {BaseTab | undefined} */
    let nextTab

    if (event.key === nextKey) {
      nextTab = root.getAdjacentEnabledTab(currentTab, 1, this.loopFocus)
    } else if (event.key === previousKey) {
      nextTab = root.getAdjacentEnabledTab(currentTab, -1, this.loopFocus)
    } else if (event.key === "Home") {
      nextTab = root.getFirstEnabledTab()
    } else if (event.key === "End") {
      nextTab = root.getLastEnabledTab()
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault()
      root.activateTab(currentTab, event)
      return
    }

    if (!nextTab) return

    event.preventDefault()
    root.focusTab(nextTab)

    if (this.activateOnFocus) {
      root.activateTab(nextTab, event)
    }
  }
}

export class BaseTab extends HTMLElement {
  static observedAttributes = ["disabled", "value"]

  /** @type {BaseTabs | undefined} */
  #root

  connectedCallback() {
    this.#root = getTabsRoot(this)
    ensureElementId(this, "base-tab")
    this.setAttribute("role", "tab")
    this.onclick = this.#handleClick.bind(this)
    this.onfocus = () => getTabsRoot(this)?.focusTab(this)
    requestTabsUpdate(this)
  }

  disconnectedCallback() {
    this.onclick = null
    this.onfocus = null
    this.#root?.requestUpdate()
    this.#root = undefined
  }

  attributeChangedCallback() {
    requestTabsUpdate(this)
  }

  /** @returns {string} */
  get value() {
    const explicitValue = this.getAttribute("value")
    if (explicitValue != null) return explicitValue

    const root = getTabsRoot(this)
    const index = root?.tabs.indexOf(this) ?? 0
    return String(index)
  }

  /** @param {string | null | undefined} value */
  set value(value) {
    if (value == null) {
      this.removeAttribute("value")
    } else {
      this.setAttribute("value", String(value))
    }
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
    if (this.disabled) {
      event.preventDefault()
      event.stopImmediatePropagation()
      return
    }

    getTabsRoot(this)?.activateTab(this, event)
  }
}

export class BaseTabsPanel extends HTMLElement {
  static observedAttributes = ["value"]

  /** @type {BaseTabs | undefined} */
  #root

  connectedCallback() {
    this.#root = getTabsRoot(this)
    ensureElementId(this, "base-tabs-panel")
    this.setAttribute("role", "tabpanel")
    requestTabsUpdate(this)
  }

  disconnectedCallback() {
    this.#root?.requestUpdate()
    this.#root = undefined
  }

  attributeChangedCallback() {
    requestTabsUpdate(this)
  }

  /** @returns {string} */
  get value() {
    const explicitValue = this.getAttribute("value")
    if (explicitValue != null) return explicitValue

    const root = getTabsRoot(this)
    const index = root?.panels.indexOf(this) ?? 0
    return String(index)
  }

  /** @param {string | null | undefined} value */
  set value(value) {
    if (value == null) {
      this.removeAttribute("value")
    } else {
      this.setAttribute("value", String(value))
    }
  }
}

export function defineBaseTabs() {
  defineCustomElement("base-tabs", BaseTabs)
  defineCustomElement("base-tabs-list", BaseTabsList)
  defineCustomElement("base-tab", BaseTab)
  defineCustomElement("base-tabs-panel", BaseTabsPanel)
}

/**
 * @param {string} name
 * @param {CustomElementConstructor} constructor
 */
function defineCustomElement(name, constructor) {
  if (!customElements.get(name)) {
    customElements.define(name, constructor)
  }
}

/**
 * @param {Element} element
 * @param {string} prefix
 */
function ensureElementId(element, prefix) {
  if (!element.id) {
    generatedId += 1
    element.id = `${prefix}-${generatedId}`
  }
}

/**
 * @param {string | null | undefined} value
 * @returns {TabsOrientation}
 */
function normalizeOrientation(value) {
  return value === "vertical" ? "vertical" : "horizontal"
}

/** @param {Element} element */
function getTabsRoot(element) {
  let parent = element.parentElement

  while (parent) {
    if (parent instanceof BaseTabs) return parent
    parent = parent.parentElement
  }

  return undefined
}

/** @param {Element} element */
function requestTabsUpdate(element) {
  getTabsRoot(element)?.requestUpdate()
}

/**
 * @param {Element} element
 * @returns {element is BaseTab}
 */
function isBaseTab(element) {
  return element instanceof BaseTab
}

/**
 * @param {Element} element
 * @returns {element is BaseTabsPanel}
 */
function isBaseTabsPanel(element) {
  return element instanceof BaseTabsPanel
}

/**
 * @param {Element} element
 * @returns {element is BaseTabsList}
 */
function isBaseTabsList(element) {
  return element instanceof BaseTabsList
}

/**
 * @param {Element} element
 * @param {string} name
 * @param {boolean} value
 */
function setBooleanAttribute(element, name, value) {
  if (value) {
    element.setAttribute(name, "")
  } else {
    element.removeAttribute(name)
  }
}

/**
 * @param {BaseTab[]} tabs
 * @param {string | null} previousValue
 * @param {string | null} nextValue
 * @param {TabsOrientation} orientation
 * @returns {ActivationDirection}
 */
function computeActivationDirection(tabs, previousValue, nextValue, orientation) {
  if (previousValue == null || nextValue == null) return "none"

  const previousIndex = tabs.findIndex((tab) => tab.value === previousValue)
  const nextIndex = tabs.findIndex((tab) => tab.value === nextValue)

  if (previousIndex === -1 || nextIndex === -1 || previousIndex === nextIndex) return "none"
  if (orientation === "vertical") return nextIndex > previousIndex ? "down" : "up"
  return nextIndex > previousIndex ? "right" : "left"
}

/**
 * @param {BaseTab[]} tabs
 * @param {string | null} previousValue
 */
function getAutomaticChangeReason(tabs, previousValue) {
  if (previousValue == null) return "initial"

  const previousTab = tabs.find((tab) => tab.value === previousValue)
  if (previousTab?.disabled) return "disabled"

  return "missing"
}
