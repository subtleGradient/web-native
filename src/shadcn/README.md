# shadcn web components

Styled shadcn-inspired custom elements for standalone browser usage.

```html
<meta name="color-scheme" content="light dark" />
<link rel="stylesheet" href="./themes/neutral.css" />
<link rel="stylesheet" href="./styles/base-nova.css" />
<script type="module" src="./define.js"></script>

<shadcn-button>Save changes</shadcn-button>

<shadcn-toggle variant="outline" size="sm">Bold</shadcn-toggle>

<shadcn-tabs value="account">
  <shadcn-tabs-list variant="line" aria-label="Settings sections">
    <shadcn-tabs-trigger value="account">Account</shadcn-tabs-trigger>
    <shadcn-tabs-trigger value="security">Security</shadcn-tabs-trigger>
  </shadcn-tabs-list>
  <shadcn-tabs-content value="account">Account settings</shadcn-tabs-content>
  <shadcn-tabs-content value="security">Security settings</shadcn-tabs-content>
</shadcn-tabs>
```

Interactive components expose shadcn-namespaced cancelable events:

- `shadcn:pressed-change` from `shadcn-toggle`
- `shadcn:value-change` from `shadcn-tabs`

The standalone GitHub import-map fixture is `examples/standalone/shadcn-github.html`.
