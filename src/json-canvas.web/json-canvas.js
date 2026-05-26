// @ts-check

/** @typedef {"text" | "file" | "link" | "group"} JsonCanvasNodeType */
/** @typedef {"top" | "right" | "bottom" | "left"} JsonCanvasSide */
/** @typedef {"none" | "arrow"} JsonCanvasEnd */
/** @typedef {"cover" | "ratio" | "repeat"} JsonCanvasBackgroundStyle */
/** @typedef {{ id: string, type: JsonCanvasNodeType, x: number, y: number, width: number, height: number, color?: string, text?: string, file?: string, subpath?: string, url?: string, label?: string, background?: string, backgroundStyle?: JsonCanvasBackgroundStyle }} JsonCanvasNodeData */
/** @typedef {{ id: string, fromNode: string, fromSide?: JsonCanvasSide, fromEnd?: JsonCanvasEnd, toNode: string, toSide?: JsonCanvasSide, toEnd?: JsonCanvasEnd, color?: string, label?: string }} JsonCanvasEdgeData */
/** @typedef {{ nodes?: JsonCanvasNodeData[], edges?: JsonCanvasEdgeData[] }} JsonCanvasDocument */
/** @typedef {{ id: string, offsetX: number, offsetY: number, startX?: number, startY?: number }} JsonCanvasNodeDragData */
/** @typedef {{ x: number, y: number }} Point */
/** @typedef {{ left: number, top: number, right: number, bottom: number, width: number, height: number, centerX: number, centerY: number }} Box */

const nodeTagName = "json-canvas-node"
const edgeTagName = "json-canvas-edge"
const wireTagName = "noodle-wire"
const nodeDragDataType = "application/x.web-native-json-canvas-node+json"
const invalidAttributeValue = Symbol("invalid-attribute-value")

const canvasStyles = String.raw`
  :host {
    --json-canvas-padding: 48px;
    --json-canvas-width: 100%;
    --json-canvas-height: 16rem;
    --json-canvas-color-1: #ef4444;
    --json-canvas-color-2: #f97316;
    --json-canvas-color-3: #eab308;
    --json-canvas-color-4: #22c55e;
    --json-canvas-color-5: #06b6d4;
    --json-canvas-color-6: #8b5cf6;
    background:
      radial-gradient(circle at 1px 1px, color-mix(in oklch, CanvasText 16%, transparent) 1px, transparent 0) 0 0 / 24px 24px,
      color-mix(in oklch, Canvas 94%, CanvasText 6%);
    border: 1px solid color-mix(in oklch, CanvasText 14%, transparent);
    border-radius: 1rem;
    box-sizing: border-box;
    color: CanvasText;
    display: block;
    min-block-size: max(16rem, var(--json-canvas-height));
    min-inline-size: max(100%, var(--json-canvas-width));
    overflow: auto;
    position: relative;
  }

  :host([plain]) {
    background: transparent;
    border: 0;
    border-radius: 0;
  }

  :host([data-json-canvas-drop-target]) {
    border-color: color-mix(in oklch, Highlight 56%, CanvasText 14%);
  }

  slot {
    display: contents;
  }

  ::slotted(json-canvas-node) {
    position: absolute;
    z-index: 2;
  }

  ::slotted(json-canvas-edge),
  ::slotted(noodle-wire) {
    inset: 0;
    position: absolute;
    z-index: 1;
  }
`

const nodeStyles = String.raw`
  :host {
    --json-canvas-node-accent: color-mix(in oklch, Highlight 76%, CanvasText 8%);
    box-sizing: border-box;
    color: CanvasText;
    contain: layout style;
    display: block;
    min-block-size: 1rem;
    min-inline-size: 1rem;
    position: absolute;
  }

  :host([draggable="true"]) {
    cursor: grab;
  }

  :host([data-json-canvas-dragging]) {
    cursor: grabbing;
    opacity: 0.62;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  .node {
    background: color-mix(in oklch, Canvas 96%, var(--json-canvas-node-accent) 4%);
    border: 1px solid color-mix(in oklch, var(--json-canvas-node-accent) 42%, CanvasText 12%);
    border-radius: 0.875rem;
    box-shadow: 0 16px 40px color-mix(in oklch, CanvasText 12%, transparent);
    color: CanvasText;
    display: grid;
    gap: 0.625rem;
    grid-template-rows: auto minmax(0, 1fr);
    height: 100%;
    overflow: auto;
    padding: 0.875rem;
    position: relative;
    width: 100%;
  }

  :host([draggable="true"]) .node {
    user-select: none;
  }

  .node::before {
    background: var(--json-canvas-node-accent);
    border-radius: 999px;
    content: "";
    inline-size: 0.35rem;
    inset-block: 0.875rem;
    inset-inline-start: 0.625rem;
    opacity: 0.86;
    position: absolute;
  }

  .node__header {
    align-items: center;
    display: flex;
    gap: 0.5rem;
    min-width: 0;
    padding-inline-start: 0.5rem;
  }

  .node__chip {
    background: color-mix(in oklch, var(--json-canvas-node-accent) 16%, Canvas);
    border: 1px solid color-mix(in oklch, var(--json-canvas-node-accent) 32%, transparent);
    border-radius: 999px;
    color: color-mix(in oklch, CanvasText 78%, var(--json-canvas-node-accent) 22%);
    flex: none;
    font-size: 0.6875rem;
    font-weight: 760;
    letter-spacing: 0.08em;
    line-height: 1.1;
    padding: 0.22rem 0.45rem;
    text-transform: uppercase;
  }

  .node__title {
    font-size: 0.875rem;
    font-weight: 760;
    line-height: 1.2;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .node__body {
    min-height: 0;
    min-width: 0;
    overflow-wrap: anywhere;
    padding-inline-start: 0.5rem;
  }

  .node--text .node__body {
    display: block;
    font-size: 0.9375rem;
    line-height: 1.5;
  }

  .node--text h1,
  .node--text h2,
  .node--text h3,
  .node--text h4,
  .node--text h5,
  .node--text h6,
  .node--text p,
  .node--text ul,
  .node--text ol,
  .node--text blockquote,
  .node--text pre {
    margin-block: 0 0.625rem;
  }

  .node--text h1,
  .node--text h2,
  .node--text h3,
  .node--text h4,
  .node--text h5,
  .node--text h6 {
    letter-spacing: -0.02em;
    line-height: 1.12;
  }

  .node--text h1 { font-size: 1.35rem; }
  .node--text h2 { font-size: 1.2rem; }
  .node--text h3 { font-size: 1.05rem; }

  .node--text ul,
  .node--text ol {
    padding-inline-start: 1.25rem;
  }

  .node--text blockquote {
    border-inline-start: 0.25rem solid color-mix(in oklch, var(--json-canvas-node-accent) 48%, transparent);
    color: color-mix(in oklch, CanvasText 72%, transparent);
    padding-inline-start: 0.75rem;
  }

  .node--text code {
    background: color-mix(in oklch, CanvasText 8%, transparent);
    border-radius: 0.35rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.9em;
    padding: 0.08rem 0.28rem;
  }

  .node--text pre {
    background: color-mix(in oklch, CanvasText 8%, transparent);
    border-radius: 0.625rem;
    overflow: auto;
    padding: 0.75rem;
  }

  .node--text pre code {
    background: transparent;
    border-radius: 0;
    padding: 0;
  }

  .node--file,
  .node--link {
    grid-template-rows: auto minmax(0, 1fr) auto;
  }

  .node__media {
    align-items: center;
    background: color-mix(in oklch, var(--json-canvas-node-accent) 10%, Canvas);
    border: 1px solid color-mix(in oklch, var(--json-canvas-node-accent) 22%, transparent);
    border-radius: 0.625rem;
    display: grid;
    justify-items: center;
    min-block-size: 4rem;
    overflow: hidden;
  }

  .node__media img {
    display: block;
    height: 100%;
    object-fit: cover;
    width: 100%;
  }

  .node__path,
  .node__url {
    color: LinkText;
    font-weight: 650;
    min-width: 0;
    overflow-wrap: anywhere;
    text-decoration: none;
  }

  .node__path:hover,
  .node__url:hover {
    text-decoration: underline;
  }

  .node__subpath {
    color: color-mix(in oklch, CanvasText 62%, transparent);
    font-size: 0.8125rem;
  }

  .node--group {
    background: color-mix(in oklch, var(--json-canvas-node-accent) 9%, Canvas 82%);
    border-style: dashed;
    box-shadow: inset 0 0 0 1px color-mix(in oklch, Canvas 60%, transparent);
    overflow: hidden;
  }

  .node--group::before {
    inset-block-end: auto;
    inset-block-start: 0.875rem;
    block-size: 0.35rem;
    inline-size: 2rem;
  }

  .node--group .node__body {
    color: color-mix(in oklch, CanvasText 64%, transparent);
    font-size: 0.875rem;
  }

  .node--empty .node__body {
    color: color-mix(in oklch, CanvasText 54%, transparent);
    font-style: italic;
  }
`

