const css = String.raw

export const appStyle = css`
  :root {
    color-scheme: light dark;
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
      sans-serif;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  body {
    background:
      radial-gradient(circle at top left, color-mix(in oklch, var(--primary) 10%, transparent), transparent 26rem),
      color-mix(in oklch, var(--background) 94%, var(--muted) 6%);
    color: var(--foreground);
    margin: 0;
    min-inline-size: 14.5rem;
    padding: 0 clamp(1rem, 4vw, 2rem) 3rem;
  }

  todo-app {
    display: block;
    inline-size: min(100%, 34.5rem);
    margin: 0 auto;
  }

  .todoapp {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    box-shadow:
      0 1px 2px color-mix(in oklch, var(--foreground) 6%, transparent),
      0 1.25rem 3rem color-mix(in oklch, var(--foreground) 10%, transparent);
    color: var(--card-foreground);
    overflow: clip;
  }

  .main[hidden],
  .footer[hidden],
  [hidden] {
    display: none !important;
  }

  .main {
    border-block-start: 1px solid var(--border);
    display: block;
    position: relative;
  }

  .info {
    color: var(--muted-foreground);
    display: grid;
    font-size: 0.75rem;
    gap: 0.25rem;
    line-height: 1.4;
    margin: 2rem auto 0;
    max-inline-size: 34.5rem;
    text-align: center;
  }

  .info p {
    margin: 0;
  }

  .info a {
    color: inherit;
    font-weight: 650;
    text-decoration: none;
  }

  .info a:hover {
    text-decoration: underline;
  }

  .visually-hidden {
    block-size: 1px;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    inline-size: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
  }

  @media (max-width: 40rem) {
    body {
      padding-inline: 0.75rem;
    }
  }
`
