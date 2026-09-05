// Cola del jefe entrenador: quién tiene módulos ESTUDIADOS esperando
// que le tomen la maniobra, y hace cuántos días. La página solo se pinta si
// puedeFirmar() lo permite — y el servidor lo vuelve a comprobar en
// firmarDrill(), que es donde de verdad importa.
//
// Ruta hermana de /entrenamiento/oficio: el segmento estático "firmas" gana
// sobre el dinámico [modulo], así que la página de los tours no se toca.
import Link from 'next/link'
import Sidebar from '../../../../../components/Sidebar'
import PanelDrill from '../../../../../components/entrenamiento/PanelDrill'
import { getCentroNombre } from '../../../../actions/centros'
import { colaFirmas } from '../../../../actions/entrenamiento-oficio'
// Cómo se nombra cada puesto delante de una persona: una sola fuente. Aquí
// había una sexta copia con dos entradas, y el Coach y el Coordinador —que
// ahora también entran a esta cola— habrían salido como "coach" y
// "coordinador", en minúscula y sin acento.
import { nombreDeRol } from '../../../../../lib/entrenamiento/oficio/progreso'

export default async function FirmasPage({ params }) {
  const { id } = await params
  const [nombre, cola] = await Promise.all([
    getCentroNombre(id).catch(() => null),
    colaFirmas(Number(id)),
  ])

  const shell = (estado, contenido) => (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={nombre || 'Centro'} centroId={id} />
      {/* id + data-page-state: el "Saltar al contenido" del layout apunta a
          #main-content, y sin el estado la ruta no entra al barrido R10. */}
      <main className="main ent-page" id="main-content" data-page-state={estado}>
        <Link className="tour-card__link" href={`/centro/${id}/entrenamiento`}>← Volver a Entrenamiento</Link>
        {contenido}
      </main>
    </div>
  )

  if (cola?.error) return shell('error', <div className="alert alert--error" role="alert">{cola.error}</div>)

  const cabecera = (
    <div className="main__head"><div>
      <div className="label" style={{ marginTop: 8, marginBottom: 10 }}>Jefe entrenador</div>
      <h1 className="h-title">Maniobras por firmar</h1>
      <p className="h-sub">
        Estudiar no es saber hacer. Tómale la maniobra, tilda los criterios que de verdad cumplió y firma. Si no los cumple, no firmes: devuélvelo al módulo.
      </p>
    </div></div>
  )

  if (!cola.filas.length) {
    return shell('ready', <>
      {cabecera}
      <div className="card" style={{ padding: 24 }}>
        <p className="h-sub" style={{ margin: 0 }}>
          Nadie a tu cargo tiene módulos estudiados esperando firma. Vuelve cuando alguien de tu equipo termine uno.
        </p>
      </div>
    </>)
  }

  // AGRUPADA POR PUESTO. La action ya las devuelve ordenadas por rol; aquí solo
  // se abre un encabezado cuando cambia, con su conteo. Sin esto la
  // Administradora con cuatro Coaches y una Asistente veía cinco tarjetas
  // intercaladas y no sabía de un vistazo qué puesto tiene atrasado.
  const cuentaDe = (rol) => {
    const suyas = cola.filas.filter((x) => x.rol === rol)
    const maniobras = suyas.reduce((n, x) => n + x.modulos.length, 0)
    return `${suyas.length} ${suyas.length === 1 ? 'persona' : 'personas'} · ${maniobras} ${maniobras === 1 ? 'maniobra' : 'maniobras'}`
  }

  return shell('ready', <>
    {cabecera}
    {cola.filas.map((f, i) => (
      <div key={f.usuarioId}>
      {(i === 0 || cola.filas[i - 1].rol !== f.rol) && (
        <h2 className="ent-seccion__titulo">{nombreDeRol(f.rol)} <span className="ent-pill">{cuentaDe(f.rol)}</span></h2>
      )}
      <section className="ofi-cola" aria-labelledby={`alumno-${f.usuarioId}`}>
        <div className="ofi-cola__head">
          <div>
            {/* h3 y no h2: el h2 es ahora el puesto que agrupa. */}
            <h3 id={`alumno-${f.usuarioId}`}>{f.nombre}</h3>
            <p className="h-sub" style={{ margin: 0 }}>{f.centro} · {f.email}</p>
          </div>
          <span className={`ent-pill${f.modulos.some((m) => (m.dias ?? 0) >= 7) ? ' ent-pill--bad' : ' ent-pill--mid'}`}>
            {f.modulos.length} {f.modulos.length === 1 ? 'maniobra pendiente' : 'maniobras pendientes'}
          </span>
        </div>
        {f.modulos.map((m) => (
          <div key={m.id} className="ofi-cola__modulo">
            <div className="label">
              {m.titulo} · estudiado hace {m.dias == null ? '—' : m.dias} {m.dias === 1 ? 'día' : 'días'}
              {m.drills.length > 1 ? ` · ${m.drills.length} maniobras en este módulo` : ''}
            </div>
            {/* UN panel por MÓDULO, no por maniobra: la firma es del módulo (una
                sola columna drill_firmado_at por usuario y módulo). Con cuatro
                botones, tomar uno firmaba los cuatro. */}
            <PanelDrill drills={m.drills} indice={`${f.usuarioId}-${m.id}`} usuarioId={f.usuarioId} moduloId={m.id}
              moduloTitulo={m.titulo} firmadoAt={null} firmadoPor={null} puedoFirmar estudiado />
          </div>
        ))}
      </section>
      </div>
    ))}
  </>)
}
