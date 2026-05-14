import path from "node:path"

type StaticServerOptions = {
  root: string
  port: number
  defaultPath?: string
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

export function serveStatic({ root, port, defaultPath = "/test/index.html" }: StaticServerOptions) {
  const rootPath = path.resolve(root)

  return Bun.serve({
    port,
    async fetch(request) {
      const url = new URL(request.url)
      let pathname = url.pathname

      try {
        pathname = decodeURIComponent(pathname)
      } catch {
        return new Response("Bad request", { status: 400 })
      }

      if (pathname === "/") pathname = defaultPath
      if (pathname.endsWith("/")) pathname += "index.html"

      const filePath = resolvePublicPath(rootPath, pathname)
      if (!filePath) return new Response("Not found", { status: 404 })

      const file = Bun.file(filePath)
      if (!(await file.exists())) return new Response("Not found", { status: 404 })

      const contentType = MIME_TYPES.get(path.extname(filePath)) ?? "application/octet-stream"
      return new Response(file, { headers: { "content-type": contentType } })
    },
  })
}

function resolvePublicPath(rootPath: string, pathname: string) {
  const filePath = path.resolve(rootPath, `.${pathname}`)
  const insideRoot = filePath === rootPath || filePath.startsWith(`${rootPath}${path.sep}`)
  return insideRoot ? filePath : undefined
}