const wireStyles = String.raw`
  :host {
    --json-canvas-edge-color: color-mix(in oklch, CanvasText 72%, transparent);
    --json-canvas-edge-width: 2.5;
    block-size: max(100%, var(--json-canvas-height, 100%));
    color: var(--json-canvas-edge-color);
    display: block;
    inline-size: max(100%, var(--json-canvas-width, 100%));
    inset: 0;
    overflow: visible;
    pointer-events: none;
    position: absolute;
  }

  svg {
    display: block;
    height: 100%;
    overflow: visible;
    width: 100%;
  }

  path.wire {
    fill: none;
    stroke: var(--json-canvas-edge-color);
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: var(--json-canvas-edge-width);
  }

  marker path {
    fill: var(--json-canvas-edge-color);
  }

  text {
    dominant-baseline: middle;
    fill: CanvasText;
    font: 650 12px ui-sans-serif, system-ui, sans-serif;
    paint-order: stroke;
    stroke: color-mix(in oklch, Canvas 94%, transparent);
    stroke-linejoin: round;
    stroke-width: 5px;
    text-anchor: middle;
  }
`

export class JsonCanvasElement extends HTMLElement {
  static observedAttributes = ["document", "padding", "src"]

  /** @type {JsonCanvasDocument | undefined} */
  #canvasDocument

  /** @type {JsonCanvasNodeDragData | undefined} */
  #nodeDrag

  /** @type {symbol | undefined} */
  #loadToken

  /** @type {boolean} */
  #metricsQueued = false

  /** @type {(event: DragEvent) => void} */
  #handleDragStart = (event) => this.#startNodeDrag(event)

  /** @type {(event: DragEvent) => void} */
  #handleDrag = (event) => this.#dragNode(event)

  /** @type {(event: DragEvent) => void} */
  #handleDragEnd = (event) => this.#endNodeDrag(event)

  /** @type {(event: DragEvent) => void} */
  #handleDragEnter = (event) => this.#acceptNodeDrag(event)

  /** @type {(event: DragEvent) => void} */
  #handleDragOver = (event) => this.#acceptNodeDrag(event)

  /** @type {(event: DragEvent) => void} */
  #handleDragLeave = (event) => this.#leaveNodeDrag(event)

  /** @type {(event: DragEvent) => void} */
  #handleDrop = (event) => this.#dropNode(event)

  connectedCallback() {
    this.#ensureShadow()
    this.#connectDragListeners()

    if (
      !this.#canvasDocument &&
      !this.hasAttribute("document") &&
      this.hasAttribute("src")
    ) {
      this.#loadSrc(this.getAttribute("src") ?? "")
    } else if (!this.#canvasDocument && !this.hasAttribute("document")) {
      const scriptDocument = this.#readInlineDocument()
      if (scriptDocument) this.canvasDocument = scriptDocument
      else this.#requestMetricsSync()
    } else {
      this.#requestMetricsSync()
    }
  }

  disconnectedCallback() {
    this.#disconnectDragListeners()
  }

  /**
   * @param {string} name
   * @param {string | null} oldValue
   * @param {string | null} newValue
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return

    if (name === "document") {
      if (newValue == null || newValue.trim() === "") {
        this.#canvasDocument = undefined
        this.#requestMetricsSync()
        return
      }

      const parsed = parseJsonCanvasDocumentAttribute(this, newValue)
      if (parsed === invalidAttributeValue) return
      this.canvasDocument = parsed
      return
    }

    if (
      name === "src" &&
      newValue != null &&
      newValue.trim() !== "" &&
      !this.hasAttribute("document")
    ) {
      this.#loadSrc(newValue)
      return
    }

    if (name === "padding") this.#requestMetricsSync()
  }

  /** @returns {JsonCanvasDocument | undefined} */
  get canvasDocument() {
    return this.#canvasDocument
  }

  /** @param {unknown} value */
  set canvasDocument(value) {
    const normalized = normalizeJsonCanvasDocument(value)
    this.#canvasDocument = normalized
    this.#renderDocument(normalized)
  }

  /** @returns {JsonCanvasDocument | undefined} */
  get document() {
    return this.canvasDocument
  }

  /** @param {unknown} value */
  set document(value) {
    this.canvasDocument = value
  }

  /** @returns {string} */
  get src() {
    return this.getAttribute("src") ?? ""
  }

  /** @param {string | null | undefined} value */
  set src(value) {
    if (value == null) this.removeAttribute("src")
    else this.setAttribute("src", String(value))
  }

  /** @returns {number} */
  get padding() {
    return getNumberAttribute(this, "padding", 48)
  }

  /** @param {number | string | null | undefined} value */
  set padding(value) {
    if (value == null) this.removeAttribute("padding")
    else this.setAttribute("padding", String(value))
  }

  /** @param {unknown} value */
  renderDocument(value) {
    this.canvasDocument = value
  }

  /** @returns {{ nodes: JsonCanvasNodeData[], edges: JsonCanvasEdgeData[] }} */
  toCanvasDocument() {
    /** @type {JsonCanvasNodeData[]} */
    const nodes = []
    /** @type {JsonCanvasEdgeData[]} */
    const edges = []

    for (const child of Array.from(this.children)) {
      if (child instanceof JsonCanvasNode) nodes.push(child.toCanvasNode())
      if (child instanceof NoodleWire) {
        const edge = child.toCanvasEdge()
        if (edge.fromNode && edge.toNode) edges.push(edge)
      }
    }

    return { nodes, edges }
  }

  refresh() {
    this.#syncMetrics()
    refreshContainedWires(this)
  }

