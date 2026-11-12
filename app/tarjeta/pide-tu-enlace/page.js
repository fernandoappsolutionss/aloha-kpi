export const metadata = { title: 'Tu tarjeta ALOHA', robots: { index: false, follow: false }, referrer: 'no-referrer' }

export default function PideTuEnlace() {
  return (
    <main className="tarjeta" id="main-content">
      <img className="tarjeta__logo" src="/aloha/lockup.png" alt="ALOHA Mental Arithmetic" width="200" height="91" />
      <section className="tarjeta__caja">
        <h1 className="tarjeta__titulo">Ya tienes tarjeta ALOHA</h1>
        <p className="tarjeta__texto">Por seguridad este enlace abre una sola vez. Pide el enlace de tu tarjeta en tu centro ALOHA y guárdala en tu teléfono.</p>
      </section>
    </main>
  )
}
