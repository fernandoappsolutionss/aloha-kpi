'use client'
// Plan de UN niño (R3): la superficie para VERLO. El modelo no se rediseña
// aquí — el ancla es `estudiantes.fecha_inicio_nivel` y el plan se deriva al
// vuelo con el motor único (lib/plan-nino.mjs). Esta pantalla solo lo pinta.
//
// La línea de tiempo es la MISMA del itinerario del grupo: se extrajo de
// app/centro/[id]/grupos/page.js (ItinerarioNivel) a este módulo para que el
// aula y el niño se vean idénticos y los estilos vivan en un solo sitio
// (.itin-* de app/globals.css). Lo único que cambia es de dónde sale la
// posición: el aula por su itinerario y el niño por su ancla, pero ambas por
// el mismo `posicionPlanNino` — entran por {estado, indice}
// (lib/plan-nino-vista.mjs).
//
// RENDIMIENTO: los planes de los niños llegan ENRIQUECIDOS por lote desde
// loadOperaciones (memo compartido, g1-13). Aquí NO se deriva por render: el
// useMemo del modal solo cubre al niño que no pasó por esa pasada.

import { useEffect, useMemo, useState } from 'react'
import { TIPOS_SEMANA } from '../lib/itinerario'
import { calendarioVersionadoDe, planNino, posicionPlanNino, cierreEfectivo } from '../lib/plan-nino.mjs'
import { estadoCasilla, progresoPlan } from '../lib/plan-nino-vista.mjs'
import Dialog, { useDialogCallback } from './Dialog'

// Fechas DATE de Postgres llegan como 'AAAA-MM-DD' o como Date según el driver.
const isoDia = (d) => {
  if (!d) return ''
  if (typeof d === 'string') return d.slice(0, 10)
  const dt = new Date(d)
  return isNaN(dt) ? '' : dt.toISOString().slice(0, 10)
}
const fmtDia = (d) => isoDia(d) || '—'

// Color de cada tipo de semana de la plantilla (leyenda incluida).
export const TIPO_ESTILO = {
  induccion: { bg: 'var(--surface-3)', line: 'var(--border-strong)', fg: 'var(--text-muted)' },
  clase: { bg: 'var(--surface-3)', line: 'var(--border-strong)', fg: 'var(--text-muted)' },
  evaluacion: { bg: 'var(--warn-bg)', line: 'var(--warn-line)', fg: 'var(--warn)' },
  mental: { bg: 'var(--ts-green-soft)', line: 'var(--ts-green-line)', fg: 'var(--ok-text)' },
  cierre: { bg: 'var(--bad-bg)', line: 'var(--bad-line)', fg: 'var(--bad)' },
}
const estiloDe = (tipo) => TIPO_ESTILO[tipo] || TIPO_ESTILO.clase

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export const mesDe = (f) => {
  const [y, m] = String(f).slice(0, 10).split('-').map(Number)
  return `${MESES[(m || 1) - 1]} ${y}`
}
export const diaMes = (f) => String(f).slice(8, 10) + '/' + String(f).slice(5, 7)

// ── Barra de progreso del plan ──────────────────────────────────────────────
// `estado`/`indice` ya vienen resueltos (posicionPlanNino para el aula,
// posicionPlanNino para el niño): aquí no se decide nada, se dibuja.
export function ProgresoPlan({ it, estado, indice }) {
  const total = it?.semanas?.length || 0
  const etiqueta = it?.semanas?.[estado === 'por_iniciar' ? 0 : indice]?.etiqueta
  const { pct, texto } = progresoPlan({ total, estado, indice, etiqueta })
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>
        <span>{texto}</span>
        <span className="num">{pct}%</span>
      </div>
      <div className="bar"><div className="bar__fill" style={{ width: `${pct}%`, background: 'var(--ts-green)' }} /></div>
    </div>
  )
}

