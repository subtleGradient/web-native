import { statSync, watch, type FSWatcher } from "node:fs"
import path from "node:path"

type StaticServerOptions = {
  root: string
  port: number
  defaultPath?: string
  liveReload?: boolean
  transformHtml?: (html: string, filePath: string) => Promise<string> | string
}

const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".wasm", "application/wasm"],
])

export function serveStatic({ root, port, defaultPath = "/test/index.html", liveReload = false, transformHtml }: StaticServerOptions) {
  const rootPath = path.resolve(root)
  const reloadClients = new Set<ReadableStreamDefaultController<string>>()
  let watcher: FSWatcher | undefined

  if (liveReload) {
    try {
      watcher = watch(rootPath, { recursive: true }, (_event, filename) => {
        if (!filename || String(filename).startsWith(".git/")) return
        for (const client of reloadClients) client.enqueue("event: reload\ndata: changed\n\n")
      })
    } catch {
      watcher = undefined
    }
  }

  const server = Bun.serve({
    port,
    async fetch(request) {
      const url = new URL(request.url)
      let pathname = url.pathname

      try {
        pathname = decodeURIComponent(pathname)
      } catch {
        return new Response("Bad request", { status: 400 })
      }

      if (liveReload && pathname === "/__web-native-dev/events") {
        let streamController: ReadableStreamDefaultController<string> | undefined
        const stream = new ReadableStream<string>({
          start(controller) {
            streamController = controller
            reloadClients.add(controller)
            controller.enqueue("event: ready\ndata: ready\n\n")
          },
          cancel() {
            if (streamController) reloadClients.delete(streamController)
          },
        })

        return new Response(stream, {
          headers: {
            "cache-control": "no-store",
            "content-type": "text/event-stream; charset=utf-8",
          },
        })
      }

      if (pathname === "/") pathname = defaultPath
      if (pathname.endsWith("/")) pathname += "index.html"

      const filePath = resolvePublicPath(rootPath, pathname)
      if (!filePath) return new Response("Not found", { status: 404 })

      const file = Bun.file(filePath)
      if (!(await file.exists())) return new Response("Not found", { status: 404 })

      const contentType = MIME_TYPES.get(path.extname(filePath)) ?? "application/octet-stream"

      if (path.extname(filePath) === ".html" && transformHtml) {
        const source = await file.text()
        const transformed = await transformHtml(source, filePath)
        const body = liveReload ? injectLiveReloadClient(transformed) : transformed
        return new Response(body, { headers: { "cache-control": "no-store", "content-type": contentType } })
      }

      return new Response(file, { headers: { "content-type": contentType } })
    },
  })

  return {
    hostname: server.hostname,
    port: server.port,
    stop(closeActiveConnections?: boolean) {
      watcher?.close()
      return server.stop(closeActiveConnections)
    },
  }
}

function resolvePublicPath(rootPath: string, pathname: string) {
  const filePath = path.resolve(rootPath, `.${pathname}`)
  const insideRoot = filePath === rootPath || filePath.startsWith(`${rootPath}${path.sep}`)
  return insideRoot ? directoryIndexPath(filePath) ?? filePath : undefined
}

function directoryIndexPath(filePath: string) {
  try {
    if (!statSync(filePath).isDirectory()) return undefined
  } catch {
    return undefined
  }

  const indexPath = path.join(filePath, "index.html")
  return existsFile(indexPath) ? indexPath : undefined
}

function existsFile(filePath: string) {
  try {
    return statSync(filePath).isFile()
  } catch {
    return false
  }
}

function injectLiveReloadClient(html: string) {
  if (html.includes("/__web-native-dev/events")) return html

  const script = `<script type="module">
const webNativeDevEvents = new EventSource("/__web-native-dev/events")
webNativeDevEvents.addEventListener("reload", () => location.reload())
</script>`

  if (html.includes("</body>")) return html.replace("</body>", `${script}</body>`)
  if (html.includes("</html>")) return html.replace("</html>", `${script}</html>`)
  return `${html}${script}`
}
