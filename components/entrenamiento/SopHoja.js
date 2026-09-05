'use client'
// La HOJA: el procedimiento operativo estándar de un módulo, en una sola
// página, lista para imprimir o guardar como PDF.
//
// SIN LIBRERÍAS. El "descargar" es el diálogo de impresión del navegador
// (window.print) contra un @page A4 con márgenes de 14 mm; el navegador exporta
// el PDF. Por eso el botón dice "Imprimir o guardar como PDF" y no "Descargar
// PDF": lo que hace es abrir el diálogo, y prometer otra cosa sería mentir.
// ponytail: el techo de esto es que no se puede controlar el nombre del archivo
// ni generar el PDF en el servidor (para adjuntarlo a un correo, por ejemplo).
// Si eso hace falta algún día, ahí sí se evalúa una librería de PDF; hoy sería
// una dependencia para hacer peor lo que el navegador ya hace bien.
//
// La PANTALLA es la vista previa del papel: la hoja mide una A4 real
// (210 × 297 mm) con sus márgenes dibujados. Lo que se ve desbordando en
// pantalla es exactamente lo que se va a imprimir en una segunda página.
//
// No importa el catálogo ni el glosario: recibe la hoja ya derivada por el
// Server Component (así la prosa de los 40 módulos no entra al bundle).
import { useEffect, useRef, useState } from 'react'

function Falta({ children }) {
  return <p className="sop-falta">{children}</p>
}

