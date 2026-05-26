import { renderTodoItem } from "../item/item.js"

class TodoList extends HTMLElement {
  render({ counts, editingId, route, todos }) {
    const allCompleted = counts.total > 0 && counts.completed === counts.total

    this.innerHTML = `
      <input
        id="toggle-all"
        class="toggle-all"
        type="checkbox"
        aria-label="Mark all todos as complete"
        onchange="todos.toggleAll(event)"
        ${allCompleted ? "checked" : ""}
      />
      <label class="toggle-all-label" for="toggle-all">
        <span class="visually-hidden">Mark all todos as complete</span>
      </label>
      <ul id="todo-list" class="todo-list" role="list">
        ${todos.map((todo) => renderTodoItem(todo, { editingId, route })).join("")}
      </ul>
    `
  }
}

if (!customElements.get("todo-list")) customElements.define("todo-list", TodoList)

export { TodoList }
