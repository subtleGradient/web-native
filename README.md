# web-native

Generic universal web-native ESM modules and custom elements.

This project's core source intentionally avoids React, framework runtime dependencies, bundlers, transpilers, npm publishing assumptions, and TypeScript source syntax. Browser-facing code is plain JavaScript ESM with strict TypeScript checking through JSDoc. Isolated research demos may live under `examples/` without changing that source model.

## Development

```sh
bun install
bun run check
bun run test
bun run verify:dark
bun run verify:demos
bun run verify:standalone
bun run dev
```

`bun run dev` serves the repository as static files at `http://localhost:4173/`, rewrites this repo's CDN-backed standalone HTML imports to local `/src/...` URLs in memory, and injects live reload. Files on disk stay CDN-backed.

`bun run test` starts the same static server, launches Chromium through `puppeteer-core`, runs the browser-native Mocha/Chai tests, and exits non-zero on failures.

`bun run check` uses `tsgo --noEmit`; do not use `tsc` for this project.

`bun run verify:dark` launches Chromium and verifies that the shadcn theme follows `prefers-color-scheme: dark` by default while still allowing explicit `.light`, `.dark`, and `data-theme` overrides.

`bun run verify:demos` launches Chromium against the composite demos, interacts with tabs, switches, and checkboxes, verifies focus/active/disabled styles, and runs axe against the page.

`bun run verify:standalone` serves the standalone GitHub-linked demos through the localizing dev transform, verifies they define custom elements, and checks automatic light/dark theme sync where the page supports it.

Set `PUPPETEER_EXECUTABLE_PATH` or `CHROME_BIN` if Chromium is not installed at a common system path.

## Testing

Tests use classic BDD globals in a real browser:

```js
import { expect } from "chai"

describe("thing", () => {
  it("does the behavior", () => {
    expect(true).to.equal(true)
  })
})
```

The browser harness is `test/index.html`. It loads Mocha and Chai from local `node_modules`, configures an import map, then imports each test module listed in `test/modules.js`.

## Component Layout

Each custom element should live in its own folder with its demos, examples, and tests next to the implementation:

```txt
src/
  button/
    button.js
    button.demo.html
    button.test.js
    README.md
```

Development should follow RGRTDD / demo-first flow:

1. Create or update the demo first.
2. Write the failing browser test.
3. Implement the smallest native web change that makes it pass.
4. Refactor while tests stay green.

## Current Components

- `src/base.web/checkbox/` ports Base UI Checkbox as `base-checkbox`.
- `src/base.web/toggle/` ports Base UI Toggle as `base-toggle`.
- `src/base.web/toggle-group/` ports Base UI Toggle Group as `base-toggle-group` and `base-toggle-group-item`.
- `src/base.web/separator/` ports Base UI Separator as `base-separator`.
- `src/base.web/switch/` ports Base UI Switch as `base-switch`.
- `src/base.web/tabs/` ports Base UI Tabs as `base-tabs`, `base-tabs-list`, `base-tab`, and `base-tabs-panel`.
- `src/base.web/progress/` ports Base UI Progress as `base-progress`, `base-progress-track`, `base-progress-indicator`, `base-progress-label`, and `base-progress-value`.
- `src/base.web/radio-group/` ports Base UI Radio Group as `base-radio-group` and `base-radio`.
- `src/chat.web/` adds `topic-transcript`, `chat-summary`, and `chat-message` elements for lightweight archived chat transcript pages.
- `src/codemirror.web/` adds `codemirror-editor` and language aliases for CodeMirror-backed textarea enhancement.
- `src/openai/` adds BYOK OpenAI client helpers plus `openai-client`, `openai-key-field`, and `openai-result` elements.
- `src/json-editor.web/` adds `json-editor` for schema-aware textarea enhancement.
- `src/deck-gl.web/` adds deck.gl-inspired `deck-gl`, `deck-layer-list`, and `deck-details-panel` elements for static HTML map examples.
- `src/json-canvas.web/` adds `json-canvas`, `json-canvas-node`, `json-canvas-edge`, and `noodle-wire` elements for mapping JSON Canvas documents to HTML.
- `src/shadcn.web/` adds styled shadcn-inspired custom elements over those Base UI web components.

Each folder includes a `*.demo.html`, `*.test.js`, and `README.md` next to the implementation.

Standalone examples live in one-example folders under `examples/`, using prefixes to keep related pages together, such as `examples/react-inline-jsx/`, `examples/react-service-worker-jsx/`, `examples/deck-gl-cdn-scatterplot-inline/`, and `examples/deck-gl-sqlite-opfs-bulk/`. Each example folder owns the files it needs. Component folders also include CDN-backed standalone pages named without a `.standalone` suffix, such as `src/shadcn.web/button/button.html`. Local `*.demo.html` pages use browser ESM and should be opened through `bun run dev`, not directly as `file://` URLs.

## Standalone CDN Pages

Standalone pages are CDN-backed on disk so they can be opened directly from GitHub or a local file. For local development, `bun dev` rewrites this repo's CDN URLs to local server paths in memory and live-reloads edits.

```sh
bun run standalone --cdn --all
bun run standalone --local --all
bun run standalone --cdn --all --check
bun run hooks:install
```

`bun run standalone --cdn --all` discovers standalone HTML pages from repo conventions and repo CDN usage, then pins this repo's CSS imports to the newest commit that changed their CSS import graph, and JS imports to the newest commit that changed their transitive JS module graph. `bun run standalone --local --all` removes only this repo's jsDelivr GitHub CDN URLs; third-party CDN dependencies are preserved.

## Browser Imports

During local tests, the import map points `web-native/` at `/src/`.

External browser usage can point at GitHub through jsDelivr:

```html
<script type="importmap">
  {
    "imports": {
      "web-native/": "https://cdn.jsdelivr.net/gh/subtleGradient/web-native@main/src/"
    }
  }
</script>
```

For production-like usage, pin to a tag or commit SHA instead of `main`.

## Registry

A shadcn-compatible registry is intentionally left open for later. When added, it should distribute universal plain-file registry items rather than changing the browser-native source model.
