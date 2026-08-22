'use client'
import { useEffect, useRef, useState } from 'react'
import { createPeticionDraft, updatePeticionDraft, submitPeticion, discardPeticionDraft } from '../../app/actions/peticiones'
import { PETICION_CATEGORIAS } from '../../lib/peticiones-domain.mjs'
import CotizacionCard from './CotizacionCard'

function categoriaLabel(value) {
  return PETICION_CATEGORIAS.find((c) => c.value === value)?.label || value || '—'
}

// Formulario de petición formal: categoría + descripción + mínimo 3 cotizaciones
// válidas de proveedores fiscales distintos. Vive como borrador (editable,
// con vencimiento) hasta que se envía; el servidor sigue siendo la autoridad
// final sobre distinción de proveedores y PDFs.
export default function PeticionDraftForm({ centroId, anio, trimestre, drafts, uploadsAvailable, onRefresh, onStatus }) {
  const [selectedDraftId, setSelectedDraftId] = useState(null)
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  // Claves estables de slot "vacío" (sin cotización real todavía). Nunca se
  // reindexan por posición: cada slot conserva su clave desde que se crea
  // hasta que su carga valida (momento en el que se retira). Esto evita que
  // React reasocie una instancia de CotizacionCard —con su cotizacionId ya en
  // memoria— a un slot lógico distinto cuando una carga fuera de orden hace
  // que el arreglo de cotizaciones cambie de tamaño; esa reasociación era la
  // causa de que un segundo archivo sobrescribiera silenciosamente una
  // cotización ya validada.
  const slotCounter = useRef(0)
  const [emptySlotKeys, setEmptySlotKeys] = useState([])

  const activeDraft = (drafts || []).find((d) => d.id === selectedDraftId) || null

  function nextSlotKey() {
    slotCounter.current += 1
    return `slot-${slotCounter.current}`
  }

  useEffect(() => {
    if (!activeDraft) { setEmptySlotKeys([]); return }
    const needed = Math.max(3 - (activeDraft.cotizaciones?.length || 0), 0)
    setEmptySlotKeys(Array.from({ length: needed }, () => nextSlotKey()))
    // Solo al cambiar de borrador activo: un refresh de `drafts` en el mismo
    // borrador NO debe reiniciar los slots vacíos a mitad de una carga.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDraftId])

  function handleContinuar(draft) {
    setSelectedDraftId(draft.id)
    setCategory(draft.categoria || '')
    setDescription(draft.texto || '')
  }

  async function persistDraftMeta(id, next) {
    try {
      const res = await updatePeticionDraft(centroId, id, next)
      if (res?.error) throw new Error(res.error)
      return true
    } catch (e) {
      onStatus?.(`Error al guardar el borrador: ${e?.message || ''}`)
      return false
    }
  }

  async function handleUpdateMeta(next) {
    if (!activeDraft || activeDraft.expired || busy) return
    await persistDraftMeta(activeDraft.id, next)
  }

  function onCategoryChange(e) {
    const value = e.target.value
    setCategory(value)
    if (activeDraft) handleUpdateMeta({ texto: description, categoria: value })
  }

  function onDescriptionBlur() {
    if (activeDraft) handleUpdateMeta({ texto: description, categoria: category })
  }

  async function handleGuardarBorrador() {
    if (busy) return
    const texto = description.trim()
    if (!texto || !category) { onStatus?.('Error: completa la categoría y la descripción antes de guardar.'); return }
    setBusy(true)
    try {
      const res = await createPeticionDraft(centroId, anio, trimestre, { texto, categoria: category })
      if (res?.error) throw new Error(res.error)
      await onRefresh?.()
      setSelectedDraftId(res.draft.id)
    } catch (e) {
      onStatus?.(`Error: ${e?.message || 'No se pudo guardar el borrador.'}`)
    }
    setBusy(false)
  }

  async function handleDiscard(id) {
    if (busy) return
    setBusy(true)
    try {
      const res = await discardPeticionDraft(centroId, id)
      if (res?.error) throw new Error(res.error)
      if (id === selectedDraftId) { setSelectedDraftId(null); setCategory(''); setDescription('') }
      await onRefresh?.()
    } catch (e) {
      onStatus?.(`Error al descartar: ${e?.message || ''}`)
    }
    setBusy(false)
  }

  async function handleSubmit() {
    if (!activeDraft || busy) return
    setBusy(true)
    try {
      // El blur de la descripción guarda "al vuelo" (fire-and-forget) y puede
      // perder la carrera contra este envío — si el clic llega primero, el
      // servidor enviaría con texto viejo y el guardado tardío luego fallaría
      // con "Borrador no encontrado" porque ya se envió. Se espera aquí la
      // sincronización de categoría/descripción antes de enviar.
      await persistDraftMeta(activeDraft.id, { texto: description, categoria: category })
      const res = await submitPeticion(centroId, activeDraft.id)
      if (res?.error) throw new Error(res.error)
      setSelectedDraftId(null)
      setCategory('')
      setDescription('')
      await onRefresh?.()
    } catch (e) {
      // El servidor sigue siendo la autoridad de distinción de proveedores/PDF —
      // si rechaza el envío, se muestra el motivo pero se conserva el estado
      // (categoría, descripción y borrador seleccionado) para que se corrija.
      onStatus?.(`Error: ${e?.message || 'No se pudo enviar la petición.'}`)
    }
    setBusy(false)
  }

  const quotes = activeDraft?.cotizaciones || []
  const totalCount = quotes.length + emptySlotKeys.length

  const documentFormDisabled = !uploadsAvailable || busy
  const validCount = quotes.filter((quote) => quote.upload_status === 'valid').length
  const submitDisabled = !uploadsAvailable || busy || validCount < 3 || !description.trim() || !category
  const requirementText = validCount < 3
    ? `Faltan ${3 - validCount} cotización${3 - validCount === 1 ? '' : 'es'} válida${3 - validCount === 1 ? '' : 's'}.`
    : 'Documentación mínima completa.'

  return (
    <div>
      {!uploadsAvailable && (
        <p id="peticion-storage-status" className="form-error" role="alert">
          Carga de cotizaciones no disponible. Configura el almacenamiento privado antes de registrar una petición.
        </p>
      )}

      {/* Fuera del fieldset a propósito: si falta o rota el token de Blob, la
          creación documental se bloquea (fieldset abajo) pero "Continuar" y
          "Descartar borrador" de los borradores existentes deben seguir
          funcionando — si no, un borrador queda atrapado hasta que venza (30
          días) sin forma de soltarlo. */}
      {!activeDraft && (drafts || []).length > 0 && (
        <div style={{ marginTop: 14 }}>
          <p className="label" style={{ marginBottom: 6 }}>Borradores existentes</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {drafts.map((draft) => (
              <div key={draft.id} className="foda-request-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <p style={{ fontSize: 13 }}>{categoriaLabel(draft.categoria)}</p>
                  {draft.expired && <p style={{ color: 'var(--bad)', fontSize: 12 }}>Borrador vencido</p>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn" onClick={() => handleContinuar(draft)}>Continuar</button>
                  <button type="button" className="btn" disabled={busy} onClick={() => handleDiscard(draft.id)}>Descartar borrador</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <fieldset disabled={documentFormDisabled} aria-describedby="peticion-storage-status" style={{ border: 'none', padding: 0, margin: 0 }}>
        {!activeDraft && (
          <div style={{ marginTop: 14 }}>
            <div className="foda-quote-fields">
              <label className="field">
                <span className="label">Categoría</span>
                <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Selecciona…</option>
                  {PETICION_CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </label>
            </div>
            <label className="field" style={{ marginTop: 8 }}>
              <span className="label">Descripción</span>
              <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe la petición…" style={{ minHeight: 70, resize: 'vertical' }} />
            </label>
            <button type="button" className="btn btn--primary" style={{ marginTop: 10 }}
              disabled={busy || !description.trim() || !category} onClick={handleGuardarBorrador}>
              {busy ? 'Guardando…' : 'Guardar borrador'}
            </button>
          </div>
        )}

        {activeDraft && (
          <div style={{ marginTop: 14 }}>
            {activeDraft.expired && (
              <p style={{ color: 'var(--bad)', fontSize: 12, marginBottom: 8 }}>
                Borrador vencido — ya no puede editarse ni enviarse. Descártalo para empezar uno nuevo.
              </p>
            )}
            <div className="foda-quote-fields" style={{ marginBottom: 10 }}>
              <label className="field">
                <span className="label">Categoría</span>
                <select className="select" value={category} onChange={onCategoryChange} disabled={activeDraft.expired}>
                  <option value="">Selecciona…</option>
                  {PETICION_CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </label>
              {activeDraft.draft_expires_at && (
                <div className="field">
                  <span className="label">Vence</span>
                  <p className="h-sub" style={{ marginTop: 0 }}>{new Date(activeDraft.draft_expires_at).toLocaleDateString('es-PA')}</p>
                </div>
              )}
            </div>
            <label className="field">
              <span className="label">Descripción</span>
              <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)}
                onBlur={onDescriptionBlur} disabled={activeDraft.expired} style={{ minHeight: 70, resize: 'vertical' }} />
            </label>

            {!activeDraft.expired && (
              <>
                <div className="foda-quote-grid" style={{ marginTop: 12 }}>
                  {quotes.map((quote, i) => (
                    <CotizacionCard key={quote.id} centroId={centroId} peticionId={activeDraft.id}
                      quote={quote} index={i} onValidated={onRefresh} onStatus={onStatus} />
                  ))}
                  {emptySlotKeys.map((slotKey, i) => (
                    <CotizacionCard key={slotKey} centroId={centroId} peticionId={activeDraft.id}
                      quote={null} index={quotes.length + i}
                      onValidated={async () => {
                        // Este slot ya cumplió su propósito: se retira aquí
                        // (nunca se reindexa/reutiliza) y el refresh trae la
                        // cotización real, que a partir de ahora se dibuja
                        // por su propio quote.id.
                        setEmptySlotKeys((keys) => keys.filter((k) => k !== slotKey))
                        await onRefresh?.()
                      }}
                      onStatus={onStatus} />
                  ))}
                </div>
                {totalCount < 10 && (
                  <button type="button" className="btn" style={{ marginTop: 10 }}
                    onClick={() => setEmptySlotKeys((keys) => [...keys, nextSlotKey()])}>
                    Agregar otra cotización
                  </button>
                )}
                <p className="h-sub" style={{ marginTop: 10 }}>{validCount} de 3 cotizaciones válidas · {requirementText}</p>
                <button type="button" className="btn btn--primary" style={{ marginTop: 10 }} disabled={submitDisabled} onClick={handleSubmit}>
                  {busy ? 'Enviando…' : 'Enviar petición'}
                </button>
              </>
            )}
            <div style={{ marginTop: 10 }}>
              <button type="button" className="btn" onClick={() => handleDiscard(activeDraft.id)}>
                Descartar borrador
              </button>
            </div>
          </div>
        )}
      </fieldset>
    </div>
  )
}
