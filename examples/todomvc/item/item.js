import { isTodoVisible } from "../routes/routes.js"

export function renderTodoItem(todo, { editingId, route }) {
  const id = escapeAttribute(todo.id)
  const title = escapeText(todo.title)
  const titleAttribute = escapeAttribute(todo.title)
  const classes = [
    todo.completed ? "completed" : "",
    editingId === todo.id ? "editing" : "",
  ].filter(Boolean).join(" ")
  const hidden = isTodoVisible(todo, route) ? "" : "hidden"

  return `
    <li data-id="${id}" class="${classes}" ${hidden}>
      <div class="view">
        <input
          class="toggle"
          type="checkbox"
          aria-label="Toggle ${titleAttribute}"
          onchange="todos.toggle(event)"
          ${todo.completed ? "checked" : ""}
        />
        <label ondblclick="todos.startEdit(event)" tabindex="0">${title}</label>
        <shadcn-button
          class="destroy-button"
          variant="ghost"
          size="icon-sm"
          aria-label="Remove ${titleAttribute}"
          title="Remove ${titleAttribute}"
        >
          <span class="destroy" onclick="todos.remove(event)">x</span>
        </shadcn-button>
      </div>
      <shadcn-input class="edit-shell">
        <input
          class="edit"
          aria-label="Edit ${titleAttribute}"
          value="${titleAttribute}"
          onkeydown="todos.editKey(event)"
          onblur="todos.commitEdit(event)"
        />
      </shadcn-input>
    </li>
  `
}

function escapeText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function escapeAttribute(value) {
  return escapeText(value)
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}
