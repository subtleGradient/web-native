// @ts-check

import { expect } from "chai"
import "./define.js"

const html = String.raw

describe("base-progress", () => {
  afterEach(() => {
    document.querySelectorAll("[data-test-root]").forEach((element) => element.remove())
  })

  it("renders determinate progress semantics and part state", () => {
    const progress = mountProgress(html`
      <base-progress value="25" min="0" max="50">
        <base-progress-label>Upload</base-progress-label>
        <base-progress-value></base-progress-value>
        <base-progress-track><base-progress-indicator></base-progress-indicator></base-progress-track>
      </base-progress>
    `)
    const label = /** @type {HTMLElement} */ (progress.querySelector("base-progress-label"))
    const value = /** @type {HTMLElement} */ (progress.querySelector("base-progress-value"))
    const indicator = /** @type {HTMLElement} */ (progress.querySelector("base-progress-indicator"))

    expect(progress.getAttribute("role")).to.equal("progressbar")
    expect(progress.getAttribute("aria-valuemin")).to.equal("0")
    expect(progress.getAttribute("aria-valuemax")).to.equal("50")
    expect(progress.getAttribute("aria-valuenow")).to.equal("25")
    expect(progress.getAttribute("aria-valuetext")).to.equal("50%")
    expect(progress.getAttribute("aria-labelledby")).to.equal(label.id)
    expect(progress.hasAttribute("data-progressing")).to.equal(true)
    expect(value.textContent).to.equal("50%")
    expect(value.getAttribute("aria-hidden")).to.equal("true")
    expect(indicator.style.width).to.equal("50%")
  })

  it("updates value, complete, and indeterminate states", () => {
    const progress = mountProgress(html`
      <base-progress value="10" max="20">
        <base-progress-value></base-progress-value>
        <base-progress-track><base-progress-indicator></base-progress-indicator></base-progress-track>
      </base-progress>
    `)
    const value = /** @type {HTMLElement} */ (progress.querySelector("base-progress-value"))
    const indicator = /** @type {HTMLElement} */ (progress.querySelector("base-progress-indicator"))

    progress.value = 20
    expect(progress.hasAttribute("data-complete")).to.equal(true)
    expect(value.textContent).to.equal("100%")
    expect(indicator.style.width).to.equal("100%")

    progress.value = null
    expect(progress.hasAttribute("data-indeterminate")).to.equal(true)
    expect(progress.hasAttribute("aria-valuenow")).to.equal(false)
    expect(value.textContent).to.equal("")
    expect(indicator.style.width).to.equal("")
  })

  it("passes automated accessibility checks", async () => {
    const root = mount(html`
      <base-progress value="70">
        <base-progress-label>Import</base-progress-label>
        <base-progress-value></base-progress-value>
        <base-progress-track><base-progress-indicator></base-progress-indicator></base-progress-track>
      </base-progress>
      <base-progress aria-label="Indeterminate sync">
        <base-progress-track><base-progress-indicator></base-progress-indicator></base-progress-track>
      </base-progress>
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
function mountProgress(html) {
  return /** @type {import("./progress.js").BaseProgress} */ (mount(html).firstElementChild)
}

/** @param {Element} element */
async function expectNoAxeViolations(element) {
  const axe = /** @type {{ run(element: Element): Promise<{ violations: { id: string, impact: string | null }[] }> }} */ (Reflect.get(globalThis, "axe"))
  const results = await axe.run(element)
  const seriousViolations = results.violations.filter((violation) => violation.impact !== "minor")

  expect(seriousViolations.map((violation) => violation.id)).to.deep.equal([])
}
