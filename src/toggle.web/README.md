# base-toggle

`base-toggle` is a two-state button-like custom element ported from Base UI Toggle behavior.

```html
<script type="module" src="./define.js"></script>

<base-toggle>Bold</base-toggle>
<base-toggle pressed>Selected</base-toggle>
<base-toggle disabled>Disabled</base-toggle>
```

The host exposes `role="button"`, `aria-pressed`, `data-pressed`, and `data-disabled`.

State changes dispatch `base-ui:pressed-change` with `{ pressed, reason }`. The event is cancelable; calling `event.preventDefault()` prevents the internal state change.
