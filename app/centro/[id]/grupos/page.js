'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import {
  loadOperaciones, crearGrupo, actualizarGrupo, cerrarGrupo, reabrirGrupo, setInscripcionAbierta, extenderVentanaLlenado, linkCoach, siguienteNumero,
  saveCoach, toggleCoach, saveSalon, toggleSalon, sugerenciasFusion, aplicarFusion, ajustarItinerarioGrupo,
} from '../../../actions/grupos'
import {
  inscribirEstudiante, actualizarEstudiante, graduarTiny, marcarBajaPotencial,
  revertirBajaPotencial, retirarEstudiante, reincorporarEstudiante,
} from '../../../actions/estudiantes'
import {
  ITINERARIOS, NIVEL_MAX, MOTIVOS_RETIRO, MOTIVOS_RETIRO_LABELS, ORIGENES, DIAS, TINYMAP, aperturaMinima, hoyISO,
} from '../../../../lib/operaciones'
import { groupStatus, underMeta, promedios, sugerenciasPara, scoreBand } from '../../../../lib/fusiones'
import {
  CIERRE_MIN, SLOT_MIN, DIAS_OPERATIVOS, aperturaDe, aHora, aHora12, aMinutos, calendarioDia,
  sinSalonDia, inventarioSemanal, coachesLibresEn, bloquesQueCaben, ventanaVendible, KINDER_INICIO,
} from '../../../../lib/inventario'
import { atractivoDe, recomendacionesApertura, inicioVendible, unidadParaHueco, GUIA_FRANJAS_DIFICILES } from '../../../../lib/atractivo'
import { estadoModelo, unidadesLibres, slotsDelDia, RESUMEN_MODELO } from '../../../../lib/modelo'
import { reservasComoGrupos, diasConPrueba, ROLES_RESERVA, ROL_LABEL, ROL_PIDE_COACH } from '../../../../lib/reservas'
import { sugerenciaReserva, guardarReserva, eliminarReserva } from '../../../actions/reservas'
import { generarItinerario, semanaEnCurso, TIPOS_SEMANA } from '../../../../lib/itinerario'
import { ventanaNuevos, ritmoLlenado, sugerenciasLlenado, ordenarPorCierreLlenado, SEMANA_LIMITE_NUEVOS } from '../../../../lib/llenado.mjs'

// Pill por estado de grupo (claves de groupStatus en lib/fusiones).
const ESTADO_PILL = { estable: 'pill--ok', bajo: 'pill--bad', online: 'pill--warn', kinder: 'pill--warn', base: 'pill--warn', cerrado: 'pill--bad', fusionado: 'pill--warn' }
// Qué significa cada etiqueta (se muestra al pasar el mouse).
const ESTADO_TITULO = {
  estable: 'En meta: 8 o más niños.',
  bajo: 'Menos de 8 niños con niveles 3+: candidato a fusión según el manual.',
  base: 'Todos los niños van en nivel 1–2: el grupo está arrancando el programa. El manual lo exime de fusiones (las uniones aplican desde nivel 3, cuando llegan las deserciones).',
  kinder: 'Grupo Kinder: exento de la meta de 8 y de las fusiones.',
  online: 'Grupo online: exento de la meta de 8 y de las fusiones.',
  cerrado: 'Grupo cerrado: ya no cuenta en la rentabilidad.',
  fusionado: 'Grupo fusionado con otro: sus niños fueron movidos.',
}
const BANDA_PILL = { Alta: 'pill--ok', Media: 'pill--warn', Baja: 'pill--bad', Bloqueado: 'pill--bad' }
const ORIGEN_LABELS = { clase_prueba: 'Clase de prueba', directo: 'Inscripción directa', traslado: 'Traslado de centro' }
const BTN_XS = { padding: '4px 10px', fontSize: 11 }

// Fechas DATE de Postgres llegan como string 'AAAA-MM-DD' o como Date según el driver.
const isoDia = (d) => {
  if (!d) return ''
  if (typeof d === 'string') return d.slice(0, 10)
  const dt = new Date(d)
  return isNaN(dt) ? '' : dt.toISOString().slice(0, 10)
}
const fmtDia = (d) => isoDia(d) || '—'
const horarioTexto = (horarios) =>
  (horarios || []).length ? horarios.map((h) => `${DIAS[h.dia]} ${aHora12(aMinutos(h.hora_inicio))}–${aHora12(aMinutos(h.hora_fin))}`).join(' · ') : 'Sin horario'

// Búsqueda tolerante a acentos y mayúsculas.
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
// Un grupo coincide por número, itinerario, coach o por el nombre de alguno de
// sus niños / representantes: buscar "Duna" debe llevarte a su grupo.
function coincideBusqueda(g, termino) {
  if (!termino) return true
  const t = norm(termino)
  return (
    norm(`grupo ${g.numero}`).includes(t) ||
    norm(g.itinerario).includes(t) ||
    norm(g.coach?.nombre).includes(t) ||
    g.estudiantes.some((e) => norm(e.nombre).includes(t) || norm(e.representante).includes(t))
  )
}

