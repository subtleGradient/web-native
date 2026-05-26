# base-checkbox

`base-checkbox` is a framework-free Base UI-inspired checkbox custom element.

```html
<script type="module" src="./define.js"></script>

<base-checkbox>Accept terms</base-checkbox>
<base-checkbox checked>Email updates</base-checkbox>
<base-checkbox indeterminate>Select visible projects</base-checkbox>
<base-checkbox disabled>Disabled option</base-checkbox>
```

It provides `role="checkbox"`, `aria-checked`, focus management, disabled suppression, `data-state`, `data-active`, and a cancelable `base-ui:checked-change` event for user changes.
