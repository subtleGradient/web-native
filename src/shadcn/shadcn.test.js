// @ts-check

import { expect } from "chai"
import "./define.js"

const html = String.raw

describe("shadcn web components", () => {
  afterEach(() => {
    document.querySelectorAll("[data-test-root]").forEach((element) => element.remove())
  })

  it("applies button slots, variant classes, and button-like semantics", () => {
    const root = mount(html`<shadcn-button variant="outline" size="sm">Save</shadcn-button>`)
    const button = /** @type {import("./button/index.js").ShadcnButton} */ (root.firstElementChild)

    expect(button.getAttribute("data-slot")).to.equal("button")
    expect(button.getAttribute("data-variant")).to.equal("outline")
    expect(button.getAttribute("data-size")).to.equal("sm")
    expect(button.classList.contains("cn-button-variant-outline")).to.equal(true)
    expect(button.classList.contains("cn-button-size-sm")).to.equal(true)
    expect(button.getAttribute("role")).to.equal("button")
  })

  it("updates button variant and size classes without keeping stale generated classes", () => {
    const root = mount(html`<shadcn-button variant="outline" size="sm">Save</shadcn-button>`)
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
    const root = mount(html`<shadcn-button>Save</shadcn-button>`)
    const button = /** @type {import("./button/index.js").ShadcnButton} */ (root.firstElementChild)
    let clicks = 0

    button.addEventListener("click", () => {
      clicks += 1
    })

    button.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: " " }))
    expect(clicks).to.equal(0)

    button.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, cancelable: true, key: " " }))
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
    const root = mount(html`<shadcn-toggle>Bold</shadcn-toggle>`)
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
    const root = mount(html`<shadcn-toggle>Bold</shadcn-toggle>`)
    const toggle = /** @type {import("./toggle/index.js").ShadcnToggle} */ (root.firstElementChild)

    toggle.addEventListener("shadcn:pressed-change", (event) => event.preventDefault())
    toggle.click()

    expect(toggle.pressed).to.equal(false)
  })

  it("updates toggle variant and size classes while preserving Base UI state attributes", () => {
    const root = mount(html`<shadcn-toggle variant="outline" size="sm">Bold</shadcn-toggle>`)
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

  it("applies checkbox and switch slots, classes, and Base UI semantics", () => {
    const root = mount(html`
      <shadcn-checkbox size="sm" indeterminate aria-label="Select all"></shadcn-checkbox>
      <shadcn-switch size="lg" checked aria-label="Enable alerts"></shadcn-switch>
    `)
    const checkbox = /** @type {import("./checkbox/index.js").ShadcnCheckbox} */ (root.querySelector("shadcn-checkbox"))
    const switchControl = /** @type {import("./switch/index.js").ShadcnSwitch} */ (root.querySelector("shadcn-switch"))

    expect(checkbox.getAttribute("data-slot")).to.equal("checkbox")
    expect(checkbox.getAttribute("role")).to.equal("checkbox")
    expect(checkbox.getAttribute("aria-checked")).to.equal("mixed")
    expect(checkbox.getAttribute("data-size")).to.equal("sm")
    expect(checkbox.classList.contains("cn-checkbox-size-sm")).to.equal(true)

    expect(switchControl.getAttribute("data-slot")).to.equal("switch")
    expect(switchControl.getAttribute("role")).to.equal("switch")
    expect(switchControl.getAttribute("aria-checked")).to.equal("true")
    expect(switchControl.getAttribute("data-size")).to.equal("lg")
    expect(switchControl.classList.contains("cn-switch-size-lg")).to.equal(true)
  })

  it("exposes shadcn checked events and hides Base UI checkbox and switch events", () => {
    const root = mount(html`
      <shadcn-checkbox aria-label="Accept terms"></shadcn-checkbox>
      <shadcn-switch aria-label="Enable alerts"></shadcn-switch>
    `)
    const checkbox = /** @type {import("./checkbox/index.js").ShadcnCheckbox} */ (root.querySelector("shadcn-checkbox"))
    const switchControl = /** @type {import("./switch/index.js").ShadcnSwitch} */ (root.querySelector("shadcn-switch"))
    let shadcnCheckboxEvents = 0
    let shadcnSwitchEvents = 0
    let baseEvents = 0

    checkbox.addEventListener("shadcn:checked-change", (event) => {
      shadcnCheckboxEvents += 1
      expect(/** @type {CustomEvent<{ checked: boolean, indeterminate: boolean }>} */ (event).detail).to.deep.include({ checked: true, indeterminate: false })
    })
    switchControl.addEventListener("shadcn:checked-change", (event) => {
      shadcnSwitchEvents += 1
      expect(/** @type {CustomEvent<{ checked: boolean }>} */ (event).detail.checked).to.equal(true)
    })
    root.addEventListener("base-ui:checked-change", () => {
      baseEvents += 1
    })

    checkbox.click()
    switchControl.click()

    expect(shadcnCheckboxEvents).to.equal(1)
    expect(shadcnSwitchEvents).to.equal(1)
    expect(baseEvents).to.equal(0)
    expect(checkbox.checked).to.equal(true)
    expect(switchControl.checked).to.equal(true)
  })

  it("lets canceled shadcn checked events block checkbox and switch commits", () => {
    const root = mount(html`
      <shadcn-checkbox aria-label="Accept terms"></shadcn-checkbox>
      <shadcn-switch aria-label="Enable alerts"></shadcn-switch>
    `)
    const checkbox = /** @type {import("./checkbox/index.js").ShadcnCheckbox} */ (root.querySelector("shadcn-checkbox"))
    const switchControl = /** @type {import("./switch/index.js").ShadcnSwitch} */ (root.querySelector("shadcn-switch"))

    checkbox.addEventListener("shadcn:checked-change", (event) => event.preventDefault())
    switchControl.addEventListener("shadcn:checked-change", (event) => event.preventDefault())
    checkbox.click()
    switchControl.click()

    expect(checkbox.checked).to.equal(false)
    expect(switchControl.checked).to.equal(false)
  })

  it("styles checkbox and switch focus, active, checked, and disabled states", async () => {
    await ensureShadcnStyles()

    const root = mount(html`
      <shadcn-checkbox aria-label="Accept terms"></shadcn-checkbox>
      <shadcn-checkbox disabled aria-label="Disabled checkbox"></shadcn-checkbox>
      <shadcn-switch aria-label="Enable alerts"></shadcn-switch>
      <shadcn-switch disabled aria-label="Disabled switch"></shadcn-switch>
    `)
    const checkbox = /** @type {import("./checkbox/index.js").ShadcnCheckbox} */ (root.querySelector("shadcn-checkbox:not([disabled])"))
    const disabledCheckbox = /** @type {HTMLElement} */ (root.querySelector("shadcn-checkbox[disabled]"))
    const switchControl = /** @type {import("./switch/index.js").ShadcnSwitch} */ (root.querySelector("shadcn-switch:not([disabled])"))
    const disabledSwitch = /** @type {HTMLElement} */ (root.querySelector("shadcn-switch[disabled]"))

    expect(getComputedStyle(checkbox).display).to.equal("inline-flex")
    expect(getComputedStyle(switchControl).display).to.equal("inline-flex")
    expect(getComputedStyle(disabledCheckbox).opacity).to.equal("0.5")
    expect(getComputedStyle(disabledSwitch).opacity).to.equal("0.5")

    focusVisible(checkbox)
    await nextFrame()
    expect(document.activeElement).to.equal(checkbox)
    expect(getComputedStyle(checkbox).boxShadow).to.not.equal("none")

    checkbox.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }))
    switchControl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }))
    expect(getComputedStyle(checkbox).transform).to.not.equal("none")
    expect(getComputedStyle(switchControl).transform).to.not.equal("none")

    const switchOffBackground = getComputedStyle(switchControl).backgroundColor
    switchControl.click()
    await nextFrame()
    expect(getComputedStyle(switchControl).backgroundColor).to.not.equal(switchOffBackground)
  })

  it("styles existing button and toggle focus, active, and disabled states", async () => {
    await ensureShadcnStyles()

    const root = mount(html`
      <shadcn-button>Save</shadcn-button>
      <shadcn-button disabled>Disabled</shadcn-button>
      <shadcn-toggle variant="outline">Bold</shadcn-toggle>
      <shadcn-toggle disabled>Disabled toggle</shadcn-toggle>
    `)
    const button = /** @type {import("./button/index.js").ShadcnButton} */ (root.querySelector("shadcn-button:not([disabled])"))
    const disabledButton = /** @type {HTMLElement} */ (root.querySelector("shadcn-button[disabled]"))
    const toggle = /** @type {import("./toggle/index.js").ShadcnToggle} */ (root.querySelector("shadcn-toggle:not([disabled])"))
    const disabledToggle = /** @type {HTMLElement} */ (root.querySelector("shadcn-toggle[disabled]"))

    focusVisible(button)
    await nextFrame()
    expect(document.activeElement).to.equal(button)
    expect(getComputedStyle(button).boxShadow).to.not.equal("none")
    expect(getComputedStyle(disabledButton).opacity).to.equal("0.5")
    expect(getComputedStyle(disabledToggle).opacity).to.equal("0.5")

    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }))
    toggle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }))
    expect(button.hasAttribute("data-active")).to.equal(true)
    expect(toggle.hasAttribute("data-active")).to.equal(true)
    expect(getComputedStyle(button).transform).to.not.equal("none")
    expect(getComputedStyle(toggle).transform).to.not.equal("none")

    toggle.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0 }))
    toggle.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: " " }))
    expect(toggle.pressed).to.equal(false)
    expect(toggle.hasAttribute("data-active")).to.equal(true)

    toggle.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, cancelable: true, key: " " }))
    expect(toggle.pressed).to.equal(true)
    expect(toggle.hasAttribute("data-active")).to.equal(false)
  })

  it("uses Base UI tabs behavior under shadcn tab names", async () => {
    const root = mount(html`
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
    const root = mount(html`
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
    tabs.innerHTML = html`
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
    const root = mount(html`
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
    const root = mount(html`
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

  it("styles vertical line tabs with a vertical list and indicator", async () => {
    await ensureShadcnStyles()

    const root = mount(html`
      <shadcn-tabs value="account" orientation="vertical">
        <shadcn-tabs-list variant="line" aria-label="Settings">
          <shadcn-tabs-trigger value="account">Account</shadcn-tabs-trigger>
          <shadcn-tabs-trigger value="security">Security</shadcn-tabs-trigger>
        </shadcn-tabs-list>
        <shadcn-tabs-content value="account">Account panel</shadcn-tabs-content>
        <shadcn-tabs-content value="security">Security panel</shadcn-tabs-content>
      </shadcn-tabs>
    `)
    const list = /** @type {HTMLElement} */ (root.querySelector("shadcn-tabs-list"))
    const trigger = /** @type {HTMLElement} */ (root.querySelector("shadcn-tabs-trigger"))

    await nextMicrotask()

    expect(getComputedStyle(list).flexDirection).to.equal("column")
    expect(getComputedStyle(list).borderRightWidth).to.equal("1px")
    expect(getComputedStyle(trigger, "::after").width).to.equal("2px")
  })

  it("applies slots and classes to presentational components", () => {
    const root = mount(html`
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
    const root = mount(html`
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

    const root = mount(html`
      <shadcn-button>Save</shadcn-button>
      <shadcn-alert><shadcn-alert-title>Status</shadcn-alert-title></shadcn-alert>
      <shadcn-tabs value="one">
        <shadcn-tabs-list aria-label="Sections">
          <shadcn-tabs-trigger value="one">One</shadcn-tabs-trigger>
        </shadcn-tabs-list>
        <shadcn-tabs-content value="one">One panel</shadcn-tabs-content>
      </shadcn-tabs>
    `)
    const button = /** @type {HTMLElement} */ (root.querySelector("shadcn-button"))
    const alert = /** @type {HTMLElement} */ (root.querySelector("shadcn-alert"))
    const tabs = /** @type {HTMLElement} */ (root.querySelector("shadcn-tabs"))
    const trigger = /** @type {HTMLElement} */ (root.querySelector("shadcn-tabs-trigger"))

    await nextMicrotask()

    expect(getComputedStyle(button).display).to.equal("inline-flex")
    expect(getComputedStyle(alert).boxSizing).to.equal("border-box")
    expect(getComputedStyle(tabs).display).to.equal("flex")
    expect(getComputedStyle(trigger).position).to.equal("relative")
  })

  it("passes automated accessibility checks for a representative shadcn UI", async () => {
    const root = mount(html`
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
          <shadcn-checkbox aria-label="Email receipts"></shadcn-checkbox>
          <shadcn-switch aria-label="Security alerts"></shadcn-switch>
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

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve))
}

/** @param {HTMLElement} element */
function focusVisible(element) {
  Reflect.apply(HTMLElement.prototype.focus, element, [{ focusVisible: true }])
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
