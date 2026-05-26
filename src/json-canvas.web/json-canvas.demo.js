// @ts-check

const media = matchMedia("(prefers-color-scheme: dark)")
const sampleTexts = [
  "# Idea\n\nPlain JSON Canvas text with **Markdown-ish** rendering.",
  "# Build\n\n- nodes\n- edges\n- colors",
  "# Review\n\nMap documents without a framework.",
  "# Ship\n\nEvery node remains inspectable HTML.",
]
/** @typedef {{ x: number, y: number }} CanvasSlot */
/** @typedef {{ id: string, type: string, x: number, y: number, width: number, height: number, color: string, text?: string, url?: string }} DemoNode */
/** @type {CanvasSlot[]} */
const textLayoutSlots = [
  { x: 72, y: 76 },
  { x: 430, y: 92 },
  { x: 800, y: 76 },
  { x: 430, y: 330 },
]
/** @type {CanvasSlot} */
const linkLayoutSlot = { x: 800, y: 330 }

syncTheme()
media.addEventListener("change", syncTheme)

Reflect.set(globalThis, "CanvasDemo", {
  randomize() {
    const canvas = document.querySelector("#canvas")
    if (!(canvas instanceof HTMLElement) || !("canvasDocument" in canvas)) return

    canvas.canvasDocument = createRandomCanvas()
  },
})

Reflect.get(globalThis, "CanvasDemo")?.randomize()
Reflect.set(globalThis, "__webNativeJsonCanvasDemoReady", true)

function syncTheme() {
  document.documentElement.dataset.theme = media.matches ? "dark" : "light"
}

function createRandomCanvas() {
  /** @type {DemoNode[]} */
  const nodes = sampleTexts.map((text, index) => {
    const slot = jitterSlot(textLayoutSlots[index] ?? textLayoutSlots[0])

    return {
      id: `node-${index + 1}`,
      type: "text",
      x: slot.x,
      y: slot.y,
      width: 260 + Math.round(Math.random() * 40),
      height: 155 + Math.round(Math.random() * 35),
      color: String((index % 6) + 1),
      text,
    }
  })

  const linkSlot = jitterSlot(linkLayoutSlot)

  nodes.push({
    id: "jsoncanvas-spec",
    type: "link",
    x: linkSlot.x,
    y: linkSlot.y,
    width: 340,
    height: 145,
    color: "5",
    url: "https://jsoncanvas.org/",
  })

  return {
    nodes,
    edges: [
      { id: "edge-1", fromNode: "node-1", toNode: "node-2", color: "4", label: "next" },
      { id: "edge-2", fromNode: "node-2", toNode: "node-3", color: "6", label: "review" },
      { id: "edge-3", fromNode: "node-3", toNode: "node-4", color: "2", label: "ship" },
      { id: "edge-4", fromNode: "node-4", toNode: "jsoncanvas-spec", color: "5", label: "spec" },
    ],
  }
}

/** @param {CanvasSlot} slot */
function jitterSlot(slot) {
  return {
    x: Math.round(slot.x + (Math.random() - 0.5) * 36),
    y: Math.round(slot.y + (Math.random() - 0.5) * 32),
  }
}
