'use client'
import { useState } from 'react'
import { cambiarAlineamiento, guardarCuotas } from '../../app/actions/semana'
import { sumarDias } from '../../lib/semana-cierre.mjs'
import { METRICAS_ALINEAMIENTO, PARTIDAS_ALINEAMIENTO, totalesAlineamiento } from '../../lib/alineamiento-semana.mjs'

export default function AlineamientoSemana({ centroId, semanaFin, items, cuotas, puedeEscribir, ejecutar, ocupado }) {
  const [codigo, setCodigo] = useState('nuevos_inscritos')
  const { alineado, hecho } = totalesAlineamiento(items, codigo)
  const cuota = cuotas[codigo]?.cuota
  const cambiar = cambio => ejecutar(() => cambiarAlineamiento(centroId, semanaFin, cambio))
  return <section className="semana-plan__seccion semana-alineamiento" aria-labelledby="alineamiento-title">
    <h3 id="alineamiento-title">Alineamiento</h3>
    <p className="h-sub">Pon nombre a las oportunidades que harán posible tu cuota: clientes, grupos o actividades y su cantidad. Agrega cada oportunidad una sola vez. Planificar no significa que ya se logró.</p>
    <label className="field"><span>Resultado que vas a alinear</span><select className="input" value={codigo} onChange={e => setCodigo(e.target.value)} disabled={ocupado}>{Object.entries(METRICAS_ALINEAMIENTO).map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}</select></label>
    <div className="semana-alineamiento__totales">
      <form key={`${codigo}:${cuota}`} onSubmit={async e => { e.preventDefault(); const valor = Number(new FormData(e.currentTarget).get('cuota')); await ejecutar(() => guardarCuotas(centroId, sumarDias(semanaFin, 7), { [codigo]: valor })) }}>
        <label className="field"><span>Cuota semanal del alineamiento</span><input name="cuota" className="input" type="number" min="0" step="1" required defaultValue={cuota ?? ''} disabled={!puedeEscribir || ocupado} /></label>
        <p className="h-sub">{cuotas[codigo]?.estado === 'aprobada' ? 'Aprobada' : cuotas[codigo]?.estado === 'propuesta' ? 'Propuesta' : 'Sin guardar'} · misma cuota de Avance y cuotas.</p>
        {puedeEscribir && <button className="btn" disabled={ocupado}>Guardar cuota</button>}
      </form>
      <p><span>Alineado</span><strong>{alineado}</strong></p><p><span>Hecho</span><strong>{hecho}</strong></p>
    </div>
    {Number(cuota) > 0 ? <><progress aria-label="Cobertura del alineamiento" max={Number(cuota)} value={Math.min(alineado, Number(cuota))} /><p className="h-sub">Cobertura ×{(alineado / Number(cuota)).toFixed(1)} de la cuota. Busca suficientes oportunidades para cubrir las que no se concreten.</p></> : <p className="h-sub">Guarda una cuota para ver su cobertura.</p>}
    <p className="h-sub">Hecho suma las partidas que marcas con evidencia. Los resultados oficiales siguen llegando de los registros del centro y Clases de Prueba; esta lista no los modifica.</p>
    {Object.entries(PARTIDAS_ALINEAMIENTO).map(([partida, titulo]) => <section key={`${codigo}:${partida}`} className="semana-alineamiento__partida" aria-label={titulo}>
      <h4>{titulo}</h4>
      <ul className="semana-plan__objetivos">{items.filter(item => item.codigo === codigo && item.partida === partida).map(item => <li className="semana-objetivo" key={item.id}>
        <strong>{item.nombre}</strong> · {item.cantidad} · {item.hecho ? 'Hecho' : 'Pendiente'}
        {item.evidencia && <p><strong>Evidencia:</strong> {item.evidencia}</p>}
        {puedeEscribir && <>{!item.hecho ? <form onSubmit={e => { e.preventDefault(); cambiar({ accion: 'realizar', id: item.id, evidencia: new FormData(e.currentTarget).get('evidencia') }) }}><label className="field"><span>Evidencia de la partida</span><input className="input" name="evidencia" maxLength={1000} required placeholder="Registro donde compruebas la cantidad lograda" /></label><button className="btn" disabled={ocupado}>Marcar partida hecha</button></form> : <button className="btn" disabled={ocupado} onClick={() => cambiar({ accion: 'reabrir', id: item.id })}>Reabrir partida</button>}<button className="btn" disabled={ocupado} onClick={() => { if (window.confirm('¿Eliminar esta partida del alineamiento?')) cambiar({ accion: 'eliminar', id: item.id }) }}>Eliminar partida</button></>}
      </li>)}</ul>
      {!items.some(item => item.codigo === codigo && item.partida === partida) && <p className="h-sub">Sin partidas.</p>}
      {puedeEscribir && <form className="semana-alineamiento__form" onSubmit={async e => { e.preventDefault(); const form = e.currentTarget; if (await cambiar({ accion: 'agregar', codigo, partida, ...Object.fromEntries(new FormData(form)) })) form.reset() }}>
        <label className="field"><span>Cliente, grupo o producto</span><input className="input" name="nombre" maxLength={200} required placeholder="Ej.: familias de la clase de prueba del sábado" /></label>
        <label className="field"><span>Cantidad</span><input className="input" name="cantidad" type="number" min="1" max="10000" step="1" required /></label>
        <button className="btn btn--primary" disabled={ocupado}>Agregar a {titulo.toLowerCase()}</button>
      </form>}
    </section>)}
  </section>
}
