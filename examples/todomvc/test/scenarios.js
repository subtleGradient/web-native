import { assert, equal, includes, isHidden, isVisible, visible } from "./assertions.js"
import { storageKey } from "../todos/storage.js"

export const scenarios = [
  {
    name: "initial focus and empty state",
    async run({ loadApp }) {
      const app = await loadApp()

      equal(app.doc.activeElement, query(app, ".new-todo"), "new todo input is focused")
      equal(queryAll(app, ".todo-list li").length, 0, "starts with no todos")
      isHidden(query(app, ".main"), "main is hidden when empty")
      isHidden(query(app, ".footer"), "footer is hidden when empty")
      assert(app.win.customElements.get("todo-app"), "todo-app is defined")
      assert(app.win.customElements.get("todo-topbar"), "todo-topbar is defined")
      assert(app.win.customElements.get("todo-list"), "todo-list is defined")
      assert(app.win.customElements.get("todo-bottombar"), "todo-bottombar is defined")
    },
  },
  {
    name: "add, trim, append, and count",
    async run({ loadApp }) {
      const app = await loadApp()

      await submitTodo(app, "    buy some cheese    ")
      await submitTodo(app, "feed the cat")

      const items = queryAll(app, ".todo-list li")
      equal(items.length, 2, "two todos are rendered")
      equal(labelText(items[0]), "buy some cheese", "first todo is trimmed")
      equal(labelText(items[1]), "feed the cat", "second todo is appended")
      equal(query(app, ".new-todo").value, "", "new todo input is cleared")
      includes(query(app, ".todo-count").textContent, "2", "active count is shown")
      isVisible(query(app, ".main"), "main is visible with todos")
      isVisible(query(app, ".footer"), "footer is visible with todos")
      equal(readStoredTodos().length, 2, "todos are stored")
    },
  },
  {
    name: "toggle one todo and toggle all",
    async run({ loadApp }) {
      const app = await loadApp()
      await createDefaults(app)

      queryAll(app, ".toggle")[0].click()
      await nextFrame(app)
      assert(queryAll(app, ".todo-list li")[0].classList.contains("completed"), "first todo is completed")
      assert(!query(app, "#toggle-all").checked, "toggle all remains unchecked")

      query(app, "#toggle-all").click()
      await nextFrame(app)
      assert(query(app, "#toggle-all").checked, "toggle all is checked")
      assert(queryAll(app, ".todo-list li").every((item) => item.classList.contains("completed")), "all todos are completed")

      query(app, "#toggle-all").click()
      await nextFrame(app)
      assert(!query(app, "#toggle-all").checked, "toggle all is unchecked")
      assert(queryAll(app, ".todo-list li").every((item) => !item.classList.contains("completed")), "all todos are active")
    },
  },
  {
    name: "editing save, blur, cancel, and empty delete",
    async run({ loadApp }) {
      const app = await loadApp()
      await createDefaults(app)

      await startEdit(app, 1)
      equal(query(app, ".editing .edit").value, "feed the cat", "edit input receives current title")
      isHidden(query(app, ".editing .toggle"), "toggle is hidden while editing")
      await editWithEnter(app, "buy some sausages")
      equal(labelText(queryAll(app, ".todo-list li")[1]), "buy some sausages", "enter saves edit")

      await startEdit(app, 0)
      await editWithBlur(app, "buy better cheese")
      equal(labelText(queryAll(app, ".todo-list li")[0]), "buy better cheese", "blur saves edit")

      await startEdit(app, 0)
      await editWithEscape(app, "cancelled title")
      equal(labelText(queryAll(app, ".todo-list li")[0]), "buy better cheese", "escape cancels edit")

      await startEdit(app, 1)
      await editWithEnter(app, "   ")
      equal(queryAll(app, ".todo-list li").length, 2, "empty edit deletes item")
      equal(labelText(queryAll(app, ".todo-list li")[1]), "book a doctors appointment", "remaining items keep order")
    },
  },
  {
    name: "clear completed",
    async run({ loadApp }) {
      const app = await loadApp()
      await createDefaults(app)

      queryAll(app, ".toggle")[1].click()
      await nextFrame(app)
      isVisible(query(app, ".clear-completed"), "clear completed is visible")
      includes(query(app, ".clear-completed").textContent, "Clear completed", "clear completed text is correct")

      query(app, ".clear-completed").click()
      await nextFrame(app)

      const items = queryAll(app, ".todo-list li")
      equal(items.length, 2, "completed todo is removed")
      equal(labelText(items[0]), "buy some cheese", "first active todo remains")
      equal(labelText(items[1]), "book a doctors appointment", "third active todo remains")
      isHidden(query(app, ".clear-completed"), "clear completed hides when nothing is completed")
    },
  },
  {
    name: "routing and browser back",
    async run({ loadApp, waitFor }) {
      const app = await loadApp()
      await createDefaults(app)
      queryAll(app, ".toggle")[1].click()
      await nextFrame(app)

      query(app, '#filters a[href="#/active"]').click()
      await waitFor(() => app.win.location.hash === "#/active" && visibleItems(app).length === 2)
      equal(visibleItems(app).length, 2, "active route shows active todos")
      assert(query(app, '#filters a[href="#/active"]').classList.contains("selected"), "active filter is selected")

      query(app, '#filters a[href="#/completed"]').click()
      await waitFor(() => app.win.location.hash === "#/completed" && visibleItems(app).length === 1)
      equal(visibleItems(app).length, 1, "completed route shows completed todos")
      assert(query(app, '#filters a[href="#/completed"]').classList.contains("selected"), "completed filter is selected")

      query(app, '#filters a[href="#/"]').click()
      await waitFor(() => app.win.location.hash === "#/" && visibleItems(app).length === 3)
      equal(visibleItems(app).length, 3, "all route shows every todo")
      assert(query(app, '#filters a[href="#/"]').classList.contains("selected"), "all filter is selected")

      app.win.history.back()
      await waitFor(() => app.win.location.hash === "#/completed" && visibleItems(app).length === 1)
      equal(visibleItems(app).length, 1, "back returns to completed route")
    },
  },
  {
    name: "localStorage persistence",
    async run({ loadApp }) {
      const app = await loadApp()
      await submitTodo(app, "buy some cheese")
      await submitTodo(app, "feed the cat")
      queryAll(app, ".toggle")[0].click()
      await nextFrame(app)

      await app.reload()

      const items = queryAll(app, ".todo-list li")
      equal(items.length, 2, "todos survive reload")
      assert(items[0].classList.contains("completed"), "completed state survives reload")
      equal(labelText(items[1]), "feed the cat", "titles survive reload")
    },
  },
  {
    name: "mobile layout has no horizontal overflow",
    async run({ loadApp }) {
      const app = await loadApp({ width: 390, height: 844 })
      await submitTodo(app, "a very long todo title that should wrap inside the available mobile width without causing page overflow")

      const root = app.doc.documentElement
      assert(root.scrollWidth <= root.clientWidth + 1, "page does not overflow horizontally")
    },
  },
]

