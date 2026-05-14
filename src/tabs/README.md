# base-tabs

`base-tabs`, `base-tabs-list`, `base-tab`, and `base-tabs-panel` are custom elements ported from Base UI Tabs behavior.

```html
<script type="module" src="./define.js"></script>

<base-tabs value="account">
  <base-tabs-list aria-label="Settings sections">
    <base-tab value="account">Account</base-tab>
    <base-tab value="security">Security</base-tab>
  </base-tabs-list>

  <base-tabs-panel value="account">Account settings</base-tabs-panel>
  <base-tabs-panel value="security">Security settings</base-tabs-panel>
</base-tabs>
```

Tabs expose `role="tablist"`, `role="tab"`, `role="tabpanel"`, ARIA relationships, roving focus, arrow-key navigation, `data-active`, `data-disabled`, `data-hidden`, `data-orientation`, and `data-activation-direction`.

Value changes dispatch `base-ui:value-change` with `{ value, previousValue, reason, activationDirection }`. The event is cancelable for user-initiated changes.
