// @ts-check

const media = matchMedia("(prefers-color-scheme: dark)")
const sampleTexts = [
  "# Idea\n\nPlain JSON Canvas text with **Markdown-ish** rendering.",
  "# Build\n\n- nodes\n- edges\n- colors",
  "# Review\n\nMap documents without a framework.",
  "# Ship\n\nEvery node remains inspectable HTML.",
]

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
  const nodes = sampleTexts.map((text, index) => ({
    id: `node-${index + 1}`,
    type: "text",
    x: Math.round(80 + Math.random() * 760),
    y: Math.round(40 + Math.random() * 420),
    width: 230 + Math.round(Math.random() * 80),
    height: 130 + Math.round(Math.random() * 80),
    color: String((index % 6) + 1),
    text,
  }))

  nodes.push({
    id: "jsoncanvas-spec",
    type: "link",
    x: Math.round(880 + Math.random() * 180),
    y: Math.round(140 + Math.random() * 300),
    width: 280,
    height: 130,
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
