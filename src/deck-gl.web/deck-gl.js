// @ts-check

/** @typedef {{ setProps?: (props: Record<string, unknown>) => void, redraw?: (force?: boolean) => void, finalize?: () => void }} DeckInstance */
/** @typedef {new (props: Record<string, unknown>) => DeckInstance} DeckConstructor */
/** @typedef {{ prop: string, eventName: string, detail: (...args: unknown[]) => unknown }} DeckEventCallback */
/** @typedef {{ name: string, eventName: string }} InlineEventAttribute */
/** @typedef {{ id: string, label: string, visible: boolean, swatch?: string, description?: string, count?: string | number }} DeckLayerListItem */
/** @typedef {{ eventType?: string, info?: unknown, object?: unknown }} DeckDetailsValue */

const invalidAttributeValue = Symbol("invalid-attribute-value")
const css = String.raw

/** @type {DeckEventCallback[]} */
const deckEventCallbacks = [
  { prop: "onLoad", eventName: "deck-load", detail: () => undefined },
  { prop: "onError", eventName: "deck-error", detail: (error) => ({ error }) },
  { prop: "onClick", eventName: "deck-click", detail: (info, event) => ({ info, event }) },
  { prop: "onHover", eventName: "deck-hover", detail: (info, event) => ({ info, event }) },
  { prop: "onDragStart", eventName: "deck-drag-start", detail: (info, event) => ({ info, event }) },
  { prop: "onDrag", eventName: "deck-drag", detail: (info, event) => ({ info, event }) },
  { prop: "onDragEnd", eventName: "deck-drag-end", detail: (info, event) => ({ info, event }) },
  { prop: "onViewStateChange", eventName: "deck-view-state-change", detail: (payload) => payload },
]

const deckGlAttributeNames = ["controller", "debug", "initial-view-state", "parameters", "use-device-pixels", "view-state"]

/** @type {InlineEventAttribute[]} */
const inlineEventAttributes = [
  { name: "oninit", eventName: "deck-init" },
  { name: "ondeckinit", eventName: "deck-init" },
  { name: "onload", eventName: "deck-load" },
  { name: "ondeckload", eventName: "deck-load" },
  { name: "onerror", eventName: "deck-error" },
  { name: "ondeckerror", eventName: "deck-error" },
  { name: "ondeckclick", eventName: "deck-click" },
  { name: "onhover", eventName: "deck-hover" },
  { name: "ondeckhover", eventName: "deck-hover" },
  { name: "ondragstart", eventName: "deck-drag-start" },
  { name: "ondeckdragstart", eventName: "deck-drag-start" },
  { name: "ondrag", eventName: "deck-drag" },
  { name: "ondeckdrag", eventName: "deck-drag" },
  { name: "ondragend", eventName: "deck-drag-end" },
  { name: "ondeckdragend", eventName: "deck-drag-end" },
  { name: "onviewstatechange", eventName: "deck-view-state-change" },
  { name: "ondeckviewstatechange", eventName: "deck-view-state-change" },
  { name: "onlayervisibilitychange", eventName: "deck-layer-visibility-change" },
  { name: "ondecklayervisibilitychange", eventName: "deck-layer-visibility-change" },
  { name: "ondetailschange", eventName: "deck-details-change" },
  { name: "ondeckdetailschange", eventName: "deck-details-change" },
]

const inlineEventAttributesByName = new Map(inlineEventAttributes.map((attribute) => [attribute.name, attribute.eventName]))
const inlineEventAttributeNames = inlineEventAttributes.map((attribute) => attribute.name)
const deckGlInlineEventAttributeNames = inlineEventAttributes
  .filter((attribute) => attribute.eventName.startsWith("deck-") && !["deck-layer-visibility-change", "deck-details-change"].includes(attribute.eventName))
  .map((attribute) => attribute.name)
const layerListInlineEventAttributeNames = inlineEventAttributes
  .filter((attribute) => attribute.eventName === "deck-layer-visibility-change")
  .map((attribute) => attribute.name)
