import { Suspense } from 'react'
import TourHost from '../../../components/tour/TourHost'

// Layout del centro: no cambia las páginas (cada una sigue pintando su
// Sidebar); solo monta el motor del tour, que lee ?tour= de la URL y no
// renderiza nada si no hay recorrido activo. useSearchParams exige Suspense.
export default function CentroLayout({ children }) {
  return (
    <>
      {children}
      <Suspense fallback={null}><TourHost /></Suspense>
    </>
  )
}
