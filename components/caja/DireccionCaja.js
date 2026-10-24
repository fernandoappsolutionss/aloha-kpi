'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { cargarDireccionCaja, guardarDireccionCaja } from '../../app/actions/caja-direccion'
import { CHECKS_VIERNES, AYUDA_VIERNES, CHECKS_LUNES, TIPOS_ACCION, ES_EXCEPCION, CONDICIONES_CAJA, calidadCaja, diagnosticoCaja, viernesCiclo } from '../../lib/caja/direccion.mjs'
import { FORMULAS } from '../../lib/condiciones/formulas.mjs'
import { lunesDe } from '../../lib/caja/semanas.mjs'
import { usd, fechaCorta } from './formato'

const vacio = () => ({ condicion: 'sin_asignar', fundamento: '', soportes: '', bitacora: '', viernes: {}, lunes: {}, acciones: [] })
const nombreCondicion = c => ({ sin_asignar: 'Pendiente de datos reales', 'peligro:superior': 'Peligro — superior', 'afluencia:financiera': 'Afluencia financiera' }[c] || c[0].toUpperCase()+c.slice(1))
const estiloCampo = { display: 'grid', gap: 5, minWidth: 0, gridTemplateColumns: 'minmax(0, 1fr)' }
export function DireccionCaja({ empresa, datos, onCambio }) {
  const [ciclo,setCiclo] = useState(viernesCiclo(datos.hoy))
  const [estado,setEstado] = useState(null)
  const [doc,setDoc] = useState(vacio)
  const [error,setError] = useState('')
  const [aviso,setAviso] = useState('')
  const [ocupado,setOcupado] = useState(false)
  const [carga,setCarga] = useState(0)
  useEffect(() => {
    let vigente = true
    setEstado(null); setError(''); setAviso('')
    cargarDireccionCaja(empresa,ciclo).then(r=>{
      if (!vigente) return
      if (r.error) setError(r.error)
      else { setEstado(r); setDoc(r.plan?.documento || vacio()) }
    }).catch(()=>{if(vigente) setError('No se pudo cargar el plan. Recarga esta sección.')})
    return ()=>{vigente=false}
  },[empresa,ciclo,carga])
  // Una importación o clasificación actualiza calidad sin borrar el borrador del plan.
  useEffect(() => {
    let vigente = true
    cargarDireccionCaja(empresa,ciclo).then(r=>{
      if (vigente && !r.error) setEstado(prev=>prev ? {...prev,pendientes:r.pendientes} : prev)
    }).catch(()=>{})
    return ()=>{vigente=false}
  },[datos,empresa,ciclo])
  const cuentas = datos.cuentas.filter(c=>c.empresa===empresa)
  const calidad = estado && calidadCaja(cuentas,estado.pendientes,datos.hoy)
  const riesgos = diagnosticoCaja(datos.curvas[empresa])
  const formula = FORMULAS[doc.condicion] || []
  const editar = (k,v) => setDoc(d=>({...d,[k]:v}))
  const accion = (id,k,v) => setDoc(d=>({...d,acciones:d.acciones.map(a=>a.id===id ? {...a,[k]:v} : a)}))
  async function guardar(tipo) {
    setOcupado(true);setError('');setAviso('')
    try {
      const r = await guardarDireccionCaja({empresa,ciclo,tipo,version:estado.plan?.version||0,documento:doc})
      if (r.error) {setError(r.error);return}
      const actualizado=await cargarDireccionCaja(empresa,ciclo)
      if (actualizado.error) {setError(`Guardado. ${actualizado.error}`);return}
      setEstado(actualizado);setDoc(actualizado.plan.documento)
      setAviso(tipo==='cerrar_viernes' ? 'Cierre del viernes registrado con su foto y autor.' : tipo==='revisar_lunes' ? 'Revisión del lunes registrada.' : 'Plan y bitácora guardados.')
      onCambio()
    } catch {setError('No se pudo confirmar el guardado. Recarga y comprueba el historial antes de reintentar.')}
    finally {setOcupado(false)}
  }
  return <section className="card" style={{padding:20,marginBottom:16}} aria-label="Dirección Operativa de caja">
    <div className="label">Carmen · Dirección Operativa</div>
    <h2>Viernes: cerrar y planificar. Lunes: decidir y dar seguimiento.</h2>
    <p>El viernes deja saldos, pagos y soportes completos y prepara tu plan de batalla. El lunes revisa los puntos rojos, autoriza dentro de tus facultades y escala las excepciones a Fernando. La semana de la curva va de lunes a domingo; este ritual no cambia el cierre estadístico de los centros.</p>
    {estado?.formacion && <Link className="btn btn--primary" href={`/centro/${estado.centroFormacion}/entrenamiento/oficio/of-caj-1${estado.master?'?revisar=coordinador':''}`}>Abrir entrenamiento de Dirección Operativa</Link>}
    {calidad && <div role={calidad.confiable?'status':'alert'} className={`alert ${calidad.confiable?'':'alert--error'}`} style={{marginTop:16,display:'block'}}>
      <strong>{calidad.confiable?'Saldos recientes y movimientos clasificados':'Datos pendientes: comprueba la caja antes de decidir'}</strong>
      {calidad.problemas.length>0 && <ul>{calidad.problemas.map(p=><li key={p}>{p}</li>)}</ul>}
      <p>Una previsión verde no acredita Normal o Afluencia. La condición se fundamenta con estadísticas reales comparables. Los ingresos estimados y las acciones propuestas todavía no son dinero cobrado.</p>
    </div>}
    <details open><summary><strong>Semanas en riesgo o en caída</strong></summary>
      <p>Rojo: disponible negativo. Ámbar: debajo del piso de dos semanas de gasto. Caída: menos disponible que la semana proyectada anterior. Son señales operativas, no condiciones HCA automáticas.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,320px),1fr))',gap:12}}>
        {riesgos.filter(s=>s.semaforo!=='verde'||s.caida).map(s=><div key={s.semana} className="alert" style={{display:'grid',gridTemplateRows:'auto 1fr auto',alignItems:'start',minWidth:0,border:`1px solid var(${s.semaforo==='rojo'?'--bad-line':s.semaforo==='ambar'?'--warn-line':'--border'})`,background:`var(${s.semaforo==='rojo'?'--bad-bg':s.semaforo==='ambar'?'--warn-bg':'--surface-2'})`,padding:16}}>
          <strong>{fechaCorta(s.semana)} · {s.semaforo==='rojo'?'Riesgo de faltante':s.semaforo==='ambar'?'Bajo el piso':'Sobre el piso'}{s.caida?' · En caída':''}</strong>
          <p>Disponible {usd(s.disponible)}. Faltan {usd(s.faltaParaPiso)} para el piso.{s.variacion!==null?` Variación ${usd(s.variacion)}.`:''}{s.excedeLinea?' El faltante excede la línea disponible.':''}</p>
          {estado?.puedeEditar && <button className="btn" type="button" onClick={()=>editar('acciones',[...doc.acciones,{id:crypto.randomUUID(),tipo:'cobro',objetivo:'',responsable:'Carmen',fecha:s.semana,semana:s.semana,monto:0,paso:0,estado:'pendiente',evidencia:'',aprobacion:'facultad_actual'}])}>Planificar esta semana</button>}
        </div>)}
        {riesgos.every(s=>s.semaforo==='verde'&&!s.caida)&&<p>Sin semanas bajo el piso ni caídas en esta proyección. Verifica también la integridad de los datos.</p>}
      </div>
    </details>
    <details style={{marginTop:16}}><summary><strong>Cómo coordinar la transferencia al socio</strong></summary>
      <ol><li>Comprueba «Dueño por separar» en el resumen de la empresa y contrasta lo ya transferido en Movimientos importados.</li><li>Agrega una acción «Coordinar transferencia al socio / dueño» con monto, responsable, fecha y referencia del acuerdo.</li><li>La persona autorizada realiza la transferencia en el banco. Esta plataforma registra el seguimiento; no mueve dinero.</li><li>Importa el extracto y clasifica la salida como Dueño. Registra el comprobante y el resultado en la acción.</li></ol>
      <p>No lo agregues como otro pago programado: la curva ya separa esta participación. Cambios de porcentaje o excepciones requieren acuerdo de Master.</p>
    </details>
    <hr/>
    <label style={estiloCampo}>Viernes de referencia del plan<input className="input" type="date" value={ciclo} max={datos.hoy} disabled={ocupado} onChange={e=>setCiclo(e.target.value)}/></label>
    {estado?.ciclos.length>0&&<p>Ciclos guardados: {estado.ciclos.map(c=><button className="btn" key={c.ciclo} onClick={()=>setCiclo(c.ciclo)} disabled={ocupado}>{fechaCorta(c.ciclo)}</button>)}</p>}
    {error&&<p className="alert alert--error" role="alert">{error}</p>}
    {aviso&&<p className="alert" role="status">{aviso}</p>}
    {!estado&&<button className="btn" onClick={()=>setCarga(n=>n+1)}>Recargar plan</button>}
    {estado&&<>
      <p>Cierre: {estado.plan?.cierre_at?new Date(estado.plan.cierre_at).toLocaleString('es-PA',{timeZone:'America/Panama'}):'pendiente'} · Revisión del lunes: {estado.plan?.lunes_at?'registrada':'pendiente'}. Horarios de Panamá.</p>
      {!estado.puedeEditar&&<p>Consulta. Carmen y Master registran el plan y los rituales.</p>}
      <fieldset disabled={!estado.puedeEditar||ocupado} style={{border:0,padding:0,minWidth:0,display:'grid',gap:16}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,240px),1fr))',gap:16}}>
          {[[CHECKS_VIERNES,'viernes','Cierre del viernes'],[CHECKS_LUNES,'lunes','Revisión del lunes']].map(([checks,k,t])=><div key={k}><h3>{t}</h3>{Object.entries(checks).map(([id,label])=><label key={id} style={{display:'flex',gap:8,alignItems:'start',marginBottom:10}}><input type="checkbox" checked={!!doc[k][id]} onChange={e=>editar(k,{...doc[k],[id]:e.target.checked})}/><span>{label}{k === 'viernes' && <small style={{display:'block',marginTop:4}}>{AYUDA_VIERNES[id]}</small>}</span></label>)}</div>)}
        </div>
        <label style={estiloCampo}>Soportes y conciliación<textarea className="input" rows={3} maxLength={4000} value={doc.soportes} onChange={e=>editar('soportes',e.target.value)} placeholder="Archivo importado, cuenta, fecha de corte, saldo contrastado y referencia del comprobante. Sube el extracto en Subir extracto; aquí deja sus referencias."/></label>
        <label style={estiloCampo}>Condición sustentada en estadísticas reales<select className="input" value={doc.condicion} onChange={e=>{editar('condicion',e.target.value);setDoc(d=>({...d,acciones:d.acciones.map(a=>({...a,paso:0}))}))}}>{CONDICIONES_CAJA.map(c=><option key={c} value={c}>{nombreCondicion(c)}</option>)}</select></label>
        <label style={estiloCampo}>Fundamento: estadística, valores, semanas y fuente<textarea className="input" rows={3} maxLength={4000} value={doc.fundamento} onChange={e=>editar('fundamento',e.target.value)} placeholder="No asignar una condición a partir del semáforo o de una sola cifra. Con datos insuficientes, dejar pendiente y planificar cómo completarlos."/></label>
        {formula.length>0&&<div><strong>Fórmula: conserva este orden y escribe objetivos debajo de cada paso</strong><ol>{formula.map(p=><li key={p}>{p}</li>)}</ol></div>}
        <h3>Plan de batalla · cobros, costos y decisiones</h3>
        <p>Impacto esperado de cada acción, sin sumarlo automáticamente a la curva. Un ahorro elimina gasto; una reprogramación solo cambia la fecha y exige acuerdo. Usa el mismo pago una sola vez. Nuevos compromisos, fuera de presupuesto y crédito requieren aprobación de Master.</p>
        {doc.acciones.map((a,i)=><fieldset key={a.id} style={{border:'1px solid var(--line)',padding:16,minWidth:0,display:'grid',gap:10}}><legend>Acción {i+1}</legend>
          <label style={estiloCampo}>Tipo<select aria-label="Tipo" className="input" value={a.tipo} onChange={e=>accion(a.id,'tipo',e.target.value)}>{Object.entries(TIPOS_ACCION).map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
          <label style={estiloCampo}>Resultado concreto<textarea className="input" value={a.objetivo} maxLength={600} onChange={e=>accion(a.id,'objetivo',e.target.value)}/></label>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}>
            <label style={estiloCampo}>Responsable<input className="input" value={a.responsable} maxLength={120} onChange={e=>accion(a.id,'responsable',e.target.value)}/></label>
            <label style={estiloCampo}>Fecha límite<input className="input" type="date" value={a.fecha} onChange={e=>accion(a.id,'fecha',e.target.value)}/></label>
            <label style={estiloCampo}>Semana afectada (lunes)<input className="input" type="date" value={a.semana} onChange={e=>accion(a.id,'semana',e.target.value)}/></label>
            <label style={estiloCampo}>Impacto esperado USD<input className="input" type="number" min="0" step="0.01" value={a.monto} onChange={e=>accion(a.id,'monto',e.target.value===''?0:Number(e.target.value))}/></label>
          </div>
          <label style={estiloCampo}>Paso de fórmula<select className="input" value={a.paso} onChange={e=>accion(a.id,'paso',Number(e.target.value))}><option value={0}>Actividad urgente / pendiente / estratégica</option>{formula.map((p,n)=><option key={n} value={n+1}>{n+1}. {p}</option>)}</select></label>
          <label style={estiloCampo}>Estado<select className="input" value={a.estado} onChange={e=>accion(a.id,'estado',e.target.value)}><option value="pendiente">Pendiente</option><option value="en_curso">En curso</option><option value="hecho">Hecho con evidencia</option><option value="cancelada">Cancelada con motivo</option></select></label>
          <label style={estiloCampo}>Evidencia, resultado real o motivo<textarea className="input" maxLength={1500} value={a.evidencia} onChange={e=>accion(a.id,'evidencia',e.target.value)}/></label>
          {ES_EXCEPCION.has(a.tipo)&&<div><strong>Decisión de Master: {a.aprobacion==='facultad_actual'?'pendiente':a.aprobacion}</strong>{a.aprobador&&<p>{a.aprobador.nombre} · {a.aprobador.fecha}</p>}{estado.master&&<label style={estiloCampo}>Registrar decisión<select className="input" value={a.decision||''} onChange={e=>accion(a.id,'decision',e.target.value)}><option value="">Sin decisión nueva</option><option value="aprobada">Aprobar esta propuesta</option><option value="rechazada">Rechazar esta propuesta</option></select></label>}</div>}
        </fieldset>)}
        <button className="btn" type="button" onClick={()=>editar('acciones',[...doc.acciones,{id:crypto.randomUUID(),tipo:'cobro',objetivo:'',responsable:'Carmen',fecha:datos.hoy,semana:lunesDe(datos.hoy),monto:0,paso:0,estado:'pendiente',evidencia:'',aprobacion:'facultad_actual'}])}>Agregar acción</button>
        <label style={estiloCampo}>Bitácora de esta actualización<textarea className="input" rows={4} value={doc.bitacora} maxLength={6000} onChange={e=>editar('bitacora',e.target.value)} placeholder="Qué cambió, resultado frente a lo previsto, causa, decisión y siguiente control. El historial conserva cada versión."/></label>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button className="btn btn--primary" onClick={()=>guardar('guardar')}>Guardar plan y bitácora</button><button className="btn" onClick={()=>guardar('cerrar_viernes')}>Registrar cierre del viernes</button><button className="btn" onClick={()=>guardar('revisar_lunes')}>Registrar revisión del lunes</button></div>
      </fieldset>
      <p>Registrar el cierre no paga facturas ni congela la operación bancaria. Las nuevas operaciones deben conciliarse. La firma del entrenamiento se registra aparte, después de observar la maniobra.</p>
      <details><summary>Historial verificable ({estado.eventos.length} últimas versiones)</summary>{estado.eventos.map(e=><article key={e.id} style={{borderTop:'1px solid var(--line)',padding:'12px 0'}}><strong>Versión {e.version} · {e.tipo.replaceAll('_',' ')} · {e.autor}</strong><p>{new Date(e.created_at).toLocaleString('es-PA',{timeZone:'America/Panama'})} · {e.documento.bitacora}</p><details><summary>Ver plan y foto de caja guardados</summary><p>Condición: {nombreCondicion(e.documento.condicion)}. {e.documento.fundamento}</p><p>Soportes: {e.documento.soportes}</p><ul>{e.documento.acciones.map(a=><li key={a.id}><strong>{a.objetivo}</strong> · {a.responsable} · {fechaCorta(a.fecha)} · {usd(a.monto)} esperados · {a.estado.replaceAll('_',' ')} · {a.aprobacion.replaceAll('_',' ')}. {a.evidencia}</li>)}</ul><p>Foto al {fechaCorta(e.foto.hoy)}: saldo {usd(e.foto.resumen?.saldoHoy)}; pendientes de clasificar {e.foto.pendientes}; piso {usd(e.foto.curva?.piso)}.</p><ul>{(e.foto.curva?.semanas||[]).map(s=><li key={s.lunes}>{fechaCorta(s.lunes)}: disponible {usd(s.disponible)} · {s.semaforo}.</li>)}</ul></details></article>)}</details>
    </>}
  </section>
}