  #connectDragListeners() {
    this.addEventListener("dragstart", this.#handleDragStart)
    this.addEventListener("drag", this.#handleDrag)
    this.addEventListener("dragend", this.#handleDragEnd)
    this.addEventListener("dragenter", this.#handleDragEnter)
    this.addEventListener("dragover", this.#handleDragOver)
    this.addEventListener("dragleave", this.#handleDragLeave)
    this.addEventListener("drop", this.#handleDrop)
  }

  #disconnectDragListeners() {
    this.removeEventListener("dragstart", this.#handleDragStart)
    this.removeEventListener("drag", this.#handleDrag)
    this.removeEventListener("dragend", this.#handleDragEnd)
    this.removeEventListener("dragenter", this.#handleDragEnter)
    this.removeEventListener("dragover", this.#handleDragOver)
    this.removeEventListener("dragleave", this.#handleDragLeave)
    this.removeEventListener("drop", this.#handleDrop)
  }

  #ensureShadow() {
    if (this.shadowRoot) return

    const shadow = this.attachShadow({ mode: "open" })
    const slot = document.createElement("slot")
    slot.onslotchange = () => this.#requestMetricsSync()
    shadow.append(createStyle(canvasStyles), slot)
  }

  /** @returns {JsonCanvasDocument | null} */
  #readInlineDocument() {
    const script = this.querySelector(
      'script[type="application/json"], script[type="application/jsoncanvas+json"]',
    )
    if (!script) return null

    try {
      return normalizeJsonCanvasDocument(JSON.parse(script.textContent ?? "{}"))
    } catch (error) {
      this.#dispatchError(error, { source: "inline-document" })
      return null
    }
  }

  /** @param {string} src */
  async #loadSrc(src) {
    const href = src.trim()
    if (!href) return

    const token = Symbol("json-canvas-load")
    this.#loadToken = token
    this.setAttribute("data-json-canvas-state", "loading")

    try {
      const response = await fetch(href)
      if (this.#loadToken !== token) return
      if (!response.ok)
        throw new Error(
          `Could not load JSON Canvas document (${response.status} ${response.statusText}).`,
        )

      const value = await response.json()
      if (this.#loadToken !== token) return

      this.canvasDocument = value
      this.setAttribute("data-json-canvas-state", "ready")
      dispatchJsonCanvasEvent(this, "json-canvas-load", {
        document: this.#canvasDocument,
        src: href,
      })
    } catch (error) {
      if (this.#loadToken !== token) return
      this.setAttribute("data-json-canvas-state", "error")
      this.#dispatchError(error, { source: "src", src: href })
    }
  }

  /** @param {JsonCanvasDocument} canvasDocument */
  #renderDocument(canvasDocument) {
    const fragment = document.createDocumentFragment()
    const nodes = canvasDocument.nodes ?? []
    const edges = canvasDocument.edges ?? []

    nodes.forEach((node, index) => {
      const element = document.createElement(nodeTagName)
      if (element instanceof JsonCanvasNode) element.canvasNode = node
      else applyJsonCanvasNodeAttributes(element, node)
      element.style.zIndex = String(index + 2)
      fragment.append(element)
    })

    for (const edge of edges) {
      const element = document.createElement(edgeTagName)
      if (element instanceof NoodleWire) element.canvasEdge = edge
      else applyJsonCanvasEdgeAttributes(element, edge)
      fragment.append(element)
    }

    this.replaceChildren(fragment)
    this.#syncMetrics()
    this.setAttribute("data-json-canvas-state", "ready")
    dispatchJsonCanvasEvent(this, "json-canvas-render", {
      document: canvasDocument,
      nodes,
      edges,
    })
  }

  #requestMetricsSync() {
    if (this.#metricsQueued) return

    this.#metricsQueued = true
    queueMicrotask(() => {
      this.#metricsQueued = false
      if (this.isConnected) this.#syncMetrics()
    })
  }

  #syncMetrics() {
    const nodes = Array.from(this.children).filter(
      (child) => child instanceof JsonCanvasNode,
    )
    const padding = Math.max(0, this.padding)

    if (nodes.length === 0) {
      this.style.setProperty("--json-canvas-offset-x", `${padding}px`)
      this.style.setProperty("--json-canvas-offset-y", `${padding}px`)
      this.style.setProperty("--json-canvas-width", "100%")
      this.style.setProperty("--json-canvas-height", "16rem")
      return
    }

    let minX = 0
    let minY = 0
    let maxX = 0
    let maxY = 0

    for (const node of nodes) {
      minX = Math.min(minX, node.x)
      minY = Math.min(minY, node.y)
      maxX = Math.max(maxX, node.x + node.width)
      maxY = Math.max(maxY, node.y + node.height)
    }

    this.style.setProperty("--json-canvas-offset-x", `${padding - minX}px`)
    this.style.setProperty("--json-canvas-offset-y", `${padding - minY}px`)
    this.style.setProperty(
      "--json-canvas-width",
      `${maxX - minX + padding * 2}px`,
    )
    this.style.setProperty(
      "--json-canvas-height",
      `${maxY - minY + padding * 2}px`,
    )
    refreshContainedWires(this)
  }

  /** @param {DragEvent} event */
  #startNodeDrag(event) {
    const target = event.target
    const node = /** @type {any} */ (
      target instanceof Element ? target.closest(nodeTagName) : null
    )
    if (!(node instanceof JsonCanvasNode) || node.closest("json-canvas") !== this)
      return
    if (!event.dataTransfer) return

    const nodeRect = node.getBoundingClientRect()
    const offsetX = event.clientX - nodeRect.left
    const offsetY = event.clientY - nodeRect.top
    this.#nodeDrag = {
      id: node.nodeId,
      offsetX,
      offsetY,
      startX: node.x,
      startY: node.y,
    }
    this.dataset.draggingNode = node.nodeId
    node.setAttribute("data-json-canvas-dragging", "")

    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData(
      nodeDragDataType,
      JSON.stringify(this.#nodeDrag),
    )
    event.dataTransfer.setData("text/plain", node.nodeId)
  }

  /** @param {DragEvent} event */
  #dragNode(event) {
    if (!this.#nodeDrag) return
    if (event.clientX === 0 && event.clientY === 0) return
    this.#moveDraggedNode(event, this.#nodeDrag)
  }

  /** @param {DragEvent} event */
  #endNodeDrag(event) {
    this.#clearNodeDrag()
  }

  /** @param {DragEvent} event */
  #acceptNodeDrag(event) {
    const data = this.#getNodeDragData(event)
    if (!data) return

    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move"
    this.setAttribute("data-json-canvas-drop-target", "")
    if (event.type === "dragover") this.#moveDraggedNode(event, data)
  }

  /** @param {DragEvent} event */
  #leaveNodeDrag(event) {
    if (
      event.relatedTarget instanceof Node &&
      this.contains(event.relatedTarget)
    )
      return
    this.removeAttribute("data-json-canvas-drop-target")
  }

  /** @param {DragEvent} event */
  #dropNode(event) {
    const data = this.#getNodeDragData(event)
    if (!data) return

    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move"

    const moved = this.#moveDraggedNode(event, data)
    if (!moved) return

    const oldX = data.startX ?? moved.oldX
    const oldY = data.startY ?? moved.oldY
    dispatchJsonCanvasEvent(this, "json-canvas-node-move", {
      node: moved.node.toCanvasNode(),
      oldX,
      oldY,
      x: moved.x,
      y: moved.y,
    })
    this.#clearNodeDrag()
  }

  /** @param {DragEvent} event */
  #getNodeDragData(event) {
    const transferredData = readNodeDragData(event.dataTransfer)
    const localData =
      transferredData && this.#nodeDrag?.id === transferredData.id
        ? this.#nodeDrag
        : (transferredData ?? this.#nodeDrag)
    if (!localData || !this.#findNode(localData.id)) return null
    return localData
  }

  /**
   * @param {DragEvent} event
   * @param {JsonCanvasNodeDragData} data
   */
  #moveDraggedNode(event, data) {
    const node = /** @type {any} */ (this.#findNode(data.id))
    if (!node) return null

    const canvasRect = this.getBoundingClientRect()
    const oldX = node.x
    const oldY = node.y
    const nextX = Math.round(
      event.clientX -
        canvasRect.left +
        this.scrollLeft -
        data.offsetX -
        this.#canvasOffsetX,
    )
    const nextY = Math.round(
      event.clientY -
        canvasRect.top +
        this.scrollTop -
        data.offsetY -
        this.#canvasOffsetY,
    )

    if (oldX !== nextX) node.x = nextX
    if (oldY !== nextY) node.y = nextY
    this.#canvasDocument = this.toCanvasDocument()
    this.refresh()
    return {
      node,
      oldX,
      oldY,
      x: nextX,
      y: nextY,
    }
  }

  #clearNodeDrag() {
    const id = this.#nodeDrag?.id
    if (id) this.#findNode(id)?.removeAttribute("data-json-canvas-dragging")
    this.#nodeDrag = undefined
    delete this.dataset.draggingNode
    this.removeAttribute("data-json-canvas-drop-target")
  }

  /** @param {string} id */
  #findNode(id) {
    for (const node of Array.from(this.querySelectorAll(nodeTagName))) {
      const canvasNode = /** @type {any} */ (node)
      if (node instanceof JsonCanvasNode && canvasNode.nodeId === id)
        return canvasNode
    }
    return null
  }

  /** @returns {number} */
  get #canvasOffsetX() {
    return cssPixelValue(
      getComputedStyle(this).getPropertyValue("--json-canvas-offset-x"),
    )
  }

  /** @returns {number} */
  get #canvasOffsetY() {
    return cssPixelValue(
      getComputedStyle(this).getPropertyValue("--json-canvas-offset-y"),
    )
  }

  /**
   * @param {unknown} error
   * @param {Record<string, unknown>} [detail]
   */
  #dispatchError(error, detail = {}) {
    dispatchJsonCanvasEvent(this, "json-canvas-error", { ...detail, error })
  }
}

export class JsonCanvasNode extends HTMLElement {
  static observedAttributes = [
    "background",
    "background-style",
    "color",
    "file",
    "height",
    "id",
    "label",
    "subpath",
    "text",
    "type",
    "url",
    "width",
    "x",
    "y",
  ]

