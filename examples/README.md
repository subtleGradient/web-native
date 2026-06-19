# Examples

Each example lives in its own folder and uses `index.html` as its entrypoint. Related examples stay together by folder prefix instead of sharing parent directories.

## Folder Map

- `composite-settings-console/` combines the shadcn-style elements into a settings UI fixture.
- `deck-gl-cdn-scatterplot-inline/` loads deck.gl from CDN imports in one HTML page.
- `deck-gl-sqlite-opfs-bulk/` owns its SQLite OPFS worker and renders bulk logistics data with deck.gl.
- `evolu.web/` runs an Evolu local-first activity lab with browser-native ESM, JSDoc types, a CDN import map, encrypted SQLite, optional relay sync, and export.
- `react-deckgl-sqlite-opfs/` owns its React page, CSS, and SQLite OPFS worker copy.
- `react-inline-jsx/` demonstrates inline JSX transformed by Babel standalone.
- `react-service-worker-jsx/` demonstrates multi-file JSX transformed by a local service worker.
- `shadcn-github/` verifies CDN-backed GitHub import-map usage.
- `sqlite-wasm-cdn/` runs SQLite Wasm from CDN imports without a build step.
- `todomvc/` uses web-native custom elements and shadcn-style controls in a no-build TodoMVC example.

## React Without A Build Step

These are isolated research demos for running React directly in the browser with native ESM, an import map, and just-in-time JSX transformation. They do not change the core `web-native` source model, which remains plain browser JavaScript without framework runtime dependencies.

## Research Notes

- `websearch` and the Babel docs confirm that `@babel/standalone` still transforms `type="text/babel"` and `type="text/jsx"` scripts in the browser.
- Babel standalone supports native ESM by using `data-type="module"` on the transformed script.
- MDN marks `<script type="importmap">` as Baseline and widely available, with support across browsers since March 2023.
- React 19 is best loaded as ESM. The esm.sh docs show React 19 import-map examples and map `react-dom/client` to `https://esm.sh/react-dom@19.2.0/client`.
- JSX is still not native JavaScript. The no-build choices are either a browser-time transformer such as `@babel/standalone`, or an edge/CDN transform such as `esm.sh/tsx`.

## React Demos

- `react-inline-jsx/index.html` is the direct 2014-style pattern modernized: one HTML file, import map, React ESM, Babel standalone, and inline JSX transformed in the browser.
- `react-service-worker-jsx/index.html` registers `jsx-transform-sw.js`, then imports real `.jsx` modules. The service worker fetches those files, runs Babel in the browser worker, and returns JavaScript to native ESM.
- `react-deckgl-sqlite-opfs/index.html` imports `@deck.gl/react` and `@deck.gl/layers` from esm.sh, owns its SQLite Wasm OPFS worker, and renders persisted rows with the official DeckGL React component.

Open the inline demo directly or through the local server. Open the service-worker demo through `bun run dev`; service workers do not run from `file://` pages.

## Core Recipe

```html
<script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@19.2.0?dev",
      "react/jsx-dev-runtime": "https://esm.sh/react@19.2.0/jsx-dev-runtime?dev",
      "react/jsx-runtime": "https://esm.sh/react@19.2.0/jsx-runtime?dev",
      "react-dom/client": "https://esm.sh/react-dom@19.2.0/client?dev"
    }
  }
</script>
<script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7.28.5/babel.min.js"></script>
<script>
  Babel.registerPreset("react-automatic", {
    presets: [[Babel.availablePresets.react, { runtime: "automatic", development: true }]],
  })
</script>
<script type="text/babel" data-type="module" data-presets="react-automatic">
  import { createRoot } from "react-dom/client"

  createRoot(document.getElementById("root")).render(<h1>Hello from JSX</h1>)
</script>
```

Use this for demos, prototypes, teaching, and local experiments. For large production applications, precompile JSX so users do not pay the transform cost on every cold load.