// ¿La pantalla es angosta? Debajo del breakpoint el detalle deja de ser una
// columna fija y pasa a abrirse como panel deslizante sobre la lista.
function useNarrow(max = 1180) {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${max}px)`)
    const sync = () => setNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [max])
  return narrow
}

// Itinerarios y rangos de nivel presentes en el grupo, p. ej. "TINY 3–5 · KIDS 7".
function nivelesTexto(g) {
  const partes = []
  for (const it of ITINERARIOS) {
    const nvs = g.estudiantes.filter((e) => e.itinerario === it).map((e) => Number(e.nivel))
    if (!nvs.length) continue
    const min = Math.min(...nvs)
    const max = Math.max(...nvs)
    partes.push(`${it} ${min === max ? min : `${min}–${max}`}`)
  }
  return partes.length ? partes.join(' · ') : g.itinerario
}

// Fecha iso corrida N días (para el min/max del input de extensión).
const sumaDias = (iso, n) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

// ── Llenado (cliente puro, lib/llenado.mjs) ──────────────────────────────────
// Ventana de nuevos + ritmo del grupo, derivados de lo que ya llegó en
// loadOperaciones — cero queries nuevas. La meta sigue el diseño: apertura
// mínima del nivel vigente si el nivel aún no inicia, gpn_min una vez andando.
// El ritmo OBSERVADO se aproxima con el roster embebido (inscripciones de los
// últimos 14 días que siguen en el grupo): subestima si un niño entró y se
// retiró dentro de la quincena — señal visual suficiente; el número exacto
// vive en el servidor (estudiante_eventos).
function llenadoDe(g, metas, hoy) {
  const it = g.itinerario_clases
  const inicioNivel = isoDia(it?.fecha_inicio)
  const noInicia = !!inicioNivel && hoy < inicioNivel
  const meta = noInicia ? aperturaMinima(g.itinerario, Number(it?.nivel) || 1) : metas.gpnMin
  const eventos = (g.estudiantes || []).map((e) => ({ tipo: 'inscripcion', a_grupo_id: g.id, fecha: e.fecha_inscripcion }))
  return { ventana: ventanaNuevos(g, hoy), ritmo: ritmoLlenado(g, meta, eventos, hoy) }
}

// Countdown de la card destacada: "cierra a nuevos en X días" / "vence hoy".
function countdownVentana(v) {
  if (v.diasHastaLimite == null) return 'sin fecha límite (exento)'
  if (v.diasHastaLimite === 0) return 'vence hoy'
  if (v.diasHastaLimite === 1) return 'cierra a nuevos mañana'
  return `cierra a nuevos en ${v.diasHastaLimite} días`
}

// Motivo legible cuando el grupo NO acepta niños nuevos (tooltip del botón
// de inscribir). Espeja los mensajes del server action, que valida igual.
function motivoNoAceptaNuevos(v) {
  if (v.razon === 'palanca_cerrada') return 'Cerrado a inscripciones: ya no entra nadie. Ábrelo con “Abrir inscripciones” si tiene cupo.'
  if (v.razon === 'vencida') return `La ventana de niños nuevos venció el ${fmtDia(v.fechaLimite)} (manual: Tiny hasta la semana 4 del libro, Kids hasta la 2). Extiende la ventana o apunta la venta a la inducción del próximo nivel.`
  if (v.razon === 'no_activo') return 'El grupo no está activo.'
  return ''
}

// Chip de llenado del panel — 3 estados (diseño 2026-08-08): verde = en
// llenado (con la fecha en que cierra a nuevos si el manual la fija), ámbar =
// ventana del manual vencida (los movimientos internos SÍ siguen entrando),
// rojo = palanca manual cerrada (no entra nadie).
function ChipLlenado({ v, programa }) {
  if (v.razon === 'palanca_cerrada') {
    return <span className="pill pill--bad" title="Cerrado a inscripciones: ya no entra nadie (ni inscripción, ni reincorporación, ni fusión). Ventas ve 0 cupos."><span className="dot" />🔒 Inscripciones cerradas</span>
  }
  if (v.razon === 'vencida') {
    const sem = SEMANA_LIMITE_NUEVOS[String(programa || '').toUpperCase()]
    return (
      <span className="pill pill--warn" title={`Ya no acepta niños NUEVOS: la ventana del manual venció el ${fmtDia(v.fechaLimite)}. Reincorporaciones, cambios de grupo y fusiones sí entran; al pasar de nivel la ventana se reabre sola.`}>
        <span className="dot" />Cerrado a nuevos (manual{sem ? ` · semana ${sem}` : ''})
      </span>
    )
  }
  return (
    <span className="pill pill--ok" title="En llenado: acepta niños nuevos y se puede colocar en las clases de prueba.">
      <span className="dot" />En llenado{v.fechaLimite ? ` · cierra ${fmtDia(v.fechaLimite)}` : ''}
    </span>
  )
}

export default function GruposPage() {
  const { id } = useParams()
  const router = useRouter()
  const [rol, setRol] = useState('usuario')
  const isAdmin = rol === 'admin_general' || rol === 'supervisor'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [tab, setTab] = useState('grupos')
  const [filtro, setFiltro] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [openId, setOpenId] = useState(null)
  // Workspace maestro/detalle: la lista manda, el detalle vive al lado (sticky)
  // y en pantallas angostas se abre como panel deslizante.
  const narrow = useNarrow()
  const workspaceRef = useRef(null)
  // Fusiones: se cargan al entrar al tab; se invalidan tras cada mutación.
  const [fus, setFus] = useState(null)
  const [fusLoading, setFusLoading] = useState(false)
  const [origenId, setOrigenId] = useState(null)
  const [busyFusion, setBusyFusion] = useState(null)
  // Modales
  const [grupoModal, setGrupoModal] = useState(null)
  const [inscribir, setInscribir] = useState(null) // null | { grupoId? }
  const [editEst, setEditEst] = useState(null)
  const [retiroEst, setRetiroEst] = useState(null)
  const [reincEst, setReincEst] = useState(null)
  const [itinEdit, setItinEdit] = useState(null) // { grupo, fecha? }

  useEffect(() => { setRol(localStorage.getItem('aloha_rol') || 'usuario') }, [])

  const load = useCallback(async () => {
    try {
      const res = await loadOperaciones(id)
      setData(res)
    } catch (e) { setStatus('❌ ' + e.message) }
    setLoading(false)
  }, [id])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    // fusLoading NO va en las deps ni en el guard: setearlo aquí re-dispararía
    // el efecto y su cleanup (vivo = false) descartaría el resultado en vuelo.
    if (tab !== 'fusiones' || fus) return
    let vivo = true
    setFusLoading(true)
    sugerenciasFusion(id).then((r) => { if (vivo) { setFus(r); setFusLoading(false) } }).catch(() => { if (vivo) setFusLoading(false) })
    return () => { vivo = false }
  }, [tab, fus, id])

  async function refresca() {
    setFus(null)
    await load()
  }

  const metas = data?.metas || { gpnMin: 8, cupoMax: 15 }
  const grupos = data?.grupos || []
  const activos = grupos.filter((g) => g.estado === 'activo')
  const bajoMetaN = activos.filter((g) => underMeta(g, metas.gpnMin)).length
  const prom = promedios(grupos, metas.gpnMin)
  const ninosActivos = grupos.reduce((s, g) => s + g.estudiantes.length, 0) + (data?.sinGrupo?.length || 0)

  const hoy = hoyISO()
  const pasaFiltro = (g, f) => {
    const st = groupStatus(g, metas.gpnMin)
    if (f === 'todos') return g.estado === 'activo'
    if (f === 'bajo') return st.key === 'bajo'
    if (f === 'estables') return st.key === 'estable'
    if (f === 'kinder') return g.estado === 'activo' && st.key === 'kinder'
    // Cerrados a nuevos: activos donde un niño NUEVO ya no entra — palanca
    // manual cerrada o ventana del manual vencida (los movimientos internos
    // sí siguen entrando mientras la palanca esté abierta).
    if (f === 'cerradosNuevos') return g.estado === 'activo' && !ventanaNuevos(g, hoy).abierta
    return g.estado !== 'activo'
  }
  // Secuencia ÚNICA de la lista (diseño 2026-08-08, defecto 12): base = el
  // filtro + búsqueda de siempre; EN LLENADO = activos con palanca abierta y
  // ventana de nuevos vigente, el que cierra primero arriba (sin fecha al
  // final); resto = el complemento en el orden del servidor. TODO — render,
  // visiblesKey, flechas ↑/↓, conteos y el auto-cierre del detalle — deriva
  // de `visibles`, y cada grupo se renderiza UNA sola vez.
  const base = grupos.filter((g) => pasaFiltro(g, filtro) && coincideBusqueda(g, busqueda))
  const enLlenado = ordenarPorCierreLlenado(base.filter((g) => ventanaNuevos(g, hoy).abierta), hoy)
  const idsEnLlenado = new Set(enLlenado.map((g) => String(g.id)))
  const resto = base.filter((g) => !idsEnLlenado.has(String(g.id)))
  const visibles = [...enLlenado, ...resto]
  const abierto = openId ? visibles.find((g) => String(g.id) === String(openId)) : null
  const visiblesKey = visibles.map((g) => g.id).join(',')

  // Si el grupo abierto se sale de la vista (cambió el filtro o la búsqueda),
  // se cierra el detalle para no mostrar algo que ya no está en la lista.
  useEffect(() => {
    if (openId && !visiblesKey.split(',').includes(String(openId))) setOpenId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visiblesKey, openId])

  // Deja el workspace pegado arriba: al elegir un grupo, el detalle queda
  // completo en pantalla sin que haya que bajar la página.
  function alinearWorkspace() {
    const el = workspaceRef.current
    if (!el) return
    const top = el.getBoundingClientRect().top
    if (top >= -4 && top <= 24) return
    window.scrollTo({ top: window.scrollY + top - 12, behavior: 'smooth' })
  }
  function abrirGrupo(g, { alinear = true } = {}) {
    setStatus('')
    setOpenId(g.id)
    if (alinear && !narrow) requestAnimationFrame(alinearWorkspace)
  }

  // Teclado: Esc cierra el detalle, ↑/↓ recorren la lista de grupos.
  const hayModal = !!(grupoModal || inscribir || editEst || retiroEst || reincEst || itinEdit)
  useEffect(() => {
    function onKey(e) {
      if (tab !== 'grupos' || hayModal) return
      if (e.key === 'Escape') { if (openId) setOpenId(null); return }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      const ids = visiblesKey ? visiblesKey.split(',') : []
      if (!ids.length) return
      e.preventDefault()
      const i = ids.indexOf(String(openId))
      const next = e.key === 'ArrowDown'
        ? (i < 0 ? 0 : Math.min(i + 1, ids.length - 1))
        : (i < 0 ? ids.length - 1 : Math.max(i - 1, 0))
      setOpenId(ids[next])
      requestAnimationFrame(() => document.querySelector(`[data-grupo="${ids[next]}"]`)?.scrollIntoView({ block: 'nearest' }))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tab, hayModal, openId, visiblesKey])

  // Con el panel deslizante abierto, el fondo no debe hacer scroll.
  useEffect(() => {
    if (!narrow || !abierto || tab !== 'grupos') return
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previo }
  }, [narrow, abierto, tab])

  // `prefill` opcional: desde el calendario o una recomendación del modelo.
  // Puede ser una sesión suelta { dia, hora_inicio, hora_fin, salon_id } o una
  // unidad completa { horarios: [...] } (p. ej. el par Lun+Mié del modelo).
  async function abrirNuevoGrupo(prefill) {
    setStatus('')
    const num = await siguienteNumero(id)
    const horarios = prefill?.horarios?.length
      ? prefill.horarios.map((h) => ({ ...h }))
      : [{ ...(prefill || { dia: 1, hora_inicio: '', hora_fin: '', salon_id: '' }) }]
    setGrupoModal({ numero: String(num), itinerario: prefill?.itinerario || 'TINY', es_online: false, coach_id: '', fecha_apertura: hoyISO(), fecha_inicio_clases: '', notas: '', nivel: 1, ninos_iniciales: '', horarios })
  }
  function abrirEditarGrupo(g) {
    setStatus('')
    // La palanca de inscripciones ya NO viaja al modal: vive solo en el botón
    // dedicado del panel (CAS). `it_inicio` alimenta el hint de solo lectura
    // cuando la columna fecha_inicio_clases sigue vacía.
    setGrupoModal({
      id: g.id, numero: String(g.numero), itinerario: g.itinerario, es_online: !!g.es_online,
      coach_id: g.coach_id || '', fecha_apertura: isoDia(g.fecha_apertura),
      fecha_inicio_clases: isoDia(g.fecha_inicio_clases),
      it_inicio: isoDia(g.itinerario_clases?.fecha_inicio),
      notas: g.notas || '',
      horarios: (g.horarios || []).map((h) => ({ dia: h.dia, hora_inicio: h.hora_inicio, hora_fin: h.hora_fin, salon_id: h.salon_id || '' })),
    })
  }
  async function onToggleInscripcion(g) {
    // CAS: se manda el estado que el usuario VIO (`esperado`); si otra pestaña
    // movió la palanca primero, el server responde con error legible y aquí
    // se recarga para mostrar el estado real — nunca se pisa en silencio.
    const abiertaVista = g.inscripcion_abierta !== false
    if (abiertaVista && !confirm(`¿Cerrar las inscripciones del grupo ${g.numero}? Ya no entra nadie (ni inscripción, ni reincorporación, ni fusión) y ventas verá 0 cupos.`)) return
    const res = await setInscripcionAbierta(id, g.id, !abiertaVista, abiertaVista)
    if (res.error) { setStatus('❌ ' + res.error); refresca(); return }
    setStatus(res.abierta ? `✅ Grupo ${g.numero} abierto: en llenado.` : `🔒 Grupo ${g.numero} cerrado a inscripciones.`)
    refresca()
  }
  // Extiende (o retira, con fecha null) la ventana de niños nuevos: override
  // consciente con rastro (llenado_extendido_hasta); vence sola. Devuelve si
  // se aplicó, para que el bloque Llenado cierre su mini-formulario.
  async function onExtenderVentana(g, fecha) {
    const res = await extenderVentanaLlenado(id, g.id, fecha)
    if (res.error) { setStatus('❌ ' + res.error); return false }
    setStatus(fecha
      ? `✅ Ventana de nuevos del grupo ${g.numero} extendida hasta el ${res.hasta}.`
      : `✅ Extensión de ventana del grupo ${g.numero} retirada: rige la del manual.`)
    refresca()
    return true
  }
  async function onCerrarGrupo(g) {
    if (!confirm(`¿Cerrar el grupo ${g.numero}? Deja de contar en la rentabilidad del centro.`)) return
    const res = await cerrarGrupo(id, g.id)
    if (res.error) setStatus('❌ ' + res.error)
    else { setStatus(`✅ Grupo ${g.numero} cerrado.`); setOpenId(null); refresca() }
  }
  async function onReabrirGrupo(g) {
    if (!confirm(`¿Reabrir el grupo ${g.numero}?`)) return
    const res = await reabrirGrupo(id, g.id)
    if (res.error) setStatus('❌ ' + res.error)
    else { setStatus(`✅ Grupo ${g.numero} reabierto.`); refresca() }
  }
  function onBuscarFusion(g) {
    setStatus('')
    setOrigenId(g.id)
    setTab('fusiones')
  }
  async function onGraduar(e) {
    if (!confirm(`¿Graduar a ${e.nombre}? Pasa de TINY 10 a KIDS nivel 5 (regla del manual).`)) return
    const res = await graduarTiny(id, e.id)
    if (res.error) setStatus('❌ ' + res.error)
    else { setStatus(`✅ ${e.nombre} graduado 🎓 — ahora es KIDS nivel 5.`); refresca() }
  }
  async function onBaja(e) {
    if (!confirm(`¿Marcar a ${e.nombre} como baja potencial? Sigue este mes pero se iría el próximo.`)) return
    const res = await marcarBajaPotencial(id, e.id, {})
    if (res.error) setStatus('❌ ' + res.error)
    else { setStatus(`✅ ${e.nombre} marcado como baja potencial.`); refresca() }
  }
  async function onRevertirBaja(e) {
    const res = await revertirBajaPotencial(id, e.id)
    if (res.error) setStatus('❌ ' + res.error)
    else { setStatus(`✅ ${e.nombre} sigue activo.`); refresca() }
  }
  async function retiroGuardado(res, est) {
    setRetiroEst(null)
    let msg = `✅ ${est.nombre} retirado.`
    if (res.warn) msg += ` ⚠️ ${res.warn}`
    if (res.grupoVacio && est.grupo_id && confirm(`El grupo ${res.grupoVacio} quedó sin niños. El manual indica cerrarlo para no afectar la rentabilidad. ¿Cerrarlo ahora?`)) {
      const rc = await cerrarGrupo(id, est.grupo_id)
      msg = rc.error ? '❌ ' + rc.error : `✅ ${est.nombre} retirado y grupo ${res.grupoVacio} cerrado.`
    }
    setStatus(msg)
    refresca()
  }
  async function onAplicarFusion(from, to) {
    const n = from.estudiantes.length
    if (!confirm(`¿Fusionar el grupo ${from.numero} (${n} niños) con el grupo ${to.numero}? Los ${n} niños pasan al grupo ${to.numero}.`)) return
    const key = `${from.id}-${to.id}`
    setBusyFusion(key)
    const res = await aplicarFusion(id, { deGrupoId: from.id, aGrupoId: to.id, estudianteIds: from.estudiantes.map((e) => e.id) })
    setBusyFusion(null)
    if (res.error) setStatus('❌ ' + res.error)
    else {
      setStatus(res.cerrado ? `✅ Grupo ${from.numero} fusionado y cerrado. Los niños pasaron al grupo ${to.numero}.` : `✅ Fusión aplicada: los niños pasaron al grupo ${to.numero}.`)
      setOrigenId(null)
      refresca()
    }
  }

  async function onLinkCoach(g) {
    const res = await linkCoach(id, g.id)
    if (res.error) { setStatus('❌ ' + res.error); return }
    const url = `${window.location.origin}${res.path}`
    try {
      await navigator.clipboard.writeText(url)
      setStatus(`✅ Link del coach del grupo ${g.numero} copiado: ${url} — compártelo por WhatsApp; ahí marca asistencia y notas.`)
    } catch {
      setStatus(`✅ Link del coach del grupo ${g.numero}: ${url}`)
    }
  }

  const acciones = {
    linkCoach: onLinkCoach,
    editarGrupo: abrirEditarGrupo,
    cerrar: onCerrarGrupo,
    reabrir: onReabrirGrupo,
    toggleInscripcion: onToggleInscripcion,
    extenderVentana: onExtenderVentana,
    buscarFusion: onBuscarFusion,
    inscribirEn: (g) => { setStatus(''); setInscribir({ grupoId: g.id }) },
    ajustarItinerario: (g, fecha) => { setStatus(''); setItinEdit({ grupo: g, fecha }) },
    editarNino: (e) => { setStatus(''); setEditEst(e) },
    retirar: (e) => { setStatus(''); setRetiroEst(e) },
    graduar: onGraduar,
    baja: onBaja,
    revertirBaja: onRevertirBaja,
  }

  if (loading) return <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-dim)' }}>Cargando…</div>

  const isError = status.includes('❌')
  const statusText = status.replace(/^[❌✅]\s*/, '')
  const okProm = prom.sinK >= metas.gpnMin
  const CARDS = [
    { l: 'Prom. niños/grupo (sin Kinder)', v: prom.sinK.toFixed(1), c: okProm ? 'var(--ok)' : 'var(--bad)', s: `${Math.round(prom.pctMeta)}% de la meta (${metas.gpnMin})`, sc: okProm ? 'var(--ok)' : 'var(--bad)' },
    { l: 'Prom. con Kinder', v: prom.conK.toFixed(1), c: 'var(--text)' },
    { l: 'Grupos activos', v: activos.length, c: 'var(--text)' },
    { l: 'Grupos bajo meta', v: bajoMetaN, c: bajoMetaN > 0 ? 'var(--bad)' : 'var(--ok)' },
    { l: 'Niños activos', v: ninosActivos, c: 'var(--text)' },
  ]
  const TABS = [['grupos', 'Grupos'], ['fusiones', 'Fusiones'], ['horarios', 'Horarios'], ['coaches', 'Coaches y salones']]
  const FILTROS = [['todos', 'Todos'], ['bajo', 'Bajo meta'], ['estables', 'Estables'], ['kinder', 'Kinder'], ['cerradosNuevos', 'Cerrados a nuevos'], ['cerrados', 'Cerrados']]

  return (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={data?.nombre || 'Centro'} centroId={id} />
      <main className="main main--flow">
        {isAdmin && (
          <button onClick={() => router.push('/dashboard')} className="btn" style={{ marginBottom: 18, gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            Volver al panel de administrador
          </button>
        )}
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Mi centro · Operaciones</div>
            <h1 className="h-title">Grupos y Fusiones</h1>
            <p className="h-sub">{data?.nombre || ''} — grupos, niños, horarios y plan de fusiones según el manual</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" onClick={() => { setStatus(''); setInscribir({}) }}>Inscribir niño</button>
            <button className="btn btn--primary" onClick={() => abrirNuevoGrupo()}>➕ Aperturar grupo</button>
          </div>
        </div>

        {status && (
          <div className={`alert${isError ? ' alert--error' : ''}`}
            style={isError ? { marginBottom: 16 } : { marginBottom: 16, background: 'var(--ok-bg)', border: '1px solid var(--ok-line)', color: '#6EE7B7' }}>{statusText}</div>
        )}

        {/* KPI cards (siempre visibles) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(158px,1fr))', gap: 12, marginBottom: 20 }}>
          {CARDS.map((c) => (
            <div key={c.l} className="kpi" style={{ padding: '14px 16px' }}>
              <div className="kpi__top"><span className="label">{c.l}</span></div>
              <div className="kpi__value num" style={{ fontSize: 26, color: c.c }}>{c.v}</div>
              {c.s && <div className="kpi__sub" style={c.sc ? { color: c.sc } : undefined}>{c.s}</div>}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`btn${tab === k ? ' btn--primary' : ''}`} style={{ padding: '8px 16px', fontSize: 13 }}>{l}</button>
          ))}
        </div>

        {tab === 'grupos' && (
          <>
            <div className="grp-toolbar">
              <div className="grp-search">
                <span className="grp-search__icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                </span>
                <input className="input" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar grupo, coach o niño…" aria-label="Buscar grupo, coach o niño" />
                {busqueda && <button className="grp-search__clear" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda">✕</button>}
              </div>
              {FILTROS.map(([k, l]) => {
                const n = grupos.filter((g) => pasaFiltro(g, k)).length
                return (
                  <button key={k} onClick={() => setFiltro(k)} className={`grp-chip${filtro === k ? ' grp-chip--on' : ''}`}>
                    {l}<span className="grp-chip__n">{n}</span>
                  </button>
                )
              })}
              <span className="label" style={{ marginLeft: 'auto' }}>
                {visibles.length} {visibles.length === 1 ? 'grupo' : 'grupos'}{busqueda ? ' encontrados' : ''}
              </span>
            </div>

            <div className="grp-layout" ref={workspaceRef}>
              <div className="grp-list">
                {visibles.length === 0 ? (
                  <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
                    {grupos.length === 0
                      ? 'Aún no hay grupos. Apertura el primero con “➕ Aperturar grupo”.'
                      : busqueda ? `Ningún grupo coincide con “${busqueda}”.` : 'Sin grupos para este filtro.'}
                  </div>
                ) : (
                  <>
                    {/* Sección destacada EN LLENADO: el grupo que cierra a
                        nuevos primero va arriba. El resto sigue debajo en su
                        orden de siempre — mismo orden que `visibles`, así las
                        flechas ↑/↓ recorren exactamente lo que se ve. */}
                    {enLlenado.length > 0 && (
                      <div className="label" style={{ color: 'var(--ts-green)' }}>⏳ En llenado · {enLlenado.length}</div>
                    )}
                    {enLlenado.map((g) => (
                      <GrupoCard key={g.id} g={g} metas={metas} activo={String(openId) === String(g.id)}
                        llenado={llenadoDe(g, metas, hoy)}
                        onAbrir={() => abrirGrupo(g)}
                        onEditar={() => { abrirGrupo(g, { alinear: false }); acciones.editarGrupo(g) }} />
                    ))}
                    {enLlenado.length > 0 && resto.length > 0 && (
                      <div className="label" style={{ marginTop: 6 }}>Los demás · {resto.length}</div>
                    )}
                    {resto.map((g) => (
                      <GrupoCard key={g.id} g={g} metas={metas} activo={String(openId) === String(g.id)}
                        onAbrir={() => abrirGrupo(g)}
                        onEditar={() => { abrirGrupo(g, { alinear: false }); acciones.editarGrupo(g) }} />
                    ))}
                  </>
                )}
              </div>

              {!narrow && (
                abierto ? (
                  <GrupoDetalle g={abierto} metas={metas} acciones={acciones} onCerrarPanel={() => setOpenId(null)} />
                ) : (
                  <div className="panel grp-detail grp-detail--vacio">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-faint)' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, color: 'var(--text)' }}>Elige un grupo</div>
                    <p style={{ fontSize: 12.5, color: 'var(--text-dim)', maxWidth: 320, lineHeight: 1.65 }}>
                      Su listado de niños y las acciones del grupo aparecen aquí mismo, sin bajar la página.
                    </p>
                    <span className="label" style={{ fontSize: 10 }}>↑ ↓ para moverte · Esc para cerrar</span>
                  </div>
                )
              )}
            </div>

            {data?.sinGrupo?.length > 0 && (
              <div className="panel" style={{ marginTop: 16 }}>
                <div className="panel__head"><h3 className="panel__title">Niños sin grupo ({data.sinGrupo.length})</h3></div>
                <table className="table">
                  <thead><tr>{['Niño', 'Nivel', 'Inscrito', ''].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.sinGrupo.map((e) => (
                      <tr key={e.id} style={{ cursor: 'default' }}>
                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>{e.nombre}</td>
                        <td style={{ fontSize: 12 }}>{e.itinerario} {e.nivel}</td>
                        <td className="num" style={{ fontSize: 12 }}>{fmtDia(e.fecha_inscripcion)}</td>
                        <td style={{ textAlign: 'right' }}><button className="btn" style={BTN_XS} onClick={() => acciones.editarNino(e)}>Asignar grupo</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data?.retirados?.length > 0 && (
              <div className="panel" style={{ marginTop: 16 }}>
                <div className="panel__head">
                  <h3 className="panel__title">Retirados recientes</h3>
                  <span className="label">Últimos {data.retirados.length}</span>
                </div>
                <table className="table">
                  <thead><tr>{['Niño', 'Nivel', 'Motivo', 'Fecha retiro', ''].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.retirados.map((e) => (
                      <tr key={e.id} style={{ cursor: 'default' }}>
                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>{e.nombre}</td>
                        <td style={{ fontSize: 12 }}>{e.itinerario} {e.nivel}</td>
                        <td><span className="pill pill--bad"><span className="dot" />{MOTIVOS_RETIRO_LABELS[e.motivo_retiro] || e.motivo_retiro || '—'}</span></td>
                        <td className="num" style={{ fontSize: 12 }}>{fmtDia(e.fecha_retiro)}</td>
                        <td style={{ textAlign: 'right' }}><button className="btn" style={BTN_XS} onClick={() => { setStatus(''); setReincEst(e) }}>Reincorporar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'fusiones' && (
          <TabFusiones grupos={grupos} metas={metas} fus={fus} fusLoading={fusLoading}
            origenId={origenId} setOrigenId={setOrigenId} onAplicar={onAplicarFusion} busyFusion={busyFusion} />
        )}

        {tab === 'horarios' && (
          <TabHorarios centroId={id} grupos={grupos} coaches={data?.coaches || []} salones={data?.salones || []}
            retirados={data?.retirados || []} reservas={data?.reservas || []}
            onAbrirGrupo={(prefill) => abrirNuevoGrupo(prefill)} onChanged={refresca} setStatus={setStatus} />
        )}

        {tab === 'coaches' && (
          <TabCoaches centroId={id} coaches={data?.coaches || []} salones={data?.salones || []}
            onChanged={refresca} setStatus={setStatus} />
        )}
      </main>

      {/* Pantallas angostas: el detalle entra como panel deslizante sobre la lista */}
      {tab === 'grupos' && narrow && abierto && (
        <>
          <div className="grp-backdrop" onClick={() => setOpenId(null)} />
          <GrupoDetalle g={abierto} metas={metas} acciones={acciones} sheet onCerrarPanel={() => setOpenId(null)} />
        </>
      )}

      {grupoModal && (
        <GrupoModal centroId={id} coaches={data?.coaches || []} salones={data?.salones || []} initial={grupoModal}
          onClose={() => setGrupoModal(null)}
          onSaved={(msg, warn) => { setGrupoModal(null); setStatus(warn ? `✅ ${msg} ⚠️ ${warn}` : `✅ ${msg}`); refresca() }} />
      )}
      {inscribir && (
        <InscribirModal centroId={id} grupos={grupos} grupoPrefill={inscribir.grupoId}
          onClose={() => setInscribir(null)}
          onSaved={(msg) => { setInscribir(null); setStatus('✅ ' + msg); refresca() }} />
      )}
      {editEst && (
        <EstudianteModal centroId={id} est={editEst} grupos={grupos}
          onClose={() => setEditEst(null)}
          onSaved={(msg) => { setEditEst(null); setStatus('✅ ' + msg); refresca() }} />
      )}
      {retiroEst && (
        <RetiroModal centroId={id} est={retiroEst}
          onClose={() => setRetiroEst(null)}
          onSaved={(res) => retiroGuardado(res, retiroEst)} />
      )}
      {itinEdit && (
        <ItinerarioModal centroId={id} g={itinEdit.grupo} nuevaExcepcion={itinEdit.fecha}
          onClose={() => setItinEdit(null)}
          onSaved={(msg) => { setItinEdit(null); setStatus('✅ ' + msg); refresca() }} />
      )}
      {reincEst && (
        <ReincorporarModal centroId={id} est={reincEst} grupos={grupos}
          onClose={() => setReincEst(null)}
          onSaved={(msg) => { setReincEst(null); setStatus('✅ ' + msg); refresca() }} />
      )}
    </div>
  )
}

// Ocupación del grupo contra el cupo máximo, con la marca de la meta (gpn_min).
function OcupacionBar({ n, metas }) {
  const pct = metas.cupoMax ? Math.min(100, (n / metas.cupoMax) * 100) : 0
  const metaPct = metas.cupoMax ? Math.min(100, (metas.gpnMin / metas.cupoMax) * 100) : 0
  const color = n >= metas.gpnMin ? 'var(--ok)' : n > 0 ? 'var(--warn)' : 'var(--bad)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} title={`${n} de ${metas.cupoMax} cupos · meta ${metas.gpnMin} niños`}>
      <div className="bar" style={{ position: 'relative' }}>
        <div className="bar__fill" style={{ width: `${pct}%`, background: color }} />
        <span style={{ position: 'absolute', top: 0, bottom: 0, left: `${metaPct}%`, width: 2, background: 'var(--text-faint)' }} />
      </div>
      <span className="num" style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{n}/{metas.cupoMax}</span>
    </div>
  )
}

// ── Tarjeta de grupo en la lista maestra ────────────────────────────────────
// `llenado` (opcional, solo sección EN LLENADO): countdown de la ventana de
// nuevos, niños contra la meta y ritmo semanal necesario — de llenadoDe().
function GrupoCard({ g, metas, activo, llenado, onAbrir, onEditar }) {
  const st = groupStatus(g, metas.gpnMin)
  return (
    <div data-grupo={g.id} role="button" tabIndex={0} aria-pressed={activo}
      className={`grp-card${activo ? ' grp-card--on' : ''}`}
      onClick={onAbrir}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAbrir() } }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 500, color: 'var(--text)', lineHeight: 1.2 }}>
            Grupo {g.numero}
            <span className="num" style={{ fontSize: 10.5, color: 'var(--text-dim)', marginLeft: 8, letterSpacing: '0.06em' }}>
              {g.itinerario}{g.es_online ? ' · ONLINE' : ''}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{g.coach?.nombre || 'Sin coach'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1, lineHeight: 1.45 }}>{horarioTexto(g.horarios)}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7, flexShrink: 0 }}>
          <span className={`pill ${ESTADO_PILL[st.key] || 'pill--warn'}`} title={ESTADO_TITULO[st.key] || ''}><span className="dot" />{st.label}</span>
          <button className="btn grp-card__edit" style={{ padding: '3px 9px', fontSize: 11 }}
            title={`Editar el grupo ${g.numero}`} onClick={(e) => { e.stopPropagation(); onEditar() }}>✎ Editar</button>
        </div>
      </div>
      <div style={{ marginTop: 11 }}><OcupacionBar n={g.estudiantes.length} metas={metas} /></div>
      {llenado && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline', marginTop: 8, fontSize: 11 }}>
          <span className="num" style={{ fontWeight: 700, color: llenado.ventana.diasHastaLimite != null && llenado.ventana.diasHastaLimite <= 7 ? 'var(--warn)' : 'var(--ts-green)' }}>
            ⏳ {countdownVentana(llenado.ventana)}
          </span>
          <span className="num" style={{ color: 'var(--text-muted)' }}>{llenado.ritmo.ninos}/{llenado.ritmo.meta} niños</span>
          {llenado.ritmo.faltan === 0
            ? <span className="num" style={{ color: 'var(--ok)' }}>meta cumplida</span>
            : llenado.ritmo.ritmoSemanalNecesario != null && (
              <span className="num" style={{ color: 'var(--text-dim)' }}>necesita {llenado.ritmo.ritmoSemanalNecesario}/sem</span>
            )}
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 7 }}>{nivelesTexto(g)}</div>
    </div>
  )
}

// Acciones de un niño dentro del grupo (mismas en tabla y en panel deslizante).
function AccionesNino({ e, acciones }) {
  return (
    <>
      <button className="btn" style={BTN_XS} onClick={() => acciones.editarNino(e)}>Editar</button>
      {e.itinerario === 'TINY' && Number(e.nivel) === 10 && (
        <button className="btn" style={{ ...BTN_XS, color: 'var(--ts-green)', borderColor: 'var(--ts-green-line)' }} onClick={() => acciones.graduar(e)}>Graduar a Kids 5</button>
      )}
      {e.estado === 'activo' ? (
        <button className="btn" style={{ ...BTN_XS, color: 'var(--warn)', borderColor: 'var(--warn-line)' }} onClick={() => acciones.baja(e)}>Baja potencial</button>
      ) : (
        <button className="btn" style={BTN_XS} onClick={() => acciones.revertirBaja(e)}>Sigue activo</button>
      )}
      <button className="btn" style={{ ...BTN_XS, color: 'var(--bad)', borderColor: 'var(--bad-line)' }} onClick={() => acciones.retirar(e)}>Retirar</button>
    </>
  )
}

// ── Detalle de un grupo: roster y acciones por niño ──────────────────────────
// Vive al lado de la lista (sticky) o como panel deslizante en pantallas
// angostas: la cabecera con las acciones queda fija y solo el listado hace scroll.
function GrupoDetalle({ g, metas, acciones, sheet, onCerrarPanel }) {
  const [vista, setVista] = useState('ninos')
  const st = groupStatus(g, metas.gpnMin)
  const n = g.estudiantes.length
  const bajas = g.estudiantes.filter((e) => e.estado === 'baja_potencial').length
  const faltan = Math.max(0, metas.gpnMin - n)
  const activo = g.estado === 'activo'
  // Estado de llenado del grupo (ventana de nuevos + ritmo), derivado en
  // cliente con lib/llenado.mjs — alimenta el chip, el botón de inscribir y
  // el bloque Llenado. Solo tiene sentido en grupos activos.
  const ll = activo ? llenadoDe(g, metas, hoyISO()) : null
  const aceptaNuevos = !!ll?.ventana?.abierta
  const it = g.itinerario_clases
  const idxHoy = it ? semanaEnCurso(it, hoyISO()) : -1
  const TILES = [
    { l: 'Niños', v: n, s: `de ${metas.cupoMax} cupos` },
    { l: 'Meta', v: faltan === 0 ? '✓' : `−${faltan}`, s: faltan === 0 ? `cumple los ${metas.gpnMin}` : `faltan para los ${metas.gpnMin}`, c: faltan === 0 ? 'var(--ok)' : 'var(--warn)' },
    { l: 'Bajas potenciales', v: bajas, s: bajas ? 'se irían el próximo mes' : 'ninguna', c: bajas ? 'var(--warn)' : 'var(--text)' },
  ]
  return (
    <section className={`panel grp-detail${sheet ? ' grp-detail--sheet' : ''}`} aria-label={`Grupo ${g.numero}`}>
      <header className="grp-detail__head">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <h3 className="panel__title" style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              Grupo {g.numero} · {g.itinerario}{g.es_online ? ' · Online' : ''}
              <span className={`pill ${ESTADO_PILL[st.key] || 'pill--warn'}`} title={ESTADO_TITULO[st.key] || ''}><span className="dot" />{st.label}</span>
              {activo && ll && <ChipLlenado v={ll.ventana} programa={g.itinerario} />}
            </h3>
            <p className="h-sub" style={{ marginTop: 5 }}>
              {g.coach ? `Coach: ${g.coach.nombre}` : 'Sin coach asignado'} · {horarioTexto(g.horarios)}
              {g.fecha_apertura ? ` · Apertura: ${fmtDia(g.fecha_apertura)}` : ''}
              {g.fecha_inicio_clases ? ` · Inicia clases: ${fmtDia(g.fecha_inicio_clases)} (entra al cuadro ese mes)` : ''}
            </p>
          </div>
          <button className="btn" style={{ padding: '4px 10px', fontSize: 12, flexShrink: 0 }}
            onClick={onCerrarPanel} title="Cerrar el detalle (Esc)" aria-label="Cerrar el detalle">✕</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <button className="btn btn--primary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => acciones.editarGrupo(g)}>✎ Editar grupo</button>
          {activo && (
            <button className="btn" style={{ padding: '6px 12px', fontSize: 12 }} disabled={!aceptaNuevos}
              title={aceptaNuevos ? undefined : motivoNoAceptaNuevos(ll.ventana)}
              onClick={() => acciones.inscribirEn(g)}>+ Inscribir niño aquí</button>
          )}
          {activo && (
            <button className="btn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => acciones.toggleInscripcion(g)}>
              {g.inscripcion_abierta === false ? 'Abrir inscripciones' : 'Cerrar inscripciones'}
            </button>
          )}
          {activo && <button className="btn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => acciones.linkCoach(g)}>🔗 Link del coach</button>}
          {activo && <button className="btn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => acciones.buscarFusion(g)}>Buscar fusión</button>}
          {activo ? (
            <button className="btn" style={{ padding: '6px 12px', fontSize: 12, color: 'var(--bad)', borderColor: 'var(--bad-line)' }} onClick={() => acciones.cerrar(g)}>Cerrar grupo</button>
          ) : (
            <button className="btn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => acciones.reabrir(g)}>Reabrir</button>
          )}
        </div>
        {/* Dos vistas del grupo: su gente y el itinerario del nivel que cursa */}
        <div className="grp-seg" role="tablist">
          <button role="tab" aria-selected={vista === 'ninos'} className={`grp-seg__btn${vista === 'ninos' ? ' grp-seg__btn--on' : ''}`} onClick={() => setVista('ninos')}>
            Niños <span className="num">{n}</span>
          </button>
          <button role="tab" aria-selected={vista === 'itinerario'} className={`grp-seg__btn${vista === 'itinerario' ? ' grp-seg__btn--on' : ''}`} onClick={() => setVista('itinerario')}>
            Itinerario {it ? <span className="num">nivel {it.nivel}</span> : ''}
          </button>
        </div>
      </header>

      <div className="grp-detail__body">
        {vista === 'itinerario' ? (
          <ItinerarioNivel g={g} it={it} idxHoy={idxHoy} onAjustar={(fecha) => acciones.ajustarItinerario(g, fecha)} />
        ) : (
        <>
        <div className="grp-stats">
          {TILES.map((t) => (
            <div key={t.l}>
              <span className="label">{t.l}</span>
              <div className="num" style={{ fontSize: 21, color: t.c || 'var(--text)', lineHeight: 1.1, marginTop: 4 }}>{t.v}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{t.s}</div>
            </div>
          ))}
          <div style={{ gridColumn: '1 / -1' }}><OcupacionBar n={n} metas={metas} /></div>
        </div>
        {activo && ll && (
          <BloqueLlenado g={g} ll={ll} onExtender={(fecha) => acciones.extenderVentana(g, fecha)} />
        )}
        {g.notas && (
          <div style={{ padding: '10px 18px', fontSize: 12, color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>{g.notas}</div>
        )}
        {it?.semanas?.length > 0 && (
          <button className="grp-hoy" onClick={() => setVista('itinerario')} title="Ver el itinerario completo del nivel">
            <span className="label" style={{ color: 'var(--ts-green)' }}>Esta semana</span>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>
              {idxHoy < 0 ? 'Nivel terminado' : it.semanas[idxHoy].etiqueta}
            </span>
            <span className="num" style={{ color: 'var(--text-dim)', fontSize: 11.5 }}>
              {idxHoy < 0
                ? `cerró ${fmtDia(it.fecha_cierre_estimada)}`
                : `${idxHoy + 1} de ${it.semanas.length} · cierra ${fmtDia(it.fecha_cierre_estimada)}`}
            </span>
            <span style={{ marginLeft: 'auto', color: 'var(--text-dim)', fontSize: 11 }}>Ver itinerario →</span>
          </button>
        )}
        {n === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, display: 'grid', gap: 12, justifyItems: 'center' }}>
            Este grupo no tiene niños activos.
            {activo && <button className="btn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => acciones.inscribirEn(g)}>Inscribir el primero</button>}
          </div>
        ) : sheet ? (
          // En el panel deslizante la tabla no cabe: cada niño va apilado.
          <div>
            {g.estudiantes.map((e) => (
              <div key={e.id} className="grp-roster__item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13.5 }}>{e.nombre}</div>
                    {e.representante && <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{e.representante}</div>}
                  </div>
                  {e.estado === 'baja_potencial'
                    ? <span className="pill pill--warn"><span className="dot" />Baja potencial</span>
                    : <span className="pill pill--ok"><span className="dot" />Activo</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <span className="pill" style={{ background: 'var(--surface-3)', border: '1px solid var(--border-strong)', color: 'var(--text-muted)' }}>{e.itinerario} {e.nivel}</span>
                  <span className="num" style={{ fontSize: 11, color: 'var(--text-dim)' }}>cierra {fmtDia(e.fecha_cierre_nivel)}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>
                  <AccionesNino e={e} acciones={acciones} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table className="table">
            {/* El cierre de nivel va bajo el nivel (y no en columna aparte) para
                que las acciones de cada niño quepan en una sola línea. */}
            <thead><tr>{['Niño', 'Nivel · cierre', 'Estado', ''].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {g.estudiantes.map((e) => (
                <tr key={e.id} style={{ cursor: 'default' }}>
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                    {e.nombre}
                    {e.representante && <div style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-faint)' }}>{e.representante}</div>}
                  </td>
                  <td>
                    <span className="pill" style={{ background: 'var(--surface-3)', border: '1px solid var(--border-strong)', color: 'var(--text-muted)' }}>{e.itinerario} {e.nivel}</span>
                    <div className="num" style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>{fmtDia(e.fecha_cierre_nivel)}</div>
                  </td>
                  <td>
                    {e.estado === 'baja_potencial'
                      ? <span className="pill pill--warn"><span className="dot" />Baja potencial</span>
                      : <span className="pill pill--ok"><span className="dot" />Activo</span>}
                  </td>
                  {/* Sin wrap: las acciones de cada niño van en una sola línea
                      y la tabla estrecha la columna del nombre, no los botones. */}
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                      <AccionesNino e={e} acciones={acciones} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        </>
        )}
      </div>
    </section>
  )
}

// ── Bloque Llenado del panel: ritmo contra la meta + sugerencias del manual ──
// Todo derivado en cliente (lib/llenado.mjs); las sugerencias son SOLO las
// herramientas aprobadas del manual con sus topes — la UI las pinta tal cual,
// nadie inventa promos. "Extender ventana" escribe llenado_extendido_hasta
// vía server action (override consciente con rastro, vence solo).
const ESTADO_RITMO = {
  meta_cumplida: { t: 'Meta cumplida', pill: 'pill--ok' },
  a_ritmo: { t: 'A ritmo', pill: 'pill--ok' },
  apretado: { t: 'Apretado', pill: 'pill--warn' },
  vencida: { t: 'Ventana vencida', pill: 'pill--bad' },
  sin_datos: { t: 'Sin datos aún', pill: 'pill--warn' },
}

function BloqueLlenado({ g, ll, onExtender }) {
  const [extiendo, setExtiendo] = useState(false)
  const [fechaExt, setFechaExt] = useState('')
  const [guardando, setGuardando] = useState(false)
  const { ventana: v, ritmo: r } = ll
  const hoy = hoyISO()
  const palancaAbierta = g.inscripcion_abierta !== false
  // Extender solo aplica donde el manual fija semana límite (Tiny/Kids con
  // itinerario); en Kinder o sin itinerario no hay ventana que extender.
  const extensible = palancaAbierta && !!SEMANA_LIMITE_NUEVOS[String(g.itinerario || '').toUpperCase()] && v.razon !== 'exento' && v.razon !== 'sin_itinerario_valido'
  const extensionVigente = isoDia(g.llenado_extendido_hasta) && isoDia(g.llenado_extendido_hasta) >= hoy
  const sugerencias = palancaAbierta ? sugerenciasLlenado(r, g) : []
  const est = ESTADO_RITMO[r.estado] || null

  async function guardar(fecha) {
    setGuardando(true)
    const ok = await onExtender(fecha)
    setGuardando(false)
    if (ok) { setExtiendo(false); setFechaExt('') }
  }

  return (
    <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="label" style={{ color: 'var(--ts-green)' }}>Llenado</span>
        {est && <span className={`pill ${est.pill}`} style={{ fontSize: 10 }}><span className="dot" />{est.t}</span>}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
        <b className="num" style={{ color: 'var(--text)' }}>{r.ninos}/{r.meta}</b> niños contra la meta
        {r.faltan > 0 ? <> · faltan <b className="num" style={{ color: 'var(--warn)' }}>{r.faltan}</b></> : ' · meta cumplida'}
        {r.diasParaInicio != null && <> · el nivel inicia en <b className="num" style={{ color: 'var(--text)' }}>{r.diasParaInicio} día{r.diasParaInicio === 1 ? '' : 's'}</b></>}
        {v.fechaLimite
          ? <> · acepta nuevos hasta el <b className="num" style={{ color: v.razon === 'vencida' ? 'var(--bad)' : 'var(--text)' }}>{fmtDia(v.fechaLimite)}</b>{v.razon === 'extendida' ? ' (ventana extendida)' : ''}</>
          : <> · sin fecha límite de nuevos ({v.razon === 'sin_itinerario_valido' ? 'itinerario sin semanas del libro' : 'exento del manual'})</>}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        Ritmo semanal: necesita <b className="num" style={{ color: 'var(--text)' }}>{r.ritmoSemanalNecesario == null ? '—' : r.ritmoSemanalNecesario}</b>/sem ·
        lleva <b className="num" style={{ color: 'var(--text)' }}>{r.ritmoSemanalObservado === 'sin_datos' ? 'sin datos' : `~${r.ritmoSemanalObservado}`}</b>/sem
        <span style={{ color: 'var(--text-dim)' }}> (aprox. con las inscripciones de los últimos 14 días)</span>
      </div>
      {sugerencias.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: 'var(--text-dim)', display: 'grid', gap: 3 }}>
          {sugerencias.map((s, i) => (
            <li key={i}>{s.texto}{s.tope ? <b style={{ color: 'var(--text-muted)' }}> ({s.tope})</b> : null}</li>
          ))}
        </ul>
      )}
      {extensible && (
        extiendo ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" className="input" style={{ width: 160 }} value={fechaExt}
              min={sumaDias(hoy, 1)} max={sumaDias(hoy, 56)}
              onChange={(e) => setFechaExt(e.target.value)} />
            <button className="btn btn--primary" style={BTN_XS} disabled={guardando || !fechaExt} onClick={() => guardar(fechaExt)}>
              {guardando ? 'Guardando…' : 'Extender'}
            </button>
            <button className="btn" style={BTN_XS} onClick={() => { setExtiendo(false); setFechaExt('') }}>Cancelar</button>
            <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>máx. 8 semanas · queda registrado y vence solo</span>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" style={BTN_XS} title="Permite niños nuevos más allá de la semana límite del manual (queda registrado; vence solo)" onClick={() => setExtiendo(true)}>Extender ventana</button>
            {extensionVigente && (
              <button className="btn" style={BTN_XS} disabled={guardando} onClick={() => guardar(null)}>
                {guardando ? 'Guardando…' : 'Quitar extensión'}
              </button>
            )}
          </div>
        )
      )}
    </div>
  )
}

// ── Itinerario del nivel: línea de tiempo visual + ajustes ───────────────────
// La plantilla de semanas es la base de franquicia; lo que se ajusta por grupo
// es cómo cae en SU calendario (nivel que cursa, fecha de inicio y clases
// suspendidas). Cada suspensión corre el plan y mueve el cierre estimado.
const TIPO_ESTILO = {
  induccion: { bg: 'var(--surface-3)', line: 'var(--border-strong)', fg: 'var(--text-muted)' },
  clase: { bg: 'var(--surface-3)', line: 'var(--border-strong)', fg: 'var(--text-muted)' },
  evaluacion: { bg: 'var(--warn-bg)', line: 'var(--warn-line)', fg: 'var(--warn)' },
  mental: { bg: 'var(--ts-green-soft)', line: 'var(--ts-green-line)', fg: 'var(--ts-green)' },
  cierre: { bg: 'var(--bad-bg)', line: 'var(--bad-line)', fg: 'var(--bad)' },
}
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const mesDe = (f) => {
  const [y, m] = String(f).slice(0, 10).split('-').map(Number)
  return `${MESES[(m || 1) - 1]} ${y}`
}
const diaMes = (f) => String(f).slice(8, 10) + '/' + String(f).slice(5, 7)

function ItinerarioNivel({ g, it, idxHoy, onAjustar }) {
  if (!it?.semanas?.length) {
    return (
      <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, display: 'grid', gap: 12, justifyItems: 'center' }}>
        Este grupo todavía no tiene itinerario.
        <span style={{ fontSize: 12, maxWidth: 340, lineHeight: 1.6 }}>
          Se arma solo con la <b style={{ color: 'var(--text)' }}>fecha de inicio de clases</b> y el horario del grupo: ponlos y aquí verás las 22 semanas del nivel.
        </span>
        <button className="btn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => onAjustar()}>Armar itinerario</button>
      </div>
    )
  }
  const total = it.semanas.length
  const hechas = idxHoy < 0 ? total : idxHoy
  const pct = Math.round((hechas / total) * 100)
  // Agrupa las semanas por mes calendario para que el plan se lea como agenda.
  const porMes = []
  it.semanas.forEach((s, i) => {
    const mes = mesDe(s.fechas[0])
    if (!porMes.length || porMes[porMes.length - 1].mes !== mes) porMes.push({ mes, filas: [] })
    porMes[porMes.length - 1].filas.push({ s, i })
  })

  return (
    <div>
      <div className="itin-head">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <span className="label">Itinerario del nivel</span>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--text)', lineHeight: 1.15, marginTop: 3 }}>
              {g.itinerario} · Nivel {it.nivel}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 3 }}>
              {fmtDia(it.fecha_inicio)} → {fmtDia(it.fecha_cierre_estimada)} · {total} semanas
              {it.pais === 'VE' || it.con_feriados === false ? ' · fechas patrias de Venezuela' : ''}
            </div>
          </div>
          <button className="btn btn--primary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => onAjustar()}>✎ Ajustar itinerario</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 5 }}>
            <span>{idxHoy < 0 ? 'Nivel terminado' : `En curso: ${it.semanas[idxHoy].etiqueta} (${idxHoy + 1} de ${total})`}</span>
            <span className="num">{pct}%</span>
          </div>
          <div className="bar"><div className="bar__fill" style={{ width: `${pct}%`, background: 'var(--ts-green)' }} /></div>
        </div>
      </div>

      {/* Línea de tiempo: una casilla por semana, con hoy marcado */}
      <div className="itin-tl">
        {it.semanas.map((s, i) => {
          const est = TIPO_ESTILO[s.tipo] || TIPO_ESTILO.clase
          const pasada = idxHoy < 0 || i < idxHoy
          const hoy = i === idxHoy
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
            <i style={{ background: (TIPO_ESTILO[k] || TIPO_ESTILO.clase).bg, borderColor: (TIPO_ESTILO[k] || TIPO_ESTILO.clase).line }} />{v.label}
          </span>
        ))}
      </div>

      {/* Agenda mes a mes */}
      {porMes.map(({ mes, filas }) => (
        <div key={mes}>
          <div className="itin-mes">{mes}</div>
          {filas.map(({ s, i }) => {
            const est = TIPO_ESTILO[s.tipo] || TIPO_ESTILO.clase
            const pasada = idxHoy < 0 || i < idxHoy
            const hoy = i === idxHoy
            return (
              <div key={i} className={`itin-fila${hoy ? ' itin-fila--hoy' : ''}`} style={pasada ? { opacity: 0.55 } : undefined}>
                <span className="itin-fila__chip" style={{ background: est.bg, borderColor: est.line, color: est.fg }}>{s.corto}</span>
                <span style={{ color: hoy ? 'var(--text)' : 'var(--text-muted)', fontWeight: hoy ? 600 : 400 }}>{s.etiqueta}</span>
                {hoy && <span className="pill pill--ok" style={{ fontSize: 10 }}><span className="dot" />Hoy</span>}
                <span className="num itin-fila__fechas">
                  {(s.saltadas || []).map((k) => (
                    <span key={k.fecha} className="itin-fecha itin-fecha--out" title={`${fmtDia(k.fecha)}: ${k.motivo} — por eso corrió el plan`}>
                      {diaMes(k.fecha)}
                    </span>
                  ))}
                  {s.fechas.map((f) => (
                    <button key={f} className="itin-fecha" title={`Suspender la clase del ${fmtDia(f)} (corre el plan)`} onClick={() => onAjustar(f)}>
                      {diaMes(f)}
                    </button>
                  ))}
                </span>
              </div>
            )
          })}
        </div>
      ))}

      <div style={{ padding: '12px 18px', display: 'grid', gap: 8 }}>
        {it.clases_suspendidas?.length > 0 && (
          <div style={{ fontSize: 11.5, color: 'var(--warn)' }}>
            ⏸ Clases suspendidas del grupo: {it.clases_suspendidas.map((c) => `${fmtDia(c.fecha)}${c.motivo ? ` (${c.motivo})` : ''}`).join(' · ')}
          </div>
        )}
        {it.feriados_saltados?.length > 0 && (
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
            🎌 Sin clases por feriados y vacaciones del manual: {it.feriados_saltados.map(fmtDia).join(' · ')}
          </div>
        )}
        {it.inicio_siguiente_nivel && (
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
            ➡️ El nivel {it.nivel + 1} arrancaría el <b style={{ color: 'var(--text)' }}>{fmtDia(it.inicio_siguiente_nivel)}</b>
            {Number(it.nivel) % 2 === 0 ? ' (incluye la semana de vacaciones de fin de ciclo)' : ''}.
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tab Fusiones: bajo meta, destinos por grupo y plan sugerido del mes ──────
function TabFusiones({ grupos, metas, fus, fusLoading, origenId, setOrigenId, onAplicar, busyFusion }) {
  const origen = origenId ? grupos.find((g) => String(g.id) === String(origenId)) : null
  const destinos = origen ? sugerenciasPara(origen, grupos, { MIN: metas.gpnMin, MAX: metas.cupoMax }) : []
  return (
    <div>
      <div className="card" style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-dim)', marginBottom: 16, lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--ts-green)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>Reglas del manual:</strong> Exentos: Kinder, Online y grupos base nivel 1–2. El manual permite fusionar desde nivel 3 (Tiny–Tiny ideal desde nivel 4).
      </div>

      {origen && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel__head">
            <h3 className="panel__title">Destinos para el grupo {origen.numero} ({origen.estudiantes.length} niños)</h3>
            <button className="btn" style={BTN_XS} onClick={() => setOrigenId(null)}>✕ Cerrar</button>
          </div>
          <div style={{ padding: 16, display: 'grid', gap: 12 }}>
            {destinos.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, padding: 10 }}>Sin grupos candidatos para fusionar con este grupo.</div>
            ) : destinos.slice(0, 6).map((s) => (
              <FusionCard key={s.grupo.id} from={origen} to={s.grupo} analisis={s.analisis} onAplicar={onAplicar} busyFusion={busyFusion} />
            ))}
          </div>
        </div>
      )}

      {fusLoading || !fus ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>Calculando fusiones…</div>
      ) : (
        <>
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="panel__head"><h3 className="panel__title">Grupos bajo meta ({fus.bajoMeta.length})</h3></div>
            {fus.bajoMeta.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>Ningún grupo por debajo de la meta de {metas.gpnMin} niños. 💪</div>
            ) : (
              <table className="table">
                <thead><tr>{['Grupo', 'Niños', 'Coach', 'Horario', ''].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {fus.bajoMeta.map((g) => (
                    <tr key={g.id} style={{ cursor: 'default' }}>
                      <td style={{ fontWeight: 600, color: 'var(--text)' }}>Grupo {g.numero} · {g.itinerario}</td>
                      <td className="num" style={{ color: 'var(--bad)', fontWeight: 700 }}>{g.estudiantes.length}/{metas.gpnMin}</td>
                      <td style={{ fontSize: 12 }}>{g.coach?.nombre || 'Sin coach'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{horarioTexto(g.horarios)}</td>
                      <td style={{ textAlign: 'right' }}><button className="btn" style={BTN_XS} onClick={() => setOrigenId(g.id)}>Ver destinos</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="panel">
            <div className="panel__head"><h3 className="panel__title">Fusiones sugeridas del mes</h3></div>
            <div style={{ padding: 16, display: 'grid', gap: 12 }}>
              {fus.sugerencias.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, padding: 10 }}>Sin fusiones sugeridas: no hay pares viables este mes.</div>
              ) : fus.sugerencias.map((p) => (
                <FusionCard key={`${p.from.id}-${p.to.id}`} from={p.from} to={p.to} analisis={p.analisis} onAplicar={onAplicar} busyFusion={busyFusion} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Por dónde va el grupo en su planificación (semana en curso del itinerario).
function posicionPlan(g) {
  const it = g.itinerario_clases
  if (!it?.semanas?.length) return null
  const idx = semanaEnCurso(it, hoyISO())
  const sem = idx >= 0 ? it.semanas[idx] : null
  return {
    corto: sem?.corto || '—',
    etiqueta: sem?.etiqueta || (idx < 0 ? 'aún no inicia' : ''),
    nivel: it.nivel,
    cierre: it.fecha_cierre_estimada,
  }
}

// Resumen de niveles de los niños de un grupo: "3× T7 · 2× T8 · 1× K6".
const nivelCorto = (e) => `${e.itinerario === 'KINDER' ? 'Kd' : e.itinerario === 'KIDS' ? 'K' : 'T'}${e.nivel}`
function resumenNiveles(estudiantes) {
  const cnt = {}
  for (const e of estudiantes || []) cnt[nivelCorto(e)] = (cnt[nivelCorto(e)] || 0) + 1
  return Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n}× ${k}`).join(' · ')
}

