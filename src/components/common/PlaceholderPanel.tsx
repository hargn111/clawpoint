type PlaceholderPanelProps = {
  eyebrow: string
  title: string
  body: string
  bullets: string[]
  cliHints?: string[]
}

export function PlaceholderPanel({ eyebrow, title, body, bullets, cliHints = [] }: PlaceholderPanelProps) {
  return (
    <section className="panel-card panel-card-wide">
      <div className="panel-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
        <span className="badge badge-idle">draft</span>
      </div>

      <p className="panel-copy">{body}</p>

      <ul className="list compact-list">
        {bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>

      {cliHints.length ? (
        <div className="hint-row">
          {cliHints.map((hint) => (
            <span key={hint} className="cli-pill">
              {hint}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  )
}
