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

  it("updates button variant and size classes without keeping stale generated classes", () => {
    const root = mount(`<shadcn-button variant="outline" size="sm">Save</shadcn-button>`)
    const button = /** @type {import("./button/index.js").ShadcnButton} */ (root.firstElementChild)

    button.variant = "destructive"
    button.size = "icon"

    expect(button.getAttribute("data-variant")).to.equal("destructive")
    expect(button.getAttribute("data-size")).to.equal("icon")
    expect(button.classList.contains("cn-button-variant-outline")).to.equal(false)
    expect(button.classList.contains("cn-button-variant-destructive")).to.equal(true)
    expect(button.classList.contains("cn-button-size-sm")).to.equal(false)
    expect(button.classList.contains("cn-button-size-icon")).to.equal(true)

    button.variant = "not-a-variant"
    expect(button.getAttribute("variant")).to.equal("default")
    expect(button.classList.contains("cn-button-variant-default")).to.equal(true)
  })

  it("activates button clicks from Space and Enter but suppresses disabled activation", () => {
    const root = mount(`<shadcn-button>Save</shadcn-button>`)
    const button = /** @type {import("./button/index.js").ShadcnButton} */ (root.firstElementChild)
    let clicks = 0

    button.addEventListener("click", () => {
      clicks += 1
    })

    button.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: " " }))
    button.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" }))
    expect(clicks).to.equal(2)

    button.disabled = true
    button.click()
    button.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" }))

    expect(clicks).to.equal(2)
    expect(button.getAttribute("aria-disabled")).to.equal("true")
    expect(button.getAttribute("tabindex")).to.equal("-1")
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

  it("updates toggle variant and size classes while preserving Base UI state attributes", () => {
    const root = mount(`<shadcn-toggle variant="outline" size="sm">Bold</shadcn-toggle>`)
    const toggle = /** @type {import("./toggle/index.js").ShadcnToggle} */ (root.firstElementChild)

    toggle.click()
    toggle.variant = "default"
    toggle.size = "lg"

    expect(toggle.getAttribute("aria-pressed")).to.equal("true")
    expect(toggle.hasAttribute("data-pressed")).to.equal(true)
    expect(toggle.getAttribute("data-variant")).to.equal("default")
    expect(toggle.getAttribute("data-size")).to.equal("lg")
    expect(toggle.classList.contains("cn-toggle-variant-outline")).to.equal(false)
    expect(toggle.classList.contains("cn-toggle-variant-default")).to.equal(true)
    expect(toggle.classList.contains("cn-toggle-size-sm")).to.equal(false)
    expect(toggle.classList.contains("cn-toggle-size-lg")).to.equal(true)
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

  it("hides Base UI tab events and lets canceled shadcn tab events block commits", async () => {
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
    const securityTrigger = /** @type {HTMLElement} */ (tabs.querySelector('shadcn-tabs-trigger[value="security"]'))
    let shadcnEvents = 0
    let baseEvents = 0

    await nextMicrotask()

    tabs.addEventListener("base-ui:value-change", () => {
      baseEvents += 1
    })
    tabs.addEventListener("shadcn:value-change", (event) => {
      shadcnEvents += 1
      event.preventDefault()
    })

    securityTrigger.click()

    expect(shadcnEvents).to.equal(1)
    expect(baseEvents).to.equal(0)
    expect(tabs.value).to.equal("account")
  })

  it("translates automatic initial selection to a non-cancelable shadcn event", async () => {
    const root = mount("")
    const tabs = /** @type {import("./tabs/index.js").ShadcnTabs} */ (document.createElement("shadcn-tabs"))
    /** @type {{ value: string | null, previousValue: string | null, reason: string } | undefined} */
    let detail
    let cancelable = true

    tabs.addEventListener("shadcn:value-change", (event) => {
      cancelable = event.cancelable
      event.preventDefault()
      detail = /** @type {CustomEvent<{ value: string | null, previousValue: string | null, reason: string }>} */ (event).detail
    })

    root.append(tabs)
    tabs.innerHTML = `
        <shadcn-tabs-list variant="line" aria-label="Settings">
          <shadcn-tabs-trigger value="account">Account</shadcn-tabs-trigger>
          <shadcn-tabs-trigger value="security">Security</shadcn-tabs-trigger>
        </shadcn-tabs-list>
        <shadcn-tabs-content value="account">Account panel</shadcn-tabs-content>
        <shadcn-tabs-content value="security">Security panel</shadcn-tabs-content>
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

  it("keeps shadcn tab variants on the list while Base UI updates orientation state", async () => {
    const root = mount(`
      <shadcn-tabs value="account" orientation="vertical">
        <shadcn-tabs-list variant="line" aria-label="Settings">
          <shadcn-tabs-trigger value="account">Account</shadcn-tabs-trigger>
          <shadcn-tabs-trigger value="security">Security</shadcn-tabs-trigger>
        </shadcn-tabs-list>
        <shadcn-tabs-content value="account">Account panel</shadcn-tabs-content>
        <shadcn-tabs-content value="security">Security panel</shadcn-tabs-content>
      </shadcn-tabs>
    `)
    const tabs = /** @type {import("./tabs/index.js").ShadcnTabs} */ (root.firstElementChild)
    const list = /** @type {import("./tabs/index.js").ShadcnTabsList} */ (tabs.querySelector("shadcn-tabs-list"))

    await nextMicrotask()

    expect(tabs.getAttribute("data-orientation")).to.equal("vertical")
    expect(list.getAttribute("aria-orientation")).to.equal("vertical")
    expect(list.getAttribute("data-variant")).to.equal("line")
    expect(list.classList.contains("cn-tabs-list-variant-line")).to.equal(true)

    list.variant = "default"
    expect(list.classList.contains("cn-tabs-list-variant-line")).to.equal(false)
    expect(list.classList.contains("cn-tabs-list-variant-default")).to.equal(true)
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

  it("updates presentational variants and generated classes", () => {
    const root = mount(`
      <shadcn-card size="sm"></shadcn-card>
      <shadcn-badge variant="outline">Badge</shadcn-badge>
      <shadcn-alert variant="destructive"></shadcn-alert>
    `)
    const card = /** @type {import("./presentational/index.js").ShadcnCard} */ (root.querySelector("shadcn-card"))
    const badge = /** @type {import("./presentational/index.js").ShadcnBadge} */ (root.querySelector("shadcn-badge"))
    const alert = /** @type {import("./presentational/index.js").ShadcnAlert} */ (root.querySelector("shadcn-alert"))

    expect(card.getAttribute("data-size")).to.equal("sm")
    expect(badge.classList.contains("cn-badge-variant-outline")).to.equal(true)
    expect(alert.classList.contains("cn-alert-variant-destructive")).to.equal(true)

    badge.variant = "secondary"
    alert.variant = "default"

    expect(badge.classList.contains("cn-badge-variant-outline")).to.equal(false)
    expect(badge.classList.contains("cn-badge-variant-secondary")).to.equal(true)
    expect(alert.classList.contains("cn-alert-variant-destructive")).to.equal(false)
    expect(alert.classList.contains("cn-alert-variant-default")).to.equal(true)
  })

  it("loads shadcn CSS without Tailwind and applies usable computed styles", async () => {
    await ensureShadcnStyles()

    const root = mount(`
      <shadcn-button>Save</shadcn-button>
      <shadcn-tabs value="one">
        <shadcn-tabs-list aria-label="Sections">
          <shadcn-tabs-trigger value="one">One</shadcn-tabs-trigger>
        </shadcn-tabs-list>
        <shadcn-tabs-content value="one">One panel</shadcn-tabs-content>
      </shadcn-tabs>
    `)
    const button = /** @type {HTMLElement} */ (root.querySelector("shadcn-button"))
    const tabs = /** @type {HTMLElement} */ (root.querySelector("shadcn-tabs"))
    const trigger = /** @type {HTMLElement} */ (root.querySelector("shadcn-tabs-trigger"))

    await nextMicrotask()

    expect(getComputedStyle(button).display).to.equal("inline-flex")
    expect(getComputedStyle(tabs).display).to.equal("flex")
    expect(getComputedStyle(trigger).position).to.equal("relative")
  })

  it("passes automated accessibility checks for a representative shadcn UI", async () => {
    const root = mount(`
      <shadcn-alert>
        <shadcn-alert-title>Status</shadcn-alert-title>
        <shadcn-alert-description>Everything is working.</shadcn-alert-description>
      </shadcn-alert>
      <shadcn-card>
        <shadcn-card-header>
          <shadcn-card-title>Account settings</shadcn-card-title>
          <shadcn-card-description>Manage account sections.</shadcn-card-description>
        </shadcn-card-header>
        <shadcn-card-content>
          <shadcn-tabs value="account">
            <shadcn-tabs-list aria-label="Settings sections">
              <shadcn-tabs-trigger value="account">Account</shadcn-tabs-trigger>
              <shadcn-tabs-trigger value="security">Security</shadcn-tabs-trigger>
            </shadcn-tabs-list>
            <shadcn-tabs-content value="account">Account settings</shadcn-tabs-content>
            <shadcn-tabs-content value="security">Security settings</shadcn-tabs-content>
          </shadcn-tabs>
        </shadcn-card-content>
        <shadcn-card-footer>
          <shadcn-button>Save</shadcn-button>
          <shadcn-toggle variant="outline">Bold</shadcn-toggle>
        </shadcn-card-footer>
      </shadcn-card>
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

function nextMicrotask() {
  return Promise.resolve()
}

async function ensureShadcnStyles() {
  if (document.querySelector("[data-test-shadcn-styles]")) return

  for (const href of ["/src/shadcn/themes/neutral.css", "/src/shadcn/styles/base-nova.css"]) {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = href
    link.setAttribute("data-test-shadcn-styles", "")
    document.head.append(link)
    await new Promise((resolve, reject) => {
      link.onload = resolve
      link.onerror = reject
    })
  }
}

/** @param {Element} element */
async function expectNoAxeViolations(element) {
  const axe = /** @type {{ run(element: Element): Promise<{ violations: { id: string, impact: string | null }[] }> }} */ (Reflect.get(globalThis, "axe"))
  const results = await axe.run(element)
  const seriousViolations = results.violations.filter((violation) => violation.impact !== "minor")

  expect(seriousViolations.map((violation) => violation.id)).to.deep.equal([])
}
