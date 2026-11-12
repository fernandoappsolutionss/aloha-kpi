import QRCode from 'qrcode'
import { notFound } from 'next/navigation'
import { referidos, baseUrl } from '../../../lib/referidos'
import { centavos } from '../../../lib/referidos/reglas.mjs'
import { appleConfig } from '../../../lib/referidos/wallet-apple.mjs'
import { googleConfig } from '../../../lib/referidos/wallet-google.mjs'
import CompartirCodigo from '../../../components/referidos/CompartirCodigo'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Tu tarjeta ALOHA', robots: { index: false, follow: false }, referrer: 'no-referrer' }

const TIPOS = {
  bono_clase_prueba: 'Clase de prueba', bono_referido_asiste: 'Tu invitado fue a su clase',
  bono_referido_inscrito: 'Tu invitado se inscribió', reverso: 'Corrección', canje: 'Canje en mensualidad', ajuste: 'Ajuste',
}
const fecha = (v) => new Date(v).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', timeZone: 'America/Panama' })

export default async function TarjetaPage({ params }) {
  const { token } = await params
  const m = await referidos.tarjetaPorToken(token).catch(() => null)
  if (!m) notFound()
  await referidos.marcarVista(m.id).catch(() => {})
  const enlace = `${baseUrl()}/r/${m.codigo}`
  const qr = await QRCode.toString(enlace, { type: 'svg', margin: 0, color: { dark: '#00556D', light: '#FFFFFF' } })
  return (
    <main className="tarjeta" id="main-content">
      <img className="tarjeta__logo" src="/aloha/lockup.png" alt="ALOHA Mental Arithmetic" width="200" height="91" />
      <section className="tarjeta__caja" aria-label="Tu tarjeta">
        <p className="tarjeta__etiqueta">Tu saldo</p>
        <p className={`tarjeta__saldo${m.saldo_cent < 0 ? ' tarjeta__saldo--deuda' : ''}`}>{centavos(m.saldo_cent)}</p>
        <p className="tarjeta__nombre">{m.nombre || 'Familia ALOHA'}</p>
        <div className="tarjeta__qr" role="img" aria-label="Código QR para invitar" dangerouslySetInnerHTML={{ __html: qr }} />
        <p className="tarjeta__codigo">Código {m.codigo.toUpperCase()}</p>
        <CompartirCodigo enlace={enlace} />
        {(appleConfig() || googleConfig()) && (
          <div className="tarjeta__wallets">
            {appleConfig() && <a className="tarjeta__wallet" href={`/api/wallet/apple/${m.token}`}>Agregar a Apple Wallet</a>}
            {googleConfig() && <a className="tarjeta__wallet" href={`/api/wallet/google/${m.token}`}>Agregar a Google Wallet</a>}
          </div>
        )}
      </section>
      <section className="tarjeta__caja">
        <h2 className="tarjeta__subtitulo">Así ganas saldo</h2>
        <p className="tarjeta__texto">Comparte tu código. Ganas cuando tu invitado va a su clase de prueba y cuando se inscribe. Lo canjeas en tu mensualidad, en tu centro.</p>
        <p className="tarjeta__texto"><strong>{m.referidos}</strong> {m.referidos === 1 ? 'familia invitada' : 'familias invitadas'} hasta hoy.</p>
      </section>
      {m.movimientos.length > 0 && (
        <section className="tarjeta__caja">
          <h2 className="tarjeta__subtitulo">Movimientos</h2>
          <ul className="tarjeta__movimientos">
            {m.movimientos.map((mv, i) => (
              <li key={i}><span>{TIPOS[mv.tipo] || mv.tipo} · {fecha(mv.created_at)}</span><strong>{mv.monto_cent > 0 ? '+' : '−'}{centavos(Math.abs(mv.monto_cent))}</strong></li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