// ── Línea de tiempo + leyenda + agenda mes a mes ────────────────────────────
// `onFecha` SOLO lo pasa el grupo: suspender una clase corre el plan del aula.
// En el plan del niño las fechas son texto — las excepciones son del grupo, no
// suyas, y desde su ficha no se toca el calendario de nadie más.
export function LineaTiempoPlan({ it, estado, indice, onFecha, tour }) {
  const semanas = it?.semanas || []
  if (!semanas.length) return null
  // Agrupa las semanas por mes calendario para que el plan se lea como agenda.
  const porMes = []
  semanas.forEach((s, i) => {
    const mes = mesDe(s.fechas[0])
    if (!porMes.length || porMes[porMes.length - 1].mes !== mes) porMes.push({ mes, filas: [] })
    porMes[porMes.length - 1].filas.push({ s, i })
  })
  const pos = { estado, indice }

  return (
    <>
      {/* Línea de tiempo: una casilla por semana, con hoy marcado */}
      <div className="itin-tl" data-tour={tour}>
        {semanas.map((s, i) => {
          const est = estiloDe(s.tipo)
          const { hoy, pasada } = estadoCasilla(i, pos)
          return (
            <div key={i} className={`itin-blk${hoy ? ' itin-blk--hoy' : ''}${pasada ? ' itin-blk--hecha' : ''}`}
              title={`${s.etiqueta} · ${s.fechas.map(fmtDia).join(' · ')}${hoy ? ' · SEMANA EN CURSO' : ''}`}
              style={{ background: est.bg, borderColor: hoy ? 'var(--ts-green)' : est.line, color: est.fg }}>
              {s.corto || String(i + 1)}
            </div>
          )
        })}
      </div>
      <div className="itin-leyenda">
        {Object.entries(TIPOS_SEMANA).map(([k, v]) => (
          <span key={k} title={v.desc}>
            <i style={{ background: estiloDe(k).bg, borderColor: estiloDe(k).line }} />{v.label}
          </span>
        ))}
      </div>

      {/* Agenda mes a mes */}
      {porMes.map(({ mes, filas }) => (
        <div key={mes}>
          <div className="itin-mes">{mes}</div>
          {filas.map(({ s, i }) => {
            const est = estiloDe(s.tipo)
            const { hoy, pasada } = estadoCasilla(i, pos)
            return (
              <div key={i} className={`itin-fila${hoy ? ' itin-fila--hoy' : ''}`} style={pasada ? { opacity: 0.55 } : undefined}>
                <span className="itin-fila__chip" style={{ background: est.bg, borderColor: est.line, color: est.fg }}>{s.corto}</span>
                <span style={{ color: hoy ? 'var(--text)' : 'var(--text-muted)', fontWeight: hoy ? 600 : 400 }}>{s.etiqueta}</span>
                {hoy && <span className="pill pill--ok" style={{ fontSize: 13 }}><span className="dot" />Hoy</span>}
                <span className="num itin-fila__fechas">
                  {(s.saltadas || []).map((k) => (
                    <span key={k.fecha} className="itin-fecha itin-fecha--out" title={`${fmtDia(k.fecha)}: ${k.motivo} — por eso corrió el plan`}>
                      {diaMes(k.fecha)}
                    </span>
                  ))}
                  {s.fechas.map((f) => (onFecha ? (
                    <button key={f} className="itin-fecha" title={`Suspender la clase del ${fmtDia(f)} (corre el plan)`} onClick={() => onFecha(f)}>
                      {diaMes(f)}
                    </button>
                  ) : (
                    <span key={f} className="itin-fecha itin-fecha--fija" title={`Clase del ${fmtDia(f)}`}>{diaMes(f)}</span>
                  )))}
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </>
  )
}

// ── Notas al pie del plan: lo que lo corrió y qué viene después ─────────────
export function NotasPlan({ it, style }) {
  if (!it) return null
  const hay = it.clases_suspendidas?.length || it.feriados_saltados?.length || it.inicio_siguiente_nivel
  if (!hay) return null
  return (
    <div style={{ padding: '12px 18px', display: 'grid', gap: 8, ...style }}>
      {it.clases_suspendidas?.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--warn)' }}>
          ⏸ Clases suspendidas del grupo: {it.clases_suspendidas.map((c) => `${fmtDia(c.fecha)}${c.motivo ? ` (${c.motivo})` : ''}`).join(' · ')}
        </div>
      )}
      {it.feriados_saltados?.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          🎌 Sin clases por feriados y vacaciones del manual: {it.feriados_saltados.map(fmtDia).join(' · ')}
        </div>
      )}
      {it.inicio_siguiente_nivel && (
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          ➡️ El nivel {it.nivel + 1} arrancaría el <b style={{ color: 'var(--text)' }}>{fmtDia(it.inicio_siguiente_nivel)}</b>
          {Number(it.nivel) % 2 === 0 ? ' (incluye la semana de vacaciones de fin de ciclo)' : ''}.
        </div>
      )}
    </div>
  )
}

// ── Modal del plan del niño ─────────────────────────────────────────────────

const ORIGEN_CIERRE = { manual: 'override manual', derivado: 'derivado de su propio plan' }

// Plan individual: se abre desde el chip del niño ("va por S{x}" / "sin plan").
//   nino    — el niño ENRIQUECIDO por loadOperaciones (trae `plan`).
//   grupo   — su grupo (encabezado y, si hiciera falta, calendario de respaldo).
//   hoy     — fecha de negocio iso10 (hoyISO Panamá): el módulo no mira el reloj.
//   renderCreacion({ nino, grupo, onPlanFijado }) — el bloque de CREACIÓN
//     RÁPIDA del ancla que falta. Es el seam de la tarea C: si no se pasa, el
//     modal explica qué falta y por qué el sistema no lo adivina.
//   onCambio(plan) — avisa a la pantalla que el ancla cambió (para refrescar
//     el roster); el modal ya repinta solo con el plan que devuelve el server.
export function PlanNinoModal({ nino, grupo = null, hoy, onClose, renderCreacion, onCambio, returnFocusRef }) {
  const [planFijado, setPlanFijado] = useState(null)
  const [closeDisabled, setCloseDisabled] = useState(false)

  const base = planFijado || nino?.plan || null

  // Al fijar el ancla el modal repinta con el plan que devolvió el server
  // (planFijado) sin esperar la recarga. En cuanto la recarga trae el niño ya
  // con plan, manda el dato vivo: si no, esta copia taparía lo que hizo otro.
  useEffect(() => {
    if (planFijado && nino?.plan && nino.plan.estado !== 'sin_plan') setPlanFijado(null)
  }, [planFijado, nino?.plan])
  const anclaCruda = isoDia(nino?.fecha_inicio_nivel)
  const ancla = base?.ancla || anclaCruda
  const nivel = Number(nino?.nivel)
  const cierreOverride = nino?.fecha_cierre_nivel

  // El plan ya viene derivado del server. El respaldo solo corre para el niño
  // que no pasó por la pasada batch (una ficha suelta), y se memoiza para no
  // volver a derivarlo en cada render.
  const derivado = useMemo(() => {
    if (base || !grupo) return null
    const plan = planNino({
      ancla: anclaCruda,
      nivel,
      pais: grupo?.pais === 'VE' || grupo?.pais === 'PA' ? grupo.pais : 'PA',
      calendarioVersionado: calendarioVersionadoDe(grupo),
      excepciones: grupo?.itinerario_clases?.excepciones || [],
    })
    const posicion = posicionPlanNino(plan, hoy)
    return {
      estado: posicion.estado,
      ancla: anclaCruda || null,
      indiceSemana: posicion.indice,
      semana: posicion.semana,
      cierre: cierreEfectivo({ override: cierreOverride, plan }),
      itinerario: plan,
    }
  }, [base, grupo, anclaCruda, nivel, hoy, cierreOverride])

  const plan = base || derivado
  const it = plan?.itinerario || null
  const estado = plan?.estado || 'sin_plan'
  const cierre = plan?.cierre || { fecha: null, origen: null }
  const sinPlan = estado === 'sin_plan' || !it?.semanas?.length
  // Dos "sin plan" muy distintos: al niño le falta el ancla (eso se arregla
  // aquí mismo) o el grupo no tiene calendario (eso se arregla en el grupo).
  const sinAncla = !ancla
  const sinCalendario = !sinAncla && sinPlan

  const fijado = useDialogCallback((planNuevo) => {
    if (planNuevo) setPlanFijado(planNuevo)
    onCambio?.(planNuevo || null)
  }, nino?.id)
  const notifyBusy = useDialogCallback(setCloseDisabled, nino?.id)

  const titulo = `Plan de ${nino?.nombre || 'el niño'}`

  return (
    <Dialog
      open
      title={titulo}
      returnFocusRef={returnFocusRef}
      onClose={onClose}
      closeDisabled={closeDisabled}
      width={640}
      className="plan-nino-dialog"
    >
      <div className="itin-head">
        <span className="label">Plan del niño</span>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>
          {nino?.itinerario} · Nivel {nino?.nivel}
          {grupo ? ` · Grupo ${grupo.numero}` : ''}
          {nino?.representante ? ` · ${nino.representante}` : ''}
        </div>

        {/* Ancla y cierre: las dos fechas que MANDAN en el plan del niño */}
        <div className="dialog-form-grid" style={{ gap: 10, marginTop: 12 }}>
          <div>
            <span className="label">Empezó su nivel</span>
            <div className="num" style={{ fontSize: 14, color: ancla ? 'var(--text)' : 'var(--text-dim)', marginTop: 3 }}>
              {ancla ? fmtDia(ancla) : 'sin fecha de inicio'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
              {ancla
                ? 'Es su ancla: de aquí sale todo su plan (no del grupo).'
                : 'Sin ancla no hay plan: el sistema no la adivina.'}
            </div>
          </div>
          <div>
            <span className="label">Cierra su nivel</span>
            <div className="num" style={{ fontSize: 14, color: cierre.fecha ? 'var(--text)' : 'var(--text-dim)', marginTop: 3 }}>
              {cierre.fecha ? fmtDia(cierre.fecha) : 'sin cierre resoluble'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
              {cierre.origen ? ORIGEN_CIERRE[cierre.origen] : 'sin override manual ni plan derivable'}
            </div>
          </div>
        </div>

        {!sinPlan && (
          <div style={{ marginTop: 12 }}>
            <ProgresoPlan it={it} estado={estado} indice={plan?.indiceSemana} />
          </div>
        )}
      </div>

      {sinPlan ? (
        sinCalendario ? (
          <div style={{ padding: 10, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12.5, lineHeight: 1.7 }}>
            {nino?.nombre} sí tiene su fecha de inicio de nivel ({fmtDia(ancla)}), pero
            {grupo ? ` el grupo ${grupo.numero}` : ' su grupo'} todavía no tiene horario ni itinerario:
            <b style={{ color: 'var(--text)' }}> sin calendario del aula no hay plan que derivar</b>.
            Ponle horario y fecha de inicio de clases al grupo y este plan aparece solo.
          </div>
        ) : renderCreacion ? (
          renderCreacion({ nino, grupo, onPlanFijado: fijado, onBusyChange: notifyBusy })
        ) : (
          <div style={{ padding: 10, color: 'var(--text-dim)', fontSize: 12.5, lineHeight: 1.7, display: 'grid', gap: 10, justifyItems: 'center', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, color: 'var(--text)' }}>Este niño no tiene fecha de inicio de nivel</div>
            <p style={{ maxWidth: 420, margin: 0 }}>
              Su historia no alcanza para deducirla (su inscripción declara un nivel distinto al que cursa hoy),
              y el sistema <b style={{ color: 'var(--text)' }}>no la inventa</b>. Hay que fijarla a mano: es el día
              en que {nino?.nombre} empezó el nivel {nino?.nivel} que cursa ahora.
            </p>
          </div>
        )
      ) : (
        <>
          <LineaTiempoPlan it={it} estado={estado} indice={plan?.indiceSemana} />
          <NotasPlan it={it} />
          <div style={{ padding: '0 2px 14px', fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.6 }}>
            Este plan es de {nino?.nombre}: sale de SU fecha de inicio de nivel sobre el calendario
            {grupo ? ` del grupo ${grupo.numero}` : ' de su grupo'} (con sus feriados y clases suspendidas).
            Sus compañeros con otra ancla van por otra semana.
          </div>
        </>
      )}
    </Dialog>
  )
}
