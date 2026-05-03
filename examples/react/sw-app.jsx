import { useState, useTransition } from "react"
import { createRoot } from "react-dom/client"
import { BuildStepGauge, RuntimeNote } from "./sw-components.jsx"

const startingMetrics = [
  { label: "Files kept as source", value: 100 },
  { label: "Bundler involvement", value: 0 },
  { label: "Browser-native loading", value: 94 },
]

function App() {
  const [runs, setRuns] = useState(1)
  const [metrics, setMetrics] = useState(startingMetrics)
  const [isPending, startTransition] = useTransition()

  const mutate = () => {
    startTransition(() => {
      setRuns((value) => value + 1)
      setMetrics((items) =>
        items.map((item, index) => ({
          ...item,
          value: item.label === "Bundler involvement" ? 0 : 72 + ((item.value + runs * 9 + index * 13) % 29),
        })),
      )
    })
  }

  return (
    <article className="app-card" aria-labelledby="app-title">
      <header className="app-header">
        <div>
          <span className="status" data-state={isPending ? "working" : "ready"}>
            {isPending ? "Updating" : "Controlled by service worker"}
          </span>
          <h2 id="app-title">Native ESM imported <code>sw-app.jsx</code></h2>
        </div>
        <button className="button" type="button" onClick={mutate}>Update imported JSX</button>
      </header>

      <div className="signal-grid">
        {metrics.map((metric) => (
          <BuildStepGauge key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </div>

      <RuntimeNote label={`Transform pass ${runs}`}>
        This component came from <code>sw-components.jsx</code>. The browser requested it as an ESM import, the service worker transformed the JSX, and the module graph stayed native.
      </RuntimeNote>
    </article>
  )
}

createRoot(document.getElementById("root")).render(<App />)
globalThis.__webNativeReactSwDemoReady = true
