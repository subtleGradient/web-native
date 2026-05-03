// @ts-check

import { expect } from "chai"
import "./define.js"

describe("base-tabs", () => {
  afterEach(() => {
    document.querySelectorAll("[data-test-root]").forEach((element) => element.remove())
  })

  it("selects the first enabled tab when value is omitted", async () => {
    const tabs = mountTabs(`
      <base-tabs>
        <base-tabs-list aria-label="Settings">
          <base-tab value="account">Account</base-tab>
          <base-tab value="security">Security</base-tab>
        </base-tabs-list>
        <base-tabs-panel value="account">Account panel</base-tabs-panel>
        <base-tabs-panel value="security">Security panel</base-tabs-panel>
      </base-tabs>
    `)

    await nextMicrotask()

    const [accountTab, securityTab] = tabs.tabs
    const [accountPanel, securityPanel] = tabs.panels

    expect(tabs.value).to.equal("account")
    expect(accountTab.getAttribute("aria-selected")).to.equal("true")
    expect(securityTab.getAttribute("aria-selected")).to.equal("false")
    expect(accountPanel.hidden).to.equal(false)
    expect(securityPanel.hidden).to.equal(true)
  })

  it("connects tab and panel ARIA relationships", async () => {
    const tabs = mountTabs(`
      <base-tabs value="account">
        <base-tabs-list aria-label="Settings">
          <base-tab value="account">Account</base-tab>
        </base-tabs-list>
        <base-tabs-panel value="account">Account panel</base-tabs-panel>
      </base-tabs>
    `)

    await nextMicrotask()

    const tab = tabs.tabs[0]
    const panel = tabs.panels[0]

    expect(tab.getAttribute("role")).to.equal("tab")
    expect(panel.getAttribute("role")).to.equal("tabpanel")
    expect(tab.getAttribute("aria-controls")).to.equal(panel.id)
    expect(panel.getAttribute("aria-labelledby")).to.equal(tab.id)
  })

  it("changes value from tab clicks and dispatches a cancelable Base UI event", async () => {
    const tabs = mountTabs(`
      <base-tabs value="account">
        <base-tabs-list aria-label="Settings">
          <base-tab value="account">Account</base-tab>
          <base-tab value="security">Security</base-tab>
        </base-tabs-list>
        <base-tabs-panel value="account">Account panel</base-tabs-panel>
        <base-tabs-panel value="security">Security panel</base-tabs-panel>
      </base-tabs>
    `)
    /** @type {{ value: string | null, previousValue: string | null, reason: string, activationDirection: string } | undefined} */
    let detail

    await nextMicrotask()

    tabs.addEventListener("base-ui:value-change", (event) => {
      expect(event.cancelable).to.equal(true)
      detail = /** @type {CustomEvent<{ value: string | null, previousValue: string | null, reason: string, activationDirection: string }>} */ (event).detail
    })

    tabs.tabs[1].click()

    expect(detail).to.deep.equal({
      value: "security",
      previousValue: "account",
      reason: "none",
      activationDirection: "right",
    })
    expect(tabs.value).to.equal("security")
    expect(tabs.tabs[1].hasAttribute("data-active")).to.equal(true)
    expect(tabs.panels[0].hidden).to.equal(true)
    expect(tabs.panels[1].hidden).to.equal(false)
  })

  it("does not commit a canceled value change", async () => {
    const tabs = mountTabs(`
      <base-tabs value="account">
        <base-tabs-list aria-label="Settings">
          <base-tab value="account">Account</base-tab>
          <base-tab value="security">Security</base-tab>
        </base-tabs-list>
        <base-tabs-panel value="account">Account panel</base-tabs-panel>
        <base-tabs-panel value="security">Security panel</base-tabs-panel>
      </base-tabs>
    `)

    await nextMicrotask()

    tabs.addEventListener("base-ui:value-change", (event) => event.preventDefault())
    tabs.tabs[1].click()

    expect(tabs.value).to.equal("account")
    expect(tabs.tabs[0].hasAttribute("data-active")).to.equal(true)
  })

  it("supports roving focus and manual keyboard activation", async () => {
    const tabs = mountTabs(`
      <base-tabs value="account">
        <base-tabs-list aria-label="Settings">
          <base-tab value="account">Account</base-tab>
          <base-tab value="security">Security</base-tab>
        </base-tabs-list>
        <base-tabs-panel value="account">Account panel</base-tabs-panel>
        <base-tabs-panel value="security">Security panel</base-tabs-panel>
      </base-tabs>
    `)

    await nextMicrotask()

    tabs.tabs[0].focus()
    tabs.tabs[0].dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }))

    expect(document.activeElement).to.equal(tabs.tabs[1])
    expect(tabs.value).to.equal("account")

    tabs.tabs[1].dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }))
    expect(tabs.value).to.equal("security")
  })

  it("supports activate-on-focus keyboard navigation", async () => {
    const tabs = mountTabs(`
      <base-tabs value="account">
        <base-tabs-list aria-label="Settings" activate-on-focus>
          <base-tab value="account">Account</base-tab>
          <base-tab value="security">Security</base-tab>
        </base-tabs-list>
        <base-tabs-panel value="account">Account panel</base-tabs-panel>
        <base-tabs-panel value="security">Security panel</base-tabs-panel>
      </base-tabs>
    `)

    await nextMicrotask()

    tabs.tabs[0].dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }))

    expect(document.activeElement).to.equal(tabs.tabs[1])
    expect(tabs.value).to.equal("security")
  })

  it("supports Home, End, and looping roving focus", async () => {
    const tabs = mountTabs(`
      <base-tabs value="one">
        <base-tabs-list aria-label="Settings">
          <base-tab value="one">One</base-tab>
          <base-tab value="two">Two</base-tab>
          <base-tab value="three">Three</base-tab>
        </base-tabs-list>
        <base-tabs-panel value="one">One panel</base-tabs-panel>
        <base-tabs-panel value="two">Two panel</base-tabs-panel>
        <base-tabs-panel value="three">Three panel</base-tabs-panel>
      </base-tabs>
    `)

    await nextMicrotask()

    tabs.tabs[1].focus()
    tabs.tabs[1].dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "End" }))
    expect(document.activeElement).to.equal(tabs.tabs[2])

    tabs.tabs[2].dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Home" }))
    expect(document.activeElement).to.equal(tabs.tabs[0])

    tabs.tabs[0].dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft" }))
    expect(document.activeElement).to.equal(tabs.tabs[2])
    expect(tabs.value).to.equal("one")
  })

  it("respects loop-focus=false at roving focus boundaries", async () => {
    const tabs = mountTabs(`
      <base-tabs value="one">
        <base-tabs-list aria-label="Settings" loop-focus="false">
          <base-tab value="one">One</base-tab>
          <base-tab value="two">Two</base-tab>
        </base-tabs-list>
        <base-tabs-panel value="one">One panel</base-tabs-panel>
        <base-tabs-panel value="two">Two panel</base-tabs-panel>
      </base-tabs>
    `)

    await nextMicrotask()

    tabs.tabs[0].focus()
    tabs.tabs[0].dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft" }))

    expect(document.activeElement).to.equal(tabs.tabs[0])
  })

  it("uses vertical arrow keys when orientation is vertical", async () => {
    const tabs = mountTabs(`
      <base-tabs value="one" orientation="vertical">
        <base-tabs-list aria-label="Settings">
          <base-tab value="one">One</base-tab>
          <base-tab value="two">Two</base-tab>
        </base-tabs-list>
        <base-tabs-panel value="one">One panel</base-tabs-panel>
        <base-tabs-panel value="two">Two panel</base-tabs-panel>
      </base-tabs>
    `)

    await nextMicrotask()

    const list = tabs.querySelector("base-tabs-list")

    expect(list?.getAttribute("aria-orientation")).to.equal("vertical")
    expect(list?.getAttribute("data-orientation")).to.equal("vertical")

    tabs.tabs[0].focus()
    tabs.tabs[0].dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }))
    expect(document.activeElement).to.equal(tabs.tabs[1])

    tabs.tabs[1].dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowUp" }))
    expect(document.activeElement).to.equal(tabs.tabs[0])
  })

  it("keeps disabled tabs focusable in roving focus but blocks activation", async () => {
    const tabs = mountTabs(`
      <base-tabs value="one">
        <base-tabs-list aria-label="Settings">
          <base-tab value="one">One</base-tab>
          <base-tab value="two" disabled>Two</base-tab>
          <base-tab value="three">Three</base-tab>
        </base-tabs-list>
        <base-tabs-panel value="one">One panel</base-tabs-panel>
        <base-tabs-panel value="two">Two panel</base-tabs-panel>
        <base-tabs-panel value="three">Three panel</base-tabs-panel>
      </base-tabs>
    `)

    await nextMicrotask()

    tabs.tabs[0].focus()
    tabs.tabs[0].dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }))

    expect(document.activeElement).to.equal(tabs.tabs[1])
    expect(tabs.tabs[1].getAttribute("aria-disabled")).to.equal("true")
    expect(tabs.tabs[1].tabIndex).to.equal(0)
    expect(tabs.value).to.equal("one")

    tabs.tabs[1].dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }))
    expect(tabs.value).to.equal("one")

    tabs.tabs[1].dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }))
    expect(document.activeElement).to.equal(tabs.tabs[2])

    tabs.tabs[2].dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: " " }))
    expect(tabs.value).to.equal("three")
  })
})

/**
 * @param {string} html
 * @returns {import("./tabs.js").BaseTabs}
 */
function mountTabs(html) {
  const root = document.createElement("div")
  root.setAttribute("data-test-root", "")
  root.innerHTML = html
  document.body.append(root)
  return /** @type {import("./tabs.js").BaseTabs} */ (root.firstElementChild)
}

function nextMicrotask() {
  return Promise.resolve()
}