function FusionCard({ from, to, analisis, onAplicar, busyFusion }) {
  const banda = scoreBand(analisis.score, analisis.blocked)
  const key = `${from.id}-${to.id}`
  const K_ICON = { ok: '✓', mb: '△', no: '✕' }
  const K_COLOR = { ok: 'var(--ok)', mb: 'var(--warn)', no: 'var(--bad)' }
  const planFrom = posicionPlan(from)
  const planTo = posicionPlan(to)
  // Aviso de planificación: fusionar niños que van por semanas distintas del
  // plan obliga a nivelar contenido — se muestra siempre que se sepa.
  let planAviso = null
  if (planFrom && planTo) {
    planAviso = planFrom.nivel === planTo.nivel && planFrom.corto === planTo.corto
      ? { k: 'ok', t: `Van por la misma semana del plan (${planFrom.corto})` }
      : { k: 'mb', t: `Planificación desfasada: G${from.numero} va por ${planFrom.corto} (nivel ${planFrom.nivel}), G${to.numero} por ${planTo.corto} (nivel ${planTo.nivel})` }
  }
  const GrupoLado = ({ g, plan, titulo }) => (
    <div style={{ flex: '1 1 220px', minWidth: 0 }}>
      <div className="label" style={{ marginBottom: 4 }}>{titulo}: Grupo {g.numero}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        Niveles: <b style={{ color: 'var(--text)' }}>{resumenNiveles(g.estudiantes) || 'sin niños'}</b>
        {plan ? <> · va por <b style={{ color: 'var(--ts-green)' }}>{plan.corto}</b>{plan.cierre ? ` · cierra ~${fmtDia(plan.cierre)}` : ''}</> : ' · sin itinerario generado'}
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
        {(g.estudiantes || []).map((e) => (
          <span key={e.id} title={`${e.nombre} · ${e.itinerario} nivel ${e.nivel}${e.fecha_cierre_nivel ? ` · cierra ${fmtDia(e.fecha_cierre_nivel)}` : ''}`}
            style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 'var(--r-pill)', background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {e.nombre.split(' ')[0]} <b style={{ color: 'var(--text)' }}>{nivelCorto(e)}</b>
          </span>
        ))}
      </div>
    </div>
  )
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, color: 'var(--text)' }}>
          Grupo {from.numero} ({from.estudiantes.length}) → Grupo {to.numero} ({to.estudiantes.length})
          <span style={{ color: 'var(--text-dim)', fontSize: 13 }}> · quedaría en {analisis.newN}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`pill ${BANDA_PILL[banda]}`}><span className="dot" />{banda} · {analisis.score} pts</span>
          {!analisis.blocked && (
            <button className="btn btn--primary" style={{ padding: '6px 14px', fontSize: 12 }} disabled={busyFusion === key} onClick={() => onAplicar(from, to)}>
              {busyFusion === key ? 'Aplicando…' : 'Aplicar fusión'}
            </button>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        {planAviso && (
          <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 'var(--r-pill)', border: '1px solid var(--border-strong)', color: 'var(--text-muted)' }}>
            <span style={{ color: K_COLOR[planAviso.k], marginRight: 5 }}>{K_ICON[planAviso.k]}</span>{planAviso.t}
          </span>
        )}
        {analisis.reasons.map((r, i) => (
          <span key={i} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 'var(--r-pill)', border: '1px solid var(--border-strong)', color: 'var(--text-muted)' }}>
            <span style={{ color: K_COLOR[r.k], marginRight: 5 }}>{K_ICON[r.k]}</span>{r.t}
          </span>
        ))}
      </div>
      {/* Cada niño con su nivel y por dónde va cada grupo en la planificación:
          lo que el administrador necesita ver ANTES de fusionar. */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        <GrupoLado g={from} plan={planFrom} titulo="Se mueve" />
        <GrupoLado g={to} plan={planTo} titulo="Recibe" />
      </div>
    </div>
  )
}

