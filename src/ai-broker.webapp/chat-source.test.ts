import { describe, expect, it } from "bun:test"
import { ChatSourceRewriteError, rewriteChatSourceHtml } from "./chat-source.ts"

const html = String.raw

describe("chat source rewriting", () => {
  it("replaces a marker-free topic transcript by id", async () => {
    const input = html`<!doctype html>
<form>
  <ai-chat-app transcript="thread">
    <topic-transcript id="thread" editable>
      <chat-message><pre>Old message</pre></chat-message>
    </topic-transcript>
    <chat-composer></chat-composer>
  </ai-chat-app>
</form>`
    const source = html`<topic-transcript id="thread" editable>
  <chat-message><pre>New message</pre></chat-message>
</topic-transcript>`

    const result = await rewriteChatSourceHtml(input, source)

    expect(result.nextHtml).toContain(source)
    expect(result.nextHtml).toContain("<chat-composer>")
    expect(result.nextHtml).not.toContain("Old message")
  })

  it("replaces the only topic transcript when the source has no id", async () => {
    const input = html`<main>
  <topic-transcript>
    <chat-message><pre>Old message</pre></chat-message>
  </topic-transcript>
</main>`
    const source = html`<topic-transcript>
  <chat-message><pre>New message</pre></chat-message>
</topic-transcript>`

    const result = await rewriteChatSourceHtml(input, source)

    expect(result.nextHtml).toContain(source)
    expect(result.nextHtml).not.toContain("Old message")
  })

  it("replaces only the matching id when the page has multiple transcripts", async () => {
    const input = html`<main>
  <topic-transcript id="one">
    <chat-message><pre>Keep this</pre></chat-message>
  </topic-transcript>
  <topic-transcript id="two">
    <chat-message><pre>Replace this</pre></chat-message>
  </topic-transcript>
</main>`
    const source = html`<topic-transcript id="two">
  <chat-message><pre>New message</pre></chat-message>
</topic-transcript>`

    const result = await rewriteChatSourceHtml(input, source)

    expect(result.nextHtml).toContain("Keep this")
    expect(result.nextHtml).toContain("New message")
    expect(result.nextHtml).not.toContain("Replace this")
  })

  it("rejects an id-less source when the page has multiple transcripts", async () => {
    const input = html`<main>
  <topic-transcript id="one"></topic-transcript>
  <topic-transcript id="two"></topic-transcript>
</main>`
    const source = html`<topic-transcript>
  <chat-message><pre>New message</pre></chat-message>
</topic-transcript>`

    const error = await rejected(rewriteChatSourceHtml(input, source))

    expect(error).toBeInstanceOf(ChatSourceRewriteError)
    expect(error.message).toBe("Multiple matching chat transcripts were found.")
  })

  it("rejects a source id that is missing from the page", async () => {
    const input = html`<main>
  <topic-transcript id="one"></topic-transcript>
</main>`
    const source = html`<topic-transcript id="missing">
  <chat-message><pre>New message</pre></chat-message>
</topic-transcript>`

    const error = await rejected(rewriteChatSourceHtml(input, source))

    expect(error).toBeInstanceOf(ChatSourceRewriteError)
    expect(error.message).toBe("Chat transcript was not found.")
  })
})

async function rejected(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error))
  }
  throw new Error("Expected promise to reject.")
}