export default function SopHoja({ hoja, centro, curso, emision, oficial }) {
  const hojaRef = useRef(null)
  const reglaRef = useRef(null)
  const [desborda, setDesborda] = useState(false)

  // El requisito central de Fernando es que QUEPA EN UNA HOJA. En vez de
  // confiar en que los topes alcancen para siempre, se mide: la hoja crece con
  // su contenido (min-height) y la regla mide una A4 exacta, así que
  // alto(hoja) > alto(regla) es "esto se va a imprimir en dos páginas".
  // Sirve tanto al que la usa (se entera antes de mandar a imprimir) como al
  // que escribe los 40 procedimientos (se entera al abrirla, no en el papel).
  //
  // Solo se mide sobre el FACSÍMIL: debajo de 900 px la hoja deja de medir una
  // A4 y fluye en una columna para poder leerse en el teléfono (globals.css).
  // Ahí la comparación contra la regla daría "no cabe" siempre, que es una
  // mentira sobre el papel — el papel no cambió, cambió la pantalla.
  useEffect(() => {
    const papel = hojaRef.current
    const regla = reglaRef.current
    if (!papel || !regla) return undefined
    const medir = () => {
      const caja = papel.getBoundingClientRect()
      // 700 px: la hoja A4 mide 794; la columna del teléfono, menos de 600.
      const facsimil = caja.width >= 700
      setDesborda(facsimil && caja.height > regla.getBoundingClientRect().height + 2)
    }
    medir()
    // Las tipografías cargan después del primer render y cambian el alto.
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(medir)
    ro.observe(papel)
    return () => ro.disconnect()
  }, [])

  const aplicaA = (hoja.aplicaA || []).join(' y ')

  return (
    <>
      <div className="sop-acciones">
        <button type="button" className="btn btn--primary" onClick={() => window.print()}>
          Imprimir o guardar como PDF
        </button>
        <p className="h-sub" style={{ margin: 0 }}>
          Se abre el diálogo de impresión del navegador. Para el PDF, elige <b>Guardar como PDF</b> como destino.
        </p>
      </div>

      {desborda && (
        <p className="alert alert--warn sop-aviso" role="status">
          Esta hoja no cabe en una página: se va a imprimir en dos. Avísale a tu jefe entrenador
          para que recorte el procedimiento — un SOP de dos hojas no se usa.
        </p>
      )}

      <p className="h-sub sop-nota-movil">
        En pantalla angosta el procedimiento se lee en una columna. La vista previa de la hoja A4 —y el aviso de si cabe
        en una página— sale en pantalla ancha, que es desde donde se imprime.
      </p>

      {/* data-horizontal-scroll: el contrato de la casa (tests/e2e/helpers/audit-page.js)
          es que todo lo que scrollea de lado se declare. Aquí es a propósito —
          la hoja mide milímetros y en pantalla media se desplaza en vez de
          encogerse, porque encogerla haría mentir a la vista previa. */}
      <div className="sop-lienzo" role="region" aria-label="Vista previa de la hoja, tal como se va a imprimir" tabIndex={0} data-horizontal-scroll="">
        <article className="sop-hoja" ref={hojaRef} aria-label={`Procedimiento ${hoja.proceso}`}>
          {/* Regla de medición: una A4 exacta. Ni se ve ni se lee ni se imprime. */}
          <span className="sop-regla" ref={reglaRef} aria-hidden="true" />
          {desborda && <span className="sop-corte" aria-hidden="true">Aquí termina la hoja 1</span>}

          <header className="sop-cabeza">
            <div>
              <p className="sop-marca">ALOHA Mental Arithmetic · Panamá</p>
              <p className="sop-centro">{centro}</p>
              <h1 className="sop-proceso">{hoja.proceso}</h1>
              {hoja.cuando && <p className="sop-cuando">Cuándo se ejecuta: {hoja.cuando}</p>}
            </div>
            <dl className="sop-meta">
              <div><dt>Código</dt><dd>{hoja.codigo}</dd></div>
              <div><dt>Aplica a</dt><dd>{aplicaA || '—'}</dd></div>
              <div><dt>Emisión</dt><dd>{emision}</dd></div>
            </dl>
          </header>

          <section className="sop-sec sop-producto">
            <h2>El producto de este proceso</h2>
            {hoja.producto
              ? <p>{hoja.producto}</p>
              : <Falta>Este módulo todavía no declara el producto de este proceso.</Falta>}
          </section>

          <section className="sop-sec">
            <h2>Los pasos</h2>
            {hoja.pasos.length > 0
              ? <ol className="sop-pasos">{hoja.pasos.map((p, i) => <li key={i}>{p}</li>)}</ol>
              : <Falta>Este módulo todavía no declara un paso a paso. Está en el módulo como texto, no como procedimiento.</Falta>}
            {hoja.pasosOmitidos > 0 && (
              <Falta>
                Quedan {hoja.pasosOmitidos} pasos fuera de la hoja: aquí van los primeros {hoja.pasos.length} para
                caber en una página. El paso a paso completo está en el módulo {hoja.codigo}.
              </Falta>
            )}
          </section>

          <div className="sop-cierre">
            <section className="sop-sec">
              <h2>Quién decide qué</h2>
              {hoja.decide.length > 0 ? (
                <ul className="sop-decide">
                  {hoja.decide.map((d, i) => (
                    <li key={i}>{d.situacion && <b>{d.situacion}. </b>}{d.regla}</li>
                  ))}
                </ul>
              ) : <Falta>Este módulo todavía no declara puntos de escalamiento.</Falta>}
            </section>

            <section className="sop-sec">
              <h2>Errores que cuestan</h2>
              {hoja.errores.length > 0 ? (
                <ul className="sop-errores">{hoja.errores.map((e, i) => <li key={i}>{e}</li>)}</ul>
              ) : <Falta>Este módulo todavía no declara errores típicos.</Falta>}
            </section>
          </div>

          <footer className="sop-pie">
            <div className="sop-firmas">
              <div className="sop-firma">
                <span className="sop-firma__linea" aria-hidden="true" />
                <p>Jefe entrenador — nombre y firma{oficial ? ` (${oficial})` : ''}</p>
              </div>
              <div className="sop-firma">
                <span className="sop-firma__linea" aria-hidden="true" />
                <p>Fecha</p>
              </div>
            </div>
            <p className="sop-origen">
              Entrenamiento a Bordo · ALOHA · {curso} · {hoja.codigo}. El contenido sale del Manual de Operaciones:
              si el Manual cambia, se corrige el módulo y esta hoja se vuelve a imprimir.
            </p>
          </footer>
        </article>
      </div>
    </>
  )
}
