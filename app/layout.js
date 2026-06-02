import './globals.css'
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
})
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
})

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
    <html lang="es" className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  )
}
