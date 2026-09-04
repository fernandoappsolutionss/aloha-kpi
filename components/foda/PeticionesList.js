'use client'
import Dialog from '../Dialog'
import { useState } from 'react'
import { updateComentario, changePeticionStatus, eliminarPeticion } from '../../app/actions/peticiones'
import { PETICION_CATEGORIAS, PETICION_ESTADOS } from '../../lib/peticiones-domain.mjs'
import CotizacionCard from './CotizacionCard'

function categoriaLabel(value) {
  return PETICION_CATEGORIAS.find((c) => c.value === value)?.label || value || '—'
}
function tipoLabel(row) {
  if (row.legacy || row.tipo === 'legado') return 'Anterior · sin requisitos documentales'
  if (row.tipo === 'comentario') return 'Comentario'
  return categoriaLabel(row.categoria)
}
function formatFecha(value) {
  if (!value) return '—'
  try { return new Date(value).toLocaleDateString('es-PA') } catch { return '—' }
}
function quoteLabel(quote) {
  return `${quote.proveedor_razon_social} — ${quote.archivo_nombre}`
}

// Historial de comentarios y peticiones ya registrados. Gerencia puede
// borrar físicamente desde aquí: comentario/legado se eliminan directo;
// una petición formal enviada exige anularla primero (dos pasos deliberados
// para no perder por error el rastro de compras/proveedores).
export default function PeticionesList({ items, permissions, uploadsAvailable, centroId, onRefresh, onStatus }) {
  const [confirmAction,setConfirmAction]=useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [addingFor, setAddingFor] = useState(null)
  const [cotizacionAprobadaByRow, setCotizacionAprobadaByRow] = useState({})

  function startEdit(row) { setEditingId(row.id); setEditText(row.texto) }
  function cancelEdit() { setEditingId(null); setEditText('') }

  async function saveEdit(row) {
    const texto = editText.trim()
    if (!texto) return
    setBusyId(row.id)
    try {
      const res = await updateComentario(centroId, row.id, texto)
      if (res?.error) throw new Error(res.error)
      setEditingId(null)
      setEditText('')
      await onRefresh?.()
    } catch (e) {
      onStatus?.(`Error al guardar el comentario: ${e?.message || ''}`)
    }
    setBusyId(null)
  }

  async function setEstado(row, estado, cotizacionAprobadaId = null) {
    if (estado === 'Aprobado' && row.tipo === 'peticion' && !cotizacionAprobadaId) {
      onStatus?.('Selecciona la cotización aprobada.')
      return
    }
    setBusyId(row.id)
    try {
      const res = await changePeticionStatus(centroId, row.id, estado, cotizacionAprobadaId)
      if (res?.error) throw new Error(res.error)
      await onRefresh?.()
    } catch (e) {
      onStatus?.(`Error al cambiar el estado: ${e?.message || ''}`)
    }
    setBusyId(null)
  }

  async function eliminar(row) {
    setBusyId(row.id)
    try {
      const res = await eliminarPeticion(centroId, row.id)
      if (res?.error) throw new Error(res.error)
      await onRefresh?.()
    } catch (e) {
      onStatus?.(`Error al eliminar: ${e?.message || ''}`)
    }
    setBusyId(null)
  }

  if (!items || items.length === 0) {
    return <p className="h-sub" style={{ textAlign: 'center', padding: '16px 0 4px', color: 'var(--text-dim)' }}>Aún no hay comentarios ni peticiones.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
      {confirmAction && <Dialog open title={confirmAction.type==='delete'?'Eliminar registro':'Anular petición'} onClose={()=>setConfirmAction(null)} closeDisabled={busyId!==null} footer={<><button type="button" className="btn" disabled={busyId!==null} onClick={()=>setConfirmAction(null)}>Cancelar</button><button type="button" className="btn btn--primary" disabled={busyId!==null} onClick={async()=>{if(confirmAction.type==='delete')await eliminar(confirmAction.row);else await setEstado(confirmAction.row,'Anulada');setConfirmAction(null)}}>Confirmar</button></>}>
        <p>{confirmAction.type==='delete'?'Esta acción no se puede deshacer y eliminará también los PDFs del registro.':'La petición quedará anulada. Confirma que deseas continuar.'}</p>
      </Dialog>}
      {items.map((row) => {
        const cotizaciones = row.cotizaciones || []
        const validQuotes = cotizaciones.filter((quote) => quote.upload_status === 'valid')
        const retryQuotes = cotizaciones.filter((quote) => quote.upload_status === 'pending' || quote.upload_status === 'invalid')
        const showAdding = addingFor === row.id
        const cotizacionAprobada = validQuotes.find((quote) => String(quote.id) === String(row.cotizacion_aprobada_id))
        const selectedCotizacionAprobada = cotizacionAprobadaByRow[row.id] || ''
        return (
          <div key={row.id} className="foda-request-row">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <span className="label" style={{ color: 'var(--text-muted)' }}>{tipoLabel(row)}</span>
                {editingId === row.id ? (
                  <textarea aria-label="Editar comentario" name="comentarioEditado" autoComplete="off" className="input" value={editText} onChange={(e) => setEditText(e.target.value)}
                    style={{ marginTop: 6, minHeight: 50, resize: 'vertical' }} />
                ) : (
                  <p style={{ marginTop: 6, fontSize: 13 }}>{row.texto}</p>
                )}
                <p className="h-sub" style={{ marginTop: 6 }}>
                  {formatFecha(row.submitted_at)} · {cotizaciones.length} proveedor{cotizaciones.length === 1 ? '' : 'es'}
                </p>
              </div>
              {row.canEditText && (
                <div style={{ display: 'flex', flexShrink: 0, gap: 6 }}>
                  {editingId === row.id ? (
                    <>
                      <button type="button" className="btn btn--primary" disabled={busyId === row.id} onClick={() => saveEdit(row)}>Guardar</button>
                      <button type="button" className="btn" onClick={cancelEdit}>Cancelar</button>
                    </>
                  ) : (
                    <button type="button" className="btn" onClick={() => startEdit(row)}>Editar</button>
                  )}
                </div>
              )}
            </div>

            {row.estado === 'Aprobado' && cotizacionAprobada && (
              <p className="pill" style={{ marginTop: 8, display: 'inline-block' }}>
                Cotización aprobada: {cotizacionAprobada.proveedor_razon_social} — {cotizacionAprobada.archivo_nombre}
              </p>
            )}

            {permissions?.canChangeStatus && !row.legacy && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                <span className="label" style={{ color: 'var(--text-muted)', marginRight: 2 }}>Estado:</span>
                {PETICION_ESTADOS.map((estado) => {
                  if (estado === 'Aprobado' && row.tipo === 'peticion') {
                    return (
                      <button key={estado} type="button" disabled={busyId === row.id || !selectedCotizacionAprobada}
                        onClick={() => setEstado(row, estado, selectedCotizacionAprobada)}
                        className="pill" style={{ cursor: 'pointer', borderColor: row.estado === estado ? 'var(--ok-text)' : 'var(--border-strong)' }}>
                        {estado}
                      </button>
                    )
                  }
                  return (
                    <button key={estado} type="button" disabled={busyId === row.id} onClick={() => estado==='Anulada' ? setConfirmAction({row,type:'annul'}) : setEstado(row, estado)}
                      className="pill" style={{ cursor: 'pointer', borderColor: row.estado === estado ? 'var(--ok-text)' : 'var(--border-strong)' }}>
                      {estado}
                    </button>
                  )
                })}
                {row.tipo === 'peticion' && (
                  <select
                    name="cotizacionAprobada" aria-label="Cotización ganadora"
                    className="input"
                    value={selectedCotizacionAprobada}
                    onChange={(e) => setCotizacionAprobadaByRow((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    style={{ marginLeft: 4 }}
                  >
                    <option value="">Cotización ganadora…</option>
                    {validQuotes.map((quote) => (
                      <option key={quote.id} value={quote.id}>{quoteLabel(quote)}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {permissions?.canChangeStatus && (
              row.tipo === 'peticion' ? (
                row.estado === 'Anulada' && (
                  <button type="button" className="btn" disabled={busyId === row.id}
                    style={{ marginTop: 10, borderColor: 'var(--bad-line)', color: 'var(--bad-text)' }}
                    onClick={() => setConfirmAction({row,type:'delete'})}>
                    Eliminar definitivamente
                  </button>
                )
              ) : (
                <button type="button" className="btn" disabled={busyId === row.id}
                  style={{ marginTop: 10, borderColor: 'var(--bad-line)', color: 'var(--bad-text)' }}
                  onClick={() => setConfirmAction({row,type:'delete'})}>
                  Eliminar
                </button>
              )
            )}

            {validQuotes.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {validQuotes.map((quote) => (
                  <a key={quote.id} className="btn" href={`/api/peticiones/cotizaciones/${quote.id}/download`}>
                    Descargar {quote.archivo_nombre}
                  </a>
                ))}
              </div>
            )}

            {retryQuotes.length > 0 && (
              <div className="foda-quote-grid" style={{ marginTop: 10 }}>
                {retryQuotes.map((quote, i) => (
                  <CotizacionCard key={quote.id} centroId={centroId} peticionId={row.id} quote={quote} index={i}
                    onValidated={onRefresh} onStatus={onStatus} />
                ))}
              </div>
            )}

            {row.canAddQuote && (
              uploadsAvailable ? (
                showAdding ? (
                  <div className="foda-quote-grid" style={{ marginTop: 10 }}>
                    <CotizacionCard centroId={centroId} peticionId={row.id} quote={null} index={cotizaciones.length}
                      onValidated={async () => { setAddingFor(null); await onRefresh?.() }} onStatus={onStatus} />
                  </div>
                ) : (
                  <button type="button" className="btn" style={{ marginTop: 10 }} onClick={() => setAddingFor(row.id)}>
                    Agregar cotización
                  </button>
                )
              ) : (
                <p className="h-sub" style={{ marginTop: 10, color: 'var(--warn)' }}>
                  Carga de cotizaciones no disponible. Configura el almacenamiento privado para agregar otra.
                </p>
              )
            )}
          </div>
        )
      })}
    </div>
  )
}
