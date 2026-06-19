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
      <chat-message from="assistant" model="gpt-test" created="2026-05-13T20:40:15.673Z" channel="final">
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
    expect(shadow?.querySelector(".speaker")?.textContent).to.equal("Assistant")
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

  it("makes user and assistant messages visually distinct without noisy metadata", async () => {
    const root = mount(html`
      <topic-transcript>
        <chat-message created="2026-05-13T20:36:49.063Z"><pre>Hello</pre></chat-message>
        <chat-message model="gpt-test" channel="final"><pre>Hi.</pre></chat-message>
      </topic-transcript>
    `)

    await nextFrame()

    const [user, assistant] = Array.from(root.querySelectorAll("chat-message"))
    expect(user?.shadowRoot?.querySelector("article")?.getAttribute("data-kind")).to.equal("user")
    expect(user?.shadowRoot?.querySelector(".speaker")?.textContent).to.equal("You")
    expect(assistant?.shadowRoot?.querySelector("article")?.getAttribute("data-kind")).to.equal("assistant")
    expect(assistant?.shadowRoot?.querySelector(".speaker")?.textContent).to.equal("Assistant")
    expect(assistant?.shadowRoot?.textContent).to.not.include("turn")
    expect(assistant?.shadowRoot?.textContent).to.not.include("gpt-test")
  })

  it("renders tool-call JSON as event summaries instead of raw JSON", async () => {
    const message = mountMessage(html`
      <chat-message from="assistant" recipient="web.run" content-type="code" created="2026-05-13T20:40:15.673Z">
        <pre>{"search_query":[{"q":"Hacker News Who is hiring May 2026 freelance contract remote developer","domains":["news.ycombinator.com"]},{"q":"remote freelance accessibility audit website contractor job"}],"response_length":"medium"}</pre>
      </chat-message>
    `)

    await nextFrame()

    const shadow = message.shadowRoot
    expect(shadow?.querySelector("article")?.getAttribute("data-kind")).to.equal("tool")
    expect(shadow?.querySelector(".tool-name")?.textContent).to.equal("web.run")
    expect(shadow?.querySelector(".tool-status")?.textContent).to.equal("request")
    expect(shadow?.querySelector(".tool-section-title")?.textContent).to.equal("Search Query")
    expect(Array.from(shadow?.querySelectorAll(".tool-item-main") ?? []).map((item) => item.textContent)).to.deep.equal([
      "Hacker News Who is hiring May 2026 freelance contract remote developer",
      "remote freelance accessibility audit website contractor job",
    ])
    expect(shadow?.querySelector(".tool-chip")?.textContent).to.equal("Response Length: medium")
    expect(shadow?.querySelector(".tool-event")?.textContent).to.not.include("{\"search_query\"")
  })

  it("renders chat-summary and topic-transcript shells", async () => {
    const root = mount(html`
      <topic-transcript>
        <header><h1>Topic</h1></header>
        <chat-summary data-previous-href="001-previous.topic.htm" data-previous-title="001 Previous Topic"><p>Previous context.</p></chat-summary>
      </topic-transcript>
    `)

    await nextFrame()

    const transcript = root.querySelector("topic-transcript")
    const summary = root.querySelector("chat-summary")
    expect(transcript?.shadowRoot?.querySelector("slot")).to.not.equal(null)
    expect(summary?.shadowRoot?.textContent).to.include("Previous context.")
    expect(summary?.shadowRoot?.querySelector(".previous-link")?.getAttribute("href")).to.equal("001-previous.topic.htm")
    expect(summary?.shadowRoot?.querySelector(".previous-link")?.textContent).to.equal("Back to 001 Previous Topic")
  })

  it("renders file references without inlining file contents", async () => {
    const message = mountMessage(html`
      <chat-message>
        <pre>Use this file.</pre>
        <a
          rel="enclosure"
          href="../../chat.web/README.md"
          type="text/markdown"
          data-status="available"
          data-current-bytes="1522"
          data-current-sha256="fdcf57be5725345d65b59121cd5f5a34f23d333ee733f997a724838fe991eb1d"
        >src/chat.web/README.md</a>
      </chat-message>
    `)

    await nextFrame()

    const shadow = message.shadowRoot
    expect(shadow?.querySelector("a")?.textContent).to.equal("src/chat.web/README.md")
    expect(shadow?.querySelector("a")?.getAttribute("href")).to.equal("../../chat.web/README.md")
    expect(shadow?.querySelector(".badge")?.textContent).to.equal("available")
    expect(shadow?.querySelector("code")?.textContent).to.equal("../../chat.web/README.md")
    expect(shadow?.textContent).to.include("text/markdown")
    expect(shadow?.textContent).to.include("1.5 KB")
    expect(shadow?.textContent).to.include("fdcf57be5725")
    expect(shadow?.textContent).to.not.include("Plain custom elements for rendering lightweight archived chat transcripts")
  })

  it("normalizes and serializes the semantic transcript source", async () => {
    const transcript = /** @type {import("./chat.js").TopicTranscript} */ (mount(html`
      <topic-transcript editable>
        <chat-message><pre>Hello</pre>
          <a
            rel="enclosure"
            href="../../chat.web/README.md"
            type="text/markdown"
            data-status="available"
            data-current-bytes="123"
            data-current-sha256="abc"
          >src/chat.web/README.md</a>
        </chat-message>
      </topic-transcript>
    `).querySelector("topic-transcript"))

    await nextFrame()

    const assistant = transcript.appendMessage({
      role: "assistant",
      text: "Hi",
      attrs: { model: "gpt-test", "data-streaming": "true" },
    })
    expect(transcript.hasAttribute("data-message-count")).to.equal(false)
    expect(assistant.hasAttribute("data-turn")).to.equal(false)
    expect(assistant.getAttribute("from")).to.equal("assistant")
    expect(transcript.messageText(assistant)).to.equal("Hi")

    transcript.setMessageText(assistant, "Edited")
    const source = transcript.serializeSource()

    expect(source).to.include("<topic-transcript")
    expect(source).to.not.include("data-message-count")
    expect(source).to.not.include("data-start-message")
    expect(source).to.not.include("data-end-message")
    expect(source).to.include("<pre>Edited</pre>")
    expect(source).to.include('rel="enclosure"')
    expect(source).to.not.include("data-source")
    expect(source).to.not.include("data-turn")
    expect(source).to.not.include("data-current-bytes")
    expect(source).to.not.include("data-current-sha256")
    expect(source).to.not.include("data-status")
    expect(source).to.not.include("data-streaming")

    const omittedSource = transcript.serializeSource({ omitMessageIndex: 0 })
    expect(omittedSource).to.not.include("src/chat.web/README.md")
    expect(omittedSource).to.not.include("data-message-count")
  })

  it("emits message action requests from editable transcript messages", async () => {
    const transcript = mount(html`
      <topic-transcript editable>
        <chat-message id="msg-editable" from="user"><pre>Hello</pre></chat-message>
      </topic-transcript>
    `).querySelector("topic-transcript")
    const message = /** @type {HTMLElement} */ (transcript?.querySelector("chat-message"))

    await nextFrame()

    const actions = /** @type {HTMLElement} */ (message.shadowRoot?.querySelector(".message-actions"))
    expect(getComputedStyle(actions).opacity).to.equal("1")
    const edit = once(message, "chat-message-edit-request")
    message.shadowRoot?.querySelector("[data-chat-action='edit']")?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    const editEvent = /** @type {CustomEvent} */ (await edit)

    expect(editEvent.detail.id).to.equal("msg-editable")
    expect(editEvent.detail.message).to.equal(message)
  })

  it("dispatches composer submissions for send and save keyboard paths", async () => {
    const composer = /** @type {import("./chat.js").ChatComposer} */ (mount(html`
      <chat-composer placeholder="Message"></chat-composer>
    `).querySelector("chat-composer"))

    await nextFrame()

    const textarea = /** @type {HTMLTextAreaElement} */ (composer.querySelector("textarea"))
    expect(textarea.form).to.equal(null)
    textarea.value = "Send this"
    const send = once(composer, "chat-composer-submit")
    textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", metaKey: true, bubbles: true }))
    const sendEvent = /** @type {CustomEvent} */ (await send)

    expect(sendEvent.detail).to.deep.equal({ send: true, text: "Send this" })
    expect(textarea.value).to.equal("")

    textarea.value = "Save this"
    const save = once(composer, "chat-composer-submit")
    textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", metaKey: true, altKey: true, bubbles: true }))
    const saveEvent = /** @type {CustomEvent} */ (await save)

    expect(saveEvent.detail).to.deep.equal({ send: false, text: "Save this" })
  })

  it("keeps composer controls in light DOM for native forms", async () => {
    const form = /** @type {HTMLFormElement} */ (mount(html`
      <form action="/v1/responses">
        <chat-composer placeholder="Message">
          <textarea name="message">Hello</textarea>
          <input name="reasoning.effort" value="high" />
          <button name="intent" value="send">Send</button>
        </chat-composer>
      </form>
    `).querySelector("form"))
    const composer = /** @type {import("./chat.js").ChatComposer} */ (form.querySelector("chat-composer"))

    await nextFrame()

    const data = new FormData(form)
    expect(data.get("message")).to.equal("Hello")
    expect(data.get("reasoning.effort")).to.equal("high")
    expect(composer.textarea?.placeholder).to.equal("Message")
  })

  it("dispatches editor saves for the selected message", async () => {
    const root = mount(html`
      <form>
        <chat-message id="msg-edit" from="user"><pre>Original</pre></chat-message>
        <chat-message-editor></chat-message-editor>
      </form>
    `)
    const message = /** @type {HTMLElement} */ (root.querySelector("chat-message"))
    const editor = /** @type {import("./chat.js").ChatMessageEditor} */ (root.querySelector("chat-message-editor"))

    await nextFrame()

    editor.edit(message, "Original")
    expect(editor.shadowRoot?.querySelector("form")).to.equal(null)
    const textarea = /** @type {HTMLTextAreaElement} */ (editor.shadowRoot?.querySelector("textarea"))
    textarea.value = "Changed"
    const saved = once(editor, "chat-editor-save")
    const saveButton = /** @type {HTMLButtonElement} */ (editor.shadowRoot?.querySelector("button[data-primary]"))
    saveButton.click()
    const savedEvent = /** @type {CustomEvent} */ (await saved)

    expect(savedEvent.detail.id).to.equal("msg-edit")
    expect(savedEvent.detail.message).to.equal(message)
    expect(savedEvent.detail.text).to.equal("Changed")
  })

  it("passes automated accessibility checks", async () => {
    const root = mount(html`
      <topic-transcript>
        <header><h1>Topic</h1></header>
        <chat-summary><p>Previous context.</p></chat-summary>
        <chat-message><pre>Hello</pre>
          <a rel="enclosure" href="../../chat.web/README.md" type="text/markdown">src/chat.web/README.md</a>
        </chat-message>
        <chat-message><pre>Hi.</pre></chat-message>
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

/**
 * @param {EventTarget} target
 * @param {string} eventName
 */
function once(target, eventName) {
  return new Promise((resolve) => target.addEventListener(eventName, resolve, { once: true }))
}

/** @param {Element} element */
async function expectNoAxeViolations(element) {
  const axe = /** @type {{ run(element: Element): Promise<{ violations: { id: string, impact: string | null }[] }> }} */ (Reflect.get(globalThis, "axe"))
  const results = await axe.run(element)
  const seriousViolations = results.violations.filter((violation) => violation.impact !== "minor")

  expect(seriousViolations.map((violation) => violation.id)).to.deep.equal([])
}