  /** @type {string | undefined} */
  #textValue

  connectedCallback() {
    this.draggable = true
    this.#render()
  }

  /**
   * @param {string} _name
   * @param {string | null} oldValue
   * @param {string | null} newValue
   */
  attributeChangedCallback(_name, oldValue, newValue) {
    if (oldValue === newValue) return
    this.#render()
    requestContainerRefresh(this)
  }

  /** @returns {JsonCanvasNodeData} */
  get canvasNode() {
    return this.toCanvasNode()
  }

  /** @param {unknown} value */
  set canvasNode(value) {
    const node = normalizeJsonCanvasNode(value)
    if (!node) return

    this.#textValue = typeof node.text === "string" ? node.text : undefined
    applyJsonCanvasNodeAttributes(this, node)
    this.#render()
    requestContainerRefresh(this)
  }

  /** @returns {string} */
  get nodeId() {
    return this.id
  }

  /** @param {string | null | undefined} value */
  set nodeId(value) {
    if (value == null) this.removeAttribute("id")
    else this.id = String(value)
  }

  /** @returns {JsonCanvasNodeType} */
  get type() {
    return normalizeNodeType(this.getAttribute("type"))
  }

  /** @param {JsonCanvasNodeType | string | null | undefined} value */
  set type(value) {
    if (value == null) this.removeAttribute("type")
    else this.setAttribute("type", String(value))
  }

  /** @returns {number} */
  get x() {
    return getNumberAttribute(this, "x", 0)
  }

  /** @param {number | string | null | undefined} value */
  set x(value) {
    if (value == null) this.removeAttribute("x")
    else this.setAttribute("x", String(value))
  }

  /** @returns {number} */
  get y() {
    return getNumberAttribute(this, "y", 0)
  }

  /** @param {number | string | null | undefined} value */
  set y(value) {
    if (value == null) this.removeAttribute("y")
    else this.setAttribute("y", String(value))
  }

  /** @returns {number} */
  get width() {
    return getNumberAttribute(this, "width", 240)
  }

  /** @param {number | string | null | undefined} value */
  set width(value) {
    if (value == null) this.removeAttribute("width")
    else this.setAttribute("width", String(value))
  }

  /** @returns {number} */
  get height() {
    return getNumberAttribute(this, "height", 140)
  }

  /** @param {number | string | null | undefined} value */
  set height(value) {
    if (value == null) this.removeAttribute("height")
    else this.setAttribute("height", String(value))
  }

  /** @returns {string} */
  get color() {
    return this.getAttribute("color") ?? ""
  }

  /** @param {string | null | undefined} value */
  set color(value) {
    if (value == null) this.removeAttribute("color")
    else this.setAttribute("color", String(value))
  }

  /** @returns {string} */
  get text() {
    if (this.#textValue != null) return this.#textValue

    const attribute = this.getAttribute("text")
    if (attribute != null) return attribute

    const script = this.querySelector(
      'script[type="text/plain"], script[type="text/markdown"], script[type="text/x-markdown"]',
    )
    if (script) return stripSurroundingBlankLines(script.textContent ?? "")

    return stripSurroundingBlankLines(this.textContent ?? "")
  }

  /** @param {string | null | undefined} value */
  set text(value) {
    this.#textValue = value == null ? undefined : String(value)
    this.#render()
  }

  /** @returns {string} */
  get file() {
    return this.getAttribute("file") ?? ""
  }

  /** @param {string | null | undefined} value */
  set file(value) {
    if (value == null) this.removeAttribute("file")
    else this.setAttribute("file", String(value))
  }

  /** @returns {string} */
  get subpath() {
    return this.getAttribute("subpath") ?? ""
  }

  /** @param {string | null | undefined} value */
  set subpath(value) {
    if (value == null) this.removeAttribute("subpath")
    else this.setAttribute("subpath", String(value))
  }

  /** @returns {string} */
  get url() {
    return this.getAttribute("url") ?? ""
  }

  /** @param {string | null | undefined} value */
  set url(value) {
    if (value == null) this.removeAttribute("url")
    else this.setAttribute("url", String(value))
  }

  /** @returns {string} */
  get label() {
    return this.getAttribute("label") ?? ""
  }

  /** @param {string | null | undefined} value */
  set label(value) {
    if (value == null) this.removeAttribute("label")
    else this.setAttribute("label", String(value))
  }

  /** @returns {string} */
  get background() {
    return this.getAttribute("background") ?? ""
  }

  /** @param {string | null | undefined} value */
  set background(value) {
    if (value == null) this.removeAttribute("background")
    else this.setAttribute("background", String(value))
  }

  /** @returns {JsonCanvasBackgroundStyle | ""} */
  get backgroundStyle() {
    return normalizeBackgroundStyle(this.getAttribute("background-style")) ?? ""
  }

  /** @param {JsonCanvasBackgroundStyle | string | null | undefined} value */
  set backgroundStyle(value) {
    if (value == null) this.removeAttribute("background-style")
    else this.setAttribute("background-style", String(value))
  }

  /** @returns {JsonCanvasNodeData} */
  toCanvasNode() {
    /** @type {JsonCanvasNodeData} */
    const node = {
      id: this.nodeId,
      type: this.type,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    }

    if (this.color) node.color = this.color

    if (node.type === "text") node.text = this.text
    if (node.type === "file") {
      node.file = this.file
      if (this.subpath) node.subpath = this.subpath
    }
    if (node.type === "link") node.url = this.url
    if (node.type === "group") {
      if (this.label) node.label = this.label
      if (this.background) node.background = this.background
      const style = this.backgroundStyle
      if (style) node.backgroundStyle = style
    }

    return node
  }

  #render() {
    this.#syncHostStyle()
    const node = this.toCanvasNode()

    const shadow = ensureOpenShadow(this)
    const section = document.createElement(
      node.type === "group" ? "section" : "article",
    )
    section.className = `node node--${node.type}`
    section.setAttribute("part", "node")
    section.dataset.type = node.type

    const header = document.createElement("header")
    header.className = "node__header"

    const chip = document.createElement("span")
    chip.className = "node__chip"
    chip.textContent = node.type

    const title = document.createElement("span")
    title.className = "node__title"
    title.textContent = getNodeTitle(node)

    header.append(chip, title)

    const body = document.createElement("div")
    body.className = "node__body"
    body.setAttribute("part", "body")

    if (node.type === "text") renderMarkdownLite(body, node.text ?? "")
    if (node.type === "file") renderFileNode(body, node)
    if (node.type === "link") renderLinkNode(body, node)
    if (node.type === "group") renderGroupNode(section, body, node)

    if (body.childNodes.length === 0) {
      section.classList.add("node--empty")
      body.textContent = "Empty node"
    }

    section.append(header, body)
    shadow.replaceChildren(createStyle(nodeStyles), section)
  }

  #syncHostStyle() {
    this.style.left = `calc(var(--json-canvas-offset-x, 0px) + ${this.x}px)`
    this.style.top = `calc(var(--json-canvas-offset-y, 0px) + ${this.y}px)`
    this.style.width = `${Math.max(0, this.width)}px`
    this.style.height = `${Math.max(0, this.height)}px`
    this.style.setProperty(
      "--json-canvas-node-accent",
      canvasColorToCss(
        this.color,
        "color-mix(in oklch, Highlight 76%, CanvasText 8%)",
      ),
    )
  }
}

