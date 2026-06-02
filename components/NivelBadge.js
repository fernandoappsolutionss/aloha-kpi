// Badge de nivel de centro (Nivel 1–5 o Sin nivel).
export default function NivelBadge({ nivel, size = 'md' }) {
  const small = size === 'sm'
  if (!nivel) {
    return (
      <span className="pill" style={{
        background: 'var(--surface-3)', color: 'var(--text-dim)',
        border: '1px solid var(--border)', fontSize: small ? 10 : 11,
      }}>Sin nivel</span>
    )
  }
  return (
    <span className="pill pill--ok" title={`Centro Nivel ${nivel}`} style={{ fontSize: small ? 10 : 11 }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
        <path d="M12 2l2.9 6.3 6.8.6-5.1 4.5 1.5 6.7L12 17l-6 3.6 1.5-6.7L2.4 9l6.8-.6z" />
      </svg>
      Nivel {nivel}
    </span>
  )
}
