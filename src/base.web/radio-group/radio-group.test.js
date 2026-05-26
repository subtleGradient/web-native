// @ts-check

import { expect } from "chai"
import "./define.js"

const html = String.raw

describe("base-radio-group", () => {
  afterEach(() => {
    document.querySelectorAll("[data-test-root]").forEach((element) => element.remove())
  })

  it("initializes radio group semantics and selected state", () => {
    const group = mountGroup(html`
      <base-radio-group value="email" aria-label="Contact method">
        <base-radio value="email">Email</base-radio>
        <base-radio value="sms">SMS</base-radio>
      </base-radio-group>
    `)
    const radios = getRadios(group)

    expect(group.getAttribute("role")).to.equal("radiogroup")
    expect(group.getAttribute("data-orientation")).to.equal("horizontal")
    expect(radios[0].getAttribute("role")).to.equal("radio")
    expect(radios[0].getAttribute("aria-checked")).to.equal("true")
    expect(radios[0].getAttribute("tabindex")).to.equal("0")
    expect(radios[1].getAttribute("aria-checked")).to.equal("false")
    expect(radios[1].getAttribute("tabindex")).to.equal("-1")
  })

  it("dispatches a cancelable value change before committing clicks", () => {
    const group = mountGroup(html`
      <base-radio-group value="email" aria-label="Contact method">
        <base-radio value="email">Email</base-radio>
        <base-radio value="sms">SMS</base-radio>
      </base-radio-group>
    `)
    const sms = getRadios(group)[1]
    /** @type {{ value: string, previousValue: string | null, reason: string } | undefined} */
    let detail

    group.addEventListener("base-ui:value-change", (event) => {
      detail = /** @type {CustomEvent<{ value: string, previousValue: string | null, reason: string }>} */ (event).detail
      expect(event.cancelable).to.equal(true)
      expect(event.bubbles).to.equal(true)
      expect(event.composed).to.equal(true)
    })

    sms.click()

    expect(detail).to.deep.equal({ value: "sms", previousValue: "email", reason: "none" })
    expect(group.value).to.equal("sms")
    expect(sms.getAttribute("aria-checked")).to.equal("true")

    group.addEventListener("base-ui:value-change", (event) => event.preventDefault(), { once: true })
    getRadios(group)[0].click()

    expect(group.value).to.equal("sms")
  })

  it("supports roving arrow, home/end, and space keyboard selection", () => {
    const group = mountGroup(html`
      <base-radio-group value="email" aria-label="Contact method">
        <base-radio value="email">Email</base-radio>
        <base-radio value="sms" disabled>SMS</base-radio>
        <base-radio value="phone">Phone</base-radio>
      </base-radio-group>
    `)
    const [email, , phone] = getRadios(group)

    email.focus()
    email.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowRight" }))

    expect(document.activeElement).to.equal(phone)
    expect(group.value).to.equal("phone")

    phone.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowRight" }))
    expect(document.activeElement).to.equal(email)
    expect(group.value).to.equal("email")

    email.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "End" }))
    expect(document.activeElement).to.equal(phone)

    phone.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: " " }))
    expect(group.value).to.equal("phone")
  })

  it("blocks disabled and readonly user changes", () => {
    const group = mountGroup(html`
      <base-radio-group value="email" readonly aria-label="Contact method">
        <base-radio value="email">Email</base-radio>
        <base-radio value="sms">SMS</base-radio>
      </base-radio-group>
    `)

    getRadios(group)[1].click()
    expect(group.value).to.equal("email")

    group.readonly = false
    group.disabled = true
    getRadios(group)[1].click()

    expect(group.value).to.equal("email")
    expect(group.getAttribute("aria-disabled")).to.equal("true")
  })

  it("participates in forms with required validity and reset", () => {
    const form = /** @type {HTMLFormElement} */ (mount(html`
      <form>
        <base-radio-group name="method" value="email" required aria-label="Contact method">
          <base-radio value="email">Email</base-radio>
          <base-radio value="sms">SMS</base-radio>
        </base-radio-group>
      </form>
    `).firstElementChild)
    const group = /** @type {import("./radio-group.js").BaseRadioGroup} */ (form.querySelector("base-radio-group"))

    expect(new FormData(form).get("method")).to.equal("email")
    group.value = null
    expect(new FormData(form).has("method")).to.equal(false)
    expect(group.matches(":invalid")).to.equal(true)

    getRadios(group)[1].click()
    expect(new FormData(form).get("method")).to.equal("sms")
    expect(group.matches(":valid")).to.equal(true)

    form.reset()
    expect(group.value).to.equal("email")
    expect(new FormData(form).get("method")).to.equal("email")
  })

  it("passes automated accessibility checks", async () => {
    const root = mount(html`
      <base-radio-group value="email" aria-label="Contact method">
        <base-radio value="email">Email</base-radio>
        <base-radio value="sms">SMS</base-radio>
      </base-radio-group>
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
function mountGroup(html) {
  return /** @type {import("./radio-group.js").BaseRadioGroup} */ (mount(html).firstElementChild)
}

/** @param {import("./radio-group.js").BaseRadioGroup} group */
function getRadios(group) {
  return /** @type {import("./radio-group.js").BaseRadio[]} */ (Array.from(group.querySelectorAll("base-radio")))
}

/** @param {Element} element */
async function expectNoAxeViolations(element) {
  const axe = /** @type {{ run(element: Element): Promise<{ violations: { id: string, impact: string | null }[] }> }} */ (Reflect.get(globalThis, "axe"))
  const results = await axe.run(element)
  const seriousViolations = results.violations.filter((violation) => violation.impact !== "minor")

  expect(seriousViolations.map((violation) => violation.id)).to.deep.equal([])
}
