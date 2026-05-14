// @ts-check

import { projectName } from "web-native/index.js"
import { expect } from "chai"

describe("web-native browser test harness", () => {
  it("loads source modules through the import map", () => {
    expect(projectName).to.equal("web-native")
  })

  it("runs inside a real browser", () => {
    expect(typeof window.customElements.define).to.equal("function")
    expect(document.querySelector("#mocha")).to.not.equal(null)
  })
})
