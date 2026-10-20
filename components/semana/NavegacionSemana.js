import Link from 'next/link'

export const SECCIONES_SEMANA = [
  ['avance', '', 'Avance y cuotas', 'Revisa tus números'],
  ['condicion', '/condicion', 'Condición y fórmula', 'Entiende y prepara'],
  ['acciones', '/acciones', 'Mis acciones', 'Ejecuta y demuestra'],
  ['cumplimiento', '/cumplimiento', 'Mi cumplimiento', 'Revisa e imprime'],
  ['juegos', '/juegos', 'Juegos', 'Un reto para el equipo'],
]

export default function NavegacionSemana({ centroId, seccion }) {
  return <nav className="semana-navegacion" aria-label="Pasos de mi semana">{SECCIONES_SEMANA.map(([key, path, title, help], i) => <Link key={key} href={`/centro/${centroId}/semana${path}`} aria-current={seccion === key ? 'page' : undefined}><span className="semana-navegacion__numero">{i + 1}</span><span><strong>{title}</strong><small>{help}</small></span></Link>)}</nav>
}
