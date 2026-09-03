import localFont from 'next/font/local'
import './globals.css'

// Tipografía institucional de ALOHA (manual de marca): Futura Md BT,
// los mismos TTF que usa promo.alohapanama.com, auto-hospedados.
const futura = localFont({
  src: [
    { path: '../public/fonts/FuturaMdBT.ttf', weight: '400', style: 'normal' },
    { path: '../public/fonts/FuturaMdBT-Bold.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-aloha',
  display: 'swap',
})

export const metadata = {
  title: 'KPI ALOHA · Panamá',
  description: 'Sistema de gestión de KPIs de ALOHA Mental Arithmetic — desempeño por centro, en tiempo real.',
  icons: { icon: '/aloha/icon.png', apple: '/aloha/icon.png' },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#00556D',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={futura.variable} suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#main-content">Saltar al contenido</a>
        {/* Clave nueva a propósito: con el rebrand todos vuelven al claro de
            ALOHA una vez, y quien prefiera oscuro lo reelige. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('aloha_theme');document.documentElement.dataset.theme=(t==='dark')?'dark':'light';}catch(e){document.documentElement.dataset.theme='light';}})();` }} />
        {children}
      </body>
    </html>
  )
}
