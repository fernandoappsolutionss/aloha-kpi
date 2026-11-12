'use client'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import TableScroller from '../../../../components/TableScroller'
import TarjetaBoton from '../../../../components/referidos/TarjetaBoton'
import { useCurrentAccess } from '../../../../components/useCurrentAccess'
import { getCentroNombre } from '../../../actions/centros'
import { ajustarSaldo, canjearSaldo, detalleMiembro, listarMiembros, reemitirTarjeta } from '../../../actions/referidos'
import { centavos } from '../../../../lib/referidos/reglas.mjs'

const TIPOS = { bono_clase_prueba: 'Clase de prueba', bono_referido_asiste: 'Referido asistió', bono_referido_inscrito: 'Referido inscrito', reverso: 'Reverso', vencimiento: 'Vencido', canje: 'Canje', ajuste: 'Ajuste' }
const fecha = (v) => new Date(v).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Panama' })
// Clave de la operación: nace al abrir el formulario; un doble clic o un
// reintento no descuenta dos veces.
const nuevaClave = () => crypto.randomUUID()

export default function ReferidosCentroPage() {
  const { id } = useParams()
  const access = useCurrentAccess()
  const [nombre, setNombre] = useState('Centro')
  const [filtro, setFiltro] = useState({ q: '', pagina: 1, porPagina: 10, sinAbrir: false })
  const [datos, setDatos] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [abierto, setAbierto] = useState(null) // { miembro, detalle, clave, monto, nota }
  const [aviso, setAviso] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { getCentroNombre(id).then((n) => n && setNombre(n)).catch(() => {}) }, [id])

  const cargar = useCallback(async () => {
    const r = await listarMiembros(id, filtro)
    if (r?.error) { setLoadError(r.error); setDatos({ miembros: [], total: 0 }); return }
    setLoadError(''); setDatos(r)
  }, [id, filtro])
  useEffect(() => { const t = setTimeout(cargar, filtro.q ? 300 : 0); return () => clearTimeout(t) }, [cargar, filtro.q])

  async function abrir(miembro) {
    setAviso('')
    setAbierto({ miembro, detalle: null, clave: nuevaClave(), monto: '', nota: '' })
    const detalle = await detalleMiembro(id, miembro.id)
    setAbierto((a) => (a && a.miembro.id === miembro.id ? { ...a, detalle } : a))
  }

  async function canjear(e) {
    e.preventDefault()
    setGuardando(true); setAviso('')
    try {
      const r = await canjearSaldo(id, abierto.miembro.id, { monto: abierto.monto, nota: abierto.nota, claveOp: abierto.clave })
      if (r?.error) { setAviso(r.error); return }
      await cargar()
      await abrir({ ...abierto.miembro, saldo_cent: r.saldo })
      setAviso(`Canje registrado. Saldo nuevo: ${centavos(r.saldo)}. Recuerda aplicar el descuento en la factura.`)
    } finally { setGuardando(false) }
  }

  async function ajustar(sentido) {
    setGuardando(true); setAviso('')
    try {
      const r = await ajustarSaldo(id, abierto.miembro.id, { monto: abierto.monto, nota: abierto.nota, sentido, claveOp: abierto.clave })
      if (r?.error) { setAviso(r.error); return }
      await cargar()
      await abrir({ ...abierto.miembro, saldo_cent: r.saldo })
      setAviso(`Ajuste registrado. Saldo nuevo: ${centavos(r.saldo)}.`)
    } finally { setGuardando(false) }
  }

  async function reemitir() {
    if (!window.confirm('Reemitir invalida la tarjeta anterior (enlace y Wallet). Hazlo solo si verificaste a la familia. ¿Continuar?')) return
    const r = await reemitirTarjeta(id, abierto.miembro.id)
    if (r?.error) { setAviso(r.error); return }
    try { await navigator.clipboard.writeText(r.enlace) } catch { /* sin permiso */ }
    setAviso(`Tarjeta nueva lista. Enlace copiado: ${r.enlace}`)
    await cargar()
  }

  const paginas = datos ? Math.max(1, Math.ceil(datos.total / filtro.porPagina)) : 1
  const canWrite = access.loaded && access.canWriteOperations !== false && !access.isReadonlyGlobal

  return (
    <div className="shell">
      <Sidebar centroId={id} centroNombre={nombre} />
      <main className="main" id="main-content">
        <p className="label">MI CENTRO · REFERIDOS</p>
        <h1 className="h-title">Referidos y saldo</h1>
        <p className="h-sub">Cada familia de clase de prueba tiene su tarjeta. Aquí entregas la tarjeta y registras el canje en la mensualidad.</p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end', margin: '20px 0' }}>
          <label className="field" style={{ flex: '1 1 240px' }}><span className="label">Buscar por nombre, teléfono o código</span>
            <input className="input" value={filtro.q} onChange={(e) => setFiltro((f) => ({ ...f, q: e.target.value, pagina: 1 }))} placeholder="Ej. 6123 o abc234" />
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <input type="checkbox" checked={filtro.sinAbrir} onChange={(e) => setFiltro((f) => ({ ...f, sinAbrir: e.target.checked, pagina: 1 }))} /> Tarjeta sin abrir
          </label>
        </div>

        {loadError && <div className="alert alert--error" role="alert">{loadError}</div>}
        {!datos ? <div role="status">Cargando…</div> : datos.miembros.length === 0 ? <div role="status" className="card" style={{ padding: 20 }}>No hay familias con ese filtro.</div> : (
          <TableScroller label="Familias con tarjeta"><table className="table">
            <thead><tr><th>Familia</th><th>Código</th><th>Saldo</th><th>Referidos</th><th>Tarjeta</th><th data-actions>Acciones</th></tr></thead>
            <tbody>{datos.miembros.map((m) => (
              <tr key={m.id} style={{ cursor: 'default' }}>
                <td><strong>{m.nombre || 'Sin nombre'}</strong><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.telefono}{m.referidor ? ` · referido por ${m.referidor}` : ''}</div></td>
                <td style={{ letterSpacing: '0.1em' }}>{m.codigo.toUpperCase()}</td>
                <td style={{ fontWeight: 700, color: m.saldo_cent < 0 ? 'var(--bad-text)' : 'inherit' }}>{centavos(m.saldo_cent)}</td>
                <td>{m.referidos}</td>
                <td><span className={`pill ${m.tarjeta_vista_at ? 'pill--ok' : 'pill--warn'}`}>{m.tarjeta_vista_at ? 'Abierta' : 'Sin abrir'}</span></td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <TarjetaBoton token={m.token} nombre={m.nombre} telefono={m.telefono} />{' '}
                  <button type="button" className="btn" onClick={() => abrir(m)}>Ver / canjear</button>
                </td>
              </tr>
            ))}</tbody>
          </table></TableScroller>
        )}

        {datos && datos.total > 0 && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', fontSize: 13 }}>
            <span>{datos.total} familias · página {filtro.pagina} de {paginas}</span>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select className="input" style={{ width: 'auto' }} aria-label="Filas por página" value={filtro.porPagina} onChange={(e) => setFiltro((f) => ({ ...f, porPagina: Number(e.target.value), pagina: 1 }))}>
                {[10, 50, 100].map((n) => <option key={n} value={n}>{n} por página</option>)}
              </select>
              <button type="button" className="btn" disabled={filtro.pagina <= 1} onClick={() => setFiltro((f) => ({ ...f, pagina: f.pagina - 1 }))}>Anterior</button>
              <button type="button" className="btn" disabled={filtro.pagina >= paginas} onClick={() => setFiltro((f) => ({ ...f, pagina: f.pagina + 1 }))}>Siguiente</button>
            </span>
          </div>
        )}

        {abierto && (
          <section className="card" style={{ padding: 20, marginTop: 24 }} aria-label={`Detalle de ${abierto.miembro.nombre || 'la familia'}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <h2 style={{ fontSize: 20 }}>{abierto.miembro.nombre || 'Sin nombre'} · {centavos(abierto.miembro.saldo_cent)}</h2>
              <button type="button" className="btn" onClick={() => setAbierto(null)}>Cerrar</button>
            </div>
            {aviso && <div className="alert" role="status" style={{ marginTop: 12 }}>{aviso}</div>}
            {canWrite && (
              <form onSubmit={canjear} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end', marginTop: 16 }}>
                <label className="field"><span className="label">Monto a canjear (USD)</span>
                  <input className="input" inputMode="decimal" required value={abierto.monto} onChange={(e) => setAbierto((a) => ({ ...a, monto: e.target.value }))} placeholder="0.00" style={{ width: 140 }} />
                </label>
                <label className="field" style={{ flex: '1 1 220px' }}><span className="label">Nota (n.º de factura)</span>
                  <input className="input" required value={abierto.nota} onChange={(e) => setAbierto((a) => ({ ...a, nota: e.target.value }))} placeholder="Factura INV-000123" />
                </label>
                <button type="submit" className="btn btn--primary" disabled={guardando || abierto.miembro.saldo_cent <= 0}>{guardando ? 'Guardando…' : 'Registrar canje'}</button>
                <button type="button" className="btn" onClick={reemitir}>Reemitir tarjeta</button>
                {access.isMaster && <>
                  <button type="button" className="btn" disabled={guardando} onClick={() => ajustar('sumar')}>Ajuste: sumar</button>
                  <button type="button" className="btn" disabled={guardando} onClick={() => ajustar('restar')}>Ajuste: restar</button>
                </>}
              </form>
            )}
            {!abierto.detalle ? <div role="status" style={{ marginTop: 16 }}>Cargando movimientos…</div> : abierto.detalle.error ? <div className="alert alert--error" role="alert" style={{ marginTop: 16 }}>{abierto.detalle.error}</div> : (
              <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', marginTop: 20 }}>
                <div><p className="label">Movimientos</p>
                  {abierto.detalle.movimientos.length === 0 ? <p style={{ fontSize: 13 }}>Sin movimientos todavía.</p> : <ul style={{ listStyle: 'none', fontSize: 13 }}>
                    {abierto.detalle.movimientos.map((mv, i) => <li key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <strong>{mv.monto_cent > 0 ? '+' : '−'}{centavos(Math.abs(mv.monto_cent))}</strong> · {TIPOS[mv.tipo] || mv.tipo} · {fecha(mv.created_at)}{mv.centro ? ` · ${mv.centro}` : ''}{mv.nota ? <div style={{ color: 'var(--text-muted)' }}>{mv.nota}</div> : null}
                    </li>)}
                  </ul>}
                </div>
                <div><p className="label">Familias que refirió</p>
                  {abierto.detalle.referidos.length === 0 ? <p style={{ fontSize: 13 }}>Aún no ha referido a nadie.</p> : <ul style={{ listStyle: 'none', fontSize: 13 }}>
                    {abierto.detalle.referidos.map((r, i) => <li key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>{r.nombre || 'Sin nombre'} · {fecha(r.created_at)}</li>)}
                  </ul>}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
