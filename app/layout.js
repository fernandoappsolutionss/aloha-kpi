import './globals.css'
export const metadata = {
  title: 'ALOHA KPI Dashboard',
  description: 'Sistema de seguimiento de KPIs para centros ALOHA Mental Arithmetic',
}
export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
