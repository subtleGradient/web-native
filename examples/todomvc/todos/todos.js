import { loadTodos, saveTodos } from "./storage.js"

export class TodoStore {
  #todos = loadTodos()

  get all() {
    return this.#todos.map((todo) => ({ ...todo }))
  }

  get counts() {
    const total = this.#todos.length
    const completed = this.#todos.filter((todo) => todo.completed).length
    const active = total - completed

    return { active, completed, total }
  }

  add(title) {
    const trimmed = String(title ?? "").trim()
    if (!trimmed) return undefined

    const todo = {
      id: createId(),
      title: trimmed,
      completed: false,
    }

    this.#todos = [...this.#todos, todo]
    this.#commit()
    return { ...todo }
  }

  toggle(id, completed) {
    this.#todos = this.#todos.map((todo) =>
      todo.id === id ? { ...todo, completed: Boolean(completed) } : todo,
    )
    this.#commit()
  }

  toggleAll(completed) {
    this.#todos = this.#todos.map((todo) => ({ ...todo, completed: Boolean(completed) }))
    this.#commit()
  }

  updateTitle(id, title) {
    const trimmed = String(title ?? "").trim()
    if (!trimmed) {
      this.remove(id)
      return
    }

    this.#todos = this.#todos.map((todo) => (todo.id === id ? { ...todo, title: trimmed } : todo))
    this.#commit()
  }

  remove(id) {
    this.#todos = this.#todos.filter((todo) => todo.id !== id)
    this.#commit()
  }

  clearCompleted() {
    this.#todos = this.#todos.filter((todo) => !todo.completed)
    this.#commit()
  }

  #commit() {
    saveTodos(this.#todos)
  }
}

function createId() {
  if (typeof crypto?.randomUUID === "function") return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
