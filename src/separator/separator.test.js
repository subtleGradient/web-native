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
})

/**
 * @param {string} html
 * @returns {import("./separator.js").BaseSeparator}
 */
function mountSeparator(html) {
  const root = document.createElement("div")
  root.setAttribute("data-test-root", "")
  root.innerHTML = html
  document.body.append(root)
  return /** @type {import("./separator.js").BaseSeparator} */ (root.firstElementChild)
}
