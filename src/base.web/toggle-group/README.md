# base-toggle-group

Base UI-style toggle group custom elements with roving focus, single or multiple pressed values, cancelable value changes, and optional form submission.

```html
<script type="module" src="./define.js"></script>

<base-toggle-group multiple value="bold" aria-label="Formatting">
  <base-toggle-group-item value="bold">Bold</base-toggle-group-item>
  <base-toggle-group-item value="italic">Italic</base-toggle-group-item>
</base-toggle-group>
```

User changes dispatch `base-ui:value-change` with `{ value, previousValue, reason }`. Cancel the event to block the commit.
