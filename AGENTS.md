# Agent Notes

## UI Directionality

UI should point at domain models, not the other way around. Prefer markup that names the domain action directly, such as inline event handlers calling a domain object method, over wiring behavior from the model or controller back into the UI with `addEventListener`.

For standalone/demo UI, inline handlers are good when they make the ownership obvious:

```html
<form onsubmit="notes.insert(event)">
  <input name="body" />
  <shadcn-button>Insert row</shadcn-button>
</form>
```

Avoid `addEventListener` for ordinary UI command wiring unless there is a concrete reason, such as delegated behavior, library integration, lifecycle cleanup, or events that cannot be expressed clearly in markup.
