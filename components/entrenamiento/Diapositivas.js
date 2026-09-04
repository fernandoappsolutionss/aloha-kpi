// DIAPOSITIVAS del módulo: un carrusel horizontal de láminas.
//
// ponytail: carrusel con CSS scroll-snap y CERO JavaScript — ni librería ni
// estado. El contenedor es un <ol> enfocable, así que las flechas del teclado
// lo desplazan solas (es scroll nativo), y el índice de abajo son anclas de
// verdad: funcionan sin JS, entran en el orden de tabulación y el lector de
// pantalla las lee como enlaces a cada lámina. Si algún día hiciera falta
// autoplay, miniaturas o transiciones encadenadas, AHÍ sí evaluar una
// librería; para "explicar el módulo en N láminas" sería peso muerto.
//
// Server Component: no hay nada que pulsar que no resuelva el navegador, así
// que las láminas de los 40 módulos no entran al bundle del cliente.
//
// Un módulo sin `laminas` no pinta nada (ver laminasDe() en el catálogo): las
// láminas no se derivan de los bloques porque recortar la prosa del Manual
// para que quepa partiría cifras y plazos, que aquí van literales.

// El énfasis **negrita** lo parsea BloquesOficio, que es 'use client'. Aquí no
// se admite (el test lo prohíbe); esto solo evita que un '**' que se cuele
// salga crudo en pantalla.
const limpio = (s) => String(s ?? '').replace(/\*\*/g, '').trim()

export default function Diapositivas({ laminas, moduloId }) {
  const lams = (laminas || []).filter((l) => l && l.titulo)
  if (lams.length === 0) return null
  const total = lams.length
  const idDe = (i) => `lam-${moduloId}-${i + 1}`

  return (
    <section className="ofi-slides" aria-labelledby="ofi-slides-titulo">
      <div className="ofi-slides__head">
        <div>
          <div className="label">Explicado en láminas</div>
          <h2 id="ofi-slides-titulo">{total} diapositivas</h2>
        </div>
        <p className="h-sub" style={{ margin: 0, maxWidth: '46ch' }}>
          La misma materia del módulo, en trozos de una idea cada uno. Deslízalas, o pulsa el número
          de la lámina que quieras repasar.
        </p>
      </div>

      {/* tabIndex=0 hace enfocable el contenedor que scrollea: con el foco
          puesto, ←/→, Inicio y Fin lo mueven sin una línea de JS. El aria-label
          es obligatorio justamente porque es enfocable.
          data-horizontal-scroll declara el desplazamiento lateral, que es el
          contrato de la casa (tests/e2e/helpers/audit-page.js): aquí la cinta
          scrollea de lado A PROPÓSITO, no por un desborde accidental. */}
      <ol
        className="ofi-slides__cinta"
        tabIndex={0}
        data-horizontal-scroll=""
        aria-label={`Diapositivas del módulo: ${total} láminas. Con el foco aquí, muévete con las flechas izquierda y derecha.`}
      >
        {lams.map((l, i) => (
          // tabIndex=-1 para que el ancla del índice deje el foco DENTRO de la
          // lámina (Safari no enfoca destinos que no son enfocables, y sin foco
          // el lector de pantalla se queda donde estaba).
          <li key={i} id={idDe(i)} tabIndex={-1} className="ofi-slides__lam" aria-label={`Lámina ${i + 1} de ${total}: ${limpio(l.titulo)}`}>
            <div className="ofi-slides__num" aria-hidden="true">{i + 1} / {total}</div>
            {l.kicker && <div className="label">{limpio(l.kicker)}</div>}
            <h3 className="ofi-slides__titulo">{limpio(l.titulo)}</h3>
            {l.texto && <p className="ofi-slides__texto">{limpio(l.texto)}</p>}
            {(l.items || []).length > 0 && (
              <ul className="ofi-slides__items">
                {l.items.map((it, j) => <li key={j}>{limpio(it)}</li>)}
              </ul>
            )}
            {l.cierre && <p className="ofi-slides__cierre">{limpio(l.cierre)}</p>}
          </li>
        ))}
      </ol>

      <nav className="ofi-slides__indice" aria-label="Ir a una lámina">
        <ol>
          {lams.map((l, i) => (
            <li key={i}>
              <a href={`#${idDe(i)}`}>
                <span aria-hidden="true">{i + 1}</span>
                <span className="sr-only">Lámina {i + 1}: {limpio(l.titulo)}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </section>
  )
}
