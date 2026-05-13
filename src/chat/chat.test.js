// @ts-check

import { expect } from "chai"
import "./define.js"

const html = String.raw

describe("chat transcript elements", () => {
  afterEach(() => {
    document.querySelectorAll("[data-test-root]").forEach((element) => element.remove())
  })

  it("renders chat-message metadata and markdown-ish innards", async () => {
    const message = mountMessage(html`
      <chat-message data-turn="42" data-role="assistant" data-model="gpt-test" data-created="2026-05-13T20:40:15.673Z" data-channel="final">
        <pre># Heading

Paragraph with **bold** and &#96;code&#96;.

Citation token citeturn289313search1turn289313search21 and literal &#96;citeturn289313search7&#96;.

- one
- two

| Trait | Value |
|---|---|
| Space | High |

&gt; quoted

&#96;&#96;&#96;js
const ok = true
&#96;&#96;&#96;</pre>
      </chat-message>
    `)

    await nextFrame()

    const shadow = message.shadowRoot
    expect(shadow?.querySelector(".badge")?.textContent).to.equal("assistant")
    expect(shadow?.querySelector("h1")?.textContent).to.equal("Heading")
    expect(shadow?.querySelector(".content strong")?.textContent).to.equal("bold")
    expect(Array.from(shadow?.querySelectorAll(".citation-ref") ?? []).map((ref) => ref.textContent)).to.deep.equal(["1", "21"])
    expect(shadow?.querySelector(".citation")?.getAttribute("data-citation-refs")).to.equal("turn289313search1 turn289313search21")
    expect(shadow?.querySelector(".citation")?.getAttribute("aria-label")).to.equal("Citations: turn289313search1, turn289313search21")
    expect(shadow?.querySelector("code")?.textContent).to.equal("code")
    expect(Array.from(shadow?.querySelectorAll("code") ?? []).some((code) => code.textContent?.includes("turn289313search7"))).to.equal(true)
    expect(shadow?.querySelector("li")?.textContent).to.equal("one")
    expect(shadow?.querySelector("table")?.textContent).to.include("Space")
    expect(shadow?.querySelector("blockquote")?.textContent?.trim()).to.equal("quoted")
    expect(shadow?.querySelector("pre code")?.textContent).to.equal("const ok = true")
  })

  it("renders chat-summary and topic-transcript shells", async () => {
    const root = mount(html`
      <topic-transcript data-index="001">
        <header><h1>Topic</h1></header>
        <chat-summary><p>Previous context.</p></chat-summary>
      </topic-transcript>
    `)

    await nextFrame()

    const transcript = root.querySelector("topic-transcript")
    const summary = root.querySelector("chat-summary")
    expect(transcript?.shadowRoot?.querySelector("slot")).to.not.equal(null)
    expect(summary?.shadowRoot?.textContent).to.include("Previous context.")
  })

  it("passes automated accessibility checks", async () => {
    const root = mount(html`
      <topic-transcript>
        <header><h1>Topic</h1></header>
        <chat-summary><p>Previous context.</p></chat-summary>
        <chat-message data-turn="1" data-role="user"><pre>Hello</pre></chat-message>
        <chat-message data-turn="2" data-role="assistant"><pre>Hi.</pre></chat-message>
      </topic-transcript>
    `)

    await nextFrame()
    await expectNoAxeViolations(root)
  })
})

/** @param {string} markup */
function mount(markup) {
  const root = document.createElement("div")
  root.setAttribute("data-test-root", "")
  root.innerHTML = markup
  document.body.append(root)
  return root
}

/** @param {string} markup */
function mountMessage(markup) {
  return /** @type {import("./chat.js").ChatMessage} */ (mount(markup).querySelector("chat-message"))
}

async function nextFrame() {
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await new Promise((resolve) => requestAnimationFrame(resolve))
}

/** @param {Element} element */
async function expectNoAxeViolations(element) {
  const axe = /** @type {{ run(element: Element): Promise<{ violations: { id: string, impact: string | null }[] }> }} */ (Reflect.get(globalThis, "axe"))
  const results = await axe.run(element)
  const seriousViolations = results.violations.filter((violation) => violation.impact !== "minor")

  expect(seriousViolations.map((violation) => violation.id)).to.deep.equal([])
}
