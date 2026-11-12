'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '../../../components/Sidebar'
import { cargarHistoricos, guardarConfigReferidos, resumenReferidos } from '../../actions/referidos'
import { centavos } from '../../../lib/referidos/reglas.mjs'

const dolares = (cent) => (Number(cent || 0) / 100).toFixed(2)

export default function ReferidosGerenciaPage() {
  const [datos, setDatos] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [avisos, setAvisos] = useState({})
  const [ocupado, setOcupado] = useState('')

  const cargar = useCallback(async () => {
    const r = await resumenReferidos()
    if (r?.error) { setLoadError(r.error); return }
    setLoadError(''); setDatos(r)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const avisar = (cuenta, texto) => setAvisos((a) => ({ ...a, [cuenta]: texto }))

  async function guardar(e, cuenta) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setOcupado(cuenta + 'g')
    try {
      const r = await guardarConfigReferidos(cuenta, {
        activo: f.get('activo') === 'on', activo_desde: f.get('activo_desde'),
        bono_clase_prueba: f.get('bono_clase_prueba'), bono_referido_asiste: f.get('bono_referido_asiste'), bono_referido_inscrito: f.get('bono_referido_inscrito'),
      })
      avisar(cuenta, r?.error || 'Guardado. Los bonos nuevos usan estos montos; los ya entregados no cambian.')
      if (!r?.error) await cargar()
    } finally { setOcupado('') }
  }

  async function historicos(cuenta) {
    setOcupado(cuenta + 'h'); avisar(cuenta, 'Cargando inscritos anteriores desde el CRM…')
    try {
      const r = await cargarHistoricos(cuenta)
      if (r?.error) { avisar(cuenta, r.error); return }
      avisar(cuenta, r.completo
        ? `Carga completa: ${r.eventos} clases revisadas, ${r.movimientos} movimientos de saldo.`
        : `Avance: ${r.importados} clases importadas de ${r.eventos}. Aún no está completa: pulsa de nuevo para continuar.`)
      await cargar()
    } finally { setOcupado('') }
  }

  return (
    <div className="shell">
      <Sidebar />
      <main className="main" id="main-content">
        <p className="label">GERENCIA · REFERIDOS</p>
        <h1 className="h-title">Referidos y saldo</h1>
        <p className="h-sub">El saldo pendiente es dinero que ALOHA les debe a las familias: se descuenta de su mensualidad.</p>
        {loadError && <div className="alert alert--error" role="alert" style={{ marginTop: 16 }}>{loadError}</div>}
        {!datos ? <div role="status" style={{ marginTop: 20 }}>Cargando…</div> : datos.cuentas.map((c) => (
          <section key={c.cuenta} className="card" style={{ padding: 20, marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <h2 style={{ fontSize: 22 }}>{c.nombre}</h2>
              <span className={`pill ${c.config?.activo ? 'pill--ok' : 'pill--warn'}`}>{c.config?.activo ? 'Encendido' : 'Apagado'}</span>
            </div>
            <div className="kpi-grid" style={{ marginTop: 16 }}>
              {[['Familias con tarjeta', c.miembros, `${c.tarjetas_abiertas} la abrieron`], ['Familias referidas', c.referidos, 'con referidor confirmado'],
                ['Saldo emitido', centavos(c.emitido_cent), 'bonos menos reversos'], ['Saldo canjeado', centavos(c.canjeado_cent), 'descontado en mensualidades'],
                ['Saldo pendiente', centavos(c.pendiente_cent), 'deuda con las familias']].map(([titulo, valor, sub]) => (
                <div className="kpi" key={titulo}><div className="kpi__top"><span className="label">{titulo}</span></div><div className="kpi__value">{valor}</div><div className="kpi__sub">{sub}</div></div>
              ))}
            </div>
            <p style={{ fontSize: 13, marginTop: 14, color: 'var(--text-dim)' }}>
              {c.config?.cobertura_completa_at ? 'Inscritos anteriores cargados: los referidos se confirman solos cada día.' : 'Falta cargar los inscritos anteriores: sin eso no se confirma ningún referido ni se paga al que refirió.'}
              {c.centroId ? <> · <Link className="operations-link" href={`/centro/${c.centroId}/referidos`}>Ver familias</Link></> : null}
            </p>
            {datos.esMaster && (
              <form onSubmit={(e) => guardar(e, c.cuenta)} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end', marginTop: 18 }}>
                {[['bono_clase_prueba', 'Por ir a clase de prueba', c.config?.bono_clase_prueba_cent], ['bono_referido_asiste', 'Al que refirió: su invitado asistió', c.config?.bono_referido_asiste_cent],
                  ['bono_referido_inscrito', 'Al que refirió: su invitado se inscribió', c.config?.bono_referido_inscrito_cent]].map(([name, etiqueta, valor]) => (
                  <label className="field" key={name}><span className="label">{etiqueta} (USD)</span>
                    <input className="input" name={name} inputMode="decimal" defaultValue={dolares(valor)} style={{ width: 150 }} /></label>
                ))}
                <label className="field"><span className="label">Paga clases desde</span>
                  <input className="input" type="date" name="activo_desde" defaultValue={c.config?.activo_desde ? String(c.config.activo_desde).slice(0, 10) : ''} /></label>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, minHeight: 44 }}>
                  <input type="checkbox" name="activo" defaultChecked={Boolean(c.config?.activo)} /> Encendido</label>
                <button type="submit" className="btn btn--primary" disabled={ocupado === c.cuenta + 'g'}>{ocupado === c.cuenta + 'g' ? 'Guardando…' : 'Guardar'}</button>
                <button type="button" className="btn" disabled={ocupado === c.cuenta + 'h'} onClick={() => historicos(c.cuenta)}>{ocupado === c.cuenta + 'h' ? 'Cargando…' : 'Cargar inscritos anteriores'}</button>
              </form>
            )}
            {avisos[c.cuenta] && <div className="alert" role="status" style={{ marginTop: 14 }}>{avisos[c.cuenta]}</div>}
          </section>
        ))}
      </main>
    </div>
  )
}
