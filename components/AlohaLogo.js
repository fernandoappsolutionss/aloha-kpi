// ALOHA Mental Arithmetic logo component
export default function AlohaLogo({ height = 48, white = false }) {
  const textColor = white ? '#ffffff' : '#1B4580'
  const subColor = white ? 'rgba(255,255,255,0.75)' : '#6B7A99'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Icon: stylized ALOHA "A" abacus shape */}
        <svg width={height * 0.7} height={height} viewBox="0 0 70 90" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Left arch - dark blue */}
          <path d="M35 4 C18 4 5 20 5 40 L5 72 C5 74 7 76 9 76 L28 76 L28 40 C28 26 30 16 35 10 Z" fill="url(#grad_blue)"/>
          {/* Right side - 3 color segments */}
          <path d="M35 4 C40 10 42 20 42 32 L65 32 C62 18 50 7 35 4 Z" fill="#B8D432"/>
          <path d="M42 32 L65 32 L65 52 L42 52 Z" fill="#4A8C3F"/>
          <path d="M42 52 L65 52 C65 62 60 70 52 74 L42 74 Z" fill="#1B4580"/>
          {/* Arch outline */}
          <path d="M35 4 C18 4 5 20 5 40 L5 72 Q5 78 11 78 L59 78 Q65 78 65 72 L65 40 C65 20 52 4 35 4 Z" stroke="white" strokeWidth="2.5" fill="none"/>
          {/* Inner arch decoration */}
          <path d="M20 78 L20 56 Q20 46 28 42 L28 78 Z" fill="#0E3060"/>
          {/* Gradient definition */}
          <defs>
            <linearGradient id="grad_blue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4A90C4"/>
              <stop offset="60%" stopColor="#1B4580"/>
              <stop offset="100%" stopColor="#0E2B5E"/>
            </linearGradient>
          </defs>
        </svg>

        {/* ALOHA text */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{
            fontSize: height * 0.55,
            fontWeight: 900,
            color: textColor,
            letterSpacing: height * 0.04,
            lineHeight: 1,
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            textShadow: white ? 'none' : '0 1px 3px rgba(27,69,128,0.2)'
          }}>
            ALOHA
          </span>
          <span style={{
            fontSize: height * 0.18,
            color: subColor,
            letterSpacing: height * 0.06,
            textTransform: 'uppercase',
            fontWeight: 600,
            marginTop: 2
          }}>
            Mental Arithmetic
          </span>
        </div>
      </div>
    </div>
  )
}