export class NoodleWire extends HTMLElement {
  static observedAttributes = [
    "color",
    "from",
    "from-end",
    "from-side",
    "id",
    "label",
    "tension",
    "to",
    "to-end",
    "to-side",
  ]

  /** @type {Element | null} */
  #fromElement = null

  /** @type {Element | null} */
  #toElement = null

  /** @type {ResizeObserver | undefined} */
  #resizeObserver

  /** @type {boolean} */
  #updateQueued = false

  /** @type {() => void} */
  #handleViewportChange = () => this.#requestUpdate()

  connectedCallback() {
    this.#ensureShadow()
    this.#connectViewportListeners()
    this.#requestUpdate()
  }

  disconnectedCallback() {
    this.#disconnectViewportListeners()
    this.#resizeObserver?.disconnect()
    this.#fromElement = null
    this.#toElement = null
  }

  /**
   * @param {string} _name
   * @param {string | null} oldValue
   * @param {string | null} newValue
   */
  attributeChangedCallback(_name, oldValue, newValue) {
    if (oldValue === newValue) return
    this.#syncColor()
    this.#requestUpdate()
  }

  /** @returns {JsonCanvasEdgeData} */
  get canvasEdge() {
    return this.toCanvasEdge()
  }

  /** @param {unknown} value */
  set canvasEdge(value) {
    const edge = normalizeJsonCanvasEdge(value)
    if (!edge) return

    applyJsonCanvasEdgeAttributes(this, edge)
    this.#syncColor()
    this.#requestUpdate()
  }

  /** @returns {string} */
  get edgeId() {
    return this.id
  }

  /** @param {string | null | undefined} value */
  set edgeId(value) {
    if (value == null) this.removeAttribute("id")
    else this.id = String(value)
  }

  /** @returns {string} */
  get from() {
    return this.getAttribute("from") ?? ""
  }

  /** @param {string | null | undefined} value */
  set from(value) {
    if (value == null) this.removeAttribute("from")
    else this.setAttribute("from", String(value))
  }

  /** @returns {string} */
  get to() {
    return this.getAttribute("to") ?? ""
  }

  /** @param {string | null | undefined} value */
  set to(value) {
    if (value == null) this.removeAttribute("to")
    else this.setAttribute("to", String(value))
  }

  /** @returns {string} */
  get fromNode() {
    return this.from
  }

  /** @param {string | null | undefined} value */
  set fromNode(value) {
    this.from = value
  }

  /** @returns {string} */
  get toNode() {
    return this.to
  }

  /** @param {string | null | undefined} value */
  set toNode(value) {
    this.to = value
  }

  /** @returns {JsonCanvasSide | undefined} */
  get fromSide() {
    return normalizeSide(this.getAttribute("from-side"))
  }

  /** @param {JsonCanvasSide | string | null | undefined} value */
  set fromSide(value) {
    if (value == null) this.removeAttribute("from-side")
    else this.setAttribute("from-side", String(value))
  }

  /** @returns {JsonCanvasSide | undefined} */
  get toSide() {
    return normalizeSide(this.getAttribute("to-side"))
  }

  /** @param {JsonCanvasSide | string | null | undefined} value */
  set toSide(value) {
    if (value == null) this.removeAttribute("to-side")
    else this.setAttribute("to-side", String(value))
  }

  /** @returns {JsonCanvasEnd} */
  get fromEnd() {
    return normalizeEnd(this.getAttribute("from-end"), "none")
  }

  /** @param {JsonCanvasEnd | string | null | undefined} value */
  set fromEnd(value) {
    if (value == null) this.removeAttribute("from-end")
    else this.setAttribute("from-end", String(value))
  }

  /** @returns {JsonCanvasEnd} */
  get toEnd() {
    return normalizeEnd(this.getAttribute("to-end"), "arrow")
  }

  /** @param {JsonCanvasEnd | string | null | undefined} value */
  set toEnd(value) {
    if (value == null) this.removeAttribute("to-end")
    else this.setAttribute("to-end", String(value))
  }

  /** @returns {string} */
  get color() {
    return this.getAttribute("color") ?? ""
  }

  /** @param {string | null | undefined} value */
  set color(value) {
    if (value == null) this.removeAttribute("color")
    else this.setAttribute("color", String(value))
  }

  /** @returns {string} */
  get label() {
    return this.getAttribute("label") ?? ""
  }

  /** @param {string | null | undefined} value */
  set label(value) {
    if (value == null) this.removeAttribute("label")
    else this.setAttribute("label", String(value))
  }

  /** @returns {number} */
  get tension() {
    const value = Number(this.getAttribute("tension"))
    return Number.isFinite(value) ? Math.max(0, value) : 0.45
  }

  /** @param {number | string | null | undefined} value */
  set tension(value) {
    if (value == null) this.removeAttribute("tension")
    else this.setAttribute("tension", String(value))
  }

  /** @returns {JsonCanvasEdgeData} */
  toCanvasEdge() {
    /** @type {JsonCanvasEdgeData} */
    const edge = {
      id: this.edgeId,
      fromNode: this.fromNode,
      fromEnd: this.fromEnd,
      toNode: this.toNode,
      toEnd: this.toEnd,
    }

    if (this.fromSide) edge.fromSide = this.fromSide
    if (this.toSide) edge.toSide = this.toSide
    if (this.color) edge.color = this.color
    if (this.label) edge.label = this.label

    return edge
  }

  refresh() {
    this.#requestUpdate()
  }

