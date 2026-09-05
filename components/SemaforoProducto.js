import { CRECIMIENTO_TEXTO, dec1 } from '../lib/marcadores.mjs'

// Banda de semáforo del PRODUCTO VALIOSO. La pinta sólo Producto: Disciplina no
// entra aquí ni se promedia con ella.
//
// Accesibilidad: el color NUNCA es el único portador de la información. Cada
// estado lleva además una FORMA distinta (▲ ◆ ●), la PALABRA del estado
// ("ALERTA ROJA" / "ATENCIÓN" / "EN VERDE") y una frase con el número. Se lee
// igual en un daltónico, en una impresión en blanco y negro y en un lector de
// pantalla (aria-label con el resumen completo).

const marcaMeta = (cumple) => (cumple === null ? '·' : cumple ? '✓' : '✗')
const tonoMeta = (cumple) => (cumple === null ? 'nd' : cumple ? 'ok' : 'no')

function Tendencia({ semaforo }) {
  const net = semaforo.netMensual
  const sinDato = net == null || semaforo.crecimiento === 'INDETERMINADO'
  return (
    <div className="semaforo__tendencia">
      <span className="label">Crecimiento real</span>
      <strong className="num semaforo__tendencia-valor">
        {sinDato ? 'sin dato' : `${net > 0 ? '+' : net < 0 ? '−' : ''}${dec1(Math.abs(net))}`}
      </strong>
      <span className="semaforo__tendencia-pie">
        {sinDato ? 'faltan cierres' : `niños/mes · ${CRECIMIENTO_TEXTO[semaforo.crecimiento]}`}
      </span>
    </div>
  )
}

export default function SemaforoProducto({ semaforo, producto, compacto = false }) {
  if (!semaforo || !producto) return null
  return (
    <section className={`semaforo semaforo--${semaforo.color}`} aria-label={semaforo.resumen}>
      <div className="semaforo__marca">
        <span className="semaforo__forma" aria-hidden="true">{semaforo.forma}</span>
        <span className="semaforo__estado">{semaforo.estado}</span>
      </div>

      <div className="semaforo__cuerpo">
        {/* EL DENOMINADOR VA SIEMPRE A LA VISTA. La tarjeta de Disciplina ya
            era escrupulosa con esto ("2 de 3 meses registrados"); el marcador
            que MANDA no lo era, y ahí es donde volvía a colarse un número
            bueno sobre un trimestre a medio contar. */}
        <div className="label">
          Producto valioso · ¿el centro crece?
          {producto.mesesDelTrimestre > 0 && (
            <> · {producto.mesesConDatos} de {producto.mesesDelTrimestre} meses con datos</>
          )}
        </div>
        <h2 className="semaforo__titulo">{semaforo.titulo}</h2>
        <p className="semaforo__motivo">{semaforo.motivo}</p>

        {!compacto && (
          <ul className="semaforo__metas">
            {producto.detalle.map((d) => (
              <li key={d.clave} className={`semaforo__meta semaforo__meta--${tonoMeta(d.cumple)}`}>
                <span className="semaforo__meta-marca" aria-hidden="true">{marcaMeta(d.cumple)}</span>
                <span className="semaforo__meta-nombre">
                  {d.etiqueta}
                  <span className="sr-only">: {d.cumple === null ? 'sin datos' : d.cumple ? 'cumple' : 'no cumple'}</span>
                </span>
                <b className="num semaforo__meta-valor">{d.valor}</b>
                <span className="semaforo__meta-objetivo">meta {d.meta}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Tendencia semaforo={semaforo} />
    </section>
  )
}

// Píldora del encabezado. Sustituye a la de "94% cumplimiento", que era
// justamente el número que daba la falsa confianza.
export function SemaforoPill({ semaforo }) {
  if (!semaforo) return null
  const tono = semaforo.color === 'rojo' ? 'bad' : semaforo.color === 'verde' ? 'ok' : 'warn'
  return (
    <span className={`pill pill--${tono}`} title={semaforo.motivo}>
      <span className="dot" />
      <span aria-hidden="true">{semaforo.forma}</span> {semaforo.estado}
      <span className="sr-only"> — {semaforo.titulo}. {semaforo.motivo}</span>
    </span>
  )
}
