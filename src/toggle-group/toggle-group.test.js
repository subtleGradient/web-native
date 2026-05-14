// @ts-check

import { expect } from "chai"
import "./define.js"

const html = String.raw

describe("base-toggle-group", () => {
  afterEach(() => {
    document.querySelectorAll("[data-test-root]").forEach((element) => element.remove())
  })

  it("initializes single-value toggle group semantics", () => {
    const group = mountGroup(html`
      <base-toggle-group value="bold" aria-label="Formatting">
        <base-toggle-group-item value="bold">Bold</base-toggle-group-item>
        <base-toggle-group-item value="italic">Italic</base-toggle-group-item>
      </base-toggle-group>
    `)
    const items = getItems(group)

    expect(group.getAttribute("role")).to.equal("group")
    expect(group.getAttribute("data-orientation")).to.equal("horizontal")
    expect(items[0].getAttribute("aria-pressed")).to.equal("true")
    expect(items[0].getAttribute("tabindex")).to.equal("0")
    expect(items[1].getAttribute("aria-pressed")).to.equal("false")
    expect(items[1].getAttribute("tabindex")).to.equal("-1")
    expect(group.values).to.deep.equal(["bold"])
  })

  it("dispatches cancelable value changes for single groups", () => {
    const group = mountGroup(html`
      <base-toggle-group value="bold" aria-label="Formatting">
        <base-toggle-group-item value="bold">Bold</base-toggle-group-item>
        <base-toggle-group-item value="italic">Italic</base-toggle-group-item>
      </base-toggle-group>
    `)
    const italic = getItems(group)[1]
    /** @type {{ value: string[], previousValue: string[], reason: string } | undefined} */
    let detail

    group.addEventListener("base-ui:value-change", (event) => {
      detail = /** @type {CustomEvent<{ value: string[], previousValue: string[], reason: string }>} */ (event).detail
      expect(event.cancelable).to.equal(true)
    })

    italic.click()

    expect(detail).to.deep.equal({ value: ["italic"], previousValue: ["bold"], reason: "none" })
    expect(group.values).to.deep.equal(["italic"])

    group.addEventListener("base-ui:value-change", (event) => event.preventDefault(), { once: true })
    getItems(group)[0].click()

    expect(group.values).to.deep.equal(["italic"])
  })

  it("toggles independent values in multiple mode", () => {
    const group = mountGroup(html`
      <base-toggle-group multiple value="bold" aria-label="Formatting">
        <base-toggle-group-item value="bold">Bold</base-toggle-group-item>
        <base-toggle-group-item value="italic">Italic</base-toggle-group-item>
      </base-toggle-group>
    `)
    const [bold, italic] = getItems(group)

    italic.click()
    expect(group.values).to.deep.equal(["bold", "italic"])
    expect(italic.getAttribute("aria-pressed")).to.equal("true")

    bold.click()
    expect(group.values).to.deep.equal(["italic"])
    expect(bold.getAttribute("aria-pressed")).to.equal("false")
  })

  it("moves roving focus with arrows and activates with keyboard", () => {
    const group = mountGroup(html`
      <base-toggle-group value="bold" aria-label="Formatting">
        <base-toggle-group-item value="bold">Bold</base-toggle-group-item>
        <base-toggle-group-item value="italic" disabled>Italic</base-toggle-group-item>
        <base-toggle-group-item value="underline">Underline</base-toggle-group-item>
      </base-toggle-group>
    `)
    const [bold, , underline] = getItems(group)

    bold.focus()
    bold.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowRight" }))

    expect(document.activeElement).to.equal(underline)
    expect(group.values).to.deep.equal(["bold"])

    underline.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" }))
    expect(group.values).to.deep.equal(["underline"])

    underline.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowRight" }))
    expect(document.activeElement).to.equal(bold)
  })

  it("participates in forms and reset", () => {
    const form = /** @type {HTMLFormElement} */ (mount(html`
      <form>
        <base-toggle-group name="format" multiple value="bold italic" aria-label="Formatting">
          <base-toggle-group-item value="bold">Bold</base-toggle-group-item>
          <base-toggle-group-item value="italic">Italic</base-toggle-group-item>
        </base-toggle-group>
      </form>
    `).firstElementChild)
    const group = /** @type {import("./toggle-group.js").BaseToggleGroup} */ (form.querySelector("base-toggle-group"))

    expect(new FormData(form).get("format")).to.equal("bold italic")

    getItems(group)[0].click()
    expect(new FormData(form).get("format")).to.equal("italic")

    form.reset()
    expect(group.values).to.deep.equal(["bold", "italic"])
    expect(new FormData(form).get("format")).to.equal("bold italic")
  })

  it("passes automated accessibility checks", async () => {
    const root = mount(html`
      <base-toggle-group value="bold" aria-label="Formatting">
        <base-toggle-group-item value="bold">Bold</base-toggle-group-item>
        <base-toggle-group-item value="italic">Italic</base-toggle-group-item>
      </base-toggle-group>
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
function mountGroup(html) {
  return /** @type {import("./toggle-group.js").BaseToggleGroup} */ (mount(html).firstElementChild)
}

/** @param {import("./toggle-group.js").BaseToggleGroup} group */
function getItems(group) {
  return /** @type {import("./toggle-group.js").BaseToggleGroupItem[]} */ (Array.from(group.querySelectorAll("base-toggle-group-item")))
}

/** @param {Element} element */
async function expectNoAxeViolations(element) {
  const axe = /** @type {{ run(element: Element): Promise<{ violations: { id: string, impact: string | null }[] }> }} */ (Reflect.get(globalThis, "axe"))
  const results = await axe.run(element)
  const seriousViolations = results.violations.filter((violation) => violation.impact !== "minor")

  expect(seriousViolations.map((violation) => violation.id)).to.deep.equal([])
}
