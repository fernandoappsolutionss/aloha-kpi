export default function OperationalCard({ headingLevel = 3, title, subtitle, status, fields = [], actions }) {
  const Heading = headingLevel === 2 ? 'h2' : headingLevel === 4 ? 'h4' : 'h3'
  const visibleFields = fields.filter(({ value }) => value !== null && value !== undefined && value !== '')
  return <article className="operational-card">
    <header className="operational-card__header">
      <div><Heading>{title}</Heading>{subtitle && <p>{subtitle}</p>}</div>
      {status && <div className="operational-card__status">{status}</div>}
    </header>
    {visibleFields.length > 0 && <dl>
      {visibleFields.map(({ label, value }, index) => <div key={`${label}-${index}`}>
        <dt>{label}</dt><dd>{value}</dd>
      </div>)}
    </dl>}
    {actions && <footer className="operational-card__actions">{actions}</footer>}
  </article>
}
