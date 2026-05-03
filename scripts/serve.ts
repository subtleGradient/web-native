import path from "node:path"
import { fileURLToPath } from "node:url"
import { serveStatic } from "./static-server.ts"

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const port = Number(process.env.PORT ?? "4173")

const server = serveStatic({ root, port })

console.log(`Serving ${root}`)
console.log(`Tests: http://${server.hostname}:${server.port}/test/`)

await new Promise(() => {})