// ── Tab Horarios: calendario del inventario por salón ───────────────────────
// El inventario ALOHA es el bloque de horario: ventana 12:30–8:30 pm, 15 min
// entre clases, sesiones de 1 h o 2 h. Los huecos verdes se pueden clicar
// para aperturar un grupo con día/hora/salón prellenados.
const ROW_H = 26 // px por bloque de 30 min

const ETIQUETA_COLOR = { Caliente: 'var(--ok)', Buena: 'var(--ok)', Media: 'var(--warn)', 'Difícil': 'var(--bad)', 'Sin historial': 'var(--text-dim)' }
const ETIQUETA_EMOJI = { Caliente: '🔥 ', Buena: '', Media: '', 'Difícil': '⚠️ ', 'Sin historial': '' }

// Liberación estimada del bloque de un grupo: su itinerario da la fecha de fin
// del nivel; si el nivel dominante es el ÚLTIMO del programa (TINY 10, KIDS 8,
// KINDER 3), al cierre el grupo se gradúa y su bloque de horario queda libre —
// eso permite mercadear ese horario con meses de antelación.
function liberacionDe(grupo) {
  const cierre = grupo.itinerario_clases?.fecha_cierre_estimada
  if (!cierre || grupo.es_online) return null
  const niveles = (grupo.estudiantes || []).map((e) => Number(e.nivel)).filter(Boolean)
  if (!niveles.length) return { cierre, libera: false }
  const conteo = {}
  for (const n of niveles) conteo[n] = (conteo[n] || 0) + 1
  const moda = Number(Object.entries(conteo).sort((a, b) => b[1] - a[1])[0][0])
  return { cierre, libera: moda >= (NIVEL_MAX[grupo.itinerario] || 99) }
}

