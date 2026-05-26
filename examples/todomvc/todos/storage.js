export const storageKey = "web-native:todomvc"

export function loadTodos() {
  try {
    const value = localStorage.getItem(storageKey)
    if (!value) return []

    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []

    return parsed
      .map(normalizeTodo)
      .filter(Boolean)
  } catch {
    return []
  }
}

export function saveTodos(todos) {
  localStorage.setItem(storageKey, JSON.stringify(todos))
}

function normalizeTodo(value) {
  if (!value || typeof value !== "object") return undefined

  const id = typeof value.id === "string" && value.id ? value.id : createId()
  const title = typeof value.title === "string" ? value.title.trim() : ""
  if (!title) return undefined

  return {
    id,
    title,
    completed: Boolean(value.completed),
  }
}

function createId() {
  if (typeof crypto?.randomUUID === "function") return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
