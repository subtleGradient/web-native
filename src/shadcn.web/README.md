# shadcn web components

Styled shadcn-inspired custom elements for standalone browser usage.

```html
<meta name="color-scheme" content="light dark" />
<link rel="stylesheet" href="themes/neutral.css" />
<link rel="stylesheet" href="styles/base-nova.css" />
<script type="module" src="define.js"></script>

<shadcn-button>Save changes</shadcn-button>

<shadcn-toggle variant="outline" size="sm">Bold</shadcn-toggle>

<shadcn-checkbox aria-label="Accept terms"></shadcn-checkbox>

<shadcn-switch checked aria-label="Enable alerts"></shadcn-switch>

<shadcn-field>
  <shadcn-field-label for="email">Email</shadcn-field-label>
  <shadcn-input id="email" name="email" type="email" placeholder="team@example.com"></shadcn-input>
  <shadcn-field-description>Used for notifications.</shadcn-field-description>
</shadcn-field>

<shadcn-native-select size="sm">
  <select name="role">
    <option value="viewer">Viewer</option>
    <option value="admin">Admin</option>
  </select>
</shadcn-native-select>

<shadcn-progress value="42">
  <shadcn-progress-label>Upload</shadcn-progress-label>
  <shadcn-progress-value></shadcn-progress-value>
</shadcn-progress>

<shadcn-radio-group name="contact" value="email" aria-label="Contact method">
  <shadcn-radio-group-item value="email"></shadcn-radio-group-item> Email
  <shadcn-radio-group-item value="sms"></shadcn-radio-group-item> SMS
</shadcn-radio-group>

<shadcn-toggle-group multiple value="bold" variant="outline" size="sm" aria-label="Formatting">
  <shadcn-toggle-group-item value="bold">Bold</shadcn-toggle-group-item>
  <shadcn-toggle-group-item value="italic">Italic</shadcn-toggle-group-item>
</shadcn-toggle-group>

<shadcn-table>
  <table is="shadcn-table-element">
    <thead is="shadcn-table-header">
      <tr is="shadcn-table-row"><th is="shadcn-table-head">Name</th></tr>
    </thead>
    <tbody is="shadcn-table-body">
      <tr is="shadcn-table-row"><td is="shadcn-table-cell">Web</td></tr>
    </tbody>
  </table>
</shadcn-table>

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
- `shadcn:checked-change` from `shadcn-checkbox` and `shadcn-switch`
- `shadcn:value-change` from `shadcn-tabs`

`shadcn-input` and `shadcn-textarea` create native text controls internally and participate in `FormData` through form-associated custom elements. `shadcn-native-select` decorates a slotted native `<select>` so browser select behavior and form semantics stay native.

The standalone GitHub import-map fixture is `examples/shadcn-github/`. The composite settings console is `examples/composite-settings-console/`.
