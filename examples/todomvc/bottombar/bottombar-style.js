export const bottombarStyle = String.raw`
  .footer {
    align-items: center;
    color: var(--muted-foreground);
    display: grid;
    font-size: 0.875rem;
    gap: 0.75rem;
    grid-template-columns: minmax(7rem, 1fr) auto minmax(7rem, 1fr);
    padding: 0.75rem 1rem;
  }

  .todo-count {
    font-variant-numeric: tabular-nums;
  }

  .todo-count strong {
    color: var(--foreground);
    font-weight: 700;
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    justify-content: center;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .filters a {
    border: 1px solid transparent;
    border-radius: 0.375rem;
    color: inherit;
    display: inline-flex;
    line-height: 1.4;
    padding: 0.2rem 0.45rem;
    text-decoration: none;
  }

  .filters a:hover {
    border-color: color-mix(in oklch, var(--border) 72%, var(--foreground) 28%);
  }

  .filters a.selected {
    border-color: color-mix(in oklch, var(--destructive) 42%, var(--border) 58%);
    color: var(--foreground);
  }

  .clear-completed-button {
    justify-self: end;
  }

  .clear-completed-button[hidden] {
    display: none !important;
  }

  .clear-completed {
    display: inline-flex;
  }

  @media (max-width: 40rem) {
    .footer {
      grid-template-columns: 1fr;
      justify-items: center;
    }

    .clear-completed-button {
      justify-self: center;
    }
  }
`
