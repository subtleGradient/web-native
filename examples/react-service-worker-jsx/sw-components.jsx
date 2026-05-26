export function RuntimeNote({ children, label }) {
  return (
    <section className="signal">
      <div className="metric-row">
        <span>{label}</span>
        <span className="pill">No build</span>
      </div>
      <p>{children}</p>
    </section>
  )
}

export function BuildStepGauge({ label, value }) {
  return (
    <section className="signal">
      <div className="metric-row">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="meter" aria-label={`${label} score ${value}`}>
        <span style={{ width: `${value}%` }} />
      </div>
    </section>
  )
}
