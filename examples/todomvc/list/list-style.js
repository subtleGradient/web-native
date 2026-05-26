export const listStyle = String.raw`
  todo-list {
    display: block;
  }

  .toggle-all {
    block-size: 2rem;
    inline-size: 2rem;
    inset-block-start: -3rem;
    inset-inline-start: 1rem;
    margin: 0;
    position: absolute;
    z-index: 2;
  }

  .toggle-all-label {
    color: var(--muted-foreground);
    font-size: 0.75rem;
    inset-block-start: -3.15rem;
    inset-inline-start: 0.75rem;
    line-height: 1;
    min-block-size: 2.25rem;
    min-inline-size: 2.5rem;
    position: absolute;
  }

  .todo-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
`
