'use client'
import { useEffect, useState } from 'react'
import { getJuegoSemana, guardarJuegoSemana, aprobarJuegoSemana } from '../../app/actions/juegos-semana'
import { getInformeSemana } from '../../app/actions/semana'
import { resultadoJuego } from '../../lib/juegos-semana.mjs'
import { mostrarNumero as numero } from '../../lib/avance-semana.mjs'

export default function JuegosSemana({ datos, centroId }) {
  const [semana, setSemana] = useState(datos.semanaAbierta)
  const [cierre, setCierre] = useState(null)
  const historico = semana !== datos.semanaAbierta
  const [juego, setJuego] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [falloCarga, setFalloCarga] = useState(false)
  const [intento, setIntento] = useState(0)
  const [editar, setEditar] = useState(false)
  const [mensaje, setMensaje] = useState('')
  useEffect(() => {
    let activo = true
    setCargando(true); setError(''); setFalloCarga(false); setJuego(null); setEditar(false)
    setCierre(null)
    Promise.all([getJuegoSemana(centroId, semana), historico ? getInformeSemana(centroId, semana) : null]).then(([j, informe]) => { if (activo) { setJuego(j); setCierre(informe) } })
      .catch(() => { if (activo) { setFalloCarga(true); setError('No se pudo cargar el juego. Reintenta antes de guardar una propuesta.') } })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [centroId, semana, historico, intento])
  async function ejecutar(work) {
    setOcupado(true); setError(''); setMensaje('')
    try { setJuego(await work()); setEditar(false); setMensaje('Juego guardado. Su estado se muestra debajo.') }
    catch (e) { setError(e?.message || 'No se pudo guardar el juego.'); setFalloCarga(true) }
    finally { setOcupado(false) }
  }
  const meta = juego && datos.catalogo.find(m => m.codigo === juego.codigo)
  const valor = juego && (historico ? cierre?.estadisticas.find(m => m.codigo === juego.codigo)?.valor : datos.resumen[juego.codigo]?.abierta)
  return <section aria-labelledby="juegos-title">
    <div className="semana-intro"><div><p className="label">05 · Opcional</p><h2 id="juegos-title">Un juego para mover al equipo</h2><p>Un reto compartido pone una meta concreta, reglas claras y un reconocimiento al esfuerzo del equipo. Sirve para concentrar la atención en un resultado y hacer visible su avance.</p></div></div>
    <details className="semana-ayuda"><summary>Cómo funciona y cuándo usarlo</summary><ol><li>Elige un resultado que el equipo pueda influir: por ejemplo, asistentes a clases de prueba.</li><li>Acuerda quién participa, qué cuenta, la meta al jueves y el premio. Puede ser un reconocimiento sin costo.</li><li>Guarda la propuesta para que coordinación la apruebe.</li><li>Revisa el avance automático cada día. Al cierre, coordinación comprueba la meta y entrega el reconocimiento acordado.</li></ol><p>Ejemplo pedagógico: «Semana de bienvenida», equipo del centro, 10 asistentes a clases de prueba realizadas de viernes a jueves y reconocimiento en la reunión. Define reglas para confirmar citas y atender bien a cada familia. Adapta la cifra a tu realidad.</p><p>El juego acompaña el plan de batalla y la calidad del servicio. No cambia las cinco cuotas, no sustituye la fórmula y no modifica primas ni paga premios automáticamente.</p></details>
    <label className="field"><span>Semana del juego</span><select className="input" value={semana} disabled={ocupado} onChange={e => setSemana(e.target.value)}>{[...datos.semanas].reverse().map(fin => <option value={fin} key={fin}>Cierre {fin}{fin === datos.semanaAbierta ? ' · En curso' : ''}</option>)}</select></label>
    {cargando && <p role="status">Cargando juego…</p>}{error && <p role="alert" className="alert alert--error">{error} <button className="btn" disabled={ocupado} onClick={() => setIntento(i => i + 1)}>Recargar juego</button></p>}{mensaje && <p role="status">{mensaje}</p>}
    {!cargando && !falloCarga && <>
      {juego && <article className="panel semana-juego"><p className="label">{juego.estado === 'aprobado' ? 'Aprobado por coordinación' : 'Propuesta pendiente'}</p><h3>{juego.titulo}</h3><p className="semana-juego__resultado"><strong>{numero(valor)}</strong> / {meta.inversa ? 'máximo' : 'meta'} {numero(juego.meta)} · {meta.nombre}</p><p role="status">{resultadoJuego(juego, valor, historico)}</p><dl><dt>Participantes</dt><dd>{juego.participantes}</dd><dt>Reglas</dt><dd>{juego.reglas}</dd><dt>Premio acordado</dt><dd>{juego.premio}</dd><dt>Cierre</dt><dd>{semana}</dd></dl><div className="semana-cuotas__acciones">{!historico && datos.puedeAsignar && <button className="btn" disabled={ocupado} onClick={() => setEditar(v => !v)}>{editar ? 'Cancelar edición' : 'Editar propuesta'}</button>}{!historico && datos.puedeAprobar && juego.estado === 'propuesto' && <button className="btn btn--primary" disabled={ocupado} onClick={() => ejecutar(() => aprobarJuegoSemana(centroId, datos.semanaAbierta, juego.version))}>Aprobar juego</button>}</div></article>}
      {!juego && <p>No hay un juego registrado para esta semana.</p>}
      {!historico && datos.puedeAsignar && (!juego || editar) && <form key={juego?.version || 0} className="panel semana-juego-form" onSubmit={e => { e.preventDefault(); const campos = Object.fromEntries(new FormData(e.currentTarget)); ejecutar(() => guardarJuegoSemana(centroId, datos.semanaAbierta, { ...campos, version: juego?.version || 0 })) }}><h3>{juego ? 'Editar el juego' : 'Proponer un juego'}</h3>{juego?.estado === 'aprobado' && <p>Editar devuelve el juego a propuesta y requiere nueva aprobación.</p>}<label className="field"><span>Nombre del juego</span><input className="input" name="titulo" maxLength={120} required defaultValue={juego?.titulo || ''} placeholder="Ej.: Semana de bienvenida" /></label><div className="semana-juego-form__meta"><label className="field"><span>Resultado a mejorar</span><select className="input" name="codigo" defaultValue={juego?.codigo || 'cp_asistidas'}>{datos.catalogo.map(m => <option key={m.codigo} value={m.codigo}>{m.nombre}{m.inversa ? ' · máximo permitido' : ''}</option>)}</select></label><label className="field"><span>Meta al cierre (entero)</span><input className="input" name="meta" type="number" min="0" max="1000000" step="1" required defaultValue={juego?.meta ?? ''} /></label></div><label className="field"><span>Quiénes participan</span><input className="input" name="participantes" maxLength={300} required defaultValue={juego?.participantes || ''} placeholder="Equipo y responsables" /></label><label className="field"><span>Reglas: qué cuenta y cómo se comprueba</span><textarea className="input" name="reglas" maxLength={1500} required defaultValue={juego?.reglas || ''} /></label><label className="field"><span>Premio o reconocimiento</span><input className="input" name="premio" maxLength={300} required defaultValue={juego?.premio || ''} placeholder="Ej.: reconocimiento en la reunión" /></label><button className="btn btn--primary" disabled={ocupado}>{ocupado ? 'Guardando…' : 'Guardar propuesta de juego'}</button></form>}
    </>}
  </section>
}
