// @ts-check

import { expect } from "chai"
import "./define.js"

describe("shadcn web components", () => {
  afterEach(() => {
    document.querySelectorAll("[data-test-root]").forEach((element) => element.remove())
  })

  it("applies button slots, variant classes, and button-like semantics", () => {
    const root = mount(`<shadcn-button variant="outline" size="sm">Save</shadcn-button>`)
    const button = /** @type {import("./button/index.js").ShadcnButton} */ (root.firstElementChild)

    expect(button.getAttribute("data-slot")).to.equal("button")
    expect(button.getAttribute("data-variant")).to.equal("outline")
    expect(button.getAttribute("data-size")).to.equal("sm")
    expect(button.classList.contains("cn-button-variant-outline")).to.equal(true)
    expect(button.classList.contains("cn-button-size-sm")).to.equal(true)
    expect(button.getAttribute("role")).to.equal("button")
  })

  it("exposes shadcn toggle events and hides the Base UI event by default", () => {
    const root = mount(`<shadcn-toggle>Bold</shadcn-toggle>`)
    const toggle = /** @type {import("./toggle/index.js").ShadcnToggle} */ (root.firstElementChild)
    let shadcnEvents = 0
    let baseEvents = 0

    toggle.addEventListener("shadcn:pressed-change", (event) => {
      shadcnEvents += 1
      expect(/** @type {CustomEvent<{ pressed: boolean }>} */ (event).detail.pressed).to.equal(true)
    })
    toggle.addEventListener("base-ui:pressed-change", () => {
      baseEvents += 1
    })

    toggle.click()

    expect(shadcnEvents).to.equal(1)
    expect(baseEvents).to.equal(0)
    expect(toggle.pressed).to.equal(true)
    expect(toggle.classList.contains("cn-toggle")).to.equal(true)
  })

  it("lets canceled shadcn toggle events block the Base UI state commit", () => {
    const root = mount(`<shadcn-toggle>Bold</shadcn-toggle>`)
    const toggle = /** @type {import("./toggle/index.js").ShadcnToggle} */ (root.firstElementChild)

    toggle.addEventListener("shadcn:pressed-change", (event) => event.preventDefault())
    toggle.click()

    expect(toggle.pressed).to.equal(false)
  })

  it("uses Base UI tabs behavior under shadcn tab names", async () => {
    const root = mount(`
      <shadcn-tabs value="account">
        <shadcn-tabs-list variant="line" aria-label="Settings">
          <shadcn-tabs-trigger value="account">Account</shadcn-tabs-trigger>
          <shadcn-tabs-trigger value="security">Security</shadcn-tabs-trigger>
        </shadcn-tabs-list>
        <shadcn-tabs-content value="account">Account panel</shadcn-tabs-content>
        <shadcn-tabs-content value="security">Security panel</shadcn-tabs-content>
      </shadcn-tabs>
    `)
    const tabs = /** @type {import("./tabs/index.js").ShadcnTabs} */ (root.firstElementChild)
    await nextMicrotask()

    const triggers = Array.from(tabs.querySelectorAll("shadcn-tabs-trigger"))
    const contents = Array.from(tabs.querySelectorAll("shadcn-tabs-content"))
    let detail

    tabs.addEventListener("shadcn:value-change", (event) => {
      detail = /** @type {CustomEvent<{ value: string | null }>} */ (event).detail
    })

    const securityTrigger = /** @type {HTMLElement} */ (triggers[1])
    securityTrigger.click()

    expect(detail).to.deep.equal({
      value: "security",
      previousValue: "account",
      reason: "none",
      activationDirection: "right",
    })
    expect(tabs.value).to.equal("security")
    expect(triggers[1].hasAttribute("data-active")).to.equal(true)
    expect(/** @type {HTMLElement} */ (contents[0]).hidden).to.equal(true)
    expect(/** @type {HTMLElement} */ (contents[1]).hidden).to.equal(false)
  })

  it("preserves Base UI manual keyboard activation through shadcn tabs", async () => {
    const root = mount(`
      <shadcn-tabs value="account">
        <shadcn-tabs-list variant="line" aria-label="Settings">
          <shadcn-tabs-trigger value="account">Account</shadcn-tabs-trigger>
          <shadcn-tabs-trigger value="security">Security</shadcn-tabs-trigger>
        </shadcn-tabs-list>
        <shadcn-tabs-content value="account">Account panel</shadcn-tabs-content>
        <shadcn-tabs-content value="security">Security panel</shadcn-tabs-content>
      </shadcn-tabs>
    `)
    const tabs = /** @type {import("./tabs/index.js").ShadcnTabs} */ (root.firstElementChild)
    await nextMicrotask()

    const triggers = Array.from(tabs.querySelectorAll("shadcn-tabs-trigger"))
    const accountTrigger = /** @type {HTMLElement} */ (triggers[0])
    const securityTrigger = /** @type {HTMLElement} */ (triggers[1])

    accountTrigger.focus()
    accountTrigger.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }))
    expect(document.activeElement).to.equal(securityTrigger)
    expect(tabs.value).to.equal("account")

    securityTrigger.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }))
    expect(tabs.value).to.equal("security")
  })

  it("applies slots and classes to presentational components", () => {
    const root = mount(`
      <shadcn-card>
        <shadcn-card-header>
          <shadcn-card-title>Card title</shadcn-card-title>
          <shadcn-card-description>Card description</shadcn-card-description>
        </shadcn-card-header>
        <shadcn-card-content>Content</shadcn-card-content>
      </shadcn-card>
      <shadcn-badge variant="secondary">Badge</shadcn-badge>
      <shadcn-alert variant="destructive"><shadcn-alert-title>Alert</shadcn-alert-title></shadcn-alert>
      <shadcn-skeleton></shadcn-skeleton>
      <shadcn-kbd>Esc</shadcn-kbd>
    `)

    expect(root.querySelector("shadcn-card")?.getAttribute("data-slot")).to.equal("card")
    expect(root.querySelector("shadcn-badge")?.classList.contains("cn-badge-variant-secondary")).to.equal(true)
    expect(root.querySelector("shadcn-alert")?.getAttribute("role")).to.equal("alert")
    expect(root.querySelector("shadcn-skeleton")?.getAttribute("aria-hidden")).to.equal("true")
    expect(root.querySelector("shadcn-kbd")?.classList.contains("cn-kbd")).to.equal(true)
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

function nextMicrotask() {
  return Promise.resolve()
}
