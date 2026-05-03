// @ts-check

import { expect } from "chai"
import "./define.js"

const html = String.raw

describe("base-tabs", () => {
  afterEach(() => {
    document.querySelectorAll("[data-test-root]").forEach((element) => element.remove())
  })

  it("selects the first enabled tab when value is omitted", async () => {
    const tabs = mountTabs(html`
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

  it("dispatches a non-cancelable initial value-change for implicit selection", async () => {
    const root = mount("")
    const tabs = /** @type {import("./tabs.js").BaseTabs} */ (document.createElement("base-tabs"))
    /** @type {{ value: string | null, previousValue: string | null, reason: string, activationDirection: string } | undefined} */
    let detail
    let cancelable = true

    tabs.addEventListener("base-ui:value-change", (event) => {
      cancelable = event.cancelable
      event.preventDefault()
      detail = /** @type {CustomEvent<{ value: string | null, previousValue: string | null, reason: string, activationDirection: string }>} */ (event).detail
    })

    root.append(tabs)
    tabs.innerHTML = html`
        <base-tabs-list aria-label="Settings">
          <base-tab value="account">Account</base-tab>
          <base-tab value="security">Security</base-tab>
        </base-tabs-list>
        <base-tabs-panel value="account">Account panel</base-tabs-panel>
        <base-tabs-panel value="security">Security panel</base-tabs-panel>
    `
    await nextMicrotask()

    expect(cancelable).to.equal(false)
    expect(detail).to.deep.equal({
      value: "account",
      previousValue: null,
      reason: "initial",
      activationDirection: "none",
    })
    expect(tabs.value).to.equal("account")
  })

  it("connects tab and panel ARIA relationships", async () => {
    const tabs = mountTabs(html`
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

  it("preserves author-provided ids in ARIA relationships", async () => {
    const tabs = mountTabs(html`
      <base-tabs value="account">
        <base-tabs-list aria-label="Settings">
          <base-tab id="account-tab" value="account">Account</base-tab>
        </base-tabs-list>
        <base-tabs-panel id="account-panel" value="account">Account panel</base-tabs-panel>
      </base-tabs>
    `)

    await nextMicrotask()

    expect(tabs.tabs[0].id).to.equal("account-tab")
    expect(tabs.panels[0].id).to.equal("account-panel")
    expect(tabs.tabs[0].getAttribute("aria-controls")).to.equal("account-panel")
    expect(tabs.panels[0].getAttribute("aria-labelledby")).to.equal("account-tab")
  })

  it("changes value from tab clicks and dispatches a cancelable Base UI event", async () => {
    const tabs = mountTabs(html`
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
    const tabs = mountTabs(html`
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

  it("emits a bubbling and composed value-change event", async () => {
    const root = mount(html`
      <base-tabs value="account">
        <base-tabs-list aria-label="Settings">
          <base-tab value="account">Account</base-tab>
          <base-tab value="security">Security</base-tab>
        </base-tabs-list>
        <base-tabs-panel value="account">Account panel</base-tabs-panel>
        <base-tabs-panel value="security">Security panel</base-tabs-panel>
      </base-tabs>
    `)
    const tabs = /** @type {import("./tabs.js").BaseTabs} */ (root.firstElementChild)
    let reachedParent = false

    await nextMicrotask()

    root.addEventListener("base-ui:value-change", (event) => {
      reachedParent = true
      expect(event.bubbles).to.equal(true)
      expect(event.composed).to.equal(true)
    })

    tabs.tabs[1].click()

    expect(reachedParent).to.equal(true)
  })

  it("supports roving focus and manual keyboard activation", async () => {
    const tabs = mountTabs(html`
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
    const tabs = mountTabs(html`
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
    const tabs = mountTabs(html`
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
    const tabs = mountTabs(html`
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
    const tabs = mountTabs(html`
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
    const tabs = mountTabs(html`
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

  it("falls back when the current tab becomes disabled", async () => {
    const tabs = mountTabs(html`
      <base-tabs value="one">
        <base-tabs-list aria-label="Settings">
          <base-tab value="one">One</base-tab>
          <base-tab value="two">Two</base-tab>
        </base-tabs-list>
        <base-tabs-panel value="one">One panel</base-tabs-panel>
        <base-tabs-panel value="two">Two panel</base-tabs-panel>
      </base-tabs>
    `)
    /** @type {{ value: string | null, previousValue: string | null, reason: string } | undefined} */
    let detail

    await nextMicrotask()

    tabs.addEventListener("base-ui:value-change", (event) => {
      expect(event.cancelable).to.equal(false)
      detail = /** @type {CustomEvent<{ value: string | null, previousValue: string | null, reason: string }>} */ (event).detail
    })

    tabs.tabs[0].disabled = true
    await nextMicrotask()

    expect(detail).to.deep.equal({
      value: "two",
      previousValue: "one",
      reason: "disabled",
      activationDirection: "none",
    })
    expect(tabs.value).to.equal("two")
    expect(tabs.tabs[1].hasAttribute("data-active")).to.equal(true)
  })

  it("falls back when the current tab is removed", async () => {
    const tabs = mountTabs(html`
      <base-tabs value="two">
        <base-tabs-list aria-label="Settings">
          <base-tab value="one">One</base-tab>
          <base-tab value="two">Two</base-tab>
        </base-tabs-list>
        <base-tabs-panel value="one">One panel</base-tabs-panel>
        <base-tabs-panel value="two">Two panel</base-tabs-panel>
      </base-tabs>
    `)
    /** @type {{ value: string | null, previousValue: string | null, reason: string } | undefined} */
    let detail

    await nextMicrotask()

    tabs.addEventListener("base-ui:value-change", (event) => {
      detail = /** @type {CustomEvent<{ value: string | null, previousValue: string | null, reason: string }>} */ (event).detail
    })

    tabs.tabs[1].remove()
    await nextFrame()

    expect(detail).to.deep.equal({
      value: "one",
      previousValue: "two",
      reason: "missing",
      activationDirection: "none",
    })
    expect(tabs.value).to.equal("one")
  })

  it("clears the value when no enabled tabs remain", async () => {
    const tabs = mountTabs(html`
      <base-tabs value="one">
        <base-tabs-list aria-label="Settings">
          <base-tab value="one">One</base-tab>
        </base-tabs-list>
        <base-tabs-panel value="one">One panel</base-tabs-panel>
      </base-tabs>
    `)

    await nextMicrotask()

    tabs.tabs[0].disabled = true
    await nextMicrotask()

    expect(tabs.value).to.equal(null)
    expect(tabs.tabs[0].getAttribute("aria-selected")).to.equal("false")
    expect(tabs.panels[0].hidden).to.equal(true)
  })

  it("updates ARIA relationships when panels are added dynamically", async () => {
    const tabs = mountTabs(html`
      <base-tabs value="one">
        <base-tabs-list aria-label="Settings">
          <base-tab value="one">One</base-tab>
          <base-tab value="two">Two</base-tab>
        </base-tabs-list>
        <base-tabs-panel value="one">One panel</base-tabs-panel>
      </base-tabs>
    `)

    await nextMicrotask()

    const panel = document.createElement("base-tabs-panel")
    panel.setAttribute("value", "two")
    panel.textContent = "Two panel"
    tabs.append(panel)
    await nextMicrotask()

    expect(tabs.tabs[1].getAttribute("aria-controls")).to.equal(panel.id)
    expect(panel.getAttribute("aria-labelledby")).to.equal(tabs.tabs[1].id)
  })

  it("keeps nested tabs isolated from parent tab collections", async () => {
    const tabs = mountTabs(html`
      <base-tabs value="outer-one">
        <base-tabs-list aria-label="Outer">
          <base-tab value="outer-one">Outer one</base-tab>
          <base-tab value="outer-two">Outer two</base-tab>
        </base-tabs-list>
        <base-tabs-panel value="outer-one">
          <base-tabs value="inner-one">
            <base-tabs-list aria-label="Inner">
              <base-tab value="inner-one">Inner one</base-tab>
              <base-tab value="inner-two">Inner two</base-tab>
            </base-tabs-list>
            <base-tabs-panel value="inner-one">Inner one panel</base-tabs-panel>
            <base-tabs-panel value="inner-two">Inner two panel</base-tabs-panel>
          </base-tabs>
        </base-tabs-panel>
        <base-tabs-panel value="outer-two">Outer two panel</base-tabs-panel>
      </base-tabs>
    `)

    await nextMicrotask()

    const innerTabs = /** @type {import("./tabs.js").BaseTabs} */ (tabs.querySelector("base-tabs"))

    expect(tabs.tabs.map((tab) => tab.value)).to.deep.equal(["outer-one", "outer-two"])
    expect(innerTabs.tabs.map((tab) => tab.value)).to.deep.equal(["inner-one", "inner-two"])
  })

  it("maintains tab invariants through deterministic random keyboard navigation", async () => {
    const tabs = mountTabs(html`
      <base-tabs value="a">
        <base-tabs-list aria-label="Letters">
          <base-tab value="a">A</base-tab>
          <base-tab value="b" disabled>B</base-tab>
          <base-tab value="c">C</base-tab>
          <base-tab value="d">D</base-tab>
        </base-tabs-list>
        <base-tabs-panel value="a">A panel</base-tabs-panel>
        <base-tabs-panel value="b">B panel</base-tabs-panel>
        <base-tabs-panel value="c">C panel</base-tabs-panel>
        <base-tabs-panel value="d">D panel</base-tabs-panel>
      </base-tabs>
    `)
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End", "Enter", " "]
    let seed = 13

    await nextMicrotask()
    tabs.tabs[0].focus()

    for (let index = 0; index < 40; index += 1) {
      seed = (seed * 17 + 11) % 97
      const key = keys[seed % keys.length]
      const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : tabs.tabs[0]
      activeElement.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key }))

      const selectedTabs = tabs.tabs.filter((tab) => tab.getAttribute("aria-selected") === "true")
      const activePanels = tabs.panels.filter((panel) => !panel.hidden)
      const tabbableTabs = tabs.tabs.filter((tab) => tab.tabIndex === 0)

      expect(selectedTabs.length).to.equal(1)
      expect(activePanels.length).to.equal(1)
      expect(tabbableTabs.length).to.equal(1)
      expect(activePanels[0].value).to.equal(selectedTabs[0].value)
      expect(tabs.value).to.equal(selectedTabs[0].value)
      expect(tabs.tabs[1].hasAttribute("data-active")).to.equal(false)
    }
  })

  it("passes automated accessibility checks", async () => {
    const root = mount(html`
      <base-tabs value="account">
        <base-tabs-list aria-label="Settings sections">
          <base-tab value="account">Account</base-tab>
          <base-tab value="security">Security</base-tab>
          <base-tab value="billing" disabled>Billing</base-tab>
        </base-tabs-list>
        <base-tabs-panel value="account">Account settings</base-tabs-panel>
        <base-tabs-panel value="security">Security settings</base-tabs-panel>
        <base-tabs-panel value="billing">Billing settings</base-tabs-panel>
      </base-tabs>
    `)

    await nextMicrotask()
    await expectNoAxeViolations(root)
  })
})

/** @param {string} html */
function createRoot(html) {
  const root = document.createElement("div")
  root.setAttribute("data-test-root", "")
  root.innerHTML = html
  return root
}

/** @param {string} html */
function mount(html) {
  const root = createRoot(html)
  document.body.append(root)
  return root
}

/**
 * @param {string} html
 * @returns {import("./tabs.js").BaseTabs}
 */
function mountTabs(html) {
  const root = mount(html)
  return /** @type {import("./tabs.js").BaseTabs} */ (root.firstElementChild)
}

function nextMicrotask() {
  return Promise.resolve()
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve))
}

/** @param {Element} element */
async function expectNoAxeViolations(element) {
  const axe = /** @type {{ run(element: Element): Promise<{ violations: { id: string, impact: string | null }[] }> }} */ (Reflect.get(globalThis, "axe"))
  const results = await axe.run(element)
  const seriousViolations = results.violations.filter((violation) => violation.impact !== "minor")

  expect(seriousViolations.map((violation) => violation.id)).to.deep.equal([])
}
