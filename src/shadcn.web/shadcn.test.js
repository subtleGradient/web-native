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

  it("supports shadcn field, text control, and native select primitives", () => {
    const root = mount(html`
      <form>
        <shadcn-field orientation="horizontal">
          <shadcn-field-label for="email">Email</shadcn-field-label>
          <shadcn-field-content>
            <shadcn-input id="email" name="email" value="tom@example.test" required placeholder="Email"></shadcn-input>
            <shadcn-field-description>Used for receipts.</shadcn-field-description>
          </shadcn-field-content>
        </shadcn-field>
        <shadcn-textarea name="bio" value="Builder"></shadcn-textarea>
        <shadcn-native-select size="sm">
          <select name="status">
            <option value="draft">Draft</option>
            <option value="active" selected>Active</option>
          </select>
        </shadcn-native-select>
      </form>
    `)
    const form = /** @type {HTMLFormElement} */ (root.querySelector("form"))
    const field = /** @type {HTMLElement} */ (root.querySelector("shadcn-field"))
    const label = /** @type {HTMLElement} */ (root.querySelector("shadcn-field-label"))
    const input = /** @type {import("./presentational/index.js").ShadcnInput} */ (root.querySelector("shadcn-input"))
    const inputControl = /** @type {HTMLInputElement} */ (input.querySelector("input"))
    const textarea = /** @type {import("./presentational/index.js").ShadcnTextarea} */ (root.querySelector("shadcn-textarea"))
    const textareaControl = /** @type {HTMLTextAreaElement} */ (textarea.querySelector("textarea"))
    const nativeSelect = /** @type {HTMLElement} */ (root.querySelector("shadcn-native-select"))
    const select = /** @type {HTMLSelectElement} */ (nativeSelect.querySelector("select"))

    expect(field.getAttribute("data-orientation")).to.equal("horizontal")
    expect(label.classList.contains("cn-field-label")).to.equal(true)
    expect(input.getAttribute("data-slot")).to.equal("input-wrapper")
    expect(inputControl.getAttribute("data-slot")).to.equal("input")
    expect(inputControl.classList.contains("cn-input")).to.equal(true)
    expect(textareaControl.classList.contains("cn-textarea")).to.equal(true)
    expect(nativeSelect.getAttribute("data-size")).to.equal("sm")
    expect(select.classList.contains("cn-native-select-size-sm")).to.equal(true)
    expect(new FormData(form).get("email")).to.equal("tom@example.test")
    expect(new FormData(form).get("bio")).to.equal("Builder")
    expect(new FormData(form).get("status")).to.equal("active")

    inputControl.value = "team@example.test"
    inputControl.dispatchEvent(new Event("input", { bubbles: true }))
    textarea.value = "Updated"

    expect(new FormData(form).get("email")).to.equal("team@example.test")
    expect(new FormData(form).get("bio")).to.equal("Updated")
  })

  it("decorates table and avatar component parts", () => {
    const root = mount(html`
      <shadcn-table>
        <table is="shadcn-table-element">
          <caption is="shadcn-table-caption">Deployments</caption>
          <thead is="shadcn-table-header">
            <tr is="shadcn-table-row"><th is="shadcn-table-head">Name</th></tr>
          </thead>
          <tbody is="shadcn-table-body">
            <tr is="shadcn-table-row" data-state="selected"><td is="shadcn-table-cell">Web</td></tr>
          </tbody>
        </table>
      </shadcn-table>
      <shadcn-avatar size="lg">
        <shadcn-avatar-fallback>TN</shadcn-avatar-fallback>
        <shadcn-avatar-badge></shadcn-avatar-badge>
      </shadcn-avatar>
      <shadcn-avatar-group>
        <shadcn-avatar size="sm"><shadcn-avatar-fallback>A</shadcn-avatar-fallback></shadcn-avatar>
        <shadcn-avatar-group-count>+3</shadcn-avatar-group-count>
      </shadcn-avatar-group>
    `)

    expect(root.querySelector("shadcn-table")?.classList.contains("cn-table-container")).to.equal(true)
    expect(root.querySelector("table")?.classList.contains("cn-table")).to.equal(true)
    expect(root.querySelector("tr")?.classList.contains("cn-table-row")).to.equal(true)
    expect(root.querySelector("td")?.getAttribute("data-slot")).to.equal("table-cell")
    expect(root.querySelector("shadcn-avatar")?.classList.contains("cn-avatar-size-lg")).to.equal(true)
    expect(root.querySelector("shadcn-avatar-fallback")?.classList.contains("cn-avatar-fallback")).to.equal(true)
    expect(root.querySelector("shadcn-avatar-group-count")?.getAttribute("data-slot")).to.equal("avatar-group-count")
  })

  it("uses Base UI progress behavior under shadcn progress names", () => {
    const root = mount(html`
      <shadcn-progress value="30" max="60">
        <shadcn-progress-label>Sync</shadcn-progress-label>
        <shadcn-progress-value></shadcn-progress-value>
      </shadcn-progress>
    `)
    const progress = /** @type {import("./progress/index.js").ShadcnProgress} */ (root.querySelector("shadcn-progress"))
    const label = /** @type {HTMLElement} */ (root.querySelector("shadcn-progress-label"))
    const value = /** @type {HTMLElement} */ (root.querySelector("shadcn-progress-value"))
    const track = /** @type {HTMLElement} */ (root.querySelector("shadcn-progress-track"))
    const indicator = /** @type {HTMLElement} */ (root.querySelector("shadcn-progress-indicator"))

    expect(progress.getAttribute("role")).to.equal("progressbar")
    expect(progress.getAttribute("aria-valuetext")).to.equal("50%")
    expect(progress.classList.contains("cn-progress")).to.equal(true)
    expect(label.classList.contains("cn-progress-label")).to.equal(true)
    expect(value.textContent).to.equal("50%")
    expect(track.classList.contains("cn-progress-track")).to.equal(true)
    expect(indicator.classList.contains("cn-progress-indicator")).to.equal(true)
    expect(indicator.style.width).to.equal("50%")
  })

  it("uses Base UI radio group behavior under shadcn radio names", () => {
    const root = mount(html`
      <shadcn-radio-group value="email" aria-label="Contact method">
        <shadcn-radio-group-item value="email">Email</shadcn-radio-group-item>
        <shadcn-radio-group-item value="sms">SMS</shadcn-radio-group-item>
      </shadcn-radio-group>
    `)
    const group = /** @type {import("./radio-group/index.js").ShadcnRadioGroup} */ (root.querySelector("shadcn-radio-group"))
    const items = Array.from(root.querySelectorAll("shadcn-radio-group-item"))
    const sms = /** @type {HTMLElement} */ (items[1])
    let shadcnEvents = 0
    let baseEvents = 0

    group.addEventListener("shadcn:value-change", (event) => {
      shadcnEvents += 1
      expect(/** @type {CustomEvent<{ value: string, previousValue: string | null }>} */ (event).detail).to.deep.include({ value: "sms", previousValue: "email" })
    })
    group.addEventListener("base-ui:value-change", () => {
      baseEvents += 1
    })

    sms.click()

    expect(shadcnEvents).to.equal(1)
    expect(baseEvents).to.equal(0)
    expect(group.value).to.equal("sms")
    expect(group.classList.contains("cn-radio-group")).to.equal(true)
    expect(sms.classList.contains("cn-radio-group-item")).to.equal(true)
    expect(sms.getAttribute("aria-checked")).to.equal("true")
  })

  it("uses Base UI toggle group behavior under shadcn toggle group names", () => {
    const root = mount(html`
      <shadcn-toggle-group multiple value="bold" variant="outline" size="sm" aria-label="Formatting">
        <shadcn-toggle-group-item value="bold">Bold</shadcn-toggle-group-item>
        <shadcn-toggle-group-item value="italic">Italic</shadcn-toggle-group-item>
      </shadcn-toggle-group>
    `)
    const group = /** @type {import("./toggle-group/index.js").ShadcnToggleGroup} */ (root.querySelector("shadcn-toggle-group"))
    const items = Array.from(root.querySelectorAll("shadcn-toggle-group-item"))
    const italic = /** @type {HTMLElement} */ (items[1])
    let shadcnEvents = 0
    let baseEvents = 0

    group.addEventListener("shadcn:value-change", (event) => {
      shadcnEvents += 1
      expect(/** @type {CustomEvent<{ value: string[], previousValue: string[] }>} */ (event).detail).to.deep.include({ value: ["bold", "italic"], previousValue: ["bold"] })
    })
    group.addEventListener("base-ui:value-change", () => {
      baseEvents += 1
    })

    italic.click()

    expect(shadcnEvents).to.equal(1)
    expect(baseEvents).to.equal(0)
    expect(group.values).to.deep.equal(["bold", "italic"])
    expect(group.classList.contains("cn-toggle-group")).to.equal(true)
    expect(italic.classList.contains("cn-toggle-group-item")).to.equal(true)
    expect(italic.classList.contains("cn-toggle-size-sm")).to.equal(true)
    expect(italic.getAttribute("aria-pressed")).to.equal("true")
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

  for (const href of [new URL("themes/neutral.css", import.meta.url).href, new URL("styles/base-nova.css", import.meta.url).href]) {
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
