'use client'
// "METAS GUARDADAS QUE NO COINCIDEN CON EL CÁLCULO" — tarjeta del supervisor.
//
// Por qué existe: las 3 metas de resultado viven en `cumplimiento` como texto
// 'si'/'no' de cuando se marcaban a mano. La pantalla del centro pinta el valor
// CALCULADO, así que esas marcas viejas son INVISIBLES ahí — pero siguen
// sumando en el % de Disciplina del panel. Un 'si' viejo infla el panel sin que
// nadie pueda verlo. El supervisor es el único que puede enterarse, y esta
// tarjeta es donde se entera.
//
// ESTA TARJETA MIRA EL TRIMESTRE SELECCIONADO. El histórico completo —que no
// depende de ningún selector y por eso no se puede apagar— lo pinta
// components/AvisoDiscrepanciaHistorico.js, que va encima de ésta.
//
// NO SE PUEDE DESCARTAR. No hay botón de "visto" a propósito: el aviso se retira
// solo cuando las dos fuentes coinciden, y coincidir sólo pasa de dos maneras —
// que entren los datos que faltaban, o que se corrija el histórico con
// scripts/backfill-metas-cumplimiento-2026-09-05.mjs.
//
// TONO: informa que dos fuentes no coinciden. No acusa. Lo puede leer la
// persona que marcó la casilla. Y el ENCUADRE va ANTES de los nombres: con 86
// de 90 discrepancias en la misma dirección y los seis centros afectados, una
// línea de reparto puesta al lado de un nombre propio se lee como señalamiento
// personal. El problema es cómo se marcaba la casilla, no quién la marcó.
import { compararMetas, resumenDiscrepancias, encuadre, NOTA_NEUTRAL } from '../lib/discrepancias-metas.mjs'

const ETIQUETA_META = {
  ventas: 'Ventas',
  'deserción': 'Deserción',
  cobranza: 'Cobranza',
}

// `centros` = lo que devuelve getCentrosKpi (cada uno con su `producto`).
// `marcadas` = filas guardadas del trimestre (getMetasMarcadasPanel).
export function compararPanel(centros = [], marcadas = [], mesesDelTrimestre = []) {
  return (centros || []).map((c) => ({
    centroId: c.id,
    centro: c.nombre,
    admin: c.admin,
    comparacion: compararMetas({
      producto: c.producto,
      filas: (marcadas || []).filter((m) => Number(m.centro_id) === Number(c.id)),
      mesesDelTrimestre,
    }),
  }))
}

export default function AvisoDiscrepanciaMetas({ centros = [], marcadas = [], mesesDelTrimestre = [], periodo = '' }) {
  const resumen = resumenDiscrepancias(compararPanel(centros, marcadas, mesesDelTrimestre))
  // Sin discrepancias NI marcas sin contrastar no ocupa espacio: un tablero que
  // grita todos los días deja de leerse.
  if (!resumen.hay) return null

  // MODO INFORMATIVO: hay marcas guardadas a mano sobre un trimestre que el
  // sistema todavía no puede juzgar. No se afirma nada de ellas —no son
  // discrepancias— pero callarlas sería esconder justo donde vive la marca
  // heredada. Va sin píldora de alerta y sin lista de centros.
  if (resumen.soloNoVerificables) {
    return (
      <section className="card discrepancia-panel discrepancia-panel--info" aria-labelledby="discrepancia-panel-titulo">
        <div className="discrepancia-panel__cabecera">
          <h2 id="discrepancia-panel-titulo" className="label">
            Metas guardadas que hoy no se pueden contrastar{periodo ? ` · ${periodo}` : ''}
          </h2>
          <span className="pill">
            <span className="dot" /> {resumen.noVerificables} {resumen.noVerificables === 1 ? 'meta' : 'metas'}
          </span>
        </div>
        <p className="discrepancia-panel__titular">
          {resumen.noVerificables === 1
            ? 'Hay 1 meta con marca guardada que el cálculo todavía no puede juzgar'
            : `Hay ${resumen.noVerificables} metas con marca guardada que el cálculo todavía no puede juzgar`}
          {' '}(trimestre sin datos o meta no evaluable). No se afirma nada de ellas: se conservan como están hasta que haya datos.
        </p>
        <p className="discrepancia__nota">{NOTA_NEUTRAL}</p>
      </section>
    )
  }

  const marco = encuadre(resumen.centros, (centros || []).length)

  return (
    <section className="card discrepancia-panel" aria-labelledby="discrepancia-panel-titulo">
      <div className="discrepancia-panel__cabecera">
        <h2 id="discrepancia-panel-titulo" className="label">
          Metas guardadas que no coinciden con el cálculo{periodo ? ` · ${periodo}` : ''}
        </h2>
        <span className="pill pill--warn">
          <span className="dot" />
          <span aria-hidden="true">⚠</span> {resumen.casos} {resumen.casos === 1 ? 'meta' : 'metas'} · {resumen.filas} {resumen.filas === 1 ? 'fila' : 'filas'}
        </span>
      </div>

      <p className="discrepancia-panel__titular">{resumen.titular}</p>
      <p className="discrepancia__nota">{resumen.reparto}</p>

      {/* El encuadre y la nota neutral van ARRIBA de la lista: quien lee un
          nombre propio ya tiene que haber leído que el patrón es de todos. */}
      {marco && <p className="discrepancia-panel__marco">{marco}</p>}
      <p className="discrepancia__nota">{NOTA_NEUTRAL}</p>

      <ul className="discrepancia-panel__lista">
        {resumen.detalle.map((c) => (
          <li key={c.centroId} className="discrepancia-panel__centro">
            <div className="discrepancia-panel__nombre">
              {c.centro}
              {c.admin && c.admin !== '—' && <span className="discrepancia-panel__admin">{c.admin}</span>}
            </div>
            <ul className="discrepancia-panel__metas">
              {c.comparacion.discrepancias.map((d) => (
                <li key={d.clave} className="discrepancia-panel__meta">
                  <b className="discrepancia-panel__meta-nombre">{ETIQUETA_META[d.corta] || d.etiqueta}</b>
                  <span className="discrepancia-panel__meta-titulo">{d.titulo}</span>
                  <span className="discrepancia-panel__meta-detalle">{d.detalle}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {resumen.noVerificables > 0 && (
        <p className="discrepancia__nota">
          Otras {resumen.noVerificables} metas tienen marca guardada que hoy no se puede contrastar
          (trimestre sin datos o meta no evaluable). No entran en la cuenta de arriba: no se afirma nada de ellas.
        </p>
      )}
    </section>
  )
}
