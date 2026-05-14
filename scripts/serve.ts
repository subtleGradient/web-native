import path from "node:path"
import { fileURLToPath } from "node:url"
import { serveStatic } from "./static-server.ts"

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const port = Number(process.env.PORT ?? "4173")

const server = serveStatic({ root, port, defaultPath: "/index.html" })

console.log(`Serving ${root}`)
console.log(`Index: http://${server.hostname}:${server.port}/`)
console.log(`Examples: http://${server.hostname}:${server.port}/examples/composite/settings-console.html`)
console.log(`Demos: http://${server.hostname}:${server.port}/src/shadcn/shadcn.demo.html`)
console.log(`Tests: http://${server.hostname}:${server.port}/test/`)

await new Promise(() => {})
