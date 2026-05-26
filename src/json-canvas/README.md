# JSON Canvas and noodle wire components

Native custom elements for turning [JSON Canvas](https://jsoncanvas.org/) documents into inspectable HTML, plus a generic `noodle-wire` element for drawing SVG cables between arbitrary DOM nodes.

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/gh/subtleGradient/web-native@main/src/json-canvas/define.js"
></script>

<json-canvas>
  <script type="application/json">
    {
      "nodes": [
        {
          "id": "a",
          "type": "text",
          "x": 0,
          "y": 0,
          "width": 220,
          "height": 120,
          "text": "# A"
        },
        {
          "id": "b",
          "type": "link",
          "x": 320,
          "y": 20,
          "width": 240,
          "height": 120,
          "url": "https://jsoncanvas.org/"
        }
      ],
      "edges": [
        { "id": "a-b", "fromNode": "a", "toNode": "b", "label": "opens" }
      ]
    }
  </script>
</json-canvas>
```

## Elements

- `json-canvas` renders a full JSON Canvas document from:
  - its `canvasDocument`/`document` JavaScript property,
  - a JSON string in the `document` attribute,
  - a child `<script type="application/json">`, or
  - a fetchable `src` URL.
- `json-canvas-node` renders one JSON Canvas node. JSON Canvas `id` maps directly to the element `id`; other spec fields are attributes: `type`, `x`, `y`, `width`, `height`, `color`, `text`, `file`, `subpath`, `url`, `label`, `background`, and `background-style`.
- `json-canvas-edge` is a JSON Canvas-shaped wire. JSON Canvas `id` maps directly to the element `id`; `fromNode`/`toNode` map to `from`/`to`, followed by `from-side`, `to-side`, `from-end`, `to-end`, `color`, and `label`.
- `noodle-wire` is the lower-level cable primitive. Use `from` and `to` to point at element IDs or selectors.

## Manual HTML mapping

You can author the same graph directly as HTML:

```html
<json-canvas padding="32">
  <json-canvas-node
    id="task"
    type="text"
    x="0"
    y="0"
    width="240"
    height="140"
    color="4"
    text="Ship the demo"
  ></json-canvas-node>
  <json-canvas-node
    id="docs"
    type="file"
    x="340"
    y="30"
    width="260"
    height="120"
    color="6"
    file="README.md"
    subpath="#usage"
  ></json-canvas-node>
  <json-canvas-edge
    id="task-docs"
    from="task"
    to="docs"
    label="document"
  ></json-canvas-edge>
</json-canvas>
```

Preset colors `"1"` through `"6"` are exposed through CSS variables `--json-canvas-color-1` … `--json-canvas-color-6`; hex colors pass through directly.

## Generic cables

`noodle-wire` is useful outside JSON Canvas:

```html
<section style="position: relative">
  <button id="source">Source</button>
  <article id="target">Target</article>
  <noodle-wire
    from="source"
    to="target"
    from-side="right"
    to-side="left"
    label="flows"
  ></noodle-wire>
</section>
```

The wire redraws on resize/scroll and uses a cubic Bézier path. Side hints are optional; omitted sides are inferred from the relative node positions.
