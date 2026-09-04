'use client'

import { useRef, useState } from 'react'
import Dialog from '../../components/Dialog'
import MeasuredChart from '../../components/MeasuredChart'
import OperationalCard from '../../components/OperationalCard'
import TableScroller from '../../components/TableScroller'
import GrowthSummaryBand from '../../components/growth/GrowthSummaryBand'

const growthFixture = {
  projection: { currentChildren: 185, currentLevel: 1, nextLevel: { level: 2, threshold: 200, gap: 15 }, scenarios: { base: { series: [{ startChildren: 185, withdrawals: 2, newActives: 8, endChildren: 191 }] } } },
  metrics: { confidence: { level: 'low' } },
  operational: { currentPeriod: '2026-09', undatedStarts: 1 },
  recommendations: [{ status: 'pending', title: 'Completar las fechas de inicio' }],
}

export default function PrimitivesHarness() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [chartWidth, setChartWidth] = useState(320)
  const [growthOpened, setGrowthOpened] = useState(false)
  const initialFocusRef = useRef(null)

  return (
    <main style={{ width: '100%', maxWidth: 390, minHeight: '100dvh', padding: 16 }}>
      <h1 className="h-title">Primitivas responsive</h1>

      <section style={{ marginTop: 24 }}>
        <h2 className="panel__title">Diálogo</h2>
        <button type="button" className="btn" onClick={() => setDialogOpen(true)}>Abrir diálogo</button>
        <Dialog
          open={dialogOpen}
          title="Detalle accesible"
          description="Harness local sin datos"
          onClose={() => setDialogOpen(false)}
          initialFocusRef={initialFocusRef}
          footer={<button type="button" className="btn" onClick={() => setDialogOpen(false)}>Guardar</button>}
        >
          <label htmlFor="primitive-name">Nombre de prueba</label>
          <input ref={initialFocusRef} id="primitive-name" name="primitive-name" autoComplete="off" className="input" defaultValue="Prueba" />
          <p style={{ marginTop: 12 }}>El contenido no cierra el diálogo</p>
        </Dialog>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 className="panel__title">Tabla</h2>
        <TableScroller label="Comparación de prueba" stickyFirstColumn>
          <table className="table" style={{ width: 760 }}>
            <thead><tr><th>Centro</th><th>Enero</th><th>Febrero</th><th>Marzo</th><th>Abril</th></tr></thead>
            <tbody><tr><td>DAVID</td><td>120</td><td>130</td><td>140</td><td>150</td></tr></tbody>
          </table>
        </TableScroller>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 className="panel__title">Tarjeta</h2>
        <OperationalCard
          headingLevel={4}
          title="Centro Faro"
          subtitle="Coordinación"
          status={<span>Activo</span>}
          fields={[
            { label: 'Centro', value: 'DAVID' },
            { label: 'Campo vacío', value: '' },
            { label: 'Campo nulo', value: null },
          ]}
        />
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 className="panel__title">Gráfico</h2>
        <button type="button" className="btn" onClick={() => setChartWidth(240)}>Reducir gráfico</button>
        <div style={{ width: chartWidth, maxWidth: '100%', marginTop: 12 }}>
          <MeasuredChart label="Evolución de prueba" minHeight={180}>
            {({ width, height }) => (
              <div data-testid="chart-measure" data-width={width} data-height={height}>
                {width} × {height}
              </div>
            )}
          </MeasuredChart>
        </div>
      </section>
      <GrowthSummaryBand data={growthFixture} onOpen={() => setGrowthOpened(true)} />
      {growthOpened && <p role="status">Ruta de prueba abierta</p>}
    </main>
  )
}
