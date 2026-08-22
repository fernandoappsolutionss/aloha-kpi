// Componente de servidor solo para fijar `maxDuration` (ver la ruta de centro).
import Sidebar from '../../../components/Sidebar'
import ConciliadorPanel from '../../../components/conciliacion/ConciliadorPanel'

export const maxDuration = 60

export default function ConciliacionAdminPage() {
  return (
    <div className="shell">
      <Sidebar rol="admin_general" />
      <main className="main">
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Finanzas</div>
            <h1 className="h-title">Conciliación bancaria</h1>
            <p className="h-sub">
              Adjunta el movimiento bancario en CSV y regístralo en la cuenta de Zoho Books del centro.
            </p>
          </div>
        </div>
        <ConciliadorPanel />
      </main>
    </div>
  )
}
