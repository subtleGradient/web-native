const routeNames = new Set(["all", "active", "completed"])

export function readRoute(location = globalThis.location) {
  return normalizeRoute(location.hash)
}

export function normalizeRoute(hash) {
  const route = String(hash ?? "")
    .replace(/^#\/?/, "")
    .split("/")[0]

  return routeNames.has(route) ? route : "all"
}

export function isKnownRoute(route) {
  return routeNames.has(route)
}

export function isTodoVisible(todo, route) {
  if (route === "active") return !todo.completed
  if (route === "completed") return todo.completed
  return true
}

export function routeHref(route) {
  return route === "all" ? "#/" : `#/${route}`
}
