export const itemStyle = String.raw`
  .todo-list li {
    border-block-end: 1px solid var(--border);
    color: var(--foreground);
    display: block;
    font-size: 1.5rem;
    line-height: 1.35;
    min-inline-size: 0;
    position: relative;
  }

  .todo-list li[hidden] {
    display: none;
  }

  .todo-list li .view {
    align-items: center;
    display: grid;
    grid-template-columns: 4rem minmax(0, 1fr) 3rem;
    min-block-size: 3.75rem;
  }

  .todo-list li.editing .view {
    display: none;
  }

  .todo-list li .toggle {
    block-size: 1.625rem;
    inline-size: 1.625rem;
    justify-self: center;
    margin: 0;
  }

  .todo-list li label {
    display: block;
    min-inline-size: 0;
    overflow-wrap: anywhere;
    padding: 0.85rem 0.5rem 0.85rem 0;
  }

  .todo-list li.completed label {
    color: color-mix(in oklch, var(--muted-foreground) 64%, transparent);
    text-decoration: line-through;
  }

  .destroy-button {
    color: color-mix(in oklch, var(--destructive) 84%, var(--foreground) 16%);
    justify-self: center;
    opacity: 0;
  }

  .destroy {
    align-items: center;
    display: inline-flex;
    justify-content: center;
    min-block-size: 100%;
    min-inline-size: 100%;
  }

  .todo-list li:hover .destroy-button,
  .destroy-button:focus,
  .destroy-button:focus-visible,
  .destroy:focus,
  .destroy:focus-visible {
    opacity: 1;
  }

  .edit-shell {
    display: none;
    padding: 0.5rem 0.75rem 0.5rem 4rem;
  }

  .todo-list li.editing .edit-shell {
    display: block;
  }

  .edit {
    background: var(--card);
    border: 1px solid var(--ring);
    color: var(--foreground);
    font: inherit;
    inline-size: 100%;
    line-height: 1.35;
    min-block-size: 3rem;
    padding: 0.55rem 0.75rem;
  }

  .edit:focus {
    outline: 2px solid var(--ring);
    outline-offset: -2px;
  }

  @media (hover: none) {
    .destroy-button {
      opacity: 1;
    }
  }

  @media (max-width: 40rem) {
    .todo-list li {
      font-size: 1.125rem;
    }

    .todo-list li .view {
      grid-template-columns: 3.25rem minmax(0, 1fr) 2.75rem;
      min-block-size: 3.25rem;
    }

    .edit-shell {
      padding-inline-start: 3.25rem;
    }
  }
`
