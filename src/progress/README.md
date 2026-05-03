# base-progress

Native custom elements for Base UI-style progress semantics.

```html
<script type="module" src="./define.js"></script>

<base-progress value="40">
  <base-progress-label>Upload</base-progress-label>
  <base-progress-value></base-progress-value>
  <base-progress-track>
    <base-progress-indicator></base-progress-indicator>
  </base-progress-track>
</base-progress>
```

`base-progress` sets `role="progressbar"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-valuetext`. Omitting `value` creates an indeterminate progress bar.
