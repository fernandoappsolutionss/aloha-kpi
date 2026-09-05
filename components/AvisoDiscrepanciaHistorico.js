'use client'
// "TODO EL HISTÓRICO DE METAS GUARDADAS" — la parte que NO se puede apagar.
//
// POR QUÉ EXISTE, QUE ES EL PUNTO. La tarjeta de al lado
// (AvisoDiscrepanciaMetas) mira el trimestre SELECCIONADO, y ese trimestre sale
// de localStorage ('ts_period'), compartido con Panel, Ranking, Reporte y la
// pantalla del centro. Con eso, de 90 discrepancias se dibujaban las 10 del
// trimestre en curso: las otras 80 eran invisibles salvo que alguien retrocediera
// trimestre por trimestre. Y bastaba con haber mirado otro trimestre en Ranking
// para que Alertas arrancara mostrando 3 en vez de 10. Eso es un descarte
// persistente en el navegador con otro nombre, y es justo lo que
// test/responsive-ui.test.mjs prohíbe para las otras dos alertas.
//
// Este bloque NO recibe período. Barre todos los trimestres con filas en
// `cumplimiento` y se dibuja siempre. Fernando: "la alerta debe mantenerse
// hasta que se corrijan los datos".
//
// NO SE PUEDE DESCARTAR: sin botón, sin localStorage, sin estado de "visto".
// Y un fallo de lectura NO se calla —se dice—, porque una tarjeta que
// desaparece en silencio se lee como "ya no hay nada", que es exactamente el
// modo de fallo que esta alerta existe para evitar.
//
// TONO: informa que dos fuentes no coinciden. No dictamina cuál miente. El
// encuadre («esto pasa en N de M centros») va ANTES de cualquier nombre propio.
import { useEffect, useState } from 'react'
import { getDiscrepanciasHistoricas } from '../app/actions/cumplimiento'
import { NOTA_NEUTRAL, encuadre } from '../lib/discrepancias-metas.mjs'

export default function AvisoDiscrepanciaHistorico() {
  const [resumen, setResumen] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    setError('')
    getDiscrepanciasHistoricas()
      .then((res) => { if (vivo) setResumen(res) })
      .catch((causa) => {
        console.error('[AvisoDiscrepanciaHistorico]', causa)
        if (vivo) setError('No se pudo contrastar las metas guardadas contra el cálculo. Recarga la página: un fallo de lectura no significa que no haya nada que corregir.')
      })
    return () => { vivo = false }
  }, [])

  if (error) return <p role="status" className="discrepancia-historico__error">{error}</p>
  if (!resumen || !resumen.hay) return null

  const marco = encuadre(resumen.centros, resumen.centrosMirados)

  return (
    <section className="card discrepancia-historico" aria-labelledby="discrepancia-historico-titulo">
      <div className="discrepancia-panel__cabecera">
        <h2 id="discrepancia-historico-titulo" className="label">
          Metas guardadas que no coinciden con el cálculo · todo el histórico
        </h2>
        <span className="pill pill--warn">
          <span className="dot" />
          <span aria-hidden="true">⚠</span> {resumen.casos} {resumen.casos === 1 ? 'meta' : 'metas'} · {resumen.filas} {resumen.filas === 1 ? 'fila' : 'filas'}
        </span>
      </div>

      <p className="discrepancia-panel__titular">{resumen.titular}</p>
      <p className="discrepancia__nota">{resumen.reparto}</p>
      {marco && <p className="discrepancia-panel__marco">{marco}</p>}
      <p className="discrepancia__nota">{NOTA_NEUTRAL}</p>

      <div className="discrepancia-historico__cortes">
        <div className="discrepancia-historico__corte">
          <h3 className="label">Por trimestre</h3>
          <ul className="discrepancia-historico__lista">
            {resumen.porTrimestre.map((t) => (
              <li key={`${t.anio}-${t.trimestre}`}>
                <b>{t.etiqueta}</b>
                <span>{t.casos} {t.casos === 1 ? 'meta' : 'metas'} · {t.filas} {t.filas === 1 ? 'fila' : 'filas'} · {t.centros} {t.centros === 1 ? 'centro' : 'centros'}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="discrepancia-historico__corte">
          <h3 className="label">Por centro</h3>
          <ul className="discrepancia-historico__lista">
            {resumen.porCentro.map((c) => (
              <li key={c.centroId}>
                <b>{c.centro}</b>
                <span>{c.casos} {c.casos === 1 ? 'meta' : 'metas'} en {c.trimestres} {c.trimestres === 1 ? 'trimestre' : 'trimestres'}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {resumen.noVerificables > 0 && (
        <p className="discrepancia__nota">
          Otras {resumen.noVerificables} metas tienen marca guardada que hoy no se puede contrastar
          (trimestre sin datos o meta no evaluable). No entran en la cuenta de arriba: no se afirma nada de ellas.
        </p>
      )}
      <p className="discrepancia__nota">
        Este bloque no depende del trimestre que tengas seleccionado arriba, y no se cierra a mano:
        cuenta todas las filas guardadas y baja solo cuando las dos fuentes coinciden.
      </p>
    </section>
  )
}
