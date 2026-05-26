# deck-gl

`deck-gl` is a thin custom element host for a Deck-compatible constructor. It owns the DOM container and lifecycle while JavaScript keeps owning layers, accessors, and data.

```html
<script type="module" src="./define.js"></script>

<deck-gl
  controller
  initial-view-state='{"longitude":-74,"latitude":40.7,"zoom":11}'
  oninit="this.deckConstructor = Deck; this.layers = [new ScatterplotLayer({ data, getPosition: d => [d[0], d[1]] })]"
  ondeckclick="console.log(event.detail.info.object)"
></deck-gl>
```

Attributes cover simple JSON or boolean props: `initial-view-state`, `view-state`, `controller`, `parameters`, `use-device-pixels`, and `debug`.

Properties cover real JavaScript values: `deckConstructor`, `layers`, `views`, `effects`, `parameters`, `initialViewState`, `viewState`, `controller`, `getTooltip`, `setProps()`, and `redraw()`.

Inline handlers are supported for the deck lifecycle and interaction events:

- `oninit` or `ondeckinit` for `deck-init`
- `onload` or `ondeckload` for `deck-load`
- `onerror` or `ondeckerror` for `deck-error`
- `ondeckclick` for `deck-click`
- `onhover` or `ondeckhover` for `deck-hover`
- `ondragstart`, `ondrag`, `ondragend`, or the `ondeck...` equivalents
- `onviewstatechange` or `ondeckviewstatechange` for `deck-view-state-change`

`deck-layer-list` dispatches `deck-layer-visibility-change` and supports `onlayervisibilitychange` or `ondecklayervisibilitychange`.

`deck-details-panel` listens to `deck-click` and `deck-hover` from a target `deck-gl` element and dispatches `deck-details-change`, with inline `ondetailschange` or `ondeckdetailschange` support.
