import { serveStatic } from "./static-server.ts"
import { getGitHubRepo, localizeRepoCdnHtml } from "./standalone-rewriter.ts"

const root = process.cwd()
const port = Number(process.env.PORT ?? "4173")
const repo = await getGitHubRepo(root)

const server = serveStatic({
  root,
  port,
  defaultPath: "/src/shadcn.web/shadcn.demo.html",
  liveReload: true,
  transformHtml: (html, htmlPath) => localizeRepoCdnHtml(html, { root, htmlPath, repo, localUrlStyle: "root" }),
})

console.log(`Serving ${root}`)
console.log(`Default: http://${server.hostname}:${server.port}/`)
console.log(`Examples: http://${server.hostname}:${server.port}/examples/composite/settings-console.html`)
console.log(`Demos: http://${server.hostname}:${server.port}/src/shadcn.web/shadcn.demo.html`)
console.log(`Tests: http://${server.hostname}:${server.port}/test/`)
console.log("HTML: repo CDN URLs are localized in memory; files on disk stay CDN-backed.")

await new Promise(() => {})
