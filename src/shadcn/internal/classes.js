// @ts-check

/** @type {WeakMap<Element, string[]>} */
const appliedClassTokens = new WeakMap()

/**
 * @param {Element} element
 * @param {string} slot
 */
export function setSlot(element, slot) {
  element.setAttribute("data-slot", slot)
}

/**
 * @param {Element} element
 * @param {Record<string, string>} attributes
 */
export function setDataAttributes(element, attributes) {
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(`data-${name}`, value)
  }
}

/**
 * @param {Element} element
 * @param {string[]} classTokens
 */
export function syncGeneratedClasses(element, classTokens) {
  for (const token of appliedClassTokens.get(element) ?? []) {
    element.classList.remove(token)
  }

  const nextTokens = classTokens.filter(Boolean)
  element.classList.add(...nextTokens)
  appliedClassTokens.set(element, nextTokens)
}

/**
 * @param {string | null | undefined} value
 * @param {string} fallback
 * @param {readonly string[]} allowed
 * @returns {string}
 */
export function normalizeToken(value, fallback, allowed) {
  return value && allowed.includes(value) ? value : fallback
}

/**
 * @param {Element} element
 * @param {string} name
 * @param {boolean} value
 */
export function setBooleanAttribute(element, name, value) {
  if (value) {
    element.setAttribute(name, "")
  } else {
    element.removeAttribute(name)
  }
}
