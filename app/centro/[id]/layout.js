import TourHost from '../../../components/tour/TourHost'

// Layout del centro: no cambia las páginas (cada una sigue pintando su
// Sidebar); solo monta el motor del tour, que lee ?tour= de la URL y no
// renderiza nada si no hay recorrido activo. Sin <Suspense>: todas las rutas
// /centro/[id]/* son dinámicas (la exigencia de Suspense con useSearchParams
// solo aplica al prerender estático) y así TourHost hidrata junto con la
// página, no después de su primera server action.
export default function CentroLayout({ children }) {
  return (
    <>
      {children}
      <TourHost />
    </>
  )
}
