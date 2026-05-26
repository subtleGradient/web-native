import { TodoStore } from "../todos/todos.js"
import { isKnownRoute, readRoute } from "../routes/routes.js"
import { appStyle } from "./app-style.js"
import { topbarStyle } from "../topbar/topbar-style.js"
import { listStyle } from "../list/list-style.js"
import { itemStyle } from "../item/item-style.js"
import { bottombarStyle } from "../bottombar/bottombar-style.js"
import "../topbar/topbar.js"
import "../list/list.js"
import "../bottombar/bottombar.js"

const styleModules = [
  ["todomvc-app", appStyle],
  ["todomvc-topbar", topbarStyle],
  ["todomvc-list", listStyle],
  ["todomvc-item", itemStyle],
  ["todomvc-bottombar", bottombarStyle],
]

class TodoApp extends HTMLElement {
  #store = new TodoStore()
  #route = readRoute()
  #editingId = null
  #handleRouteChange = () => this.#changeRoute(readRoute())

  connectedCallback() {
    installStyles()
    globalThis.todos = this
    this.#ensureShell()
    this.render()
    addEventListener("hashchange", this.#handleRouteChange)
    queueMicrotask(() => this.#focusNewTodo())
    globalThis.__webNativeTodoMVCReady = true
    globalThis.__webNativeStandaloneDemoReady = true
  }

  disconnectedCallback() {
    removeEventListener("hashchange", this.#handleRouteChange)
    if (globalThis.todos === this) delete globalThis.todos
    globalThis.__webNativeTodoMVCReady = false
    globalThis.__webNativeStandaloneDemoReady = false
  }

  render() {
    this.#ensureShell()

    const counts = this.#store.counts
    const topbar = this.querySelector("todo-topbar")
    const main = this.querySelector(".main")
    const list = this.querySelector("todo-list")
    const bottombar = this.querySelector("todo-bottombar")

    this.dataset.route = this.#route
    main.hidden = counts.total === 0
    topbar.render({ counts })
    list.render({
      counts,
      editingId: this.#editingId,
      route: this.#route,
      todos: this.#store.all,
    })
    bottombar.render({ counts, route: this.#route })
  }

  insert(event) {
    event.preventDefault()

    const form = event.currentTarget
    const input = form?.querySelector?.(".new-todo")
    if (!(input instanceof HTMLInputElement)) return

    this.#store.add(input.value)
    input.value = ""
    this.#editingId = null
    this.render()
    this.#focusNewTodo()
  }

  toggle(event) {
    const checkbox = event.currentTarget
    const item = checkbox?.closest?.("li[data-id]")
    if (!(checkbox instanceof HTMLInputElement) || !item) return

    this.#store.toggle(item.dataset.id, checkbox.checked)
    this.render()
  }

  toggleAll(event) {
    const checkbox = event.currentTarget
    if (!(checkbox instanceof HTMLInputElement)) return

    this.#store.toggleAll(checkbox.checked)
    this.render()
  }

  remove(event) {
    event.preventDefault()

    const item = event.currentTarget?.closest?.("li[data-id]")
    if (!item) return

    this.#store.remove(item.dataset.id)
    if (this.#editingId === item.dataset.id) this.#editingId = null
    this.render()
    this.#focusNewTodo()
  }

  clearCompleted(event) {
    event.preventDefault()
    this.#store.clearCompleted()
    this.#editingId = null
    this.render()
    this.#focusNewTodo()
  }

  startEdit(event) {
    const item = event.currentTarget?.closest?.("li[data-id]")
    if (!item) return

    this.#editingId = item.dataset.id ?? null
    this.render()

    const editInput = this.#findItem(this.#editingId)?.querySelector(".edit")
    if (editInput instanceof HTMLInputElement) {
      editInput.focus()
      editInput.select()
    }
  }

  editKey(event) {
    if (event.key === "Enter") {
      event.preventDefault()
      this.commitEdit(event)
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      if (event.currentTarget instanceof HTMLElement) {
        event.currentTarget.dataset.cancelled = "true"
      }
      this.cancelEdit()
    }
  }

  commitEdit(event) {
    const input = event.currentTarget
    if (!(input instanceof HTMLInputElement) || input.dataset.cancelled === "true") return

    const item = input.closest("li[data-id]")
    if (!item) return

    this.#store.updateTitle(item.dataset.id, input.value)
    this.#editingId = null
    this.render()
    this.#focusNewTodo()
  }

  cancelEdit() {
    this.#editingId = null
    this.render()
    this.#focusNewTodo()
  }

  #changeRoute(route) {
    this.#route = isKnownRoute(route) ? route : "all"
    this.#editingId = null
    this.render()
  }

  #ensureShell() {
    if (this.querySelector(".todoapp")) return

    this.innerHTML = `
      <section class="todoapp" aria-label="TodoMVC">
        <todo-topbar></todo-topbar>
        <main id="main" class="main">
          <todo-list></todo-list>
        </main>
        <todo-bottombar></todo-bottombar>
      </section>
    `
  }

  #focusNewTodo() {
    this.querySelector(".new-todo")?.focus()
  }

  #findItem(id) {
    return Array.from(this.querySelectorAll("li[data-id]")).find((item) => item.dataset.id === id)
  }
}

function installStyles() {
  for (const [id, css] of styleModules) {
    if (document.querySelector(`style[data-style-module="${id}"]`)) continue

    const style = document.createElement("style")
    style.dataset.styleModule = id
    style.textContent = css
    document.head.append(style)
  }
}

if (!customElements.get("todo-app")) customElements.define("todo-app", TodoApp)

export { TodoApp }
