// El SOP de una hoja de un módulo de oficio: /entrenamiento/oficio/<modulo>/sop
//
// Es la MISMA información del módulo, en formato de papel: lo que se pega al
// lado del escritorio para ejecutar el proceso, no para estudiarlo. El módulo
// enseña; la hoja recuerda.
//
// Server Component: la prosa se queda en el servidor. Al cliente baja solo la
// hoja ya derivada (derivarSop) y el botón de imprimir.
import Link from 'next/link'
import Sidebar from '../../../../../../../components/Sidebar'
import SopHoja from '../../../../../../../components/entrenamiento/SopHoja'
import { derivarSop } from '../../../../../../../components/entrenamiento/sop-derivar.mjs'
import { getCentroNombre } from '../../../../../../actions/centros'
import { cargarOficio } from '../../../../../../actions/entrenamiento-oficio'
import { CURSOS, MODULOS_OFICIO, moduloOficio } from '../../../../../../../lib/entrenamiento/oficio/catalogo'
import { rolesQueFirma, nombreDeRol, esDePapel, rolesDelPapel, puedeImprimirPapel, gradienteAbierto } from '../../../../../../../lib/entrenamiento/oficio/progreso'
import { puertaCerrada } from '../../../../../../../lib/entrenamiento/oficio/guia-pasos'

// Mismo permiso que el módulo: quien lo estudia y quien lo FIRMA. La
// Administradora es la jefa entrenadora de la Asistente, así que
// necesita la hoja de los procesos que le va a tomar; y gerencia, coordinador y
// supervisor firman a la Administradora, así que pueden revisar el
// entrenamiento entero aunque no se entrenen en él.
const puedeLeerComoOficial = (rol, m) => rolesQueFirma(rol).some((r) => m.roles.includes(r))

