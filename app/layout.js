import './globals.css'

export const metadata = {
  title: 'KPI Dashboard · Team Solutionss',
  description: 'Sistema de gestión de KPIs operado por Team Solutionss — seguimiento de desempeño por centro, en tiempo real.',
  icons: { icon: '/ts-mark.png', apple: '/ts-mark.png' },
}

export const viewport = {
  themeColor: '#0A0A0A',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('ts_theme');document.documentElement.dataset.theme=(t==='light')?'light':'dark';}catch(e){document.documentElement.dataset.theme='dark';}})();` }} />
        {children}
      </body>
    </html>
  )
}
