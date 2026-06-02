// Team Solutionss — logo oficial (símbolo orbital + wordmark)
// Símbolo: núcleo verde (Tessa Core) · órbita punteada (5 agentes) ·
//          círculo exterior (plataforma) · punto que orbita (el cliente).
// Colores tematizados con variables CSS (se adaptan a claro/oscuro).
// El verde del núcleo es siempre exacto #10B981 (regla de marca).

export function TSMark({ size = 40, animate = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"
      style={{ display: 'block', flexShrink: 0 }} aria-hidden="true">
      <circle cx="50" cy="50" r="44" stroke="var(--logo-ring)" strokeWidth="2" />
      <circle cx="50" cy="50" r="26" stroke="var(--logo-dash)" strokeWidth="3" strokeDasharray="6 7" strokeLinecap="round" />
      <circle cx="50" cy="50" r="11" fill="#10B981" />
      <g style={animate ? { transformBox: 'view-box', transformOrigin: '50% 50%', animation: 'orbit 16s linear infinite' } : undefined}>
        <circle cx="50" cy="6" r="5.5" fill="var(--logo-dot)" />
      </g>
    </svg>
  )
}

export default function Logo({ size = 40, animate = false, wordmark = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.34 }}>
      <TSMark size={size} animate={animate} />
      {wordmark && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 0.95 }}>
          <span style={{
            fontFamily: 'var(--font-serif)', fontWeight: 500, color: 'var(--text)',
            fontSize: size * 0.6, letterSpacing: '-0.01em',
          }}>Team</span>
          <span style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 500,
            color: 'var(--text)', fontSize: size * 0.48, letterSpacing: '0.005em', marginTop: size * 0.02,
          }}>Solutionss</span>
        </div>
      )}
    </div>
  )
}
