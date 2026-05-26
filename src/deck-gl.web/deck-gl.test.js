// @ts-check

import { expect } from "chai"
import "./define.js"

const html = String.raw

describe("deck-gl components", () => {
  beforeEach(() => {
    MockDeck.instances = []
    Reflect.set(globalThis, "MockDeck", MockDeck)
  })

  afterEach(() => {
    document.querySelectorAll("[data-test-root]").forEach((element) => element.remove())
    for (const name of ["MockDeck", "deckEvents", "deckErrors", "deckLayers", "layerEvents"]) {
      Reflect.deleteProperty(globalThis, name)
    }
  })

  it("runs inline oninit with this bound before deck construction", async () => {
    const layers = [{ id: "points" }]
    Reflect.set(globalThis, "deckLayers", layers)

    const deck = mountDeck(html`
      <deck-gl oninit="this.deckConstructor = MockDeck; this.layers = deckLayers; this.initialViewState = { longitude: -74, latitude: 40.7, zoom: 10 }"></deck-gl>
    `)

    await flushMicrotasks()

    expect(MockDeck.instances).to.have.length(1)
    expect(MockDeck.instances[0].props.layers).to.equal(layers)
    expect(MockDeck.instances[0].props.initialViewState).to.deep.equal({ longitude: -74, latitude: 40.7, zoom: 10 })
    expect(deck.deck).to.equal(MockDeck.instances[0])
  })

  it("supports inline handlers for deck lifecycle and interaction events", async () => {
    Reflect.set(globalThis, "deckEvents", [])
    mountDeck(html`
      <deck-gl
        oninit="this.deckConstructor = MockDeck"
        onload="deckEvents.push(['load', this.localName])"
        ondeckclick="deckEvents.push(['click', event.detail.info.object.name])"
        onhover="deckEvents.push(['hover', event.detail.info.object.name])"
        ondragstart="deckEvents.push(['drag-start', event.detail.info.object.name])"
        ondrag="deckEvents.push(['drag', event.detail.info.object.name])"
        ondragend="deckEvents.push(['drag-end', event.detail.info.object.name])"
        onviewstatechange="deckEvents.push(['view', event.detail.viewState.zoom])"
      ></deck-gl>
    `)

    await flushMicrotasks()

    const instance = MockDeck.instances[0]
    callDeckCallback(instance, "onClick", { object: { name: "Airport" } }, { type: "click" })
    callDeckCallback(instance, "onHover", { object: { name: "Country" } }, { type: "pointermove" })
    callDeckCallback(instance, "onDragStart", { object: { name: "Route" } }, { type: "pointerdown" })
    callDeckCallback(instance, "onDrag", { object: { name: "Route" } }, { type: "pointermove" })
    callDeckCallback(instance, "onDragEnd", { object: { name: "Route" } }, { type: "pointerup" })
    callDeckCallback(instance, "onViewStateChange", { viewState: { zoom: 12 } })

    expect(Reflect.get(globalThis, "deckEvents")).to.deep.equal([
      ["load", "deck-gl"],
      ["click", "Airport"],
      ["hover", "Country"],
      ["drag-start", "Route"],
      ["drag", "Route"],
      ["drag-end", "Route"],
      ["view", 12],
    ])
  })

  it("routes attribute errors through inline onerror", async () => {
    Reflect.set(globalThis, "deckErrors", [])

    const deck = mountDeck(html`
      <deck-gl onerror="deckErrors.push(event.detail.attribute)" initial-view-state="{bad json}"></deck-gl>
    `)
    deck.deckConstructor = MockDeck

    await flushMicrotasks()

    expect(Reflect.get(globalThis, "deckErrors")).to.deep.equal(["initial-view-state"])
    expect(MockDeck.instances[0].props.initialViewState).to.equal(undefined)
  })

  it("supports inline layer visibility handlers and cancellation", async () => {
    Reflect.set(globalThis, "layerEvents", [])
    const list = mountLayerList(html`
      <deck-layer-list onlayervisibilitychange="layerEvents.push([event.detail.id, event.detail.visible]); if (event.detail.id === 'locked') return false"></deck-layer-list>
    `)
    list.items = [
      { id: "airports", label: "Airports", visible: true, count: 120 },
      { id: "locked", label: "Locked layer", visible: true },
    ]

    await flushMicrotasks()

    clickLayerButton(list, "airports")
    clickLayerButton(list, "locked")

    expect(Reflect.get(globalThis, "layerEvents")).to.deep.equal([
      ["airports", false],
      ["locked", false],
    ])
    expect(list.items.find((item) => item.id === "airports")?.visible).to.equal(false)
    expect(list.items.find((item) => item.id === "locked")?.visible).to.equal(true)
  })
})

class MockDeck {
  /** @type {MockDeck[]} */
  static instances = []

  /** @type {Record<string, unknown>} */
  props

  /** @type {Record<string, unknown>[]} */
  setPropsCalls

  finalized

  /** @type {boolean | undefined} */
  redrawForce

  /** @param {Record<string, unknown>} props */
  constructor(props) {
    this.props = { ...props }
    this.setPropsCalls = []
    this.finalized = false
    MockDeck.instances.push(this)

    const onLoad = this.props.onLoad
    if (typeof onLoad === "function") onLoad()
  }

  /** @param {Record<string, unknown>} props */
  setProps(props) {
    this.setPropsCalls.push(props)
    Object.assign(this.props, props)
  }

  /** @param {boolean} [force] */
  redraw(force) {
    this.redrawForce = force
  }

  finalize() {
    this.finalized = true
  }
}

/** @param {string} markup */
function mount(markup) {
  const root = document.createElement("div")
  root.setAttribute("data-test-root", "")
  root.innerHTML = markup
  document.body.append(root)
  return root
}

/** @param {string} markup */
function mountDeck(markup) {
  return /** @type {import("./index.js").DeckGlElement} */ (mount(markup).querySelector("deck-gl"))
}

/** @param {string} markup */
function mountLayerList(markup) {
  return /** @type {import("./index.js").DeckLayerList} */ (mount(markup).querySelector("deck-layer-list"))
}

async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
}

/**
 * @param {MockDeck} instance
 * @param {string} name
 * @param {...unknown} args
 */
function callDeckCallback(instance, name, ...args) {
  const callback = instance.props[name]
  if (typeof callback === "function") callback(...args)
}

/**
 * @param {import("./index.js").DeckLayerList} list
 * @param {string} id
 */
function clickLayerButton(list, id) {
  const button = /** @type {HTMLButtonElement | null} */ (list.shadowRoot?.querySelector(`button[data-layer-id="${id}"]`) ?? null)
  button?.click()
}