const defaultTodos = ["buy some cheese", "feed the cat", "book a doctors appointment"]

function query(app, selector) {
  const element = app.doc.querySelector(selector)
  assert(element, `missing selector ${selector}`)
  return element
}

function queryAll(app, selector) {
  return Array.from(app.doc.querySelectorAll(selector))
}

function labelText(item) {
  return item.querySelector("label")?.textContent ?? ""
}

function readStoredTodos() {
  return JSON.parse(localStorage.getItem(storageKey) ?? "[]")
}

async function createDefaults(app) {
  for (const title of defaultTodos) await submitTodo(app, title)
}

async function submitTodo(app, title) {
  const input = query(app, ".new-todo")
  input.value = title
  input.dispatchEvent(new app.win.Event("input", { bubbles: true }))
  input.form.dispatchEvent(new app.win.Event("submit", { bubbles: true, cancelable: true }))
  await nextFrame(app)
}

async function startEdit(app, index) {
  const label = queryAll(app, ".todo-list li")[index].querySelector("label")
  label.dispatchEvent(new app.win.MouseEvent("dblclick", { bubbles: true, cancelable: true }))
  await nextFrame(app)
}

async function editWithEnter(app, title) {
  const input = query(app, ".editing .edit")
  input.value = title
  input.dispatchEvent(new app.win.Event("input", { bubbles: true }))
  input.dispatchEvent(new app.win.KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" }))
  await nextFrame(app)
}

async function editWithBlur(app, title) {
  const input = query(app, ".editing .edit")
  input.value = title
  input.dispatchEvent(new app.win.Event("input", { bubbles: true }))
  input.dispatchEvent(new app.win.FocusEvent("blur", { bubbles: false }))
  await nextFrame(app)
}

async function editWithEscape(app, title) {
  const input = query(app, ".editing .edit")
  input.value = title
  input.dispatchEvent(new app.win.Event("input", { bubbles: true }))
  input.dispatchEvent(new app.win.KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" }))
  await nextFrame(app)
}

function visibleItems(app) {
  return queryAll(app, ".todo-list li").filter(visible)
}

function nextFrame(app) {
  return new Promise((resolve) => app.win.requestAnimationFrame(() => resolve()))
}
