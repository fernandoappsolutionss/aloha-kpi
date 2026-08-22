'use client'
import { useEffect, useState } from 'react'
import { upload } from '@vercel/blob/client'
import { prepareCotizacionUpload, getCotizacionUploadStatus, discardCotizacionAttempt } from '../../app/actions/peticiones'
import { ISO_COUNTRY_CODES } from '../../lib/iso-countries.mjs'

// PA y VE arriba porque son los países donde opera Fernando — atajan el scroll
// en el 90% de los casos sin dejar de listar el resto en orden alfabético ISO.
const PRIORITY_COUNTRIES = ['PA', 'VE']
const countryDisplayNames = (() => {
  try { return new Intl.DisplayNames(['es'], { type: 'region' }) } catch { return null }
})()
const COUNTRY_OPTIONS = [
  ...PRIORITY_COUNTRIES,
  ...ISO_COUNTRY_CODES.filter((code) => !PRIORITY_COUNTRIES.includes(code)),
].map((code) => ({ code, label: countryDisplayNames ? (countryDisplayNames.of(code) || code) : code }))

function emptyFields() {
  return { proveedorRazonSocial: '', proveedorPais: '', proveedorIdFiscal: '', empresaConstituida: false, emiteFacturaFiscal: false }
}
function fieldsFromQuote(quote) {
  if (!quote) return emptyFields()
  return {
    proveedorRazonSocial: quote.proveedor_razon_social || '',
    proveedorPais: quote.proveedor_pais || '',
    proveedorIdFiscal: quote.proveedor_id_fiscal || '',
    empresaConstituida: Boolean(quote.empresa_constituida),
    emiteFacturaFiscal: Boolean(quote.emite_factura_fiscal),
  }
}

