'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../../../components/Sidebar'
import { getZohoEstado } from '../../actions/zoho'

const ERRORES = {
  config: 'Falta configurar ZOHO_CLIENT_ID y ZOHO_CLIENT_SECRET en Vercel (registro de la app en Zoho).',
  state: 'La sesión del login expiró o no coincide. Intenta conectar de nuevo.',
  zoho: 'Zoho canceló el login (acceso denegado o error de Zoho).',
  token: 'Zoho no entregó el token. Intenta de nuevo.',
  refresh: 'Zoho no entregó autorización permanente. Intenta de nuevo (el botón siempre la pide).',
  usuario: 'Ese correo no está autorizado para conectar.',
  books: 'La cuenta se logueó pero no puede leer las facturas de las organizaciones en Zoho Books.',
}

const fecha = (ts) => ts ? new Date(ts).toLocaleDateString('es-PA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Panama' }) : ''

export default function ZohoPage() {
  const [estado, setEstado] = useState(null)
  const [aviso, setAviso] = useState(null) // { tipo: 'ok'|'error', texto }

  useEffect(() => {
    getZohoEstado().then((r) => { if (!r?.error) setEstado(r) })
    const q = new URLSearchParams(window.location.search)
    if (q.get('ok')) setAviso({ tipo: 'ok', texto: '✅ Zoho quedó conectado. La cobranza se sincroniza sola cada tarde (lun-vie, 7pm).' })
    const err = q.get('error')
    if (err) {
      const extra = err === 'usuario' && q.get('email') ? ` (se logueó: ${q.get('email')})` : ''
      setAviso({ tipo: 'error', texto: `❌ ${ERRORES[err] || 'Error desconocido.'}${extra}` })
    }
  }, [])

  const conexion = estado?.conexion

  return (
    <div className="shell">
      <Sidebar rol="admin_general" />
      <main className="main">
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Configuración · Zoho Books</div>
            <h1 className="h-title">Conexión con Zoho</h1>
            <p className="h-sub">La Cobranza Vencida del KPI se llena sola con las facturas de las 4 organizaciones.</p>
          </div>
        </div>

        {aviso && (
          <div className="alert" style={{ marginBottom: 16, ...(aviso.tipo === 'ok'
            ? { background: 'var(--ok-bg)', border: '1px solid var(--ok-line)', color: '#6EE7B7' }
            : { background: 'var(--bad-bg, rgba(239,68,68,0.08))', border: '1px solid var(--bad, #ef4444)', color: 'var(--bad, #ef4444)' }) }}>
            {aviso.texto}
          </div>
        )}

        {estado && !estado.clientConfigurado && (
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Falta el registro de la app en Zoho (una sola vez)</h3>
            <ol style={{ lineHeight: 1.9, margin: 0, paddingLeft: 20 }}>
              <li>Entra a <b>api-console.zoho.com</b> → Add Client → <b>Server-based Applications</b>.</li>
              <li>Homepage: <code>{typeof window !== 'undefined' ? window.location.origin : ''}</code> · Redirect URI: <code>{typeof window !== 'undefined' ? `${window.location.origin}/api/zoho/callback` : ''}</code></li>
              <li>Copia el <b>Client ID</b> y el <b>Client Secret</b> a Vercel (proyecto aloha-kpi) como <code>ZOHO_CLIENT_ID</code> y <code>ZOHO_CLIENT_SECRET</code>, y redeploy.</li>
            </ol>
          </div>
        )}

        <div className="card" style={{ padding: 24, maxWidth: 640 }}>
          {conexion ? (
            <>
              <div style={{ fontSize: 15, marginBottom: 6 }}>
                🟢 Conectado como <b>{conexion.email}</b> desde el {fecha(conexion.conectado_at)}.
              </div>
              <p className="h-sub" style={{ marginTop: 0 }}>
                El cron cuenta las facturas vencidas cada tarde (lun-vie, 7pm Panamá) y llena el KPI de los 6 centros.
                Solo hace falta reconectar si Zoho revoca el acceso.
              </p>
              <a className="btn" href="/api/zoho/connect">Reconectar</a>
            </>
          ) : (
            <>
              <p style={{ marginTop: 0, lineHeight: 1.7 }}>
                Conecta la cuenta de Zoho <b>una sola vez</b> y la Cobranza Vencida deja de digitarse a mano.
                Solo puede conectar: <b>{estado?.emailAutorizado || 'fperez@teamsolutionss.com'}</b>.
              </p>
              <a className={`btn btn--primary${estado && !estado.clientConfigurado ? ' btn--disabled' : ''}`} href="/api/zoho/connect">
                Conectar con Zoho
              </a>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
