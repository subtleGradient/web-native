# base-radio-group

Base UI-style radio group custom elements with roving focus, cancelable value changes, and form-associated group submission.

```html
<script type="module" src="./define.js"></script>

<base-radio-group name="contact" value="email" required aria-label="Contact method">
  <base-radio value="email">Email</base-radio>
  <base-radio value="sms">SMS</base-radio>
</base-radio-group>
```

User changes dispatch `base-ui:value-change` with `{ value, previousValue, reason }`. Cancel the event to block the commit.
