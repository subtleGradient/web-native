// @ts-check

import { expect } from "chai"
import "./define.js"

const html = String.raw

describe("base-switch", () => {
  afterEach(() => {
    document.querySelectorAll("[data-test-root]").forEach((element) => element.remove())
  })

  it("initializes switch semantics with off state", () => {
    const toggle = mountSwitch(html`<base-switch>Notifications</base-switch>`)

    expect(toggle.getAttribute("role")).to.equal("switch")
    expect(toggle.getAttribute("tabindex")).to.equal("0")
    expect(toggle.getAttribute("aria-checked")).to.equal("false")
    expect(toggle.getAttribute("data-state")).to.equal("unchecked")
    expect(toggle.checked).to.equal(false)
    expect(toggle.hasAttribute("data-unchecked")).to.equal(true)
  })

  it("reflects checked, disabled, focusable, and active states", () => {
    const toggle = mountSwitch(html`<base-switch></base-switch>`)

    toggle.checked = true
    expect(toggle.getAttribute("aria-checked")).to.equal("true")
    expect(toggle.getAttribute("data-state")).to.equal("checked")
    expect(toggle.hasAttribute("data-checked")).to.equal(true)

    toggle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }))
    expect(toggle.hasAttribute("data-active")).to.equal(true)

    toggle.disabled = true
    expect(toggle.getAttribute("aria-disabled")).to.equal("true")
    expect(toggle.getAttribute("tabindex")).to.equal("-1")
    expect(toggle.hasAttribute("data-disabled")).to.equal(true)
    expect(toggle.hasAttribute("data-active")).to.equal(false)
  })

  it("toggles checked state from click and dispatches a cancelable event", () => {
    const toggle = mountSwitch(html`<base-switch></base-switch>`)
    /** @type {{ checked: boolean, previousChecked: boolean, reason: string } | undefined} */
    let detail
    let cancelable = false
    let bubbles = false
    let composed = false

    toggle.addEventListener("base-ui:checked-change", (event) => {
      const customEvent = /** @type {CustomEvent<{ checked: boolean, previousChecked: boolean, reason: string }>} */ (event)
      detail = customEvent.detail
      cancelable = event.cancelable
      bubbles = event.bubbles
      composed = event.composed
    })

    toggle.click()

    expect(detail).to.deep.equal({ checked: true, previousChecked: false, reason: "none" })
    expect(cancelable).to.equal(true)
    expect(bubbles).to.equal(true)
    expect(composed).to.equal(true)
    expect(toggle.checked).to.equal(true)
    expect(toggle.getAttribute("aria-checked")).to.equal("true")
  })

  it("does not commit a canceled checked change", () => {
    const toggle = mountSwitch(html`<base-switch></base-switch>`)

    toggle.addEventListener("base-ui:checked-change", (event) => event.preventDefault())
    toggle.click()

    expect(toggle.checked).to.equal(false)
    expect(toggle.getAttribute("aria-checked")).to.equal("false")
  })

  it("supports Space and Enter keyboard activation", () => {
    const toggle = mountSwitch(html`<base-switch></base-switch>`)
    const space = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: " " })
    const spaceUp = new KeyboardEvent("keyup", { bubbles: true, cancelable: true, key: " " })
    const enter = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" })

    toggle.dispatchEvent(space)
    expect(space.defaultPrevented).to.equal(true)
    expect(toggle.checked).to.equal(false)
    expect(toggle.hasAttribute("data-active")).to.equal(true)

    toggle.dispatchEvent(space)
    expect(toggle.checked).to.equal(false)

    toggle.dispatchEvent(spaceUp)
    expect(toggle.checked).to.equal(true)
    expect(toggle.hasAttribute("data-active")).to.equal(false)

    toggle.dispatchEvent(enter)
    expect(enter.defaultPrevented).to.equal(true)
    expect(toggle.checked).to.equal(false)
  })

  it("ignores pointer and keyboard activation while disabled", () => {
    const toggle = mountSwitch(html`<base-switch disabled></base-switch>`)
    let events = 0
    let clicks = 0

    toggle.addEventListener("base-ui:checked-change", () => {
      events += 1
    })
    toggle.addEventListener("click", () => {
      clicks += 1
    })

    toggle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }))
    toggle.click()
    toggle.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" }))

    expect(events).to.equal(0)
    expect(clicks).to.equal(0)
    expect(toggle.checked).to.equal(false)
    expect(toggle.hasAttribute("data-active")).to.equal(false)
  })

  it("participates in forms as a required switch", () => {
    const form = /** @type {HTMLFormElement} */ (mount(html`
      <form>
        <base-switch name="alerts" value="enabled" required>Email alerts</base-switch>
      </form>
    `).firstElementChild)
    const toggle = /** @type {import("./index.js").BaseSwitch} */ (form.querySelector("base-switch"))

    expect(new FormData(form).has("alerts")).to.equal(false)
    expect(toggle.matches(":invalid")).to.equal(true)

    toggle.click()

    expect(new FormData(form).get("alerts")).to.equal("enabled")
    expect(toggle.matches(":valid")).to.equal(true)

    form.reset()

    expect(toggle.checked).to.equal(false)
    expect(new FormData(form).has("alerts")).to.equal(false)
  })

  it("does not duplicate listeners after reconnecting", () => {
    const root = mount(html`<base-switch></base-switch>`)
    const toggle = /** @type {import("./index.js").BaseSwitch} */ (root.firstElementChild)
    let events = 0

    toggle.addEventListener("base-ui:checked-change", () => {
      events += 1
    })

    toggle.remove()
    root.append(toggle)
    toggle.click()

    expect(events).to.equal(1)
    expect(toggle.checked).to.equal(true)
  })

  it("passes automated accessibility checks", async () => {
    const root = mount(html`
      <base-switch>Email notifications</base-switch>
      <base-switch checked>Marketing updates</base-switch>
      <base-switch disabled>Disabled option</base-switch>
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

/** @param {string} html */
function mountSwitch(html) {
  return /** @type {import("./index.js").BaseSwitch} */ (mount(html).firstElementChild)
}

/** @param {Element} element */
async function expectNoAxeViolations(element) {
  const axe = /** @type {{ run(element: Element): Promise<{ violations: { id: string, impact: string | null }[] }> }} */ (Reflect.get(globalThis, "axe"))
  const results = await axe.run(element)
  const seriousViolations = results.violations.filter((violation) => violation.impact !== "minor")

  expect(seriousViolations.map((violation) => violation.id)).to.deep.equal([])
}