function TabHorarios({ centroId, grupos, coaches, salones, retirados, reservas, onAbrirGrupo, onChanged, setStatus }) {
  const [dia, setDia] = useState(() => {
    const d = new Date().getDay()
    return d >= 1 && d <= 6 ? d : 1
  })
  const [verGuia, setVerGuia] = useState(false)
  const [reservaModal, setReservaModal] = useState(null)
  const [borrando, setBorrando] = useState(false)
  // La clase de prueba entra al calendario como pseudo-grupo: así ocupa salón,
  // respeta el buffer y desaparece de los huecos sin tocar el motor.
  const pseudoReservas = reservasComoGrupos(reservas || [])
  const conPrueba = diasConPrueba(reservas || [])
  const activos = [...grupos.filter((g) => g.estado === 'activo'), ...pseudoReservas]
  const recos = recomendacionesApertura(grupos, salones, coaches, retirados, 4)
  const modelo = estadoModelo(grupos, salones)
  const inv = inventarioSemanal(activos, salones)
  const cols = calendarioDia(activos, salones, dia)
  const sinSalon = sinSalonDia(activos, dia)
  const sinHorario = activos.filter((g) => !(g.horarios || []).length)

  const aperturaDia = aperturaDe(dia)
  const altura = ((CIERRE_MIN - aperturaDia) / SLOT_MIN) * ROW_H
  const topDe = (min) => ((min - aperturaDia) / SLOT_MIN) * ROW_H
  const horasEje = []
  for (let m = aperturaDia; m <= CIERRE_MIN; m += 60) horasEje.push(m)

  // La clase de prueba del día seleccionado (una por día, es la sala que el
  // administrador aparta para recibir a los papás).
  const reservaDia = (reservas || []).find((r) => Number(r.dia) === dia) || null

  async function quitarReserva() {
    if (!reservaDia) return
    setBorrando(true)
    const res = await eliminarReserva(centroId, reservaDia.id)
    setBorrando(false)
    if (res.error) setStatus('❌ ' + res.error)
    else { setStatus(`✅ Clase de prueba del ${DIAS[dia].toLowerCase()} eliminada — ese día vuelve a la parrilla normal.`); onChanged() }
  }

  const clickHueco = (salon, h) => {
    // Primero intenta encajar una unidad del modelo (p. ej. el par Lun+Mié
    // completo); si no cabe ninguna, cae al bloque libre en hora vendible.
    const unidad = unidadParaHueco(grupos, salones, dia, salon.id, h)
    if (unidad) {
      onAbrirGrupo({ horarios: unidad.sesiones.map((ses) => ({ dia: ses.dia, hora_inicio: aHora(ses.inicio), hora_fin: aHora(ses.fin), salon_id: String(ses.salon_id) })) })
      return
    }
    const ini = inicioVendible(dia, h)
    const dur = h.fin - ini >= 120 ? 120 : 60
    onAbrirGrupo({ dia, hora_inicio: aHora(ini), hora_fin: aHora(ini + dur), salon_id: String(salon.id) })
  }

  if (!salones.filter((s) => s.activo).length) return (
    <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
      Este centro no tiene salones registrados. Créalos en la pestaña “Coaches y salones” para ver el calendario del inventario.
    </div>
  )

  return (
    <div>
      {/* Métricas del inventario semanal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 14 }}>
        <div className="kpi" style={{ padding: '14px 16px' }}>
          <div className="kpi__top"><span className="label">Inventario vendible ocupado</span></div>
          <div className="kpi__value num" style={{ fontSize: 26 }}>{inv.pctOcupacion}%</div>
          <div className="kpi__sub">{inv.ocupadoHoras} h de {inv.capacidadHoras} h vendibles ({inv.capacidadTotalHoras} h operativas)</div>
        </div>
        <div className="kpi" style={{ padding: '14px 16px' }}>
          <div className="kpi__top"><span className="label">Horas vendibles libres</span></div>
          <div className="kpi__value num" style={{ fontSize: 26 }}>{inv.libreHoras}</div>
          <div className="kpi__sub">Semana 3:00–8:30 pm · sábado 9 am–5 pm</div>
        </div>
        <div className="kpi" style={{ padding: '14px 16px' }}>
          <div className="kpi__top"><span className="label">Cupos del modelo</span></div>
          <div className="kpi__value num" style={{ fontSize: 26, color: modelo.cuposLibres > 0 ? 'var(--ok)' : 'var(--text)' }}>{modelo.cuposLibres}</div>
          <div className="kpi__sub">{modelo.gruposActivos} de {modelo.capacidadGrupos} grupos del modelo · capacidad {modelo.capacidadNinos} niños — ahí crece el centro</div>
        </div>
      </div>

      {/* Bloques que se van a liberar: el itinerario da la fecha de fin del
          grupo → mercadear el horario ANTES de que quede vacío. */}
      {(() => {
        const porLiberarse = activos
          .map((g) => ({ g, lib: liberacionDe(g) }))
          .filter((x) => x.lib?.libera)
          .sort((a, b) => String(a.lib.cierre).localeCompare(String(b.lib.cierre)))
        if (!porLiberarse.length) return null
        const menosDias = (f, d) => {
          const t = new Date(`${f}T00:00:00Z`).getTime() - d * 86400000
          return new Date(t).toISOString().slice(0, 10)
        }
        return (
          <div className="panel" style={{ marginBottom: 14, borderLeft: '3px solid var(--warn)' }}>
            <div className="panel__head">
              <h3 className="panel__title">📣 Bloques por liberarse — mercadear con antelación</h3>
              <span className="label">Grupos en su último nivel: al cierre, su horario queda libre</span>
            </div>
            <table className="table">
              <thead><tr>{['Grupo', 'Horario', 'Se libera', 'Mercadear desde'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {porLiberarse.map(({ g, lib }) => (
                  <tr key={g.id} style={{ cursor: 'default' }}>
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>Grupo {g.numero} <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-dim)' }}>{g.itinerario} · {g.estudiantes.length} niños · {g.coach?.nombre || 'sin coach'}</span></td>
                    <td style={{ fontSize: 12 }}>{horarioTexto(g.horarios)}</td>
                    <td className="num" style={{ fontSize: 12, color: 'var(--warn)', fontWeight: 700 }}>{fmtDia(lib.cierre)}</td>
                    <td className="num" style={{ fontSize: 12 }}>{fmtDia(menosDias(lib.cierre, 60))} <span style={{ color: 'var(--text-dim)' }}>(2 meses antes)</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })()}

      {/* Recomendación: dónde abrir el próximo grupo, según la estadística del centro */}
      {recos.length > 0 && (
        <div className="panel" style={{ marginBottom: 14 }}>
          <div className="panel__head">
            <div>
              <div className="panel__title">Dónde abrir el próximo grupo</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>
                Siempre optimizando hacia el modelo de horarios del negocio: {RESUMEN_MODELO}. Rankeado con la estadística del propio centro.
              </div>
            </div>
            <button className="btn" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setVerGuia(!verGuia)}>
              {verGuia ? 'Ocultar guía' : 'Guía para franjas difíciles'}
            </button>
          </div>
          <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 10 }}>
            {recos.map((r, i) => (
              <div key={`${r.tipo}-${r.sesiones[0].inicio}-${r.salon.id}`} className="card" style={{ padding: 12, borderLeft: `3px solid ${ETIQUETA_COLOR[r.etiqueta]}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{i + 1}. {r.titulo}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: ETIQUETA_COLOR[r.etiqueta], whiteSpace: 'nowrap' }}>{ETIQUETA_EMOJI[r.etiqueta]}{r.etiqueta}</span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>
                  {r.salon.nombre} · {r.tipo === 'LM' || r.tipo === 'MJ' ? '1 h + 1 h (par del modelo)' : 'bloque de 2 h'}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 5, minHeight: 28 }}>{r.razon}</div>
                <div style={{ fontSize: 11, color: r.coachesLibres.length ? 'var(--ok)' : 'var(--warn)', marginTop: 4 }}>
                  {r.coachesLibres.length ? `Coaches libres: ${r.coachesLibres.map((c) => c.nombre.split(' ')[0]).join(', ')}` : 'Sin coach libre en esas franjas'}
                </div>
                <button className="btn btn--primary" style={{ marginTop: 8, padding: '5px 12px', fontSize: 12 }}
                  onClick={() => onAbrirGrupo({ horarios: r.horariosForm })}>
                  Aperturar aquí
                </button>
              </div>
            ))}
          </div>
          {verGuia && (
            <div style={{ padding: '0 16px 14px' }}>
              <div className="card" style={{ padding: 14, borderLeft: '3px solid var(--warn)' }}>
                <div className="label" style={{ color: 'var(--warn)', marginBottom: 8 }}>Franjas difíciles de llenar — guía del manual</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--text-muted)', display: 'grid', gap: 5 }}>
                  {GUIA_FRANJAS_DIFICILES.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
                  Fuentes: “Establecimiento de Calendarios” y “Protocolo de Salida — herramientas de no salida” del manual. Toda promoción nueva debe aprobarla la Administración General (regla de franquicia).
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selector de día + reglas */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {DIAS_OPERATIVOS.map((d) => (
            <button key={d} className={`btn${dia === d ? ' btn--primary' : ''}`} style={{ padding: '5px 12px', fontSize: 12 }}
              onClick={() => setDia(d)}>{DIAS[d].slice(0, 3)}</button>
          ))}
        </div>
        {reservaDia ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span className="pill pill--warn" style={{ whiteSpace: 'nowrap' }}>🎯 Clase de prueba {aHora12(aMinutos(reservaDia.hora_inicio))}–{aHora12(aMinutos(reservaDia.hora_fin))}</span>
            <button className="btn" style={BTN_XS} onClick={() => { setStatus(''); setReservaModal(reservaDia) }}>Editar</button>
            <button className="btn" style={BTN_XS} disabled={borrando} onClick={quitarReserva}>{borrando ? 'Quitando…' : 'Quitar'}</button>
          </div>
        ) : (
          <button className="btn" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => { setStatus(''); setReservaModal({ dia }) }}>
            🎯 Clase de prueba este día
          </button>
        )}
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          Ventana {aHora12(aperturaDia)}–8:30 pm · 15 min entre clases · el programa son 2 h semanales (2 h un día o 1 h en dos días) · toca un bloque verde para aperturar ahí
        </span>
      </div>

      {/* Regla del negocio: el día de clase de prueba no lleva grupos de 1 h */}
      {reservaDia && dia !== 6 && (
        <div className="card" style={{ padding: '9px 14px', marginBottom: 12, borderLeft: '3px solid var(--warn)', fontSize: 12.5, color: 'var(--text-muted)' }}>
          <b style={{ color: 'var(--warn)' }}>Día de clase de prueba:</b> este día no se arma con grupos de 1 h — los bloques son de <b>2 h desde las 4:30 pm</b>, y la prueba va antes. Tampoco abre la zona Kinder.
        </div>
      )}

      {/* Calendario del día: columna por salón */}
      <div className="card" style={{ padding: 14, overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `52px repeat(${cols.length}, minmax(170px, 1fr))`, gap: 8, minWidth: 52 + cols.length * 178 }}>
          <div />
          {cols.map(({ salon }) => (
            <div key={salon.id} className="label" style={{ textAlign: 'center', color: 'var(--text-muted)', paddingBottom: 4 }}>
              {salon.nombre}{salon.es_hibrido ? ' · híbrido' : ''}
            </div>
          ))}

          {/* Eje de horas */}
          <div style={{ position: 'relative', height: altura }}>
            {horasEje.map((m) => (
              <div key={m} className="num" style={{ position: 'absolute', top: topDe(m) - 7, right: 6, fontSize: 9.5, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{aHora12(m)}</div>
            ))}
          </div>

          {cols.map(({ salon, sesiones, huecos }) => {
            const unidadesSalon = unidadesLibres(activos, [salon])
            const slotsLibres = slotsDelDia(dia, conPrueba.has(dia)).filter((sl) => huecos.some((h) => sl.inicio >= h.inicio && sl.fin <= h.fin))
            return (
            <div key={salon.id} style={{
              position: 'relative', height: altura, borderRadius: 'var(--r-sm)',
              background: `repeating-linear-gradient(to bottom, var(--surface-2), var(--surface-2) ${ROW_H * 2 - 1}px, var(--border) ${ROW_H * 2 - 1}px, var(--border) ${ROW_H * 2}px)`,
              border: '1px solid var(--border)',
            }}>
              {sesiones.map(({ grupo, horario, inicio, fin }) => {
                const st = groupStatus(grupo, 8)
                const alerta = st.key === 'bajo'
                const corto = fin - inicio <= 60 // sesión de 1 h: layout compacto para que nada se corte
                if (grupo.es_reserva) {
                  const rol = ROL_LABEL[horario.rol] || horario.rol || ''
                  const coachR = coaches.find((c) => String(c.id) === String(grupo.coach_id))
                  return (
                    <div key={`${grupo.id}-${horario.id}`} title={`Clase de prueba · ${rol} · ${coachR ? coachR.nombre : (ROL_PIDE_COACH[horario.rol] ? 'sin coach asignado' : 'la recibe la administración')} · ${aHora12(inicio)}–${aHora12(fin)} · este salón no se puede usar para grupos`}
                      style={{
                        position: 'absolute', left: 4, right: 4, top: topDe(inicio) + 1, height: topDe(fin) - topDe(inicio) - 2,
                        background: 'var(--warn-bg, rgba(245,158,11,0.14))', border: '1px solid var(--warn)',
                        borderLeft: '3px solid var(--warn)', borderRadius: 'var(--r-sm)',
                        padding: '5px 8px', overflow: 'hidden', fontSize: 11.5,
                      }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        🎯 Clase de prueba
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 10.5, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {rol}{coachR ? ` · ${coachR.nombre.split(' ')[0]}` : (ROL_PIDE_COACH[horario.rol] ? ' · sin coach' : '')}
                      </div>
                      <div className="num" style={{ color: 'var(--text-dim)', fontSize: 10 }}>{aHora12(inicio)}–{aHora12(fin)}</div>
                    </div>
                  )
                }
                const lib = liberacionDe(grupo)
                const tituloLib = lib?.cierre ? ` · cierra nivel ~${fmtDia(lib.cierre)}${lib.libera ? ' y SE LIBERA el bloque (último nivel)' : ''}` : ''
                return (
                  <div key={`${grupo.id}-${horario.id}`} title={`Grupo ${grupo.numero} · ${grupo.coach?.nombre || 'sin coach'} · ${grupo.itinerario} · ${grupo.estudiantes.length} niños · ${aHora12(inicio)}–${aHora12(fin)}${tituloLib}`}
                    style={{
                      position: 'absolute', left: 4, right: 4, top: topDe(inicio) + 1, height: topDe(fin) - topDe(inicio) - 2,
                      background: 'var(--surface-1)', border: '1px solid var(--border-strong)',
                      borderLeft: `3px solid ${alerta ? 'var(--bad)' : 'var(--ts-green)'}`,
                      borderRadius: 'var(--r-sm)', padding: corto ? '3px 8px' : '5px 8px', overflow: 'hidden', fontSize: 11.5,
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, minWidth: 0 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Grupo {grupo.numero}</span>
                      <span className="num" style={{ color: alerta ? 'var(--bad)' : 'var(--ok)', flexShrink: 0 }}>{grupo.estudiantes.length}</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontSize: corto ? 10.5 : 11.5 }}>
                      {grupo.coach?.nombre?.split(' ')[0] || 'Sin coach'}{corto ? ` · ${aHora12(inicio)}` : ` · ${grupo.itinerario}`}
                    </div>
                    {!corto && (
                      <div className="num" style={{ color: 'var(--text-dim)', fontSize: 10 }}>
                        {aHora12(inicio)}–{aHora12(fin)}
                        {lib?.libera && <span style={{ color: 'var(--warn)', fontWeight: 700 }}> · 📣 libre {fmtDia(lib.cierre)}</span>}
                      </div>
                    )}
                  </div>
                )
              })}
              {/* Zonas muertas (no se venden) en gris */}
              {huecos.flatMap((h) => {
                const [, vf] = ventanaVendible(dia)
                const limiteMuerto = dia === 6 ? aperturaDia : KINDER_INICIO
                const muertas = []
                if (Math.min(h.fin, limiteMuerto) - h.inicio > 0) muertas.push({ inicio: h.inicio, fin: Math.min(h.fin, limiteMuerto) })
                if (h.fin - Math.max(h.inicio, vf) > 0) muertas.push({ inicio: Math.max(h.inicio, vf), fin: h.fin })
                const razonMuerta = dia === 6
                  ? 'Después de las 5:00 pm el sábado casi no se vende (las jornadas van de 9 am a 5 pm).'
                  : 'Hora muerta: los niños salen del colegio ~1:00 pm. A las 2:00 pm abre la zona Kinder y a las 3:30 pm la parrilla de Tiny/Kids.'
                return muertas.map((seg) => (
                  <div key={`m-${seg.inicio}`} title={razonMuerta}
                    style={{
                      position: 'absolute', left: 4, right: 4, top: topDe(seg.inicio) + 1, height: topDe(seg.fin) - topDe(seg.inicio) - 2,
                      background: 'var(--surface-2)', border: '1px dashed var(--border)', borderRadius: 'var(--r-sm)',
                      color: 'var(--text-faint)', fontSize: 10.5, fontWeight: 500, padding: 4, overflow: 'hidden',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                    }}>
                    <span style={{ whiteSpace: 'nowrap' }}>Hora muerta</span>
                    {seg.fin - seg.inicio >= 105 && <span style={{ whiteSpace: 'nowrap' }}>casi no se vende</span>}
                  </div>
                ))
              })}
              {/* Bloques del MODELO libres: la parrilla planificada del negocio */}
              {slotsLibres.map((sl) => {
                const unidad = unidadesSalon.find((u) => u.sesiones.some((ses) => ses.dia === dia && ses.inicio === sl.inicio && ses.fin === sl.fin))
                const at = atractivoDe(grupos, retirados, dia, sl.inicio)
                const libres = coachesLibresEn(activos, coaches, dia, sl.inicio, sl.fin)
                const corto = sl.fin - sl.inicio <= 60
                // Si el par del día está ocupado en ESTE salón, igual se prellena la
                // segunda sesión de 1 h en el día par (salón por asignar): el grupo
                // siempre nace cumpliendo las 2 h semanales del programa.
                const diaPar = (sl.tipo === 'LM' || (sl.kinder && (dia === 1 || dia === 3))) ? (dia === 1 ? 3 : 1)
                  : (sl.tipo === 'MJ' || (sl.kinder && (dia === 2 || dia === 4))) ? (dia === 2 ? 4 : 2) : null
                const horarios = unidad
                  ? unidad.sesiones.map((ses) => ({ dia: ses.dia, hora_inicio: aHora(ses.inicio), hora_fin: aHora(ses.fin), salon_id: String(ses.salon_id) }))
                  : diaPar
                    ? [
                        { dia, hora_inicio: aHora(sl.inicio), hora_fin: aHora(sl.fin), salon_id: String(salon.id) },
                        { dia: diaPar, hora_inicio: aHora(sl.inicio), hora_fin: aHora(sl.fin), salon_id: '' },
                      ]
                    : [{ dia, hora_inicio: aHora(sl.inicio), hora_fin: aHora(sl.fin), salon_id: String(salon.id) }]
                const subTexto = unidad ? sl.sub : (sl.kinder ? sl.sub : diaPar ? '1 h + 1 h · par en otro salón' : sl.sub)
                const esKinder = !!sl.kinder
                return (
                  <button key={`s-${sl.inicio}`} onClick={() => onAbrirGrupo({ horarios, itinerario: esKinder ? 'KINDER' : undefined })}
                    title={esKinder
                      ? `Zona Kinder (2:00–3:30 pm entre semana): aquí SÍ se abren Kinder — prohibidos en sábado y en los horarios calientes de Tiny/Kids. Coaches libres: ${libres.length ? libres.map((c) => c.nombre).join(', ') : 'ninguno'}.`
                      : `${unidad ? unidad.titulo : `${DIAS[dia]} ${aHora12(sl.inicio)}–${aHora12(sl.fin)}`} · ${subTexto}. ${at.razon} Coaches libres: ${libres.length ? libres.map((c) => c.nombre).join(', ') : 'ninguno'}.`}
                    style={{
                      position: 'absolute', left: 4, right: 4, top: topDe(sl.inicio) + 1, height: topDe(sl.fin) - topDe(sl.inicio) - 2,
                      background: esKinder ? 'var(--warn-bg)' : 'var(--ok-bg)', border: `1.5px dashed ${esKinder ? 'var(--warn-line)' : 'var(--ok-line)'}`, borderRadius: 'var(--r-sm)',
                      color: esKinder ? 'var(--warn)' : 'var(--ok)', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 3, overflow: 'hidden',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                    }}>
                    <span className="num" style={{ whiteSpace: 'nowrap' }}>＋ {aHora12(sl.inicio)}–{aHora12(sl.fin)}</span>
                    {esKinder
                      ? <span style={{ fontWeight: 600, fontSize: 10, whiteSpace: 'nowrap' }}>Zona Kinder</span>
                      : <span style={{ fontWeight: 600, fontSize: 10, color: ETIQUETA_COLOR[at.etiqueta], whiteSpace: 'nowrap' }}>{ETIQUETA_EMOJI[at.etiqueta]}{at.etiqueta}</span>}
                    {!corto && <span style={{ fontWeight: 500, fontSize: 10, whiteSpace: 'nowrap' }}>{subTexto} · {libres.length} coach libre{libres.length === 1 ? '' : 's'}</span>}
                  </button>
                )
              })}
            </div>
          ) })}
        </div>
      </div>

      {/* Grupos del día sin salón y grupos sin horario */}
      {sinSalon.length > 0 && (
        <div className="card" style={{ padding: '10px 14px', marginTop: 12, borderLeft: '3px solid var(--warn)', fontSize: 12.5, color: 'var(--text-muted)' }}>
          <b style={{ color: 'var(--warn)' }}>Con horario pero sin salón este día:</b>{' '}
          {sinSalon.map((x) => `Grupo ${x.grupo.numero} (${aHora12(x.inicio)}–${aHora12(x.fin)})`).join(' · ')}
          {' '}— edítalos y asígnales salón para que entren al inventario.
        </div>
      )}
      {sinHorario.length > 0 && (
        <div className="card" style={{ padding: '10px 14px', marginTop: 10, fontSize: 12.5, color: 'var(--text-dim)' }}>
          Sin horario registrado: {sinHorario.map((g) => `Grupo ${g.numero}`).join(' · ')}
        </div>
      )}

      {reservaModal && (
        <ReservaModal centroId={centroId} coaches={coaches} salones={salones} initial={reservaModal}
          onClose={() => setReservaModal(null)}
          onSaved={(msg) => { setReservaModal(null); setStatus('✅ ' + msg); onChanged() }} />
      )}
    </div>
  )
}

// ── Modal: apartar la sala de la clase de prueba ─────────────────────────────
// Regla de Fernando: la prueba dura 1 h 30 y ocupa 3 salones a la vez (padres,
// Tiny y Kids). Entre semana va ANTES de los bloques de 2 h de las 4:30 pm; el
// sábado va al final, después de la tercera jornada. El sistema propone la
// franja; el administrador decide el día y los salones.
function ReservaModal({ centroId, coaches, salones, initial, onClose, onSaved }) {
  const isEdit = !!initial.id
  const activos = salones.filter((s) => s.activo)
  const [dia, setDia] = useState(String(initial.dia || 1))
  const [ini, setIni] = useState(initial.hora_inicio || '')
  const [fin, setFin] = useState(initial.hora_fin || '')
  const [notas, setNotas] = useState(initial.notas || '')
  const [salonRol, setSalonRol] = useState(() => {
    const base = {}
    for (const s of initial.salones || []) base[s.rol] = String(s.salon_id)
    // Sin reserva previa: se reparten los salones activos en orden.
    if (!initial.salones) ROLES_RESERVA.forEach((rol, i) => { if (activos[i]) base[rol] = String(activos[i].id) })
    return base
  })
  // Un coach por itinerario: Tiny y Kids son dos clases a la misma hora.
  const [coachRol, setCoachRol] = useState(() => {
    const base = {}
    for (const s of initial.salones || []) if (s.coach_id) base[s.rol] = String(s.coach_id)
    return base
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // La franja la calcula el servidor con la regla del negocio (así la UI no
  // duplica la fórmula y el sábado sale del final de la última jornada).
  useEffect(() => {
    if (isEdit) return
    let vivo = true
    sugerenciaReserva(centroId, parseInt(dia)).then((s) => {
      if (vivo && s && !s.error) { setIni(s.hora_inicio); setFin(s.hora_fin) }
    }).catch(() => {})
    return () => { vivo = false }
  }, [centroId, dia, isEdit])

  const dur = ini && fin ? aMinutos(fin) - aMinutos(ini) : 0

  async function save() {
    const usados = ROLES_RESERVA.map((r) => salonRol[r]).filter(Boolean)
    if (!usados.length) { setErr('Indica al menos un salón para la clase de prueba.'); return }
    if (new Set(usados).size !== usados.length) { setErr('Un mismo salón no puede atender dos roles a la vez: papás, Tiny y Kids van en salones distintos.'); return }
    const coachesUsados = ROLES_RESERVA.map((r) => coachRol[r]).filter(Boolean)
    if (new Set(coachesUsados).size !== coachesUsados.length) { setErr('Un mismo coach no puede atender dos salones a la misma hora: Tiny y Kids necesitan coaches distintos.'); return }
    setSaving(true); setErr('')
    try {
      const res = await guardarReserva(centroId, {
        id: initial.id || null, dia: parseInt(dia), hora_inicio: ini, hora_fin: fin, notas,
        salones: ROLES_RESERVA.filter((r) => salonRol[r]).map((r) => ({ rol: r, salon_id: salonRol[r], coach_id: coachRol[r] || null })),
      })
      setSaving(false)
      if (res.error) { setErr(res.error); return }
      onSaved(`Clase de prueba del ${DIAS[parseInt(dia)].toLowerCase()} ${ini}–${fin} apartada en ${usados.length} salón${usados.length === 1 ? '' : 'es'}.`)
    } catch (e) {
      setSaving(false)
      setErr('Error inesperado del servidor: ' + (e?.message || e) + '. Intenta de nuevo o avisa al administrador.')
    }
  }

  return (
    <Modal title={isEdit ? 'Editar clase de prueba' : 'Apartar clase de prueba'} width={560} onClose={onClose}
      footer={(
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : (isEdit ? 'Guardar cambios' : 'Apartar')}</button>
        </>
      )}>
      {err && <div className="alert alert--error" style={{ marginBottom: 14 }}>{err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Día de la clase de prueba">
          <select className="input" value={dia} onChange={(e) => setDia(e.target.value)}>
            {DIAS_OPERATIVOS.map((d) => <option key={d} value={d}>{DIAS[d]}</option>)}
          </select>
        </Field>
        <Field label="Hora de inicio"><input type="time" className="input" value={ini} onChange={(e) => setIni(e.target.value)} /></Field>
        <Field label="Hora de fin"><input type="time" className="input" value={fin} onChange={(e) => setFin(e.target.value)} /></Field>
        <div style={{ gridColumn: '1 / -1', fontSize: 12, color: dur === 90 ? 'var(--text-dim)' : 'var(--warn)', background: 'var(--surface-3)', padding: '8px 12px', borderRadius: 'var(--r-sm)' }}>
          {parseInt(dia) === 6
            ? 'Sábado: la prueba va en el último turno, después de la tercera jornada.'
            : 'Entre semana: la prueba va antes de las 4:30 pm, y ese día los grupos son bloques de 2 h (no de 1 h).'}
          {' '}Dura <b style={{ color: dur === 90 ? 'var(--text)' : 'var(--warn)' }}>1 h 30</b>
          {dur > 0 && dur !== 90 && <> — llevas {Math.floor(dur / 60)} h {dur % 60} min, ajústalo.</>}
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <div className="label" style={{ marginBottom: 8 }}>Salón y coach por sala</div>
          {ROLES_RESERVA.map((rol) => (
            <div key={rol} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <span style={{ width: 62, fontSize: 12.5, color: 'var(--text-muted)', flexShrink: 0 }}>{ROL_LABEL[rol]}</span>
              <select className="input" style={{ flex: 1, minWidth: 0 }} value={salonRol[rol] || ''}
                onChange={(e) => setSalonRol((p) => ({ ...p, [rol]: e.target.value }))}>
                <option value="">Sin salón</option>
                {salones.filter((s) => s.activo || String(s.id) === salonRol[rol]).map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
              <select className="input" style={{ flex: 1, minWidth: 0 }} value={coachRol[rol] || ''}
                onChange={(e) => setCoachRol((p) => ({ ...p, [rol]: e.target.value }))}>
                <option value="">{ROL_PIDE_COACH[rol] ? 'Sin coach' : 'Administración'}</option>
                {coaches.filter((c) => c.activo || String(c.id) === coachRol[rol]).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          ))}
          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-dim)' }}>
            Se necesitan 3 salones a la misma hora: uno para los papás, uno para Tiny y otro para Kids. <b style={{ color: 'var(--text-muted)' }}>Tiny y Kids llevan cada uno su coach</b> (son dos clases simultáneas); a los papás los recibe la administración. Esos salones y esos coaches quedan bloqueados en el calendario. El coach se puede cambiar cuando quieras con “Editar”.
          </div>
        </div>
        <Field full label="Notas"><textarea className="input" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}

// ── Tab Coaches y salones ────────────────────────────────────────────────────
function TabCoaches({ centroId, coaches, salones, onChanged, setStatus }) {
  const [coachModal, setCoachModal] = useState(null)
  const [salonModal, setSalonModal] = useState(null)
  const [busy, setBusy] = useState(null)

  async function onToggleCoach(c) {
    setBusy('c' + c.id)
    const res = await toggleCoach(centroId, c.id, !c.activo)
    setBusy(null)
    if (res.error) setStatus('❌ ' + res.error)
    else { setStatus(`✅ Coach ${c.nombre} ${c.activo ? 'desactivado' : 'activado'}.`); onChanged() }
  }
  async function onToggleSalon(s) {
    setBusy('s' + s.id)
    const res = await toggleSalon(centroId, s.id, !s.activo)
    setBusy(null)
    if (res.error) setStatus('❌ ' + res.error)
    else { setStatus(`✅ Salón ${s.nombre} ${s.activo ? 'desactivado' : 'activado'}.`); onChanged() }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
      <div className="panel">
        <div className="panel__head">
          <h3 className="panel__title">Coaches</h3>
          <button className="btn btn--primary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setCoachModal({})}>+ Agregar coach</button>
        </div>
        {coaches.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>Aún no hay coaches registrados.</div>
        ) : (
          <table className="table">
            <thead><tr>{['Coach', 'Certificación', 'Kinder', 'Estado', ''].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {coaches.map((c) => (
                <tr key={c.id} style={{ cursor: 'default', opacity: c.activo ? 1 : 0.55 }}>
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{c.nombre}</td>
                  <td style={{ fontSize: 12 }}>
                    {c.nivel_kids > 0 ? (
                      <>Kids ≤ {c.nivel_kids}<div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Tiny ≤ {TINYMAP[c.nivel_kids] || 0}</div></>
                    ) : <span style={{ color: 'var(--text-dim)' }}>Sin registrar</span>}
                  </td>
                  <td style={{ fontSize: 12 }}>{[c.kinder1 && 'K1', c.kinder23 && 'K2-3'].filter(Boolean).join(' · ') || '—'}</td>
                  <td>
                    {c.activo
                      ? <span className="pill pill--ok"><span className="dot" />Activo</span>
                      : <span className="pill pill--bad"><span className="dot" />Inactivo</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn" style={BTN_XS} onClick={() => setCoachModal(c)}>Editar</button>
                      <button className="btn" style={BTN_XS} disabled={busy === 'c' + c.id} onClick={() => onToggleCoach(c)}>{c.activo ? 'Desactivar' : 'Activar'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <div className="panel__head">
          <h3 className="panel__title">Salones</h3>
          <button className="btn btn--primary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setSalonModal({})}>+ Agregar salón</button>
        </div>
        {salones.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>Aún no hay salones registrados.</div>
        ) : (
          <table className="table">
            <thead><tr>{['Salón', 'Híbrido', 'Estado', ''].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {salones.map((s) => (
                <tr key={s.id} style={{ cursor: 'default', opacity: s.activo ? 1 : 0.55 }}>
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{s.nombre}</td>
                  <td style={{ fontSize: 12 }}>{s.es_hibrido ? 'Sí' : 'No'}</td>
                  <td>
                    {s.activo
                      ? <span className="pill pill--ok"><span className="dot" />Activo</span>
                      : <span className="pill pill--bad"><span className="dot" />Inactivo</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn" style={BTN_XS} onClick={() => setSalonModal(s)}>Editar</button>
                      <button className="btn" style={BTN_XS} disabled={busy === 's' + s.id} onClick={() => onToggleSalon(s)}>{s.activo ? 'Desactivar' : 'Activar'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {coachModal && (
        <CoachModal centroId={centroId} initial={coachModal}
          onClose={() => setCoachModal(null)}
          onSaved={(msg) => { setCoachModal(null); setStatus('✅ ' + msg); onChanged() }} />
      )}
      {salonModal && (
        <SalonModal centroId={centroId} initial={salonModal}
          onClose={() => setSalonModal(null)}
          onSaved={(msg) => { setSalonModal(null); setStatus('✅ ' + msg); onChanged() }} />
      )}
    </div>
  )
}

// ── Modal: aperturar / editar grupo ──────────────────────────────────────────
function GrupoModal({ centroId, coaches, salones, initial, onClose, onSaved }) {
  const isEdit = !!initial.id
  const [f, setF] = useState(initial)
  // Flag de tocado: la fecha de inicio de clases solo viaja al servidor si el
  // usuario la editó en ESTA sesión del modal (contrato de actualizarGrupo:
  // campo ausente = no tocar — así el modal abierto no pisa un ajuste hecho
  // en paralelo desde otra pestaña).
  const [inicioTocado, setInicioTocado] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const setH = (i, k, v) => setF((p) => ({ ...p, horarios: p.horarios.map((h, j) => (j === i ? { ...h, [k]: v } : h)) }))
  const minimo = aperturaMinima(f.itinerario, parseInt(f.nivel) || 1)

  async function save() {
    if (!String(f.numero).trim()) { setErr('El número de grupo es requerido.'); return }
    setSaving(true); setErr('')
    try {
      const data = {
        numero: String(f.numero).trim(), itinerario: f.itinerario, es_online: f.es_online,
        coach_id: f.coach_id || null, fecha_apertura: f.fecha_apertura || null,
        notas: f.notas,
        horarios: f.horarios.filter((h) => h.hora_inicio && h.hora_fin).map((h) => ({ dia: parseInt(h.dia), hora_inicio: h.hora_inicio, hora_fin: h.hora_fin, salon_id: h.salon_id || null })),
      }
      // La palanca de inscripciones ya no viaja NUNCA (vive en su botón con
      // CAS); la fecha de inicio solo si el usuario la tocó (o al crear).
      if (!isEdit || inicioTocado) data.fecha_inicio_clases = f.fecha_inicio_clases || null
      if (!isEdit) { data.nivel = parseInt(f.nivel) || 1; data.ninos_iniciales = f.ninos_iniciales }
      const res = isEdit ? await actualizarGrupo(centroId, initial.id, data) : await crearGrupo(centroId, data)
      setSaving(false)
      if (res.error) { setErr(res.error); return }
      onSaved(isEdit ? `Grupo ${data.numero} actualizado.` : `Grupo ${data.numero} aperturado.`, res.warn)
    } catch (e) {
      setSaving(false)
      setErr('Error inesperado del servidor: ' + (e?.message || e) + '. Intenta de nuevo o avisa al administrador.')
    }
  }

  return (
    <Modal title={isEdit ? `Editar grupo ${initial.numero}` : 'Aperturar grupo'} width={640} onClose={onClose}
      footer={(
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : (isEdit ? 'Guardar cambios' : 'Aperturar grupo')}</button>
        </>
      )}>
      {err && <div className="alert alert--error" style={{ marginBottom: 14 }}>{err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Número de grupo *"><input className="input" value={f.numero} onChange={(e) => set('numero', e.target.value)} placeholder="Ej: 22" /></Field>
        <Field label="Itinerario">
          <select className="input" value={f.itinerario} onChange={(e) => set('itinerario', e.target.value)}>
            {ITINERARIOS.map((it) => <option key={it} value={it}>{it}</option>)}
          </select>
        </Field>
        <Field label="Coach">
          <select className="input" value={f.coach_id || ''} onChange={(e) => set('coach_id', e.target.value)}>
            <option value="">Sin coach</option>
            {coaches.filter((c) => c.activo || String(c.id) === String(f.coach_id)).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Field>
        <Field label="Fecha de apertura"><input type="date" className="input" value={f.fecha_apertura} onChange={(e) => set('fecha_apertura', e.target.value)} /></Field>
        <Field label="Fecha de inicio de clases">
          <input type="date" className="input" value={f.fecha_inicio_clases || ''}
            onChange={(e) => { set('fecha_inicio_clases', e.target.value); setInicioTocado(true) }} />
          {isEdit && !initial.fecha_inicio_clases && initial.it_inicio && (
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
              Nivel vigente inicia {fmtDia(initial.it_inicio)} (dato del itinerario; la columna sigue vacía hasta que la fijes aquí).
            </div>
          )}
        </Field>
        <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--text-dim)', background: 'var(--surface-3)', padding: '8px 12px', borderRadius: 'var(--r-sm)' }}>
          El grupo <b style={{ color: 'var(--text)' }}>entra al Cuadro de Negocio en el mes de su fecha de inicio de clases</b> (sin fecha = cuenta desde ya). La palanca de inscripciones (abrir o cerrar el llenado) ya no vive aquí: se maneja con el botón <b style={{ color: 'var(--text)' }}>Abrir/Cerrar inscripciones</b> del panel del grupo.
        </div>
        {!isEdit && (
          <>
            <Field label="Nivel inicial">
              <input type="number" min="1" max={NIVEL_MAX[f.itinerario]} className="input" value={f.nivel} onChange={(e) => set('nivel', e.target.value)} />
            </Field>
            <Field label="Niños con los que abre">
              <input type="number" min="0" className="input" value={f.ninos_iniciales} onChange={(e) => set('ninos_iniciales', e.target.value)} placeholder="(opcional)" />
            </Field>
            <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--text-dim)', background: 'var(--surface-3)', padding: '8px 12px', borderRadius: 'var(--r-sm)' }}>
              Apertura mínima del manual para {f.itinerario} nivel {parseInt(f.nivel) || 1}: <b style={{ color: 'var(--text)' }}>{minimo} niños</b>. Con menos, el grupo queda bajo responsabilidad del centro en niveles superiores.
            </div>
          </>
        )}
        <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={f.es_online} onChange={(e) => set('es_online', e.target.checked)} />
          <span><b style={{ color: 'var(--text)' }}>Grupo online</b><br /><span className="h-sub">Exento de la alerta de fusión y del promedio de niños por grupo</span></span>
        </label>
        <div style={{ gridColumn: '1 / -1' }}>
          <div className="label" style={{ marginBottom: 8 }}>Horarios</div>
          {f.horarios.map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <select className="input" style={{ flex: 1 }} value={h.dia} onChange={(e) => setH(i, 'dia', e.target.value)}>
                {DIAS.slice(1).map((d, di) => <option key={di + 1} value={di + 1}>{d}</option>)}
              </select>
              <input type="time" className="input" style={{ width: 110 }} value={h.hora_inicio} onChange={(e) => setH(i, 'hora_inicio', e.target.value)} />
              <input type="time" className="input" style={{ width: 110 }} value={h.hora_fin} onChange={(e) => setH(i, 'hora_fin', e.target.value)} />
              <select className="input" style={{ flex: 1 }} value={h.salon_id || ''} onChange={(e) => setH(i, 'salon_id', e.target.value)}>
                <option value="">Sin salón</option>
                {salones.filter((s) => s.activo || String(s.id) === String(h.salon_id)).map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
              <button className="btn" style={{ padding: '6px 10px' }} onClick={() => set('horarios', f.horarios.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button className="btn" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => set('horarios', [...f.horarios, { dia: 1, hora_inicio: '', hora_fin: '', salon_id: '' }])}>+ Agregar horario</button>
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-dim)' }}>
            El programa son <b>2 horas semanales</b>: un bloque de 2 h, o dos bloques de 1 h en días distintos. Ventana: 12:30–8:30 pm (sábado desde 9:00 am) con 15 min entre clases.
          </div>
        </div>
        <Field full label="Notas"><textarea className="input" rows={2} value={f.notas} onChange={(e) => set('notas', e.target.value)} /></Field>
      </div>
    </Modal>
  )
}

// ── Modal: ajustar el itinerario del nivel de un grupo ───────────────────────
// La vista previa se calcula en el navegador con el MISMO generador del
// servidor (lib/itinerario es cálculo puro), así se ve el cierre nuevo antes
// de guardar. El servidor vuelve a generarlo: la UI nunca manda el plan.
function ItinerarioModal({ centroId, g, nuevaExcepcion, onClose, onSaved }) {
  const it = g.itinerario_clases
  const topeNivel = NIVEL_MAX[g.itinerario] || 10
  const [nivel, setNivel] = useState(String(it?.nivel || 1))
  const [inicio, setInicio] = useState(isoDia(it?.fecha_inicio || g.fecha_inicio_clases) || hoyISO())
  const [exc, setExc] = useState(() => {
    const base = (it?.excepciones || []).map((e) => ({ ...e }))
    if (nuevaExcepcion && !base.some((e) => e.fecha === nuevaExcepcion)) base.push({ fecha: nuevaExcepcion, motivo: '' })
    return base.sort((a, b) => a.fecha.localeCompare(b.fecha))
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const dias = [...new Set((g.horarios || []).map((h) => Number(h.dia)))]
  // Recalcula en vivo: así se ve a dónde se mueve el cierre antes de guardar.
  const previo = dias.length && inicio
    ? generarItinerario({ fechaInicio: inicio, dias, nivel: parseInt(nivel) || 1, pais: it?.pais || (it?.con_feriados === false ? 'VE' : 'PA'), excepciones: exc })
    : null
  const cierreAntes = it?.fecha_cierre_estimada
  const movio = previo && cierreAntes && previo.fecha_cierre_estimada !== cierreAntes

  async function save() {
    setSaving(true); setErr('')
    try {
      const res = await ajustarItinerarioGrupo(centroId, g.id, {
        nivel: parseInt(nivel) || 1,
        fecha_inicio: inicio,
        excepciones: exc.filter((e) => e.fecha),
      })
      setSaving(false)
      if (res.error) { setErr(res.error); return }
      onSaved(`Itinerario del grupo ${g.numero} actualizado: nivel ${res.itinerario.nivel}, cierra el ${fmtDia(res.itinerario.fecha_cierre_estimada)}.`)
    } catch (e) {
      setSaving(false)
      setErr('Error inesperado del servidor: ' + (e?.message || e) + '. Intenta de nuevo o avisa al administrador.')
    }
  }

  return (
    <Modal title={`Itinerario del grupo ${g.numero}`} width={620} onClose={onClose}
      footer={(
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={save} disabled={saving || !dias.length}>{saving ? 'Guardando…' : 'Guardar itinerario'}</button>
        </>
      )}>
      {err && <div className="alert alert--error" style={{ marginBottom: 14 }}>{err}</div>}
      {!dias.length && (
        <div className="alert alert--error" style={{ marginBottom: 14 }}>
          El grupo no tiene horario registrado. Sin días de clase no se puede armar el itinerario: edita el grupo y ponle horario.
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Nivel que cursa">
          <select className="input" value={nivel} onChange={(e) => setNivel(e.target.value)}>
            {Array.from({ length: topeNivel }, (_, i) => i + 1).map((nv) => <option key={nv} value={nv}>Nivel {nv}</option>)}
          </select>
        </Field>
        <Field label="Inicio del nivel">
          <input type="date" className="input" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </Field>

        {it?.inicio_siguiente_nivel && Number(nivel) === Number(it.nivel) && it.nivel < topeNivel && (
          <div style={{ gridColumn: '1 / -1' }}>
            <button className="btn" style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={() => { setNivel(String(it.nivel + 1)); setInicio(it.inicio_siguiente_nivel); setExc([]) }}>
              ➡️ Pasar al nivel {it.nivel + 1} (arranca el {fmtDia(it.inicio_siguiente_nivel)})
            </button>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 5 }}>
              Cierra este nivel y arma el siguiente desde esa fecha. Las clases suspendidas del nivel anterior no se arrastran.
            </div>
          </div>
        )}

        <div style={{ gridColumn: '1 / -1' }}>
          <div className="label" style={{ marginBottom: 8 }}>Clases que no se dieron</div>
          {exc.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>Ninguna. Cada clase suspendida corre el plan y mueve el cierre.</div>}
          {exc.map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input type="date" className="input" style={{ width: 160 }} value={e.fecha}
                onChange={(ev) => setExc(exc.map((x, j) => (j === i ? { ...x, fecha: ev.target.value } : x)))} />
              <input className="input" style={{ flex: 1 }} placeholder="Motivo (coach enfermo, feriado local…)" value={e.motivo || ''}
                onChange={(ev) => setExc(exc.map((x, j) => (j === i ? { ...x, motivo: ev.target.value } : x)))} />
              <button className="btn" style={{ padding: '6px 10px' }} onClick={() => setExc(exc.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button className="btn" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setExc([...exc, { fecha: hoyISO(), motivo: '' }])}>+ Suspender una clase</button>
        </div>

        {previo && (
          <div style={{ gridColumn: '1 / -1', background: 'var(--surface-3)', padding: '10px 14px', borderRadius: 'var(--r-sm)', fontSize: 12, lineHeight: 1.7 }}>
            <b style={{ color: 'var(--text)' }}>Queda así:</b> {previo.semanas.length} semanas · cierra el{' '}
            <b style={{ color: movio ? 'var(--warn)' : 'var(--text)' }}>{fmtDia(previo.fecha_cierre_estimada)}</b>
            {movio ? ` (antes ${fmtDia(cierreAntes)})` : ''} · el nivel {previo.nivel + 1} arrancaría el {fmtDia(previo.inicio_siguiente_nivel)}.
            {previo.feriados_saltados.length > 0 && (
              <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>Salta {previo.feriados_saltados.length} día(s) por feriados/vacaciones del manual.</div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Modal: inscribir niño ────────────────────────────────────────────────────
function InscribirModal({ centroId, grupos, grupoPrefill, onClose, onSaved }) {
  const [f, setF] = useState({ nombre: '', itinerario: 'TINY', nivel: 1, grupo_id: grupoPrefill ? String(grupoPrefill) : '', origen: 'directo', fecha: hoyISO(), fecha_cierre_nivel: '', representante: '', correo: '', telefono: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const activos = grupos.filter((g) => g.estado === 'activo')
  // Inscribir es siempre un niño NUEVO: el select deshabilita tanto la palanca
  // cerrada como la ventana del manual vencida (el server valida igual).
  const hoy = hoyISO()
  const ventanaPorId = new Map(activos.map((g) => [String(g.id), ventanaNuevos(g, hoy)]))

  async function save() {
    if (!f.nombre.trim()) { setErr('El nombre es requerido.'); return }
    setSaving(true); setErr('')
    try {
      const res = await inscribirEstudiante(centroId, {
        nombre: f.nombre, itinerario: f.itinerario, nivel: parseInt(f.nivel) || 1, grupo_id: f.grupo_id || null,
        origen: f.origen, fecha: f.fecha, fecha_cierre_nivel: f.fecha_cierre_nivel || null,
        representante: f.representante, correo: f.correo, telefono: f.telefono,
      })
      setSaving(false)
      if (res.error) { setErr(res.error); return }
      const g = activos.find((x) => String(x.id) === String(f.grupo_id))
      onSaved(`${f.nombre.trim()} inscrito${g ? ` en el grupo ${g.numero}` : ' (sin grupo asignado)'}.`)
    } catch (e) {
      setSaving(false)
      setErr('Error inesperado del servidor: ' + (e?.message || e) + '. Intenta de nuevo o avisa al administrador.')
    }
  }

  return (
    <Modal title="Inscribir niño" width={600} onClose={onClose}
      footer={(
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Inscribir'}</button>
        </>
      )}>
      {err && <div className="alert alert--error" style={{ marginBottom: 14 }}>{err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field full label="Nombre del niño *"><input className="input" value={f.nombre} onChange={(e) => set('nombre', e.target.value)} /></Field>
        <Field label="Itinerario">
          <select className="input" value={f.itinerario} onChange={(e) => { const it = e.target.value; setF((p) => ({ ...p, itinerario: it, nivel: Math.min(parseInt(p.nivel) || 1, NIVEL_MAX[it]) })) }}>
            {ITINERARIOS.map((it) => <option key={it} value={it}>{it}</option>)}
          </select>
        </Field>
        <Field label="Nivel">
          <select className="input" value={f.nivel} onChange={(e) => set('nivel', e.target.value)}>
            {Array.from({ length: NIVEL_MAX[f.itinerario] }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Nivel {n}</option>)}
          </select>
        </Field>
        <Field label="Grupo">
          <select className="input" value={f.grupo_id} onChange={(e) => set('grupo_id', e.target.value)}>
            <option value="">Sin grupo</option>
            {activos.map((g) => {
              const v = ventanaPorId.get(String(g.id))
              const marca = v?.razon === 'palanca_cerrada' ? ' · 🔒 cerrado' : v?.razon === 'vencida' ? ' · ventana de nuevos vencida' : ''
              return <option key={g.id} value={g.id} disabled={!v?.abierta}>Grupo {g.numero} · {g.itinerario}{marca}</option>
            })}
          </select>
        </Field>
        <Field label="Origen">
          <select className="input" value={f.origen} onChange={(e) => set('origen', e.target.value)}>
            {ORIGENES.map((o) => <option key={o} value={o}>{ORIGEN_LABELS[o] || o}</option>)}
          </select>
        </Field>
        <Field label="Fecha de inscripción"><input type="date" className="input" value={f.fecha} onChange={(e) => set('fecha', e.target.value)} /></Field>
        <Field label="Cierre de nivel"><input type="date" className="input" value={f.fecha_cierre_nivel} onChange={(e) => set('fecha_cierre_nivel', e.target.value)} /></Field>
        <Field label="Representante"><input className="input" value={f.representante} onChange={(e) => set('representante', e.target.value)} /></Field>
        <Field label="Teléfono"><input className="input" value={f.telefono} onChange={(e) => set('telefono', e.target.value)} /></Field>
        <Field full label="Correo"><input className="input" value={f.correo} onChange={(e) => set('correo', e.target.value)} /></Field>
      </div>
    </Modal>
  )
}

// ── Modal: editar niño (datos, nivel y grupo) ────────────────────────────────
function EstudianteModal({ centroId, est, grupos, onClose, onSaved }) {
  const [f, setF] = useState({
    nombre: est.nombre || '', itinerario: est.itinerario, nivel: Number(est.nivel) || 1, grupo_id: est.grupo_id || '',
    fecha_cierre_nivel: isoDia(est.fecha_cierre_nivel), representante: est.representante || '', correo: est.correo || '',
    telefono: est.telefono || '', notas: est.notas || '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const activos = grupos.filter((g) => g.estado === 'activo' || String(g.id) === String(est.grupo_id))

  async function save() {
    if (!f.nombre.trim()) { setErr('El nombre es requerido.'); return }
    setSaving(true); setErr('')
    try {
      const res = await actualizarEstudiante(centroId, est.id, {
        nombre: f.nombre, itinerario: f.itinerario, nivel: parseInt(f.nivel) || 1, grupo_id: f.grupo_id || null,
        fecha_cierre_nivel: f.fecha_cierre_nivel || null, representante: f.representante, correo: f.correo,
        telefono: f.telefono, notas: f.notas,
      })
      setSaving(false)
      if (res.error) { setErr(res.error); return }
      onSaved(`${f.nombre.trim()} actualizado.`)
    } catch (e) {
      setSaving(false)
      setErr('Error inesperado del servidor: ' + (e?.message || e) + '. Intenta de nuevo o avisa al administrador.')
    }
  }

  return (
    <Modal title={`Editar a ${est.nombre}`} width={600} onClose={onClose}
      footer={(
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
        </>
      )}>
      {err && <div className="alert alert--error" style={{ marginBottom: 14 }}>{err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field full label="Nombre *"><input className="input" value={f.nombre} onChange={(e) => set('nombre', e.target.value)} /></Field>
        <Field label="Itinerario">
          <select className="input" value={f.itinerario} onChange={(e) => { const it = e.target.value; setF((p) => ({ ...p, itinerario: it, nivel: Math.min(parseInt(p.nivel) || 1, NIVEL_MAX[it]) })) }}>
            {ITINERARIOS.map((it) => <option key={it} value={it}>{it}</option>)}
          </select>
        </Field>
        <Field label="Nivel">
          <select className="input" value={f.nivel} onChange={(e) => set('nivel', e.target.value)}>
            {Array.from({ length: NIVEL_MAX[f.itinerario] }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Nivel {n}</option>)}
          </select>
        </Field>
        <Field label="Grupo (mover de grupo)">
          <select className="input" value={f.grupo_id} onChange={(e) => set('grupo_id', e.target.value)}>
            <option value="">Sin grupo</option>
            {activos.map((g) => <option key={g.id} value={g.id} disabled={g.inscripcion_abierta === false}>Grupo {g.numero} · {g.itinerario}{g.inscripcion_abierta === false ? ' · 🔒 cerrado' : ''}</option>)}
          </select>
        </Field>
        <Field label="Cierre de nivel"><input type="date" className="input" value={f.fecha_cierre_nivel} onChange={(e) => set('fecha_cierre_nivel', e.target.value)} /></Field>
        <Field label="Representante"><input className="input" value={f.representante} onChange={(e) => set('representante', e.target.value)} /></Field>
        <Field label="Teléfono"><input className="input" value={f.telefono} onChange={(e) => set('telefono', e.target.value)} /></Field>
        <Field full label="Correo"><input className="input" value={f.correo} onChange={(e) => set('correo', e.target.value)} /></Field>
        <Field full label="Notas"><textarea className="input" rows={2} value={f.notas} onChange={(e) => set('notas', e.target.value)} /></Field>
      </div>
    </Modal>
  )
}

// ── Modal: retiro con motivo (cuadro de deserciones) ─────────────────────────
function RetiroModal({ centroId, est, onClose, onSaved }) {
  const [f, setF] = useState({ motivo: 'ECONOMICO', fecha: hoyISO(), ultimaAsistencia: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  async function save() {
    setSaving(true); setErr('')
    try {
      const res = await retirarEstudiante(centroId, est.id, { motivo: f.motivo, fecha: f.fecha, ultimaAsistencia: f.ultimaAsistencia || null })
      setSaving(false)
      if (res.error) { setErr(res.error); return }
      onSaved(res)
    } catch (e) {
      setSaving(false)
      setErr('Error inesperado del servidor: ' + (e?.message || e) + '. Intenta de nuevo o avisa al administrador.')
    }
  }

  return (
    <Modal title={`Retirar a ${est.nombre}`} width={480} onClose={onClose}
      footer={(
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Confirmar retiro'}</button>
        </>
      )}>
      {err && <div className="alert alert--error" style={{ marginBottom: 14 }}>{err}</div>}
      <div style={{ display: 'grid', gap: 14 }}>
        <Field label="Motivo de retiro *">
          <select className="input" value={f.motivo} onChange={(e) => set('motivo', e.target.value)}>
            {MOTIVOS_RETIRO.map((m) => <option key={m} value={m}>{MOTIVOS_RETIRO_LABELS[m]}</option>)}
          </select>
        </Field>
        <Field label="Fecha de retiro"><input type="date" className="input" value={f.fecha} onChange={(e) => set('fecha', e.target.value)} /></Field>
        <Field label="Última asistencia"><input type="date" className="input" value={f.ultimaAsistencia} onChange={(e) => set('ultimaAsistencia', e.target.value)} /></Field>
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>El niño pasa al cuadro de deserciones del mes de la fecha de retiro y su status en plataforma queda en DESACTIVAR.</div>
      </div>
    </Modal>
  )
}

// ── Modal: reincorporar retirado ─────────────────────────────────────────────
function ReincorporarModal({ centroId, est, grupos, onClose, onSaved }) {
  const [grupoId, setGrupoId] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const activos = grupos.filter((g) => g.estado === 'activo')

  async function save() {
    if (!grupoId) { setErr('Selecciona el grupo donde se reincorpora.'); return }
    setSaving(true); setErr('')
    try {
      const res = await reincorporarEstudiante(centroId, est.id, { grupoId })
      setSaving(false)
      if (res.error) { setErr(res.error); return }
      const g = activos.find((x) => String(x.id) === String(grupoId))
      onSaved(`${est.nombre} reincorporado${g ? ` al grupo ${g.numero}` : ''}. Cuenta como reincorporado del mes.`)
    } catch (e) {
      setSaving(false)
      setErr('Error inesperado del servidor: ' + (e?.message || e) + '. Intenta de nuevo o avisa al administrador.')
    }
  }

  return (
    <Modal title={`Reincorporar a ${est.nombre}`} width={440} onClose={onClose}
      footer={(
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Reincorporar'}</button>
        </>
      )}>
      {err && <div className="alert alert--error" style={{ marginBottom: 14 }}>{err}</div>}
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {est.itinerario} nivel {est.nivel} · retirado el {fmtDia(est.fecha_retiro)} ({MOTIVOS_RETIRO_LABELS[est.motivo_retiro] || est.motivo_retiro || 'sin motivo'})
        </div>
        <Field label="Grupo *">
          <select className="input" value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
            <option value="">Selecciona un grupo…</option>
            {activos.map((g) => <option key={g.id} value={g.id} disabled={g.inscripcion_abierta === false}>Grupo {g.numero} · {g.itinerario} ({g.estudiantes.length} niños){g.inscripcion_abierta === false ? ' · 🔒 cerrado' : ''}</option>)}
          </select>
        </Field>
      </div>
    </Modal>
  )
}

// ── Modal: coach (certificación según manual) ────────────────────────────────
function CoachModal({ centroId, initial, onClose, onSaved }) {
  const isEdit = !!initial.id
  const [f, setF] = useState({ nombre: initial.nombre || '', nivel_kids: initial.nivel_kids || 0, kinder1: !!initial.kinder1, kinder23: !!initial.kinder23 })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const topeTiny = TINYMAP[parseInt(f.nivel_kids) || 0] || 0

  async function save() {
    if (!f.nombre.trim()) { setErr('El nombre es requerido.'); return }
    setSaving(true); setErr('')
    try {
      const res = await saveCoach(centroId, { id: initial.id, nombre: f.nombre, nivel_kids: parseInt(f.nivel_kids) || 0, kinder1: f.kinder1, kinder23: f.kinder23 })
      setSaving(false)
      if (res.error) { setErr(res.error); return }
      onSaved(isEdit ? `Coach ${f.nombre.trim()} actualizado.` : `Coach ${f.nombre.trim()} agregado.`)
    } catch (e) {
      setSaving(false)
      setErr('Error inesperado del servidor: ' + (e?.message || e) + '. Intenta de nuevo o avisa al administrador.')
    }
  }

  return (
    <Modal title={isEdit ? 'Editar coach' : 'Agregar coach'} width={440} onClose={onClose}
      footer={(
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </>
      )}>
      {err && <div className="alert alert--error" style={{ marginBottom: 14 }}>{err}</div>}
      <div style={{ display: 'grid', gap: 14 }}>
        <Field label="Nombre *"><input className="input" value={f.nombre} onChange={(e) => set('nombre', e.target.value)} /></Field>
        <Field label="Nivel KIDS que domina">
          <select className="input" value={f.nivel_kids} onChange={(e) => set('nivel_kids', e.target.value)}>
            <option value={0}>Sin registrar</option>
            {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Kids hasta nivel {n}</option>)}
          </select>
        </Field>
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Tope TINY derivado (manual): {topeTiny > 0 ? `Tiny hasta nivel ${topeTiny}` : 'sin certificación registrada'}.
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={f.kinder1} onChange={(e) => set('kinder1', e.target.checked)} />
          <span style={{ color: 'var(--text)' }}>Certificado para Kinder 1</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={f.kinder23} onChange={(e) => set('kinder23', e.target.checked)} />
          <span style={{ color: 'var(--text)' }}>Certificado para Kinder 2–3</span>
        </label>
      </div>
    </Modal>
  )
}

// ── Modal: salón ─────────────────────────────────────────────────────────────
function SalonModal({ centroId, initial, onClose, onSaved }) {
  const isEdit = !!initial.id
  const [f, setF] = useState({ nombre: initial.nombre || '', es_hibrido: !!initial.es_hibrido })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!f.nombre.trim()) { setErr('El nombre es requerido.'); return }
    setSaving(true); setErr('')
    try {
      const res = await saveSalon(centroId, { id: initial.id, nombre: f.nombre, es_hibrido: f.es_hibrido })
      setSaving(false)
      if (res.error) { setErr(res.error); return }
      onSaved(isEdit ? `Salón ${f.nombre.trim()} actualizado.` : `Salón ${f.nombre.trim()} agregado.`)
    } catch (e) {
      setSaving(false)
      setErr('Error inesperado del servidor: ' + (e?.message || e) + '. Intenta de nuevo o avisa al administrador.')
    }
  }

  return (
    <Modal title={isEdit ? 'Editar salón' : 'Agregar salón'} width={400} onClose={onClose}
      footer={(
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </>
      )}>
      {err && <div className="alert alert--error" style={{ marginBottom: 14 }}>{err}</div>}
      <div style={{ display: 'grid', gap: 14 }}>
        <Field label="Nombre *"><input className="input" value={f.nombre} onChange={(e) => setF((p) => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Salón 3" /></Field>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={f.es_hibrido} onChange={(e) => setF((p) => ({ ...p, es_hibrido: e.target.checked }))} />
          <span><b style={{ color: 'var(--text)' }}>Salón híbrido</b><br /><span className="h-sub">Equipado para clases presenciales y online</span></span>
        </label>
      </div>
    </Modal>
  )
}

// ── Base de modales y campos ─────────────────────────────────────────────────
function Modal({ title, width = 560, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width, maxWidth: '100%', padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <h3 className="panel__title">{title}</h3>
          <button className="btn" style={{ padding: '4px 10px' }} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 22, maxHeight: '62vh', overflowY: 'auto' }}>{children}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>{footer}</div>
      </div>
    </div>
  )
}

function Field({ label, full, children }) {
  return <div className="field" style={full ? { gridColumn: '1 / -1', margin: 0 } : { margin: 0 }}><label className="label">{label}</label>{children}</div>
}