const detailsPanelInlineEventAttributeNames = inlineEventAttributes
  .filter((attribute) => attribute.eventName === "deck-details-change")
  .map((attribute) => attribute.name)

/** @type {WeakMap<Element, Map<string, (event: Event) => unknown>>} */
const inlineEventHandlerCache = new WeakMap()

const deckGlStyles = css`
  :host {
    display: block;
    min-height: 240px;
    position: relative;
    width: 100%;
  }

  .deck-gl-container {
    inset: 0;
    overflow: hidden;
    position: absolute;
  }
`

const layerListStyles = css`
  :host {
    display: block;
  }

  .deck-layer-list {
    display: grid;
    gap: 0.5rem;
  }

  .deck-layer-list__title {
    color: inherit;
    font: inherit;
    font-weight: 650;
    margin: 0;
  }

  .deck-layer-list__items {
    display: grid;
    gap: 0.375rem;
  }

  button {
    align-items: center;
    background: color-mix(in oklch, Canvas 90%, CanvasText 10%);
    border: 1px solid color-mix(in oklch, CanvasText 18%, transparent);
    border-radius: 0.75rem;
    color: CanvasText;
    cursor: default;
    display: grid;
    font: inherit;
    gap: 0.125rem 0.5rem;
    grid-template-columns: auto 1fr auto;
    padding: 0.625rem 0.75rem;
    text-align: start;
  }

  button[aria-pressed="false"] {
    opacity: 0.58;
  }

  button:focus-visible {
    outline: 2px solid Highlight;
    outline-offset: 2px;
  }

  .swatch {
    border: 1px solid color-mix(in oklch, CanvasText 20%, transparent);
    border-radius: 999px;
    height: 0.875rem;
    width: 0.875rem;
  }

  .label {
    font-weight: 600;
  }

  .description {
    color: color-mix(in oklch, CanvasText 62%, transparent);
    font-size: 0.8125rem;
    grid-column: 2 / -1;
  }

  .count {
    color: color-mix(in oklch, CanvasText 70%, transparent);
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
  }
`

const detailsPanelStyles = css`
  :host {
    display: block;
  }

  .deck-details-panel {
    background: color-mix(in oklch, Canvas 88%, CanvasText 12%);
    border: 1px solid color-mix(in oklch, CanvasText 16%, transparent);
    border-radius: 1rem;
    display: grid;
    gap: 0.625rem;
    padding: 0.875rem;
  }

  .empty {
    color: color-mix(in oklch, CanvasText 62%, transparent);
  }

  h2 {
    font: inherit;
    font-size: 1rem;
    font-weight: 700;
    margin: 0;
  }

  dl {
    display: grid;
    gap: 0.375rem 0.75rem;
    grid-template-columns: max-content 1fr;
    margin: 0;
  }

  dt {
    color: color-mix(in oklch, CanvasText 58%, transparent);
  }

  dd {
    margin: 0;
    min-width: 0;
    overflow-wrap: anywhere;
  }
`

export class DeckGlElement extends HTMLElement {
  static observedAttributes = [...deckGlInlineEventAttributeNames, ...deckGlAttributeNames]

  /** @type {DeckInstance | null} */
  #deck = null

  /** @type {DeckConstructor | undefined} */
  #deckConstructor

  /** @type {HTMLElement | undefined} */
  #container

  /** @type {Record<string, unknown>} */
  #props = {}

  /** @type {Record<string, unknown>} */
  #pendingProps = {}

  #creating = false

  #createQueued = false

  #initialized = false

  #updateQueued = false

  connectedCallback() {
    this.#ensureShadow()
    this.#queueCreateDeck()
  }

  disconnectedCallback() {
    this.#createQueued = false
    this.#initialized = false
    this.#updateQueued = false
    this.#finalizeDeck()
  }

