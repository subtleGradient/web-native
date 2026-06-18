const css = String.raw

export const topbarStyle = css`
  .header {
    display: grid;
  }

  .header h1 {
    color: color-mix(in oklch, var(--destructive) 52%, transparent);
    font-size: clamp(4rem, 18vw, 6.25rem);
    font-weight: 100;
    letter-spacing: 0;
    line-height: 1;
    margin: 1rem 0 1.25rem;
    text-align: center;
    text-rendering: optimizeLegibility;
  }

  .new-todo-form {
    margin: 0;
  }

  .new-todo-shell {
    border-radius: 0;
    display: block;
    inline-size: 100%;
  }

  .new-todo {
    background: var(--card);
    border: 0;
    color: var(--foreground);
    font: inherit;
    font-size: 1.5rem;
    inline-size: 100%;
    line-height: 1.4;
    min-block-size: 4rem;
    padding: 1rem 1rem 1rem 4rem;
  }

  .new-todo::placeholder {
    color: color-mix(in oklch, var(--muted-foreground) 48%, transparent);
    font-style: italic;
  }

  .new-todo:focus {
    outline: 2px solid var(--ring);
    outline-offset: -2px;
  }

  @media (max-width: 40rem) {
    .new-todo {
      font-size: 1.125rem;
      min-block-size: 3.5rem;
      padding-inline-start: 3.25rem;
    }
  }
`
