'use client'
import { useEffect, useMemo, useState } from 'react'
import {
  verLote, publicarLote, reconciliarLote, borrarLote,
  clasificarMovimiento, ignorarMovimiento, catalogoCuentasContables,
} from '../../app/actions/conciliacion'
import { dinero, fechaCorta, etiquetaEstado } from './formato'

const FILTROS = [
  { k: 'todos', l: 'Todos' },
  { k: 'nuevo', l: 'Por registrar' },
  { k: 'sin_clasificar', l: 'Sin cuenta' },
  { k: 'ya_en_zoho', l: 'Ya en Zoho' },
  { k: 'publicado', l: 'Registrados' },
  { k: 'duplicado', l: 'Ya importados' },
  { k: 'error', l: 'Con error' },
]

export default function LoteDetalle({ loteId, onCambio, onCerrar }) {
  const [datos, setDatos] = useState(null)
  const [contables, setContables] = useState([])
  const [filtro, setFiltro] = useState('todos')
  const [mensaje, setMensaje] = useState(null)
  const [ocupado, setOcupado] = useState('')

  async function cargar() {
    const res = await verLote(loteId)
    if (res?.error) { setMensaje({ tipo: 'error', texto: res.error }); return }
    setDatos(res)
    if (res.cuenta) {
      const cat = await catalogoCuentasContables(res.cuenta.id)
      if (cat?.cuentas) setContables(cat.cuentas)
    }
  }

  useEffect(() => { setDatos(null); setMensaje(null); cargar() }, [loteId])

  const movimientos = useMemo(() => {
    const lista = datos?.movimientos || []
    return filtro === 'todos' ? lista : lista.filter((m) => m.estado === filtro)
  }, [datos, filtro])

  if (!datos) return <div className="conc-cargando">Cargando la carga…</div>

  const { lote, resumen } = datos
  const avisos = Array.isArray(lote.avisos) ? lote.avisos : []

  async function accion(clave, fn, exito) {
    setOcupado(clave)
    setMensaje(null)
    try {
      const res = await fn()
      if (res?.error) { setMensaje({ tipo: 'error', texto: res.error }); return res }
      if (exito) setMensaje({ tipo: 'ok', texto: exito(res) })
      await cargar()
      onCambio?.()
      return res
    } finally {
      setOcupado('')
    }
  }

  // La carga solo se cierra si el borrado salió bien: cerrarla igual dejaría
  // al usuario creyendo que se borró cuando el servidor lo rechazó.
  async function borrar() {
    const res = await accion('borrar', () => borrarLote(lote.id), () => 'Carga eliminada.')
    if (res && !res.error) onCerrar?.()
  }

  const publicar = () => accion('publicar', () => publicarLote(lote.id), (res) => {
    const partes = [`${res.publicados} movimiento(s) registrados en Zoho`]
    if (res.fallidos) partes.push(`${res.fallidos} con error`)
    if (res.pendientes) {
      partes.push(res.cortadoPor === 'limite'
        ? `${res.pendientes} pendientes: Zoho limitó las llamadas, continúa en un minuto`
        : `${res.pendientes} pendientes, vuelve a pulsar Registrar para continuar`)
    }
    return partes.join(' · ')
  })

  return (
    <div className="conc-lote">
      <div className="conc-lote__head">
        <div>
          <div className="label">Carga #{lote.id} · {lote.archivo}</div>
          <h3 className="panel__title">
            {fechaCorta(lote.periodo_desde)} — {fechaCorta(lote.periodo_hasta)}
          </h3>
          <div className="conc-lote__meta">
            Subida por {lote.subido_por_nombre || 'un usuario'} · {fechaCorta(lote.created_at)}
          </div>
        </div>
        <div className="conc-lote__acciones">
          <button className="btn" onClick={onCerrar}>Volver</button>
          <button className="btn" disabled={Boolean(ocupado)}
            onClick={() => accion('conciliar', () => reconciliarLote(lote.id),
              (res) => res.cambios ? `${res.cambios} movimiento(s) actualizados contra Zoho.` : 'Sin cambios: todo sigue igual en Zoho.')}>
            {ocupado === 'conciliar' ? 'Comparando…' : 'Volver a conciliar'}
          </button>
          <button className="btn btn--primary" disabled={Boolean(ocupado) || !resumen.nuevos} onClick={publicar}>
            {ocupado === 'publicar' ? 'Registrando en Zoho…' : `Registrar en Zoho (${resumen.nuevos})`}
          </button>
        </div>
      </div>

      {mensaje && (
        <div className={mensaje.tipo === 'error' ? 'alert alert--error' : 'conc-ok'}>{mensaje.texto}</div>
      )}

      {avisos.map((aviso, i) => (
        <div key={i} className="conc-aviso">{aviso}</div>
      ))}

      <div className="conc-resumen">
        <Cifra valor={resumen.total} etiqueta="Movimientos" />
        <Cifra valor={resumen.nuevos} etiqueta="Por registrar" acento />
        <Cifra valor={resumen.sin_clasificar} etiqueta="Sin cuenta" />
        <Cifra valor={resumen.ya_en_zoho} etiqueta="Ya en Zoho" />
        <Cifra valor={resumen.publicados} etiqueta="Registrados" />
        <Cifra valor={dinero(resumen.entradas)} etiqueta="Entradas" />
        <Cifra valor={dinero(resumen.salidas)} etiqueta="Salidas" />
      </div>

      <div className="conc-filtros">
        {FILTROS.map((f) => (
          <button key={f.k} className={`conc-chip${filtro === f.k ? ' conc-chip--activo' : ''}`}
            onClick={() => setFiltro(f.k)}>{f.l}</button>
        ))}
        {resumen.publicados === 0 && (
          <button className="conc-chip conc-chip--peligro" disabled={Boolean(ocupado)} onClick={borrar}>
            Borrar carga
          </button>
        )}
      </div>

      <div className="conc-tabla-wrap">
        <table className="conc-tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th>Referencia</th>
              <th className="num">Monto</th>
              <th>Estado</th>
              <th>Cuenta contable</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {movimientos.map((m) => {
              const badge = etiquetaEstado(m.estado)
              const editable = !['publicado', 'publicando'].includes(m.estado)
              return (
                <tr key={m.id} className={m.direccion === 'entrada' ? 'conc-fila--entrada' : ''}>
                  <td className="num">{fechaCorta(m.fecha)}</td>
                  <td>
                    <div className="conc-desc">{m.descripcion}</div>
                    {(m.nota || m.error) && <div className="conc-nota">{m.error || m.nota}</div>}
                  </td>
                  <td className="conc-ref">{m.referencia || '—'}</td>
                  <td className={`num conc-monto conc-monto--${m.direccion}`}>
                    {m.direccion === 'entrada' ? '+' : '−'}{dinero(m.monto)}
                  </td>
                  <td><span className={`conc-badge ${badge.clase}`}>{badge.texto}</span></td>
                  <td>
                    {editable ? (
                      <select
                        className="input conc-select"
                        value={m.zoho_account_id || ''}
                        disabled={Boolean(ocupado) || !contables.length}
                        onChange={(e) => {
                          const elegida = contables.find((c) => c.account_id === e.target.value)
                          if (!elegida) return
                          accion(`clasificar-${m.id}`, () => clasificarMovimiento(m.id, {
                            zoho_account_id: elegida.account_id,
                            zoho_account_nombre: elegida.nombre,
                          }))
                        }}
                      >
                        <option value="">Elegir cuenta…</option>
                        {contables.map((c) => (
                          <option key={c.account_id} value={c.account_id}>{c.nombre}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="conc-cuenta">{m.zoho_account_nombre || '—'}</span>
                    )}
                  </td>
                  <td>
                    {editable && (
                      <button className="conc-link" disabled={Boolean(ocupado)}
                        onClick={() => accion(`ignorar-${m.id}`, () => ignorarMovimiento(m.id, m.estado !== 'ignorado'))}>
                        {m.estado === 'ignorado' ? 'Reactivar' : 'Ignorar'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {!movimientos.length && (
              <tr><td colSpan={7} className="conc-vacio">No hay movimientos con ese filtro.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Cifra({ valor, etiqueta, acento }) {
  return (
    <div className="conc-cifra">
      <div className={`num conc-cifra__valor${acento ? ' conc-cifra__valor--acento' : ''}`}>{valor}</div>
      <div className="label">{etiqueta}</div>
    </div>
  )
}
