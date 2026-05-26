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

  it("moves nodes with native drag and drop", async () => {
    const canvas = mountCanvas(html`<json-canvas padding="24"></json-canvas>`)
    canvas.canvasDocument = {
      nodes: [
        {
          id: "idea",
          type: "text",
          x: 0,
          y: 0,
          width: 140,
          height: 90,
          text: "# Idea",
        },
        {
          id: "ship",
          type: "text",
          x: 260,
          y: 20,
          width: 140,
          height: 90,
          text: "# Ship",
        },
      ],
      edges: [
        {
          id: "idea-ship",
          fromNode: "idea",
          toNode: "ship",
        },
      ],
    }
    await flushFrames()

    const node = /** @type {import("./index.js").JsonCanvasNode} */ (
      canvas.querySelector("#idea")
    )
    const edge = canvas.querySelector("json-canvas-edge")
    const moved = new Promise((resolve) => {
      canvas.addEventListener("json-canvas-node-move", (event) =>
        resolve(/** @type {CustomEvent} */ (event).detail),
      )
    })
    const dataTransfer = new DataTransfer()
    const nodeRect = node.getBoundingClientRect()
    const dragOffset = { x: 16, y: 18 }

    node.dispatchEvent(
      new DragEvent("dragstart", {
        bubbles: true,
        cancelable: true,
        clientX: nodeRect.left + dragOffset.x,
        clientY: nodeRect.top + dragOffset.y,
        dataTransfer,
      }),
    )

    expect(node.draggable).to.equal(true)
    expect(node.hasAttribute("data-json-canvas-dragging")).to.equal(true)

    const canvasRect = canvas.getBoundingClientRect()
    const offsetX = cssPixels(
      getComputedStyle(canvas).getPropertyValue("--json-canvas-offset-x"),
    )
    const offsetY = cssPixels(
      getComputedStyle(canvas).getPropertyValue("--json-canvas-offset-y"),
    )
    const nextX = 180
    const nextY = 120
    const previewX = 96
    const previewY = 72
    node.dispatchEvent(
      new DragEvent("drag", {
        bubbles: true,
        cancelable: true,
        clientX: canvasRect.left + offsetX + previewX + dragOffset.x,
        clientY: canvasRect.top + offsetY + previewY + dragOffset.y,
        dataTransfer,
      }),
    )
    await flushFrames()

    expect(node.x).to.equal(previewX)
    expect(node.y).to.equal(previewY)

    const dropEvent = new DragEvent("drop", {
      bubbles: true,
      cancelable: true,
      clientX: canvasRect.left + offsetX + nextX + dragOffset.x,
      clientY: canvasRect.top + offsetY + nextY + dragOffset.y,
      dataTransfer,
    })

    const dragOverEvent = new DragEvent("dragover", {
      bubbles: true,
      cancelable: true,
      clientX: dropEvent.clientX,
      clientY: dropEvent.clientY,
      dataTransfer,
    })
    canvas.dispatchEvent(dragOverEvent)
    await flushFrames()

    expect(dragOverEvent.defaultPrevented).to.equal(true)
    expect(node.x).to.equal(nextX)
    expect(node.y).to.equal(nextY)
    expect(canvas.canvasDocument?.nodes?.find((entry) => entry.id === "idea"))
      .to.deep.include({ x: nextX, y: nextY })

    canvas.dispatchEvent(dropEvent)
    await flushFrames()

    expect(node.x).to.equal(nextX)
    expect(node.y).to.equal(nextY)
    expect(node.hasAttribute("data-json-canvas-dragging")).to.equal(false)
    expect(canvas.hasAttribute("data-json-canvas-drop-target")).to.equal(false)
    expect(canvas.canvasDocument?.nodes?.find((entry) => entry.id === "idea"))
      .to.deep.include({ x: nextX, y: nextY })
    expect(await moved).to.deep.include({
      oldX: 0,
      oldY: 0,
      x: nextX,
      y: nextY,
    })
    expect(edge?.getAttribute("data-wire-state")).to.equal("ready")
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

/** @param {string} value */
function cssPixels(value) {
  const number = Number.parseFloat(value)
  return Number.isFinite(number) ? number : 0
}