  /**
   * @param {string} name
   * @param {string | null} oldValue
   * @param {string | null} newValue
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return
    if (setInlineEventHandlerAttribute(this, name, newValue)) return

    const parsed = parseDeckGlAttribute(this, name, newValue)
    if (parsed === invalidAttributeValue) return

    this.setProps({ [attributeNameToPropName(name)]: parsed })
  }

  /** @returns {DeckInstance | null} */
  get deck() {
    return this.#deck
  }

  /** @returns {DeckConstructor | undefined} */
  get deckConstructor() {
    return this.#deckConstructor
  }

  /** @param {DeckConstructor | null | undefined} value */
  set deckConstructor(value) {
    if (value != null && typeof value !== "function") {
      this.#dispatchError(new TypeError("deckConstructor must be a constructor."))
      return
    }

    if (this.#deckConstructor === value) return

    this.#deckConstructor = value ?? undefined

    if (this.#creating) return
    if (!this.isConnected) return

    this.#finalizeDeck()
    this.#queueCreateDeck()
  }

  /** @returns {unknown[]} */
  get layers() {
    return Array.isArray(this.#props.layers) ? this.#props.layers : []
  }

  /** @param {unknown[]} value */
  set layers(value) {
    this.setProps({ layers: value })
  }

  /** @returns {unknown[] | undefined} */
  get views() {
    return Array.isArray(this.#props.views) ? this.#props.views : undefined
  }

  /** @param {unknown[] | undefined} value */
  set views(value) {
    this.setProps({ views: value })
  }

  /** @returns {unknown[] | undefined} */
  get effects() {
    return Array.isArray(this.#props.effects) ? this.#props.effects : undefined
  }

  /** @param {unknown[] | undefined} value */
  set effects(value) {
    this.setProps({ effects: value })
  }

  /** @returns {Record<string, unknown> | undefined} */
  get parameters() {
    return isRecord(this.#props.parameters) ? this.#props.parameters : undefined
  }

  /** @param {Record<string, unknown> | undefined} value */
  set parameters(value) {
    this.setProps({ parameters: value })
  }

  /** @returns {Record<string, unknown> | undefined} */
  get initialViewState() {
    return isRecord(this.#props.initialViewState) ? this.#props.initialViewState : undefined
  }

  /** @param {Record<string, unknown> | undefined} value */
  set initialViewState(value) {
    this.setProps({ initialViewState: value })
  }

  /** @returns {Record<string, unknown> | undefined} */
  get viewState() {
    return isRecord(this.#props.viewState) ? this.#props.viewState : undefined
  }

  /** @param {Record<string, unknown> | undefined} value */
  set viewState(value) {
    this.setProps({ viewState: value })
  }

  /** @returns {boolean | Record<string, unknown> | undefined} */
  get controller() {
    const controller = this.#props.controller
    return typeof controller === "boolean" || isRecord(controller) ? controller : undefined
  }

  /** @param {boolean | Record<string, unknown> | undefined} value */
  set controller(value) {
    this.setProps({ controller: value })
  }

  /** @returns {unknown} */
  get getTooltip() {
    return this.#props.getTooltip
  }

  /** @param {unknown} value */
  set getTooltip(value) {
    this.setProps({ getTooltip: value })
  }

  /** @returns {boolean | number | undefined} */
  get useDevicePixels() {
    const value = this.#props.useDevicePixels
    return typeof value === "boolean" || typeof value === "number" ? value : undefined
  }

  /** @param {boolean | number | undefined} value */
  set useDevicePixels(value) {
    this.setProps({ useDevicePixels: value })
  }

  /** @returns {boolean | undefined} */
  get debug() {
    return typeof this.#props.debug === "boolean" ? this.#props.debug : undefined
  }

  /** @param {boolean | undefined} value */
  set debug(value) {
    this.setProps({ debug: value })
  }

  /** @param {Record<string, unknown>} props */
  setProps(props) {
    for (const [key, value] of Object.entries(props)) {
      this.#props[key] = value
      this.#pendingProps[key] = value
    }

    if (this.isConnected) this.#queueProps()
  }

  /** @param {boolean} [force] */
  redraw(force) {
    this.#deck?.redraw?.(force)
  }

  #ensureShadow() {
    if (!this.shadowRoot) {
      const shadow = this.attachShadow({ mode: "open" })
      const style = document.createElement("style")
      style.textContent = deckGlStyles
      this.#container = document.createElement("div")
      this.#container.className = "deck-gl-container"
      this.#container.setAttribute("part", "container")
      shadow.append(style, this.#container)
    } else if (!this.#container) {
      this.#container = /** @type {HTMLElement | undefined} */ (this.shadowRoot.querySelector(".deck-gl-container") ?? undefined)
    }

    return this.#container
  }

  #resolveDeckConstructor() {
    if (this.#deckConstructor) return this.#deckConstructor

    const globalDeck = Reflect.get(globalThis, "Deck")
    return typeof globalDeck === "function" ? /** @type {DeckConstructor} */ (globalDeck) : undefined
  }

  #queueCreateDeck() {
    if (this.#deck || this.#creating || this.#createQueued || !this.isConnected) return

    this.#createQueued = true
    queueMicrotask(() => {
      this.#createQueued = false
      this.#createDeck()
    })
  }

  #createDeck() {
    if (this.#deck || this.#creating || !this.isConnected) return

    const parent = this.#ensureShadow()
    if (!parent) return

    this.#creating = true

    try {
      if (!this.#initialized) {
        this.#initialized = true
        dispatchInlineCustomEvent(this, "deck-init", { parent, props: this.#props }, { cancelable: true })
      }

      const DeckConstructor = this.#resolveDeckConstructor()
      if (!DeckConstructor) {
        this.setAttribute("data-deck-state", "waiting")
        return
      }

      const props = this.#decorateProps({ ...this.#props, parent }, true)
      this.#deck = new DeckConstructor(props)
      this.#pendingProps = {}
      this.setAttribute("data-deck-state", "ready")
    } catch (error) {
      this.setAttribute("data-deck-state", "error")
      this.#dispatchError(error)
    } finally {
      this.#creating = false
    }
  }

  #queueProps() {
    if (!this.#deck) {
      this.#queueCreateDeck()
      return
    }

    if (this.#updateQueued) return

    this.#updateQueued = true

    queueMicrotask(() => {
      this.#updateQueued = false
      if (!this.isConnected || !this.#deck) return

      const props = this.#pendingProps
      this.#pendingProps = {}
      if (Object.keys(props).length === 0) return

      const nextProps = this.#decorateProps(props, false)

      try {
        this.#deck.setProps?.(nextProps)
      } catch (error) {
        this.#dispatchError(error)
      }
    })
  }

  #finalizeDeck() {
    if (!this.#deck) return

    const deck = this.#deck
    this.#deck = null

    try {
      deck.finalize?.()
    } catch (error) {
      this.#dispatchError(error)
    }

    this.setAttribute("data-deck-state", "finalized")
  }

  /**
   * @param {Record<string, unknown>} props
   * @param {boolean} includeAllCallbacks
   */
  #decorateProps(props, includeAllCallbacks) {
    const nextProps = { ...props }

    for (const callback of deckEventCallbacks) {
      if (!includeAllCallbacks && !Object.hasOwn(props, callback.prop)) continue

      const userCallback = this.#props[callback.prop]
      /** @param {...unknown} args */
      const deckCallback = (...args) => {
        dispatchInlineCustomEvent(this, callback.eventName, callback.detail(...args))

        if (typeof userCallback === "function") {
          return userCallback(...args)
        }

        return undefined
      }
      nextProps[callback.prop] = deckCallback
    }

    return nextProps
  }

  /** @param {unknown} error */
  #dispatchError(error) {
    dispatchInlineCustomEvent(this, "deck-error", { error })
  }
}

export class DeckLayerList extends HTMLElement {
  static observedAttributes = [...layerListInlineEventAttributeNames, "items", "label"]

  /** @type {DeckLayerListItem[]} */
  #items = []

  #renderQueued = false

  connectedCallback() {
    this.#render()
  }

  /**
   * @param {string} name
   * @param {string | null} oldValue
   * @param {string | null} newValue
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return
    if (setInlineEventHandlerAttribute(this, name, newValue)) return

    if (name === "items") {
      const parsed = parseItemsAttribute(this, newValue)
      if (parsed === invalidAttributeValue) return
      this.#items = parsed
    }

    this.#requestRender()
  }

  /** @returns {DeckLayerListItem[]} */
  get items() {
    return this.#items.map((item) => ({ ...item }))
  }

  /** @param {unknown} value */
  set items(value) {
    this.#items = normalizeLayerItems(value)
    this.#requestRender()
  }

  /** @returns {string} */
  get label() {
    return this.getAttribute("label") ?? "Layers"
  }

  /** @param {string | null | undefined} value */
  set label(value) {
    if (value == null) this.removeAttribute("label")
    else this.setAttribute("label", String(value))
  }

  /**
   * @param {string} id
   * @param {boolean} visible
   */
  setLayerVisible(id, visible) {
    const index = this.#items.findIndex((item) => item.id === id)
    if (index === -1) return false

    const previousVisible = this.#items[index].visible
    if (previousVisible === visible) return true

    this.#items[index] = { ...this.#items[index], visible }
    this.#requestRender()
    return true
  }

  /** @param {string} id */
  toggleLayer(id) {
    const item = this.#items.find((candidate) => candidate.id === id)
    if (!item) return false

    const previousVisible = item.visible
    const visible = !previousVisible
    const event = dispatchInlineCustomEvent(
      this,
      "deck-layer-visibility-change",
      {
        id,
        item: { ...item },
        previousVisible,
        visible,
      },
      { cancelable: true },
    )

    if (event.defaultPrevented) return false
    return this.setLayerVisible(id, visible)
  }

  #requestRender() {
    if (!this.isConnected || this.#renderQueued) return

    this.#renderQueued = true
    queueMicrotask(() => {
      this.#renderQueued = false
      if (this.isConnected) this.#render()
    })
  }

  #render() {
    const shadow = ensureOpenShadow(this)
    const section = document.createElement("section")
    section.className = "deck-layer-list"
    section.setAttribute("part", "list")

    const title = document.createElement("h2")
    title.className = "deck-layer-list__title"
    title.textContent = this.label
    section.append(title)

    const items = document.createElement("div")
    items.className = "deck-layer-list__items"

    for (const item of this.#items) {
      const button = document.createElement("button")
      button.type = "button"
      button.setAttribute("aria-pressed", String(item.visible))
      button.dataset.layerId = item.id
      button.onclick = () => this.toggleLayer(item.id)

      const swatch = document.createElement("span")
      swatch.className = "swatch"
      swatch.style.background = item.swatch ?? "currentColor"
      swatch.setAttribute("aria-hidden", "true")

      const label = document.createElement("span")
      label.className = "label"
      label.textContent = item.label

      const count = document.createElement("span")
      count.className = "count"
      count.textContent = item.count == null ? "" : String(item.count)

      button.append(swatch, label, count)

      if (item.description) {
        const description = document.createElement("span")
        description.className = "description"
        description.textContent = item.description
        button.append(description)
      }

      items.append(button)
    }

    section.append(items)
    shadow.replaceChildren(createStyle(layerListStyles), section)
  }
}

export class DeckDetailsPanel extends HTMLElement {
  static observedAttributes = [...detailsPanelInlineEventAttributeNames, "empty", "for"]

  /** @type {HTMLElement | null} */
  #target = null

  /** @type {DeckDetailsValue | null} */
  #value = null

  /** @type {((value: DeckDetailsValue) => string | Node | DocumentFragment | null | undefined) | undefined} */
  #formatter

  /** @param {Event} event */
  #handleDeckEvent = (event) => {
    const detail = event instanceof CustomEvent ? event.detail : undefined
    const info = getDeckInfo(detail)
    const object = getDeckObject(info)

    if (!object) {
      if (event.type === "deck-hover") this.value = null
      return
    }

    this.value = { eventType: event.type, info, object }
    dispatchInlineCustomEvent(this, "deck-details-change", this.value)
  }

  connectedCallback() {
    this.#connectTarget()
    this.#render()
  }

  disconnectedCallback() {
    this.#disconnectTarget()
  }

  /**
   * @param {string} name
   * @param {string | null} oldValue
   * @param {string | null} newValue
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return
    if (setInlineEventHandlerAttribute(this, name, newValue)) return
    if (name === "for" && this.isConnected) this.#connectTarget()
    if (name === "empty") this.#render()
  }

  /** @returns {string} */
  get htmlFor() {
    return this.getAttribute("for") ?? ""
  }

  /** @param {string | null | undefined} value */
  set htmlFor(value) {
    if (value == null) this.removeAttribute("for")
    else this.setAttribute("for", String(value))
  }

  /** @returns {string} */
  get empty() {
    return this.getAttribute("empty") ?? "Hover or click a feature."
  }

  /** @param {string | null | undefined} value */
  set empty(value) {
    if (value == null) this.removeAttribute("empty")
    else this.setAttribute("empty", String(value))
  }

  /** @returns {DeckDetailsValue | null} */
  get value() {
    return this.#value
  }

  /** @param {DeckDetailsValue | null} value */
  set value(value) {
    this.#value = value
    this.#render()
  }

  /** @returns {((value: DeckDetailsValue) => string | Node | DocumentFragment | null | undefined) | undefined} */
  get formatter() {
    return this.#formatter
  }

  /** @param {((value: DeckDetailsValue) => string | Node | DocumentFragment | null | undefined) | null | undefined} value */
  set formatter(value) {
    this.#formatter = typeof value === "function" ? value : undefined
    this.#render()
  }

  #connectTarget() {
    this.#disconnectTarget()

    const id = this.htmlFor
    const target = id ? document.getElementById(id) : this.parentElement?.querySelector("deck-gl")
    this.#target = target instanceof HTMLElement ? target : null

    if (!this.#target) return

    this.#target.addEventListener("deck-click", this.#handleDeckEvent)
    this.#target.addEventListener("deck-hover", this.#handleDeckEvent)
  }

  #disconnectTarget() {
    this.#target?.removeEventListener("deck-click", this.#handleDeckEvent)
    this.#target?.removeEventListener("deck-hover", this.#handleDeckEvent)
    this.#target = null
  }

  #render() {
    const shadow = ensureOpenShadow(this)
    const panel = document.createElement("section")
    panel.className = "deck-details-panel"
    panel.setAttribute("aria-live", "polite")
    panel.setAttribute("part", "panel")

    if (!this.#value) {
      const empty = document.createElement("span")
      empty.className = "empty"
      empty.textContent = this.empty
      panel.append(empty)
      shadow.replaceChildren(createStyle(detailsPanelStyles), panel)
      return
    }

    const formatted = this.#formatter?.(this.#value)
    if (formatted instanceof Node) {
      panel.append(formatted)
    } else if (typeof formatted === "string") {
      panel.textContent = formatted
    } else {
      renderDefaultDetails(panel, this.#value)
    }

    shadow.replaceChildren(createStyle(detailsPanelStyles), panel)
  }
}

/** @param {string} [name] */
export function defineDeckGl(name = "deck-gl") {
  if (!customElements.get(name)) customElements.define(name, DeckGlElement)
}

/** @param {string} [name] */
export function defineDeckLayerList(name = "deck-layer-list") {
  if (!customElements.get(name)) customElements.define(name, DeckLayerList)
}

/** @param {string} [name] */
export function defineDeckDetailsPanel(name = "deck-details-panel") {
  if (!customElements.get(name)) customElements.define(name, DeckDetailsPanel)
}

export function defineDeckElements() {
  defineDeckGl()
  defineDeckLayerList()
  defineDeckDetailsPanel()
}

/**
 * @param {Element} element
 * @param {string} name
 * @param {string | null} value
 */
function setInlineEventHandlerAttribute(element, name, value) {
  if (!inlineEventAttributesByName.has(name)) return false

  let handlers = inlineEventHandlerCache.get(element)
  if (!handlers) {
    handlers = new Map()
    inlineEventHandlerCache.set(element, handlers)
  }

  if (value == null || value.trim() === "") {
    handlers.delete(name)
    return true
  }

  try {
    const handler = new Function("event", value)
    handlers.set(name, (event) => handler.call(element, event))
  } catch (error) {
    handlers.delete(name)
    dispatchInlineCustomEvent(element, "deck-error", { attribute: name, error, value })
  }

  return true
}

/**
 * @param {Element} element
 * @param {string} eventName
 * @param {unknown} detail
 * @param {{ cancelable?: boolean }} [options]
 */
function dispatchInlineCustomEvent(element, eventName, detail, options = {}) {
  const event = new CustomEvent(eventName, {
    bubbles: true,
    cancelable: options.cancelable === true,
    composed: true,
    detail,
  })

  element.dispatchEvent(event)
  invokeInlineEventHandlers(element, eventName, event)
  return event
}

/**
 * @param {Element} element
 * @param {string} eventName
 * @param {Event} event
 */
function invokeInlineEventHandlers(element, eventName, event) {
  const handlers = inlineEventHandlerCache.get(element)
  if (!handlers) return

  for (const name of inlineEventAttributeNames) {
    if (inlineEventAttributesByName.get(name) !== eventName) continue

    const handler = handlers.get(name)
    if (!handler) continue

    try {
      if (handler(event) === false && event.cancelable) event.preventDefault()
    } catch (error) {
      if (eventName !== "deck-error") dispatchInlineCustomEvent(element, "deck-error", { error, event })
    }
  }
}

/**
 * @param {DeckGlElement} element
 * @param {string} name
 * @param {string | null} value
 */
function parseDeckGlAttribute(element, name, value) {
  if (name === "controller") return parseControllerAttribute(element, name, value)
  if (name === "debug") return parseBooleanAttribute(element, name, value)
  if (name === "use-device-pixels") return parseUseDevicePixelsAttribute(element, name, value)
  return parseJsonObjectAttribute(element, name, value)
}

/** @param {string} name */
function attributeNameToPropName(name) {
  if (name === "initial-view-state") return "initialViewState"
  if (name === "view-state") return "viewState"
  if (name === "use-device-pixels") return "useDevicePixels"
  return name
}

/**
 * @param {Element} element
 * @param {string} name
 * @param {string | null} value
 */
function parseControllerAttribute(element, name, value) {
  if (value == null) return false

  const text = value.trim()
  if (text === "" || text === "true") return true
  if (text === "false") return false
  return parseJsonObjectAttribute(element, name, value)
}

/**
 * @param {Element} element
 * @param {string} name
 * @param {string | null} value
 */
function parseBooleanAttribute(element, name, value) {
  if (value == null) return false

  const text = value.trim()
  if (text === "" || text === "true") return true
  if (text === "false") return false

  dispatchAttributeError(element, name, value, new TypeError(`${name} must be a boolean attribute.`))
  return invalidAttributeValue
}

/**
 * @param {Element} element
 * @param {string} name
 * @param {string | null} value
 */
function parseUseDevicePixelsAttribute(element, name, value) {
  if (value == null) return undefined

  const text = value.trim()
  if (text === "" || text === "true") return true
  if (text === "false") return false

  const number = Number(text)
  if (Number.isFinite(number)) return number

  dispatchAttributeError(element, name, value, new TypeError(`${name} must be a boolean or number.`))
  return invalidAttributeValue
}

/**
 * @param {Element} element
 * @param {string} name
 * @param {string | null} value
 */
function parseJsonObjectAttribute(element, name, value) {
  if (value == null) return undefined

  try {
    const parsed = JSON.parse(value)
    if (isRecord(parsed)) return parsed
    throw new TypeError(`${name} must be a JSON object.`)
  } catch (error) {
    dispatchAttributeError(element, name, value, error)
    return invalidAttributeValue
  }
}

/**
 * @param {Element} element
 * @param {string} name
 * @param {string | null} value
 * @param {unknown} error
 */
function dispatchAttributeError(element, name, value, error) {
  dispatchInlineCustomEvent(element, "deck-error", {
    attribute: name,
    error,
    value,
  })
}

/**
 * @param {DeckLayerList} element
 * @param {string | null} value
 */
function parseItemsAttribute(element, value) {
  if (value == null) return []

  try {
    return normalizeLayerItems(JSON.parse(value))
  } catch (error) {
    dispatchInlineCustomEvent(element, "deck-layer-list-error", { attribute: "items", error, value })
    return invalidAttributeValue
  }
}

/** @param {unknown} value */
function normalizeLayerItems(value) {
  if (!Array.isArray(value)) return []

  /** @type {DeckLayerListItem[]} */
  const items = []

  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== "string" || item.id.length === 0) continue

    items.push({
      id: item.id,
      label: typeof item.label === "string" && item.label.length > 0 ? item.label : item.id,
      visible: item.visible !== false,
      swatch: typeof item.swatch === "string" ? item.swatch : undefined,
      description: typeof item.description === "string" ? item.description : undefined,
      count: typeof item.count === "string" || typeof item.count === "number" ? item.count : undefined,
    })
  }

  return items
}

/** @param {unknown} value */
function getDeckInfo(value) {
  return isRecord(value) && "info" in value ? value.info : value
}

/** @param {unknown} value */
function getDeckObject(value) {
  return isRecord(value) && "object" in value ? value.object : undefined
}

/**
 * @param {HTMLElement} panel
 * @param {DeckDetailsValue} value
 */
function renderDefaultDetails(panel, value) {
  const object = value.object
  const displayObject = getDisplayObject(object)

  const title = document.createElement("h2")
  title.textContent = getObjectTitle(displayObject)
  panel.append(title)

  const rows = Object.entries(displayObject).filter(([, rowValue]) => isRenderableValue(rowValue)).slice(0, 8)
  if (rows.length === 0) return

  const list = document.createElement("dl")
  for (const [key, rowValue] of rows) {
    const term = document.createElement("dt")
    term.textContent = humanizeKey(key)
    const description = document.createElement("dd")
    description.textContent = String(rowValue)
    list.append(term, description)
  }

  panel.append(list)
}

/** @param {unknown} value */
function getDisplayObject(value) {
  if (isRecord(value) && isRecord(value.properties)) return value.properties
  if (isRecord(value)) return value
  return { value }
}

/** @param {Record<string, unknown>} value */
function getObjectTitle(value) {
  for (const key of ["name", "title", "id", "abbrev", "code"]) {
    const candidate = value[key]
    if (isRenderableValue(candidate)) return String(candidate)
  }

  return "Selected feature"
}

/** @param {string} key */
function humanizeKey(key) {
  return key.replaceAll("_", " ").replace(/([a-z])([A-Z])/g, "$1 $2")
}

/** @param {unknown} value */
function isRenderableValue(value) {
  return value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean"
}

/** @param {Element} element */
function ensureOpenShadow(element) {
  return element.shadowRoot ?? element.attachShadow({ mode: "open" })
}

/** @param {string} text */
function createStyle(text) {
  const style = document.createElement("style")
  style.textContent = text
  return style
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}
