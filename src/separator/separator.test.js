// @ts-check

import { expect } from "chai"
import "./define.js"

describe("base-separator", () => {
  afterEach(() => {
    document.querySelectorAll("[data-test-root]").forEach((element) => element.remove())
  })

  it("renders separator semantics with horizontal orientation by default", () => {
    const separator = mountSeparator("<base-separator></base-separator>")

    expect(separator.getAttribute("role")).to.equal("separator")
    expect(separator.getAttribute("aria-orientation")).to.equal("horizontal")
    expect(separator.getAttribute("data-orientation")).to.equal("horizontal")
    expect(separator.orientation).to.equal("horizontal")
  })

  it("reflects vertical orientation", () => {
    const separator = mountSeparator('<base-separator orientation="vertical"></base-separator>')

    expect(separator.getAttribute("aria-orientation")).to.equal("vertical")
    expect(separator.getAttribute("data-orientation")).to.equal("vertical")

    separator.orientation = "horizontal"
    expect(separator.getAttribute("orientation")).to.equal("horizontal")
    expect(separator.getAttribute("aria-orientation")).to.equal("horizontal")
  })

  it("normalizes invalid orientation values to horizontal semantics", () => {
    const separator = mountSeparator('<base-separator orientation="diagonal"></base-separator>')

    expect(separator.orientation).to.equal("horizontal")
    expect(separator.getAttribute("aria-orientation")).to.equal("horizontal")
    expect(separator.getAttribute("data-orientation")).to.equal("horizontal")
  })

  it("updates semantics when the orientation attribute changes after connection", () => {
    const separator = mountSeparator("<base-separator></base-separator>")

    separator.setAttribute("orientation", "vertical")
    expect(separator.orientation).to.equal("vertical")
    expect(separator.getAttribute("aria-orientation")).to.equal("vertical")

    separator.removeAttribute("orientation")
    expect(separator.orientation).to.equal("horizontal")
    expect(separator.getAttribute("aria-orientation")).to.equal("horizontal")
  })

  it("passes automated accessibility checks", async () => {
    const root = mount(`
      <p>Before</p>
      <base-separator></base-separator>
      <p>After</p>
      <base-separator orientation="vertical"></base-separator>
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
 * @returns {import("./separator.js").BaseSeparator}
 */
function mountSeparator(html) {
  const root = mount(html)
  return /** @type {import("./separator.js").BaseSeparator} */ (root.firstElementChild)
}

/** @param {Element} element */
async function expectNoAxeViolations(element) {
  const axe = /** @type {{ run(element: Element): Promise<{ violations: { id: string, impact: string | null }[] }> }} */ (Reflect.get(globalThis, "axe"))
  const results = await axe.run(element)
  const seriousViolations = results.violations.filter((violation) => violation.impact !== "minor")

  expect(seriousViolations.map((violation) => violation.id)).to.deep.equal([])
}
