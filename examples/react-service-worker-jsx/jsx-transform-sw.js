importScripts("https://cdn.jsdelivr.net/npm/@babel/standalone@7.28.5/babel.min.js")

const jsHeaders = {
  "cache-control": "no-store",
  "content-type": "application/javascript; charset=utf-8",
  "x-react-no-build-transform": "babel-standalone",
}

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)
  const shouldTransform = event.request.method === "GET" && url.origin === location.origin && url.pathname.endsWith(".jsx")

  if (!shouldTransform) return

  event.respondWith(transformJsx(event.request, url))
})

async function transformJsx(request, url) {
  const response = await fetch(request, { cache: "no-store" })
  if (!response.ok) return response

  const source = await response.text()

  try {
    const result = Babel.transform(source, {
      filename: url.pathname,
      presets: [[Babel.availablePresets.react, { development: true, runtime: "automatic" }]],
      sourceMaps: "inline",
      sourceType: "module",
    })

    return new Response(`${result.code}\n`, { headers: jsHeaders })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    const message = `JSX transform failed for ${url.pathname}: ${detail}`
    return new Response(`throw new Error(${JSON.stringify(message)});\n`, { headers: jsHeaders, status: 500 })
  }
}
