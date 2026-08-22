'use client'
import { useEffect, useState } from 'react'
import { estadoConciliador, misCuentas, subirExtracto, lotesDeCuenta } from '../../app/actions/conciliacion'
import CargaExtracto from './CargaExtracto'
import LoteDetalle from './LoteDetalle'
import ReglasPanel from './ReglasPanel'
import CuentasPanel from './CuentasPanel'
import { fechaCorta, etiquetaLote } from './formato'

// Panel del conciliador, compartido por el panel general (todas las cuentas) y
// la vista de centro (solo las suyas). Quién ve qué lo decide el servidor:
// misCuentas() ya filtra por centro.
export default function ConciliadorPanel({ centroId = null }) {
  const [estado, setEstado] = useState(null)
  const [cuentas, setCuentas] = useState([])
  const [cuentaId, setCuentaId] = useState('')
  const [lotes, setLotes] = useState([])
  const [loteAbierto, setLoteAbierto] = useState(null)
  const [pestana, setPestana] = useState('conciliar')
  const [mensaje, setMensaje] = useState(null)
  const [subiendo, setSubiendo] = useState(false)

  const cuenta = cuentas.find((c) => String(c.id) === String(cuentaId)) || null

  async function cargarCuentas() {
    const res = await misCuentas()
    if (res?.error) { setMensaje({ tipo: 'error', texto: res.error }); return }
    const lista = (res.cuentas || []).filter((c) => (centroId ? String(c.centro_id) === String(centroId) : true))
    setCuentas(lista)
    setCuentaId((actual) => (actual && lista.some((c) => String(c.id) === String(actual)) ? actual : (lista[0]?.id ?? '')))
  }

  async function cargarLotes(id) {
    if (!id) { setLotes([]); return }
    const res = await lotesDeCuenta(id)
    setLotes(res?.lotes || [])
  }

  useEffect(() => {
    estadoConciliador().then(setEstado)
    cargarCuentas()
  }, [])

  useEffect(() => { setLoteAbierto(null); cargarLotes(cuentaId) }, [cuentaId])

  async function subir({ archivo, texto }) {
    setSubiendo(true)
    setMensaje(null)
    const res = await subirExtracto({ cuentaId, archivo, texto })
    if (res?.error) setMensaje({ tipo: 'error', texto: res.error })
    else {
      setMensaje({
        tipo: 'ok',
        texto: `Se leyeron ${res.resumen.total} movimientos: ${res.resumen.nuevos} por registrar, `
          + `${res.resumen.ya_en_zoho} ya estaban en Zoho, ${res.resumen.duplicados} ya se habían importado.`,
      })
      await cargarLotes(cuentaId)
      setLoteAbierto(res.lote_id)
    }
    setSubiendo(false)
  }

  const admin = estado?.admin
  const pestanas = [
    { k: 'conciliar', l: 'Conciliar' },
    { k: 'reglas', l: 'Reglas de clasificación' },
    ...(admin ? [{ k: 'cuentas', l: 'Cuentas y centros' }] : []),
  ]

  return (
    <div className="conc">
      {estado && !estado.configurado && (
        <div className="conc-aviso conc-aviso--fuerte">
          Zoho no está conectado en este entorno: se puede leer el archivo, pero no comparar ni registrar.
          Falta configurar ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET y ZOHO_REFRESH_TOKEN.
        </div>
      )}

      <div className="conc-tabs">
        {pestanas.map((p) => (
          <button key={p.k} className={`conc-tab${pestana === p.k ? ' conc-tab--activo' : ''}`}
            onClick={() => setPestana(p.k)}>{p.l}</button>
        ))}
      </div>

      {pestana === 'cuentas' && admin && <CuentasPanel onCambio={cargarCuentas} />}

      {pestana !== 'cuentas' && !cuentas.length && (
        <div className="card conc-vacio-card">
          {admin
            ? 'Todavía no hay cuentas bancarias asignadas. Ve a “Cuentas y centros” y asigna la cuenta de Zoho que le corresponde a cada centro.'
            : 'Tu centro todavía no tiene una cuenta bancaria asignada. Pídele al administrador que la configure.'}
        </div>
      )}

      {pestana !== 'cuentas' && cuentas.length > 0 && (
        <>
          <div className="conc-selector">
            <label className="label">Cuenta bancaria</label>
            <select className="input" value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.etiqueta}{c.centro_nombre ? ` · ${c.centro_nombre}` : ' · Corporativa'}
                </option>
              ))}
            </select>
            {cuenta && (
              <div className="conc-selector__meta">
                {cuenta.zoho_org_nombre} · {cuenta.zoho_account_nombre} · tolerancia {cuenta.tolerancia_dias} d
              </div>
            )}
          </div>

          {pestana === 'reglas' && cuenta && <ReglasPanel cuenta={cuenta} />}

          {pestana === 'conciliar' && cuenta && (
            loteAbierto ? (
              <LoteDetalle
                loteId={loteAbierto}
                onCambio={() => cargarLotes(cuentaId)}
                onCerrar={() => { setLoteAbierto(null); cargarLotes(cuentaId) }}
              />
            ) : (
              <>
                <CargaExtracto cuenta={cuenta} onSubir={subir} ocupado={subiendo} />
                {mensaje && (
                  <div className={mensaje.tipo === 'error' ? 'alert alert--error' : 'conc-ok'}>{mensaje.texto}</div>
                )}
                <div className="panel" style={{ marginTop: 18 }}>
                  <div className="panel__head"><h3 className="panel__title">Cargas anteriores</h3></div>
                  <div className="conc-tabla-wrap">
                    <table className="conc-tabla">
                      <thead>
                        <tr>
                          <th>Archivo</th><th>Período</th><th className="num">Movimientos</th>
                          <th className="num">Registrados</th><th>Estado</th><th />
                        </tr>
                      </thead>
                      <tbody>
                        {lotes.map((l) => {
                          const resumen = l.resumen || {}
                          return (
                            <tr key={l.id}>
                              <td>
                                <div className="conc-desc">{l.archivo}</div>
                                <div className="conc-nota">{fechaCorta(l.created_at)} · {l.subido_por_nombre || '—'}</div>
                              </td>
                              <td className="num">{fechaCorta(l.periodo_desde)} — {fechaCorta(l.periodo_hasta)}</td>
                              <td className="num">{resumen.total ?? '—'}</td>
                              <td className="num">{resumen.publicados ?? 0}</td>
                              <td>{etiquetaLote(l.estado)}</td>
                              <td><button className="conc-link" onClick={() => setLoteAbierto(l.id)}>Abrir</button></td>
                            </tr>
                          )
                        })}
                        {!lotes.length && (
                          <tr><td colSpan={6} className="conc-vacio">Todavía no se ha subido ningún extracto.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )
          )}
        </>
      )}
    </div>
  )
}
