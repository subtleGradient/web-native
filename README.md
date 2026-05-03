# web-native

Generic universal web-native ESM modules and custom elements.

This project intentionally avoids React, framework runtime dependencies, bundlers, transpilers, npm publishing assumptions, and TypeScript source syntax. Browser-facing code is plain JavaScript ESM with strict TypeScript checking through JSDoc.

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

`bun run dev` serves the repository as static files and opens the browser-facing test harness at `http://localhost:4173/test/`.

`bun run test` starts the same static server, launches Chromium through `puppeteer-core`, runs the browser-native Mocha/Chai tests, and exits non-zero on failures.

`bun run check` uses `tsgo --noEmit`; do not use `tsc` for this project.

`bun run verify:dark` launches Chromium and verifies that the shadcn theme follows `prefers-color-scheme: dark` by default while still allowing explicit `.light`, `.dark`, and `data-theme` overrides.

`bun run verify:demos` launches Chromium against the composite demos, interacts with tabs, switches, and checkboxes, verifies focus/active/disabled styles, and runs axe against the page.

`bun run verify:standalone` opens every standalone GitHub-linked demo as a `file://` page, verifies it defines custom elements, and checks automatic light/dark theme sync in both system modes.

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

- `src/checkbox/` ports Base UI Checkbox as `base-checkbox`.
- `src/toggle/` ports Base UI Toggle as `base-toggle`.
- `src/separator/` ports Base UI Separator as `base-separator`.
- `src/switch/` ports Base UI Switch as `base-switch`.
- `src/tabs/` ports Base UI Tabs as `base-tabs`, `base-tabs-list`, `base-tab`, and `base-tabs-panel`.
- `src/deck-gl/` adds deck.gl-inspired `deck-gl`, `deck-layer-list`, and `deck-details-panel` elements for static HTML map examples.
- `src/shadcn/` adds styled shadcn-inspired custom elements over those Base UI web components.

Each folder includes a `*.demo.html`, `*.test.js`, and `README.md` next to the implementation.

The standalone GitHub import-map demo lives at `examples/standalone/shadcn-github.html`. The SQLite Wasm CDN example lives at `examples/standalone/sqlite-wasm-cdn.html`. Composite local demos live in `examples/composite/`. deck.gl-style examples live in `examples/deck-gl/`. Each component/demo folder also has a `*.standalone.html` page that can be opened directly without running a server.

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
