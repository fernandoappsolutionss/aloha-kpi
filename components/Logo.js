// Team Solutionss — logo oficial (símbolo orbital + wordmark)
// Símbolo: núcleo verde (Tessa Core) · órbita punteada (5 agentes) ·
//          círculo exterior (plataforma) · punto que orbita (el cliente).
// Reglas de marca: verde exacto #10B981, sin sombras/gradientes, plano.

export function TSMark({ size = 40, onDark = true, animate = false }) {
  const ring = onDark ? 'rgba(255,255,255,0.55)' : '#404040'
  const dash = onDark ? 'rgba(255,255,255,0.28)' : '#9A9A9A'
  const dot  = onDark ? '#FAFAF7' : '#0A0A0A'
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"
      style={{ display: 'block', flexShrink: 0 }} aria-hidden="true">
      <circle cx="50" cy="50" r="44" stroke={ring} strokeWidth="2" />
      <circle cx="50" cy="50" r="26" stroke={dash} strokeWidth="3" strokeDasharray="6 7" strokeLinecap="round" />
      <circle cx="50" cy="50" r="11" fill="#10B981" />
      <g style={animate ? { transformBox: 'view-box', transformOrigin: '50% 50%', animation: 'orbit 16s linear infinite' } : undefined}>
        <circle cx="50" cy="6" r="5.5" fill={dot} />
      </g>
    </svg>
  )
}

export default function Logo({ size = 40, onDark = true, animate = false, wordmark = true }) {
  const text = onDark ? '#FAFAF7' : '#0A0A0A'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.34 }}>
      <TSMark size={size} onDark={onDark} animate={animate} />
      {wordmark && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 0.95 }}>
          <span style={{
            fontFamily: 'var(--font-serif)', fontWeight: 500, color: text,
            fontSize: size * 0.6, letterSpacing: '-0.01em',
          }}>Team</span>
          <span style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 500,
            color: text, fontSize: size * 0.48, letterSpacing: '0.005em', marginTop: size * 0.02,
          }}>Solutionss</span>
        </div>
      )}
    </div>
  )
}
