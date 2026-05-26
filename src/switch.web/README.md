# base-switch

`base-switch` is a framework-free Base UI-inspired switch custom element.

```html
<script type="module" src="./define.js"></script>

<base-switch>Security alerts</base-switch>
<base-switch checked>Sync enabled</base-switch>
<base-switch disabled>Disabled option</base-switch>
```

It provides `role="switch"`, `aria-checked`, focus management, disabled suppression, `data-state`, `data-active`, and a cancelable `base-ui:checked-change` event for user changes.