  #ensureShadow() {
    if (!this.shadowRoot)
      this.attachShadow({ mode: "open" }).append(createStyle(wireStyles))
    this.#syncColor()
  }

  #connectViewportListeners() {
    globalThis.addEventListener("resize", this.#handleViewportChange)
    globalThis.addEventListener("scroll", this.#handleViewportChange, true)
  }

  #disconnectViewportListeners() {
    globalThis.removeEventListener("resize", this.#handleViewportChange)
    globalThis.removeEventListener("scroll", this.#handleViewportChange, true)
  }

  #syncColor() {
    this.style.setProperty(
      "--json-canvas-edge-color",
      canvasColorToCss(
        this.color,
        "color-mix(in oklch, CanvasText 72%, transparent)",
      ),
    )
  }

  #requestUpdate() {
    if (!this.isConnected || this.#updateQueued) return

    this.#updateQueued = true
    requestAnimationFrame(() => {
      this.#updateQueued = false
      if (this.isConnected) this.#update()
    })
  }

  #update() {
    this.#ensureShadow()

    const fromElement = resolveElementReference(this, this.fromNode)
    const toElement = resolveElementReference(this, this.toNode)

    this.#observeElements(fromElement, toElement)

    if (!fromElement || !toElement) {
      this.setAttribute("data-wire-state", "missing")
      this.#drawMissing()
      return
    }

    const hostRect = boxFromRect(this.getBoundingClientRect())
    const fromRect = boxFromRect(fromElement.getBoundingClientRect())
    const toRect = boxFromRect(toElement.getBoundingClientRect())
    const fromSide = this.fromSide ?? autoSide(fromRect, toRect)
    const toSide = this.toSide ?? autoSide(toRect, fromRect)
    const fromPoint = anchorPoint(fromRect, fromSide, hostRect)
    const toPoint = anchorPoint(toRect, toSide, hostRect)
    const distance = distanceBetween(fromPoint, toPoint)
    const controlOffset = clamp(distance * this.tension, 32, 260)
    const fromVector = sideVector(fromSide)
    const toVector = sideVector(toSide)
    const controlPointA = {
      x: fromPoint.x + fromVector.x * controlOffset,
      y: fromPoint.y + fromVector.y * controlOffset,
    }
    const controlPointB = {
      x: toPoint.x + toVector.x * controlOffset,
      y: toPoint.y + toVector.y * controlOffset,
    }
    const path = `M ${roundPathNumber(fromPoint.x)} ${roundPathNumber(fromPoint.y)} C ${roundPathNumber(controlPointA.x)} ${roundPathNumber(controlPointA.y)} ${roundPathNumber(controlPointB.x)} ${roundPathNumber(controlPointB.y)} ${roundPathNumber(toPoint.x)} ${roundPathNumber(toPoint.y)}`
    const labelPoint = cubicPoint(
      fromPoint,
      controlPointA,
      controlPointB,
      toPoint,
      0.5,
    )

    this.setAttribute("data-wire-state", "ready")
    this.#drawPath(path, labelPoint)
  }

  /**
   * @param {Element | null} fromElement
   * @param {Element | null} toElement
   */
  #observeElements(fromElement, toElement) {
    if (
      this.#fromElement === fromElement &&
      this.#toElement === toElement &&
      this.#resizeObserver
    )
      return

    this.#fromElement = fromElement
    this.#toElement = toElement
    this.#resizeObserver?.disconnect()

    if (typeof ResizeObserver !== "function") return

    this.#resizeObserver = new ResizeObserver(() => this.#requestUpdate())
    this.#resizeObserver.observe(this)
    if (fromElement instanceof Element)
      this.#resizeObserver.observe(fromElement)
    if (toElement instanceof Element) this.#resizeObserver.observe(toElement)
  }

  #drawMissing() {
    const shadow = ensureOpenShadow(this)
    shadow.replaceChildren(createStyle(wireStyles))
  }

  /**
   * @param {string} pathData
   * @param {Point} labelPoint
   */
  #drawPath(pathData, labelPoint) {
    const shadow = ensureOpenShadow(this)
    const hostRect = this.getBoundingClientRect()
    const width = Math.max(1, Math.ceil(hostRect.width))
    const height = Math.max(1, Math.ceil(hostRect.height))
    const svg = createSvgElement("svg")
    svg.setAttribute("aria-hidden", "true")
    svg.setAttribute("part", "svg")
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`)

    const defs = createSvgElement("defs")
    const marker = createSvgElement("marker")
    marker.setAttribute("id", "arrow")
    marker.setAttribute("markerHeight", "10")
    marker.setAttribute("markerUnits", "strokeWidth")
    marker.setAttribute("markerWidth", "10")
    marker.setAttribute("orient", "auto-start-reverse")
    marker.setAttribute("refX", "9")
    marker.setAttribute("refY", "5")
    marker.setAttribute("viewBox", "0 0 10 10")

    const arrow = createSvgElement("path")
    arrow.setAttribute("d", "M 0 0 L 10 5 L 0 10 z")
    marker.append(arrow)
    defs.append(marker)
    svg.append(defs)

    const path = createSvgElement("path")
    path.classList.add("wire")
    path.setAttribute("d", pathData)
    path.setAttribute("part", "path")
    if (this.fromEnd === "arrow")
      path.setAttribute("marker-start", "url(#arrow)")
    if (this.toEnd === "arrow") path.setAttribute("marker-end", "url(#arrow)")
    svg.append(path)

    if (this.label) {
      const text = createSvgElement("text")
      text.setAttribute("part", "label")
      text.setAttribute("x", String(roundPathNumber(labelPoint.x)))
      text.setAttribute("y", String(roundPathNumber(labelPoint.y)))
      text.textContent = this.label
      svg.append(text)
    }

    shadow.replaceChildren(createStyle(wireStyles), svg)
  }
}

export class JsonCanvasEdge extends NoodleWire {}

/** @param {string} [name] */
export function defineNoodleWire(name = wireTagName) {
  if (!customElements.get(name)) customElements.define(name, NoodleWire)
}

/** @param {string} [name] */
export function defineJsonCanvasNode(name = nodeTagName) {
  if (!customElements.get(name)) customElements.define(name, JsonCanvasNode)
}

/** @param {string} [name] */
export function defineJsonCanvasEdge(name = edgeTagName) {
  if (!customElements.get(name)) customElements.define(name, JsonCanvasEdge)
}

/** @param {string} [name] */
export function defineJsonCanvas(name = "json-canvas") {
  defineNoodleWire()
  defineJsonCanvasNode()
  defineJsonCanvasEdge()
  if (!customElements.get(name)) customElements.define(name, JsonCanvasElement)
}

export function defineJsonCanvasElements() {
  defineNoodleWire()
  defineJsonCanvasNode()
  defineJsonCanvasEdge()
  defineJsonCanvas()
}

/**
 * @param {Element} element
 * @param {string} value
 */
function parseJsonCanvasDocumentAttribute(element, value) {
  try {
    return normalizeJsonCanvasDocument(JSON.parse(value))
  } catch (error) {
    dispatchJsonCanvasEvent(element, "json-canvas-error", {
      attribute: "document",
      error,
      value,
    })
    return invalidAttributeValue
  }
}

/** @param {unknown} value @returns {JsonCanvasDocument} */
function normalizeJsonCanvasDocument(value) {
  if (!isRecord(value)) return { nodes: [], edges: [] }

  /** @type {JsonCanvasNodeData[]} */
  const nodes = Array.isArray(value.nodes)
    ? value.nodes.map(normalizeJsonCanvasNode).filter(isJsonCanvasNode)
    : []
  /** @type {JsonCanvasEdgeData[]} */
  const edges = Array.isArray(value.edges)
    ? value.edges.map(normalizeJsonCanvasEdge).filter(isJsonCanvasEdge)
    : []

  return {
    nodes,
    edges,
  }
}

/** @param {unknown} value */
function normalizeJsonCanvasNode(value) {
  if (!isRecord(value)) return null
  if (typeof value.id !== "string" || value.id.length === 0) return null

  const x = finiteNumber(value.x)
  const y = finiteNumber(value.y)
  const width = finiteNumber(value.width)
  const height = finiteNumber(value.height)
  if (x == null || y == null || width == null || height == null) return null

  const type = normalizeNodeType(value.type)
  /** @type {JsonCanvasNodeData} */
  const node = {
    id: value.id,
    type,
    x,
    y,
    width,
    height,
  }

  if (typeof value.color === "string") node.color = value.color

  if (type === "text")
    node.text = typeof value.text === "string" ? value.text : ""
  if (type === "file") {
    node.file = typeof value.file === "string" ? value.file : ""
    if (typeof value.subpath === "string") node.subpath = value.subpath
  }
  if (type === "link") node.url = typeof value.url === "string" ? value.url : ""
  if (type === "group") {
    if (typeof value.label === "string") node.label = value.label
    if (typeof value.background === "string") node.background = value.background
    const backgroundStyle = normalizeBackgroundStyle(value.backgroundStyle)
    if (backgroundStyle) node.backgroundStyle = backgroundStyle
  }

  return node
}

/** @param {unknown} value */
function normalizeJsonCanvasEdge(value) {
  if (!isRecord(value)) return null
  if (typeof value.id !== "string" || value.id.length === 0) return null
  if (typeof value.fromNode !== "string" || value.fromNode.length === 0)
    return null
  if (typeof value.toNode !== "string" || value.toNode.length === 0) return null

  /** @type {JsonCanvasEdgeData} */
  const edge = {
    id: value.id,
    fromNode: value.fromNode,
    fromEnd: normalizeEnd(value.fromEnd, "none"),
    toNode: value.toNode,
    toEnd: normalizeEnd(value.toEnd, "arrow"),
  }

  const fromSide = normalizeSide(value.fromSide)
  const toSide = normalizeSide(value.toSide)
  if (fromSide) edge.fromSide = fromSide
  if (toSide) edge.toSide = toSide
  if (typeof value.color === "string") edge.color = value.color
  if (typeof value.label === "string") edge.label = value.label

  return edge
}

/** @param {Element} element @param {JsonCanvasNodeData} node */
function applyJsonCanvasNodeAttributes(element, node) {
  setAttributeValue(element, "id", node.id)
  setAttributeValue(element, "type", node.type)
  setAttributeValue(element, "x", node.x)
  setAttributeValue(element, "y", node.y)
  setAttributeValue(element, "width", node.width)
  setAttributeValue(element, "height", node.height)
  setAttributeValue(element, "color", node.color)
  setAttributeValue(element, "file", node.file)
  setAttributeValue(element, "subpath", node.subpath)
  setAttributeValue(element, "url", node.url)
  setAttributeValue(element, "label", node.label)
  setAttributeValue(element, "background", node.background)
  setAttributeValue(element, "background-style", node.backgroundStyle)
  if (element instanceof JsonCanvasNode && typeof node.text === "string")
    element.text = node.text
  else setAttributeValue(element, "text", node.text)
}

/** @param {Element} element @param {JsonCanvasEdgeData} edge */
function applyJsonCanvasEdgeAttributes(element, edge) {
  setAttributeValue(element, "id", edge.id)
  setAttributeValue(element, "from", edge.fromNode)
  setAttributeValue(element, "to", edge.toNode)
  setAttributeValue(element, "from-side", edge.fromSide)
  setAttributeValue(element, "to-side", edge.toSide)
  setAttributeValue(element, "from-end", edge.fromEnd)
  setAttributeValue(element, "to-end", edge.toEnd)
  setAttributeValue(element, "color", edge.color)
  setAttributeValue(element, "label", edge.label)
}

/**
 * @param {Element} element
 * @param {string} name
 * @param {unknown} value
 */
function setAttributeValue(element, name, value) {
  if (value == null || value === "") element.removeAttribute(name)
  else element.setAttribute(name, String(value))
}

/** @param {unknown} value */
function normalizeNodeType(value) {
  if (value === "file" || value === "link" || value === "group") return value
  return "text"
}

/** @param {unknown} value */
function normalizeSide(value) {
  if (
    value === "top" ||
    value === "right" ||
    value === "bottom" ||
    value === "left"
  )
    return value
  return undefined
}

/** @param {unknown} value @param {JsonCanvasEnd} fallback */
function normalizeEnd(value, fallback) {
  if (value === "none" || value === "arrow") return value
  return fallback
}

/** @param {unknown} value */
function normalizeBackgroundStyle(value) {
  if (value === "cover" || value === "ratio" || value === "repeat") return value
  return undefined
}

/** @param {unknown} value */
function finiteNumber(value) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN
  return Number.isFinite(number) ? number : null
}

/** @param {DataTransfer | null} dataTransfer */
function readNodeDragData(dataTransfer) {
  if (!dataTransfer || !Array.from(dataTransfer.types).includes(nodeDragDataType))
    return null

  try {
    const parsed = JSON.parse(dataTransfer.getData(nodeDragDataType))
    if (!isRecord(parsed)) return null
    if (typeof parsed.id !== "string" || parsed.id.length === 0) return null

    const offsetX = finiteNumber(parsed.offsetX)
    const offsetY = finiteNumber(parsed.offsetY)
    const startX = finiteNumber(parsed.startX)
    const startY = finiteNumber(parsed.startY)
    return {
      id: parsed.id,
      offsetX: offsetX ?? 0,
      offsetY: offsetY ?? 0,
      startX: startX ?? undefined,
      startY: startY ?? undefined,
    }
  } catch {
    return null
  }
}

/** @param {string} value */
function cssPixelValue(value) {
  const number = Number.parseFloat(value)
  return Number.isFinite(number) ? number : 0
}

/** @param {unknown} value @returns {value is JsonCanvasNodeData} */
function isJsonCanvasNode(value) {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.type === "string"
  )
}

/** @param {unknown} value @returns {value is JsonCanvasEdgeData} */
function isJsonCanvasEdge(value) {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.fromNode === "string" &&
    typeof value.toNode === "string"
  )
}

/** @param {Element} element @param {string} name @param {number} fallback */
function getNumberAttribute(element, name, fallback) {
  const value = finiteNumber(element.getAttribute(name))
  return value == null ? fallback : value
}

/** @param {string} color @param {string} fallback */
function canvasColorToCss(color, fallback) {
  const value = color.trim()
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value))
    return value
  if (value === "1") return "var(--json-canvas-color-1, #ef4444)"
  if (value === "2") return "var(--json-canvas-color-2, #f97316)"
  if (value === "3") return "var(--json-canvas-color-3, #eab308)"
  if (value === "4") return "var(--json-canvas-color-4, #22c55e)"
  if (value === "5") return "var(--json-canvas-color-5, #06b6d4)"
  if (value === "6") return "var(--json-canvas-color-6, #8b5cf6)"
  return fallback
}

/** @param {JsonCanvasNodeData} node */
function getJsonCanvasNodeKindLabel(node) {
  if (node.type === "text") return node.text ?? node.id
  if (node.type === "file") return node.file ?? node.id
  if (node.type === "link") return node.url ?? node.id
  if (node.type === "group") return node.label ?? node.id
  return node.id
}

/** @param {JsonCanvasNodeData} node */
function nodeLabelFromCanvasNode(node) {
  return firstNonEmptyLine(getJsonCanvasNodeKindLabel(node)) || node.id
}

/** @param {string} text */
function firstNonEmptyLine(text) {
  return (
    String(text)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ?? ""
  )
}

/** @param {HTMLElement} container @param {string} markdown */
function renderMarkdownLite(container, markdown) {
  const source = stripSurroundingBlankLines(markdown)
  if (!source) return

  const lines = source.split(/\r?\n/)
  let index = 0

  while (index < lines.length) {
    const line = lines[index] ?? ""
    if (line.trim() === "") {
      index += 1
      continue
    }

    const fence = line.match(/^```(.*)$/)
    if (fence) {
      const codeLines = []
      index += 1
      while (index < lines.length && !/^```/.test(lines[index] ?? "")) {
        codeLines.push(lines[index] ?? "")
        index += 1
      }
      if (index < lines.length) index += 1
      const pre = document.createElement("pre")
      const code = document.createElement("code")
      const language = fence[1]?.trim()
      if (language) code.className = `language-${language}`
      code.textContent = codeLines.join("\n")
      pre.append(code)
      container.append(pre)
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      const level = heading[1]?.length ?? 1
      const headingElement = document.createElement(`h${Math.min(6, level)}`)
      appendInlineMarkdown(headingElement, heading[2] ?? "")
      container.append(headingElement)
      index += 1
      continue
    }

    if (/^>\s?/.test(line)) {
      const blockquote = document.createElement("blockquote")
      const parts = []
      while (index < lines.length && /^>\s?/.test(lines[index] ?? "")) {
        parts.push((lines[index] ?? "").replace(/^>\s?/, ""))
        index += 1
      }
      appendInlineMarkdown(blockquote, parts.join("\n"))
      container.append(blockquote)
      continue
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const list = document.createElement("ul")
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index] ?? "")) {
        const item = document.createElement("li")
        appendInlineMarkdown(
          item,
          (lines[index] ?? "").replace(/^\s*[-*+]\s+/, ""),
        )
        list.append(item)
        index += 1
      }
      container.append(list)
      continue
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const list = document.createElement("ol")
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index] ?? "")) {
        const item = document.createElement("li")
        appendInlineMarkdown(
          item,
          (lines[index] ?? "").replace(/^\s*\d+\.\s+/, ""),
        )
        list.append(item)
        index += 1
      }
      container.append(list)
      continue
    }

    const paragraphLines = []
    while (
      index < lines.length &&
      lines[index]?.trim() !== "" &&
      !isMarkdownBlockStart(lines[index] ?? "")
    ) {
      paragraphLines.push(lines[index] ?? "")
      index += 1
    }

    const paragraph = document.createElement("p")
    appendInlineMarkdown(paragraph, paragraphLines.join("\n"))
    container.append(paragraph)
  }
}

/** @param {string} line */
function isMarkdownBlockStart(line) {
  return (
    /^```/.test(line) ||
    /^(#{1,6})\s+/.test(line) ||
    /^>\s?/.test(line) ||
    /^\s*[-*+]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line)
  )
}

