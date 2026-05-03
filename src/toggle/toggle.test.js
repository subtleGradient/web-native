// @ts-check

import { expect } from "chai"
import "./define.js"

const html = String.raw

describe("base-toggle", () => {
  afterEach(() => {
    document.querySelectorAll("[data-test-root]").forEach((element) => element.remove())
  })

  it("initializes the host with button semantics", () => {
    const toggle = mountToggle(html`<base-toggle>Bold</base-toggle>`)

    expect(toggle.getAttribute("role")).to.equal("button")
    expect(toggle.getAttribute("tabindex")).to.equal("0")
    expect(toggle.getAttribute("aria-pressed")).to.equal("false")
    expect(toggle.hasAttribute("data-pressed")).to.equal(false)
  })

  it("toggles pressed state and dispatches a cancelable Base UI event", () => {
    const toggle = mountToggle(html`<base-toggle>Bold</base-toggle>`)
    /** @type {{ pressed: boolean, reason: string } | undefined} */
    let detail

    toggle.addEventListener("base-ui:pressed-change", (event) => {
      expect(event.cancelable).to.equal(true)
      detail = /** @type {CustomEvent<{ pressed: boolean, reason: string }>} */ (event).detail
    })

    toggle.click()

    expect(detail).to.deep.equal({ pressed: true, reason: "none" })
    expect(toggle.pressed).to.equal(true)
    expect(toggle.getAttribute("aria-pressed")).to.equal("true")
    expect(toggle.hasAttribute("data-pressed")).to.equal(true)
  })

  it("reflects pressed and disabled properties to ARIA and data attributes", () => {
    const toggle = mountToggle(html`<base-toggle>Bold</base-toggle>`)

    toggle.pressed = true
    expect(toggle.hasAttribute("pressed")).to.equal(true)
    expect(toggle.getAttribute("aria-pressed")).to.equal("true")
    expect(toggle.hasAttribute("data-pressed")).to.equal(true)

    toggle.disabled = true
    expect(toggle.hasAttribute("disabled")).to.equal(true)
    expect(toggle.getAttribute("aria-disabled")).to.equal("true")
    expect(toggle.getAttribute("tabindex")).to.equal("-1")
    expect(toggle.hasAttribute("data-disabled")).to.equal(true)

    toggle.disabled = false
    expect(toggle.hasAttribute("disabled")).to.equal(false)
    expect(toggle.hasAttribute("aria-disabled")).to.equal(false)
    expect(toggle.getAttribute("tabindex")).to.equal("0")
  })

  it("emits a bubbling and composed pressed-change event", () => {
    const root = mount(html`<base-toggle>Bold</base-toggle>`)
    const toggle = /** @type {import("./toggle.js").BaseToggle} */ (root.firstElementChild)
    let reachedParent = false

    root.addEventListener("base-ui:pressed-change", (event) => {
      reachedParent = true
      expect(event.bubbles).to.equal(true)
      expect(event.composed).to.equal(true)
      expect(/** @type {CustomEvent<{ pressed: boolean }>} */ (event).detail.pressed).to.equal(true)
    })

    toggle.click()

    expect(reachedParent).to.equal(true)
  })

  it("does not commit a canceled pressed change", () => {
    const toggle = mountToggle(html`<base-toggle>Bold</base-toggle>`)

    toggle.addEventListener("base-ui:pressed-change", (event) => event.preventDefault())
    toggle.click()

    expect(toggle.pressed).to.equal(false)
    expect(toggle.getAttribute("aria-pressed")).to.equal("false")
  })

  it("does not commit a canceled keyboard pressed change", () => {
    const toggle = mountToggle(html`<base-toggle>Bold</base-toggle>`)
    const keydown = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: " " })
    const keyup = new KeyboardEvent("keyup", { bubbles: true, cancelable: true, key: " " })

    toggle.addEventListener("base-ui:pressed-change", (pressedEvent) => pressedEvent.preventDefault())
    toggle.dispatchEvent(keydown)
    toggle.dispatchEvent(keyup)

    expect(keydown.defaultPrevented).to.equal(true)
    expect(toggle.pressed).to.equal(false)
  })

  it("ignores pointer and keyboard activation while disabled", () => {
    const toggle = mountToggle(html`<base-toggle disabled>Bold</base-toggle>`)
    let calls = 0
    let clicks = 0

    toggle.addEventListener("base-ui:pressed-change", () => {
      calls += 1
    })
    toggle.addEventListener("click", () => {
      clicks += 1
    })

    toggle.click()
    toggle.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }))

    expect(calls).to.equal(0)
    expect(clicks).to.equal(0)
    expect(toggle.pressed).to.equal(false)
    expect(toggle.hasAttribute("data-disabled")).to.equal(true)
    expect(toggle.getAttribute("aria-disabled")).to.equal("true")
  })

  it("supports Space and Enter keyboard activation", () => {
    const toggle = mountToggle(html`<base-toggle>Bold</base-toggle>`)
    const space = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: " " })
    const enter = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" })

    toggle.dispatchEvent(space)
    expect(space.defaultPrevented).to.equal(true)
    expect(toggle.pressed).to.equal(false)

    toggle.dispatchEvent(space)
    expect(toggle.pressed).to.equal(false)

    toggle.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, cancelable: true, key: " " }))
    expect(toggle.pressed).to.equal(true)

    toggle.dispatchEvent(enter)
    expect(enter.defaultPrevented).to.equal(true)
    expect(toggle.pressed).to.equal(false)
  })

  it("ignores non-activation keys", () => {
    const toggle = mountToggle(html`<base-toggle>Bold</base-toggle>`)
    const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowRight" })

    toggle.dispatchEvent(event)

    expect(event.defaultPrevented).to.equal(false)
    expect(toggle.pressed).to.equal(false)
  })

  it("does not duplicate listeners after reconnecting", () => {
    const root = mount(html`<base-toggle>Bold</base-toggle>`)
    const toggle = /** @type {import("./toggle.js").BaseToggle} */ (root.firstElementChild)
    let calls = 0

    toggle.addEventListener("base-ui:pressed-change", () => {
      calls += 1
    })

    toggle.remove()
    root.append(toggle)
    toggle.click()

    expect(calls).to.equal(1)
    expect(toggle.pressed).to.equal(true)
  })

  it("passes automated accessibility checks", async () => {
    const root = mount(html`
      <base-toggle>Bold</base-toggle>
      <base-toggle pressed>Italic</base-toggle>
      <base-toggle disabled>Disabled</base-toggle>
    `)

    await expectNoAxeViolations(root)
  })
})

/** @param {string} html */
function mount(html) {
  const root = document.createElement("div")
  root.setAttribute("data-test-root", "")
  root.innerHTML = html
  document.body.append(root)
  return root
}

/**
 * @param {string} html
 * @returns {import("./toggle.js").BaseToggle}
 */
function mountToggle(html) {
  const root = mount(html)
  return /** @type {import("./toggle.js").BaseToggle} */ (root.firstElementChild)
}

/** @param {Element} element */
async function expectNoAxeViolations(element) {
  const axe = /** @type {{ run(element: Element): Promise<{ violations: { id: string, impact: string | null, nodes: unknown[] }[] }> }} */ (Reflect.get(globalThis, "axe"))
  const results = await axe.run(element)
  const seriousViolations = results.violations.filter((violation) => violation.impact !== "minor")

  expect(seriousViolations.map((violation) => violation.id)).to.deep.equal([])
}
