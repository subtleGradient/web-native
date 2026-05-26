class TodoTopbar extends HTMLElement {
  render() {
    this.innerHTML = `
      <header class="header">
        <h1>todos</h1>
        <form class="new-todo-form" onsubmit="todos.insert(event)">
          <label class="visually-hidden" for="new-todo">What needs to be done?</label>
          <shadcn-input class="new-todo-shell">
            <input
              id="new-todo"
              class="new-todo"
              name="title"
              type="text"
              autocomplete="off"
              autofocus
              placeholder="What needs to be done?"
            />
          </shadcn-input>
        </form>
      </header>
    `
  }
}

if (!customElements.get("todo-topbar")) customElements.define("todo-topbar", TodoTopbar)

export { TodoTopbar }
