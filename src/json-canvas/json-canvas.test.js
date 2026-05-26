// @ts-check

import { expect } from "chai"
import "./define.js"

const html = String.raw

describe("json-canvas components", () => {
  afterEach(() => {
    document
      .querySelectorAll("[data-test-root]")
      .forEach((element) => element.remove())
  })

  it("maps JSON Canvas documents to node and edge custom elements", async () => {
    const canvas = mountCanvas(html`<json-canvas padding="24"></json-canvas>`)
    const documentValue = {
      nodes: [
        {
          id: "idea",
          type: "text",
          x: -40,
          y: 10,
          width: 220,
          height: 130,
          color: "4",
          text: "# Idea\n\nConnect **native** nodes.",
        },
        {
          id: "spec",
          type: "link",
          x: 300,
          y: 40,
          width: 240,
          height: 120,
          color: "5",
          url: "https://jsoncanvas.org/",
        },
      ],
      edges: [
        {
          id: "idea-to-spec",
          fromNode: "idea",
          fromSide: "right",
          toNode: "spec",
          toSide: "left",
          toEnd: "arrow",
          color: "6",
          label: "maps to",
        },
      ],
    }

    canvas.canvasDocument = documentValue
    await flushFrames()

    const nodes = canvas.querySelectorAll("json-canvas-node")
    const edge = canvas.querySelector("json-canvas-edge")

    expect(nodes).to.have.length(2)
    expect(edge).to.not.equal(null)
    expect(nodes[0]?.id).to.equal("idea")
    expect(nodes[0]?.hasAttribute("node-id")).to.equal(false)
    expect(nodes[0]?.getAttribute("type")).to.equal("text")
    expect(nodes[0]?.shadowRoot?.querySelector("h1")?.textContent).to.equal(
      "Idea",
    )
    expect(edge?.id).to.equal("idea-to-spec")
    expect(edge?.hasAttribute("edge-id")).to.equal(false)
    expect(edge?.getAttribute("from")).to.equal("idea")
    expect(edge?.getAttribute("to")).to.equal("spec")
    expect(edge?.getAttribute("data-wire-state")).to.equal("ready")
    expect(canvas.style.getPropertyValue("--json-canvas-offset-x")).to.equal(
      "64px",
    )
    expect(canvas.toCanvasDocument().edges[0]).to.deep.include({
      id: "idea-to-spec",
      fromNode: "idea",
      toNode: "spec",
      label: "maps to",
    })
  })

  it("reads an inline JSON Canvas document from a script child", async () => {
    const canvas = mountCanvas(html`
      <json-canvas>
        <script type="application/json">
          {
            "nodes": [
              {
                "id": "note",
                "type": "text",
                "x": 0,
                "y": 0,
                "width": 180,
                "height": 100,
                "text": "Inline note"
              }
            ],
            "edges": []
          }
        </script>
      </json-canvas>
    `)

    await flushFrames()

    const node = canvas.querySelector("json-canvas-node")
    expect(node?.id).to.equal("note")
    expect(node?.hasAttribute("node-id")).to.equal(false)
    expect(node?.shadowRoot?.textContent).to.contain("Inline note")
  })

  it("draws standalone noodle-wire connections between arbitrary nodes", async () => {
    const root = mount(html`
      <section style="position: relative; width: 420px; height: 220px;">
        <div
          id="source"
          style="position: absolute; left: 20px; top: 70px; width: 80px; height: 50px;"
        ></div>
        <div
          id="target"
          style="position: absolute; left: 300px; top: 80px; width: 90px; height: 60px;"
        ></div>
        <noodle-wire
          from="source"
          to="target"
          from-side="right"
          to-side="left"
          label="wire"
        ></noodle-wire>
      </section>
    `)

    const wire = /** @type {import("./index.js").NoodleWire} */ (
      root.querySelector("noodle-wire")
    )
    await flushFrames()

    const path = wire.shadowRoot?.querySelector("path.wire")
    const label = wire.shadowRoot?.querySelector("text")

    expect(wire.getAttribute("data-wire-state")).to.equal("ready")
    expect(path?.getAttribute("d")).to.match(/^M /)
    expect(path?.getAttribute("marker-end")).to.equal("url(#arrow)")
    expect(label?.textContent).to.equal("wire")
  })
})

/** @param {string} markup */
function mount(markup) {
  const root = document.createElement("div")
  root.setAttribute("data-test-root", "")
  root.innerHTML = markup
  document.body.append(root)
  return root
}

/** @param {string} markup */
function mountCanvas(markup) {
  return /** @type {import("./index.js").JsonCanvasElement} */ (
    mount(markup).querySelector("json-canvas")
  )
}

async function flushFrames() {
  await Promise.resolve()
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await new Promise((resolve) => requestAnimationFrame(resolve))
}