// Tarjeta de una cotización: junta los datos fiscales del proveedor con la
// carga del PDF. El servidor sigue siendo la autoridad de validación — esto
// solo evita subidas condenadas a fallar (país inválido, PDF de más de 10MB).
export default function CotizacionCard({ centroId, peticionId, quote, index, onValidated, onStatus }) {
  const [cotizacionId, setCotizacionId] = useState(quote?.id || null)
  const [values, setValues] = useState(fieldsFromQuote(quote))
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(quote?.validation_error || null)
  const [replacing, setReplacing] = useState(false)

  // Defensa contra la reutilización de instancia: si por lo que sea esta misma
  // tarjeta terminara representando otra cotización (identidad de `quote`
  // cambiada), se limpia el estado local para que no arrastre un
  // cotizacionId/valores de la cotización anterior.
  useEffect(() => {
    setCotizacionId(quote?.id || null)
    setValues(fieldsFromQuote(quote))
    setError(quote?.validation_error || null)
    setReplacing(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote?.id])

  const isValid = quote?.upload_status === 'valid'
  const isInvalid = quote?.upload_status === 'invalid'
  const isPending = quote?.upload_status === 'pending'
  const editable = !isValid || replacing

  function setField(name, value) {
    setValues((v) => ({ ...v, [name]: value }))
  }

  const supplierComplete = Boolean(
    values.proveedorRazonSocial.trim() &&
    values.proveedorPais &&
    values.proveedorIdFiscal.trim() &&
    values.empresaConstituida &&
    values.emiteFacturaFiscal
  )

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Adjunta una cotización en PDF.')
      return
    }
    if (file.size < 1 || file.size > 10 * 1024 * 1024) {
      setError('El PDF debe pesar entre 1 byte y 10 MB.')
      return
    }
    setBusy(true)
    setProgress(0)
    try {
      const prepared = await prepareCotizacionUpload(centroId, {
        peticionId, cotizacionId, archivoNombre: file.name,
        proveedorRazonSocial: values.proveedorRazonSocial,
        proveedorPais: values.proveedorPais,
        proveedorIdFiscal: values.proveedorIdFiscal,
        empresaConstituida: values.empresaConstituida,
        emiteFacturaFiscal: values.emiteFacturaFiscal,
      })
      if (prepared?.error) throw new Error(prepared.error)
      setCotizacionId(prepared.cotizacionId)
      await upload(prepared.pathname, file, {
        access: 'private',
        handleUploadUrl: '/api/peticiones/cotizaciones/upload',
        contentType: 'application/pdf',
        clientPayload: JSON.stringify({
          peticionId, cotizacionId: prepared.cotizacionId,
          nonce: prepared.nonce,
        }),
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      })
      let finalState = null
      for (let attempt = 0; attempt < 40; attempt++) {
        const state = await getCotizacionUploadStatus(centroId, peticionId, prepared.cotizacionId)
        if (state?.upload_status === 'valid') { finalState = state; break }
        if (state?.upload_status === 'invalid') throw new Error(state.error || 'El PDF no pasó la validación.')
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
      if (!finalState) throw new Error('El PDF sigue validándose. Recarga para consultar su estado.')
      setReplacing(false)
      await onValidated?.()
    } catch (err) {
      const message = err?.message || 'No se pudo subir el PDF.'
      setError(message)
      onStatus?.(`Error: ${message}`)
    }
    setBusy(false)
    setProgress(0)
  }

  async function quitarIntento() {
    if (!cotizacionId || busy) return
    setBusy(true)
    try {
      const res = await discardCotizacionAttempt(centroId, peticionId, cotizacionId)
      if (res?.error) throw new Error(res.error)
      await onValidated?.()
    } catch (err) {
      onStatus?.(`Error: ${err?.message || 'No se pudo quitar el intento.'}`)
    }
    setBusy(false)
  }

  const titulo = Number.isFinite(index) ? `Cotización ${index + 1}` : 'Cotización'

  return (
    <div className="foda-quote-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="label">{titulo}</span>
        {quote?.upload_attempts ? <span className="label" style={{ color: 'var(--text-dim)' }}>Intento {quote.upload_attempts} de 5</span> : null}
      </div>

      {!editable ? (
        <div>
          <p style={{ fontSize: 13, color: 'var(--ok)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span aria-hidden="true">✓</span> {quote.archivo_nombre}
          </p>
          <p className="h-sub" style={{ marginTop: 2 }}>{values.proveedorRazonSocial} · {values.proveedorPais}</p>
          <button type="button" className="btn" style={{ marginTop: 8 }} onClick={() => setReplacing(true)}>
            Reemplazar antes de enviar
          </button>
        </div>
      ) : (
        <div>
          <div className="foda-quote-fields">
            <label className="field">
              <span className="label">Razón social</span>
              <input className="input" name="proveedorRazonSocial" value={values.proveedorRazonSocial}
                onChange={(e) => setField('proveedorRazonSocial', e.target.value)} disabled={busy} />
            </label>
            <label className="field">
              <span className="label">País</span>
              <select className="select" name="proveedorPais" required value={values.proveedorPais}
                onChange={(e) => setField('proveedorPais', e.target.value)} disabled={busy}>
                <option value="">Selecciona…</option>
                {COUNTRY_OPTIONS.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
              </select>
            </label>
          </div>
          <label className="field" style={{ marginTop: 8 }}>
            <span className="label">Identificación fiscal</span>
            <input className="input" name="proveedorIdFiscal" value={values.proveedorIdFiscal}
              onChange={(e) => setField('proveedorIdFiscal', e.target.value)} disabled={busy} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
            <input type="checkbox" name="empresaConstituida" checked={values.empresaConstituida}
              onChange={(e) => setField('empresaConstituida', e.target.checked)} disabled={busy} />
            La empresa está legalmente constituida
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
            <input type="checkbox" name="emiteFacturaFiscal" checked={values.emiteFacturaFiscal}
              onChange={(e) => setField('emiteFacturaFiscal', e.target.checked)} disabled={busy} />
            Emite factura fiscal
          </label>
          <label className="field" style={{ marginTop: 10 }}>
            <span className="label">PDF de la cotización (1 byte – 10 MB)</span>
            <input type="file" accept="application/pdf,.pdf" onChange={handleFile}
              disabled={!supplierComplete || busy} />
          </label>
          {busy && <p className="h-sub">Subiendo… {progress}%</p>}
          {error && <p style={{ color: 'var(--bad)', fontSize: 12, marginTop: 6 }}>{error}</p>}
        </div>
      )}

      {(isPending || isInvalid) && (
        <button type="button" className="btn" style={{ marginTop: 8 }} disabled={busy} onClick={quitarIntento}>
          Quitar intento
        </button>
      )}
    </div>
  )
}