/** @param {Element} parent @param {string} text */
function appendInlineMarkdown(parent, text) {
  const pattern =
    /(`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*)/g
  let index = 0
  let match = pattern.exec(text)

  while (match) {
    if (match.index > index)
      parent.append(document.createTextNode(text.slice(index, match.index)))

    if (match[2] != null) {
      const code = document.createElement("code")
      code.textContent = match[2]
      parent.append(code)
    } else if (match[3] != null && match[4] != null) {
      const anchor = document.createElement("a")
      anchor.textContent = match[3]
      if (isSafeHref(match[4])) anchor.href = match[4]
      parent.append(anchor)
    } else if (match[5] != null) {
      const strong = document.createElement("strong")
      strong.textContent = match[5]
      parent.append(strong)
    } else if (match[6] != null) {
      const emphasis = document.createElement("em")
      emphasis.textContent = match[6]
      parent.append(emphasis)
    }

    index = match.index + match[0].length
    match = pattern.exec(text)
  }

  if (index < text.length)
    parent.append(document.createTextNode(text.slice(index)))
}

/** @param {HTMLElement} body @param {JsonCanvasNodeData} node */
function renderFileNode(body, node) {
  const file = node.file
  if (!file) return

  if (isImagePath(file)) {
    const media = document.createElement("div")
    media.className = "node__media"
    const image = document.createElement("img")
    image.alt = nodeLabelFromCanvasNode(node)
    image.loading = "lazy"
    image.src = file
    media.append(image)
    body.append(media)
  }

  const anchor = document.createElement("a")
  anchor.className = "node__path"
  anchor.href = file + (node.subpath ?? "")
  anchor.textContent = file
  body.append(anchor)

  if (node.subpath) {
    const subpath = document.createElement("div")
    subpath.className = "node__subpath"
    subpath.textContent = node.subpath
    body.append(subpath)
  }
}

/** @param {HTMLElement} body @param {JsonCanvasNodeData} node */
function renderLinkNode(body, node) {
  const url = node.url
  if (!url) return

  const anchor = document.createElement("a")
  anchor.className = "node__url"
  anchor.href = isSafeHref(url) ? url : "#"
  anchor.rel = "noreferrer"
  anchor.target = "_blank"
  anchor.textContent = url
  body.append(anchor)
}

/** @param {HTMLElement} section @param {HTMLElement} body @param {JsonCanvasNodeData} node */
function renderGroupNode(section, body, node) {
  if (node.background) {
    section.style.backgroundImage = `linear-gradient(color-mix(in oklch, Canvas 72%, transparent), color-mix(in oklch, Canvas 72%, transparent)), ${cssUrl(node.background)}`

    if (node.backgroundStyle === "cover") {
      section.style.backgroundPosition = "center"
      section.style.backgroundRepeat = "no-repeat"
      section.style.backgroundSize = "cover"
    } else if (node.backgroundStyle === "ratio") {
      section.style.backgroundPosition = "center"
      section.style.backgroundRepeat = "no-repeat"
      section.style.backgroundSize = "contain"
    } else if (node.backgroundStyle === "repeat") {
      section.style.backgroundRepeat = "repeat"
      section.style.backgroundSize = "auto"
    }
  }

  body.textContent = node.label ? "Group container" : "Group"
}

/** @param {JsonCanvasNodeData} node */
function getNodeTitle(node) {
  return (
    firstNonEmptyLine(getJsonCanvasNodeKindLabel(node)) || node.id || node.type
  )
}

/** @param {string} text */
function stripSurroundingBlankLines(text) {
  return text.replace(/^\s*\n/, "").replace(/\n\s*$/, "")
}

/** @param {string} value */
function isSafeHref(value) {
  const href = value.trim()
  return /^(https?:|mailto:|tel:|\/|\.\/|\.\.\/|#)/i.test(href)
}

/** @param {string} value */
function isImagePath(value) {
  return /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(value)
}

/** @param {string} value */
function cssUrl(value) {
  return `url("${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}")`
}

/** @param {Element} element */
function requestContainerRefresh(element) {
  const canvas = element.closest("json-canvas")
  if (canvas instanceof JsonCanvasElement) {
    canvas.refresh()
    return
  }

  const parent = element.parentElement
  if (parent) refreshContainedWires(parent)
}

/** @param {ParentNode} container */
function refreshContainedWires(container) {
  for (const wire of Array.from(
    container.querySelectorAll(`${edgeTagName}, ${wireTagName}`),
  )) {
    if (wire instanceof NoodleWire) wire.refresh()
  }
}

/** @param {Element} element @param {string} reference */
function resolveElementReference(element, reference) {
  const text = reference.trim()
  if (!text) return null

  const scope = getReferenceScope(element)
  const selectorLike = looksLikeSelector(text)

  if (selectorLike) {
    const selected = querySelectorSafely(scope, text)
    if (selected && selected !== element) return selected
  }

  const id = text.startsWith("#") ? text.slice(1) : text
  const matched = findElementByEndpointId(scope, id, element)
  if (matched) return matched

  if (!selectorLike) {
    const selected = querySelectorSafely(scope, text)
    if (selected && selected !== element) return selected
  }

  return null
}

/** @param {Element} element */
function getReferenceScope(element) {
  const canvas = element.closest("json-canvas")
  if (canvas) return canvas
  if (element.parentElement) return element.parentElement

  const root = element.getRootNode()
  if (root instanceof Document || root instanceof ShadowRoot) return root
  return document
}

/** @param {string} value */
function looksLikeSelector(value) {
  return /^[#.[*:>+~]/.test(value) || /\s/.test(value)
}

/** @param {ParentNode} scope @param {string} selector */
function querySelectorSafely(scope, selector) {
  try {
    return scope.querySelector(selector)
  } catch {
    return null
  }
}

/** @param {ParentNode} scope @param {string} id @param {Element} requester */
function findElementByEndpointId(scope, id, requester) {
  const candidates = scope.querySelectorAll("[id]")

  for (const candidate of Array.from(candidates)) {
    if (candidate === requester) continue
    if (candidate.id === id) return candidate
  }

  return null
}

/** @param {DOMRect} rect */
function boxFromRect(rect) {
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2,
  }
}

/** @param {Box} rect @param {Box} other */
function autoSide(rect, other) {
  const dx = other.centerX - rect.centerX
  const dy = other.centerY - rect.centerY
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left"
  return dy >= 0 ? "bottom" : "top"
}

/** @param {Box} rect @param {JsonCanvasSide} side @param {Box} host */
function anchorPoint(rect, side, host) {
  if (side === "top")
    return { x: rect.centerX - host.left, y: rect.top - host.top }
  if (side === "right")
    return { x: rect.right - host.left, y: rect.centerY - host.top }
  if (side === "bottom")
    return { x: rect.centerX - host.left, y: rect.bottom - host.top }
  return { x: rect.left - host.left, y: rect.centerY - host.top }
}

/** @param {JsonCanvasSide} side */
function sideVector(side) {
  if (side === "top") return { x: 0, y: -1 }
  if (side === "right") return { x: 1, y: 0 }
  if (side === "bottom") return { x: 0, y: 1 }
  return { x: -1, y: 0 }
}

/** @param {Point} a @param {Point} b */
function distanceBetween(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

/** @param {number} value @param {number} min @param {number} max */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/** @param {number} value */
function roundPathNumber(value) {
  return Math.round(value * 100) / 100
}

/** @param {Point} a @param {Point} b @param {Point} c @param {Point} d @param {number} t */
function cubicPoint(a, b, c, d, t) {
  const mt = 1 - t
  return {
    x:
      mt ** 3 * a.x +
      3 * mt ** 2 * t * b.x +
      3 * mt * t ** 2 * c.x +
      t ** 3 * d.x,
    y:
      mt ** 3 * a.y +
      3 * mt ** 2 * t * b.y +
      3 * mt * t ** 2 * c.y +
      t ** 3 * d.y,
  }
}

/** @param {Element} element @param {string} name @param {unknown} detail */
function dispatchJsonCanvasEvent(element, name, detail) {
  return element.dispatchEvent(
    new CustomEvent(name, {
      bubbles: true,
      composed: true,
      detail,
    }),
  )
}

/** @param {Element} element */
function ensureOpenShadow(element) {
  return element.shadowRoot ?? element.attachShadow({ mode: "open" })
}

/** @param {string} text */
function createStyle(text) {
  const style = document.createElement("style")
  style.textContent = text
  return style
}

/** @param {string} name */
function createSvgElement(name) {
  return document.createElementNS("http://www.w3.org/2000/svg", name)
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}
