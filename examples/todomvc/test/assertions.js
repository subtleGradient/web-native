export function assert(condition, message) {
  if (!condition) throw new Error(message)
}

export function equal(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${format(expected)}, received ${format(actual)}`)
  }
}

export function includes(value, expected, message) {
  if (!String(value).includes(expected)) {
    throw new Error(`${message}: expected ${format(value)} to include ${format(expected)}`)
  }
}

export function isVisible(element, message) {
  assert(visible(element), message)
}

export function isHidden(element, message) {
  assert(!visible(element), message)
}

export function visible(element) {
  if (!element) return false
  const win = element.ownerDocument.defaultView
  const style = win.getComputedStyle(element)
  if (element.hidden || style.display === "none" || style.visibility === "hidden") return false
  return element.getClientRects().length > 0
}

function format(value) {
  return typeof value === "string" ? JSON.stringify(value) : String(value)
}
