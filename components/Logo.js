// Logo oficial de ALOHA Mental Arithmetic — lockup horizontal del brand kit.
// `size` es la ALTURA en px; el ancho sale de la proporción real del archivo.
// `wordmark` y `animate` se siguen aceptando por compatibilidad con las
// llamadas existentes: el lockup ya trae el wordmark y no se anima.
const RATIO = 640 / 291

export default function Logo({ size = 40 }) {
  return (
    <img
      className="brandmark"
      src="/aloha/lockup.png"
      alt="ALOHA Mental Arithmetic"
      width={Math.round(size * RATIO)}
      height={size}
      style={{ display: 'block', height: size, width: 'auto', flexShrink: 0 }}
    />
  )
}
