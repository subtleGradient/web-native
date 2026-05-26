import { routeHref } from "../routes/routes.js"

const filters = [
  ["all", "All"],
  ["active", "Active"],
  ["completed", "Completed"],
]

class TodoBottombar extends HTMLElement {
  render({ counts, route }) {
    this.innerHTML = `
      <footer id="footer" class="footer" ${counts.total === 0 ? "hidden" : ""}>
        <span id="todo-count" class="todo-count">
          <strong>${counts.active}</strong> ${counts.active === 1 ? "item" : "items"} left
        </span>
        <ul id="filters" class="filters" role="list">
          ${filters.map(([name, label]) => renderFilter(name, label, route)).join("")}
        </ul>
        <shadcn-button
          class="clear-completed-button"
          variant="ghost"
          size="sm"
          ${counts.completed === 0 ? "hidden" : ""}
        >
          <span id="clear-completed" class="clear-completed" onclick="todos.clearCompleted(event)">Clear completed</span>
        </shadcn-button>
      </footer>
    `
  }
}

function renderFilter(name, label, route) {
  return `
    <li>
      <a href="${routeHref(name)}" class="${route === name ? "selected" : ""}">${label}</a>
    </li>
  `
}

if (!customElements.get("todo-bottombar")) customElements.define("todo-bottombar", TodoBottombar)

export { TodoBottombar }
