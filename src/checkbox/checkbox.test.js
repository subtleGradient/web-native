// @ts-check

import { expect } from "chai"
import "./define.js"

describe("base-checkbox", () => {
  afterEach(() => {
    document.querySelectorAll("[data-test-root]").forEach((element) => element.remove())
  })

  it("initializes unchecked checkbox semantics", () => {
    const checkbox = mountCheckbox(`<base-checkbox>Accept terms</base-checkbox>`)

    expect(checkbox.getAttribute("role")).to.equal("checkbox")
    expect(checkbox.getAttribute("tabindex")).to.equal("0")
    expect(checkbox.getAttribute("aria-checked")).to.equal("false")
    expect(checkbox.getAttribute("data-state")).to.equal("unchecked")
    expect(checkbox.checked).to.equal(false)
    expect(checkbox.indeterminate).to.equal(false)
    expect(checkbox.hasAttribute("data-unchecked")).to.equal(true)
    expect(checkbox.hasAttribute("data-checked")).to.equal(false)
  })

  it("reflects checked, indeterminate, disabled, focusable, and active states", () => {
    const checkbox = mountCheckbox(`<base-checkbox></base-checkbox>`)

    checkbox.checked = true
    expect(checkbox.getAttribute("aria-checked")).to.equal("true")
    expect(checkbox.getAttribute("data-state")).to.equal("checked")
    expect(checkbox.hasAttribute("data-checked")).to.equal(true)

    checkbox.indeterminate = true
    expect(checkbox.getAttribute("aria-checked")).to.equal("mixed")
    expect(checkbox.getAttribute("data-state")).to.equal("indeterminate")
    expect(checkbox.hasAttribute("data-indeterminate")).to.equal(true)

    checkbox.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }))
    expect(checkbox.hasAttribute("data-active")).to.equal(true)

    checkbox.disabled = true
    expect(checkbox.getAttribute("aria-disabled")).to.equal("true")
    expect(checkbox.getAttribute("tabindex")).to.equal("-1")
    expect(checkbox.hasAttribute("data-disabled")).to.equal(true)
    expect(checkbox.hasAttribute("data-active")).to.equal(false)
  })

  it("toggles checked state from click and dispatches a cancelable event", () => {
    const checkbox = mountCheckbox(`<base-checkbox></base-checkbox>`)
    /** @type {{ checked: boolean, indeterminate: boolean, previousChecked: boolean, previousIndeterminate: boolean, reason: string } | undefined} */
    let detail
    let cancelable = false
    let bubbles = false
    let composed = false

    checkbox.addEventListener("base-ui:checked-change", (event) => {
      const customEvent = /** @type {CustomEvent<{ checked: boolean, indeterminate: boolean, previousChecked: boolean, previousIndeterminate: boolean, reason: string }>} */ (event)
      detail = customEvent.detail
      cancelable = event.cancelable
      bubbles = event.bubbles
      composed = event.composed
    })

    checkbox.click()

    expect(detail).to.deep.equal({
      checked: true,
      indeterminate: false,
      previousChecked: false,
      previousIndeterminate: false,
      reason: "none",
    })
    expect(cancelable).to.equal(true)
    expect(bubbles).to.equal(true)
    expect(composed).to.equal(true)
    expect(checkbox.checked).to.equal(true)
    expect(checkbox.getAttribute("aria-checked")).to.equal("true")
  })

  it("does not commit a canceled checked change", () => {
    const checkbox = mountCheckbox(`<base-checkbox></base-checkbox>`)

    checkbox.addEventListener("base-ui:checked-change", (event) => event.preventDefault())
    checkbox.click()

    expect(checkbox.checked).to.equal(false)
    expect(checkbox.getAttribute("aria-checked")).to.equal("false")
  })

  it("converts indeterminate state to checked on user activation", () => {
    const checkbox = mountCheckbox(`<base-checkbox indeterminate></base-checkbox>`)
    /** @type {{ checked: boolean, indeterminate: boolean, previousChecked: boolean, previousIndeterminate: boolean } | undefined} */
    let detail

    checkbox.addEventListener("base-ui:checked-change", (event) => {
      detail = /** @type {CustomEvent<{ checked: boolean, indeterminate: boolean, previousChecked: boolean, previousIndeterminate: boolean }>} */ (event).detail
    })

    checkbox.click()

    expect(detail).to.deep.include({
      checked: true,
      indeterminate: false,
      previousChecked: false,
      previousIndeterminate: true,
    })
    expect(checkbox.checked).to.equal(true)
    expect(checkbox.indeterminate).to.equal(false)
    expect(checkbox.getAttribute("aria-checked")).to.equal("true")
  })

  it("supports Space keyboard activation and ignores Enter", () => {
    const checkbox = mountCheckbox(`<base-checkbox></base-checkbox>`)
    const space = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: " " })
    const enter = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" })

    checkbox.dispatchEvent(space)
    expect(space.defaultPrevented).to.equal(true)
    expect(checkbox.checked).to.equal(true)
    expect(checkbox.hasAttribute("data-active")).to.equal(true)

    checkbox.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: " " }))
    expect(checkbox.hasAttribute("data-active")).to.equal(false)

    checkbox.dispatchEvent(enter)
    expect(enter.defaultPrevented).to.equal(false)
    expect(checkbox.checked).to.equal(true)
  })

  it("ignores pointer and keyboard activation while disabled", () => {
    const checkbox = mountCheckbox(`<base-checkbox disabled></base-checkbox>`)
    let events = 0

    checkbox.addEventListener("base-ui:checked-change", () => {
      events += 1
    })

    checkbox.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }))
    checkbox.click()
    checkbox.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: " " }))

    expect(events).to.equal(0)
    expect(checkbox.checked).to.equal(false)
    expect(checkbox.hasAttribute("data-active")).to.equal(false)
  })

  it("does not duplicate listeners after reconnecting", () => {
    const root = mount(`<base-checkbox></base-checkbox>`)
    const checkbox = /** @type {import("./index.js").BaseCheckbox} */ (root.firstElementChild)
    let events = 0

    checkbox.addEventListener("base-ui:checked-change", () => {
      events += 1
    })

    checkbox.remove()
    root.append(checkbox)
    checkbox.click()

    expect(events).to.equal(1)
    expect(checkbox.checked).to.equal(true)
  })

  it("passes automated accessibility checks", async () => {
    const root = mount(`
      <base-checkbox>Accept terms</base-checkbox>
      <base-checkbox checked>Email updates</base-checkbox>
      <base-checkbox indeterminate>Partially selected</base-checkbox>
      <base-checkbox disabled>Disabled option</base-checkbox>
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
function mountCheckbox(html) {
  return /** @type {import("./index.js").BaseCheckbox} */ (mount(html).firstElementChild)
}

/** @param {Element} element */
async function expectNoAxeViolations(element) {
  const axe = /** @type {{ run(element: Element): Promise<{ violations: { id: string, impact: string | null }[] }> }} */ (Reflect.get(globalThis, "axe"))
  const results = await axe.run(element)
  const seriousViolations = results.violations.filter((violation) => violation.impact !== "minor")

  expect(seriousViolations.map((violation) => violation.id)).to.deep.equal([])
}
