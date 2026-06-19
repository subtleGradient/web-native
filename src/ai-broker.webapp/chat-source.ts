export type ChatSourceRewriteResult = {
  nextHtml: string
  sourceId?: string
}

export class ChatSourceRewriteError extends Error {
  details: Record<string, unknown>
  status: number

  constructor(message: string, options: { details?: Record<string, unknown>, status?: number } = {}) {
    super(message)
    this.name = "ChatSourceRewriteError"
    this.details = options.details ?? {}
    this.status = options.status ?? 500
  }
}

export async function rewriteChatSourceHtml(html: string, source: string): Promise<ChatSourceRewriteResult> {
  const { id } = await readSourceTranscript(source)
  const target = await scanTargetTranscripts(html, id)

  if (target.matchingCount === 0)
    throw new ChatSourceRewriteError("Chat transcript was not found.", {
      details: { sourceId: id, transcriptCount: target.transcriptCount },
    })

  if (target.matchingCount > 1)
    throw new ChatSourceRewriteError("Multiple matching chat transcripts were found.", {
      details: { matchingCount: target.matchingCount, sourceId: id },
    })

  let replaced = false
  const response = new HTMLRewriter()
    .on("topic-transcript", {
      element(element) {
        if (!matchesSourceTranscript(element, id)) return
        replaced = true
        element.before(`\n${source}\n`, { html: true })
        element.remove()
      },
    })
    .transform(new Response(html))

  const nextHtml = await response.text()
  if (!replaced)
    throw new ChatSourceRewriteError("Chat transcript was not replaced.", {
      details: { sourceId: id },
    })

  return { nextHtml, sourceId: id }
}

async function readSourceTranscript(source: string) {
  let count = 0
  let id: string | undefined

  const response = new HTMLRewriter()
    .on("topic-transcript", {
      element(element) {
        count += 1
        if (count === 1) id = element.getAttribute("id") || undefined
      },
    })
    .transform(new Response(source))

  await response.text()

  if (count !== 1)
    throw new ChatSourceRewriteError("save-source expected exactly one topic-transcript HTML element", {
      details: { transcriptCount: count },
      status: 400,
    })

  return { id }
}

async function scanTargetTranscripts(html: string, sourceId: string | undefined) {
  let transcriptCount = 0
  let matchingCount = 0

  const response = new HTMLRewriter()
    .on("topic-transcript", {
      element(element) {
        transcriptCount += 1
        if (matchesSourceTranscript(element, sourceId)) matchingCount += 1
      },
    })
    .transform(new Response(html))

  await response.text()
  return { matchingCount, transcriptCount }
}

type RewriterElement = {
  getAttribute(name: string): string | null
}

function matchesSourceTranscript(element: RewriterElement, sourceId: string | undefined) {
  return sourceId === undefined || element.getAttribute("id") === sourceId
}