export default async function SopPage({ params, searchParams }) {
  const { id, modulo: moduloId } = await params
  // ?revisar=<rol>: mismo acarreo que la página del módulo, para que el
  // "volver" de quien revisa no lo devuelva al selector de planes.
  const sp = searchParams ? await searchParams : {}
  const [nombre, oficio] = await Promise.all([
    getCentroNombre(id).catch(() => null),
    cargarOficio(),
  ])

  const base = `/centro/${id}/entrenamiento/oficio`
  const shell = (estado, contenido) => (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={nombre || 'Centro'} centroId={id} />
      <main className="main ent-page sop-page" id="main-content" data-page-state={estado}>
        {/* @page es una regla DE DOCUMENTO: en app/globals.css forzaría a A4
            vertical con márgenes de 14 mm toda impresión de la app —el cuadro,
            el reporte, el histórico— y, como declara `size`, Chrome además
            bloquea el selector de papel del diálogo. Aquí vive con la página
            que la necesita y se va con ella al navegar a otra. */}
        <style dangerouslySetInnerHTML={{ __html: '@page { size: A4; margin: 14mm; }' }} />
        {contenido}
      </main>
    </div>
  )

  if (oficio?.error) {
    return shell('error', <>
      <Link className="tour-card__link" href={base}>← Volver a mi puesto</Link>
      <div className="alert alert--error" role="alert">{oficio.error}</div>
    </>)
  }

  const m = moduloOficio(moduloId)
  if (!m) {
    return shell('error', <>
      <Link className="tour-card__link" href={base}>← Volver a mi puesto</Link>
      <div className="alert alert--error" role="alert">Este módulo no existe, así que no tiene procedimiento.</div>
    </>)
  }

  const { rol, oficiales, progreso = {} } = oficio
  // HOJA DE PAPEL. El personal de aseo no tiene cuenta: su módulo entero ES
  // esta hoja. La imprime quien reparte el paquete —la Asistente, que sí lleva
  // su propio módulo de entrenar y supervisar al aseo— y quien le firma a ella.
  // Se reusa esta misma ruta a propósito: no hay un segundo sistema de
  // impresión, es la hoja SOP de siempre con otro pie.
  const papel = esDePapel(m)
  // Quién se la toma a la persona de aseo: el primer rol de rolesDelPapel() es
  // el dueño del paquete (la Asistente), no uno de sus jefes.
  const tomador = papel ? (rolesDelPapel(m, MODULOS_OFICIO)[0] || '') : ''
  const esMio = !papel && m.roles.includes(rol)
  const puedeVerla = papel
    ? puedeImprimirPapel(rol, m, MODULOS_OFICIO)
    : esMio || puedeLeerComoOficial(rol, m)
  // El ?revisar= es del carril de revisión y no aplica a una hoja de papel: no
  // hay plan ajeno que arrastrar, porque no está en el plan de nadie.
  const rolPlan = esMio || papel ? rol : (m.roles.includes(sp?.revisar) ? sp.revisar : m.roles[0])
  const cola = esMio || papel ? '' : `?revisar=${rolPlan}`
  if (!puedeVerla) {
    return shell('error', <>
      <Link className="tour-card__link" href={base}>← Volver a mi puesto</Link>
      <div className="main__head"><div>
        <div className="label" style={{ marginTop: 8, marginBottom: 10 }}>Procedimiento operativo</div>
        <h1 className="h-title">Este procedimiento no es de tu puesto</h1>
        <p className="h-sub">
          &quot;{m.titulo}&quot; es del entrenamiento de {(papel ? rolesDelPapel(m, MODULOS_OFICIO) : m.roles).map(nombreDeRol).join(' y ')}. Tu plan está en tu puesto.
        </p>
      </div></div>
    </>)
  }

  // EL MISMO CANDADO QUE EL MÓDULO. La hoja es el procedimiento de este
  // módulo: contenido. Sin esta guarda, el orden se salta escribiendo /sop en
  // la barra de direcciones. Solo aplica a quien lo estudia: quien la abre para
  // tomar la maniobra necesita la hoja completa. `esRevision` reusa el ?revisar=
  // que esta página ya acarrea, para que revisar un módulo que además es tuyo no
  // te cierre la hoja.
  // `esMio` ya es "está en mi plan": ni el ?revisar= de la URL lo apaga, que es
  // justo el hueco por el que se colaba el módulo compartido.
  if (puertaCerrada(!papel && esMio, gradienteAbierto(m, progreso), progreso[m.id])) {
    const anterior = (m.requiere || [])[0] ? moduloOficio(m.requiere[0]) : null
    return shell('bloqueado', <>
      <Link className="tour-card__link" href={base}>← Volver a mi puesto</Link>
      <div className="main__head"><div>
        <div className="label" style={{ marginTop: 8, marginBottom: 10 }}>Procedimiento operativo</div>
        <h1 className="h-title">{m.titulo}</h1>
      </div></div>
      <section className="card ofi-puerta" role="note">
        <div className="label">Todavía no</div>
        <h2><span aria-hidden="true">🔒</span> No te saltes el paso</h2>
        <p>La hoja de este proceso se abre con el módulo, y el módulo se abre cuando termines <b>&quot;{anterior?.titulo || 'el anterior de tu plan'}&quot;</b>.</p>
        <div className="ofi-nav">
          {anterior && <Link className="btn btn--primary" href={`${base}/${anterior.id}`}>Ir a &quot;{anterior.titulo}&quot; <span aria-hidden="true">→</span></Link>}
          <Link className="btn" href={base}>Volver a mi plan</Link>
        </div>
      </section>
    </>)
  }

  const hoja = derivarSop(m)
  // La fecha del reloj del servidor es UTC; la hoja la firma alguien que está
  // en Panamá, así que se emite con la fecha de Panamá.
  const emision = new Date().toLocaleDateString('es-PA', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Panama',
  })
  // El nombre del Oficial solo se imprime cuando la hoja es del puesto de quien
  // la abre: si la está leyendo quien firma, su propio Oficial no pinta nada
  // en esa línea.
  const oficial = esMio && (oficiales || []).length > 0 ? oficiales[0].nombre : ''

  return shell('ready', <>
    <div className="sop-volver">
      <Link className="tour-card__link" href={`${base}/${m.id}${cola}`}>← Volver al módulo</Link>
      {/* Lo que la hoja no puede sostener se dice aquí, no se rellena abajo:
          así el que escribe los procedimientos ve el hueco al abrirla. */}
      <span className="h-sub">
        {papel
          ? 'Esta hoja es el módulo completo: se imprime, se toma con la persona delante y se firma en tinta. No queda registro en el sistema; la hoja firmada va al file del colaborador.'
          : hoja.escrito
            ? 'Procedimiento escrito para esta hoja.'
            : 'Hoja derivada del módulo: los pasos, las reglas y los errores salen de su contenido, sin agregar nada.'}
        {hoja.vacios.length > 0 && ` Todavía sin declarar: ${hoja.vacios.join(', ')}.`}
      </span>
    </div>

    <SopHoja
      hoja={hoja}
      centro={nombre || 'Centro ALOHA'}
      curso={CURSOS[m.curso]?.titulo || 'Oficio'}
      emision={emision}
      oficial={oficial}
      tomador={tomador ? nombreDeRol(tomador) : ''}
    />
  </>)
}
