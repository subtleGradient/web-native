// @ts-check

import { expect } from "chai"
import "./define.js"

describe("base-toggle", () => {
  afterEach(() => {
    document.querySelectorAll("[data-test-root]").forEach((element) => element.remove())
  })

  it("initializes the host with button semantics", () => {
    const toggle = mountToggle("<base-toggle>Bold</base-toggle>")

    expect(toggle.getAttribute("role")).to.equal("button")
    expect(toggle.getAttribute("tabindex")).to.equal("0")
    expect(toggle.getAttribute("aria-pressed")).to.equal("false")
    expect(toggle.hasAttribute("data-pressed")).to.equal(false)
  })

  it("toggles pressed state and dispatches a cancelable Base UI event", () => {
    const toggle = mountToggle("<base-toggle>Bold</base-toggle>")
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

  it("does not commit a canceled pressed change", () => {
    const toggle = mountToggle("<base-toggle>Bold</base-toggle>")

    toggle.addEventListener("base-ui:pressed-change", (event) => event.preventDefault())
    toggle.click()

    expect(toggle.pressed).to.equal(false)
    expect(toggle.getAttribute("aria-pressed")).to.equal("false")
  })

  it("ignores pointer and keyboard activation while disabled", () => {
    const toggle = mountToggle("<base-toggle disabled>Bold</base-toggle>")
    let calls = 0

    toggle.addEventListener("base-ui:pressed-change", () => {
      calls += 1
    })

    toggle.click()
    toggle.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }))

    expect(calls).to.equal(0)
    expect(toggle.pressed).to.equal(false)
    expect(toggle.hasAttribute("data-disabled")).to.equal(true)
    expect(toggle.getAttribute("aria-disabled")).to.equal("true")
  })

  it("supports Space and Enter keyboard activation", () => {
    const toggle = mountToggle("<base-toggle>Bold</base-toggle>")

    toggle.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: " " }))
    expect(toggle.pressed).to.equal(true)

    toggle.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }))
    expect(toggle.pressed).to.equal(false)
  })
})

/**
 * @param {string} html
 * @returns {import("./toggle.js").BaseToggle}
 */
function mountToggle(html) {
  const root = document.createElement("div")
  root.setAttribute("data-test-root", "")
  root.innerHTML = html
  document.body.append(root)
  return /** @type {import("./toggle.js").BaseToggle} */ (root.firstElementChild)
}
