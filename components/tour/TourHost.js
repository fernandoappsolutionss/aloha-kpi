'use client'
// Motor del tour guiado. Lee ?tour=<modulo>&paso=<n> de la URL, busca el
// elemento [data-tour="<target>"] del paso, lo resalta con un spotlight y
// muestra la tarjeta con texto, audio y controles. No conoce el contenido:
// todo sale de lib/entrenamiento/modulos.js. Montado en app/centro/[id]/layout.js.
//
// TourHost vive en el layout del centro, que NO se desmonta al navegar entre
// páginas del mismo centro. Por eso el estado del tour vive en <TourActivo
// key={tourId}>: al cambiar de módulo React monta una instancia nueva (estado a
// cero) y sin ?tour se desmonta. Dentro de un módulo, los pasos con `ruta`
// conservan la key → el tour sobrevive a la navegación entre páginas.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { MODULOS } from '../../lib/entrenamiento/modulos'
import { rutaDePaso } from '../../lib/entrenamiento/progreso'
import manifest from '../../lib/entrenamiento/audio-manifest.json'
import { marcarTourVisto } from '../../app/actions/entrenamiento'

const ANCHO_TARJETA = 360
const MARGEN = 12
const AVISO_MS = 2500 // a los 2,5 s se avisa "todavía no veo…", pero se sigue buscando

export default function TourHost() {
  const sp = useSearchParams()
  const tourId = sp.get('tour')
  if (!tourId) return null
  return <TourActivo key={tourId} tourId={tourId} />
}

function TourActivo({ tourId }) {
  const params = useParams()
  const centroId = params?.id
  const pathname = usePathname()
  const router = useRouter()
  const sp = useSearchParams()
  const paso = Math.max(1, parseInt(sp.get('paso') || '1', 10) || 1)

  const modulo = useMemo(() => MODULOS.find((m) => m.id === tourId) || null, [tourId])
  const total = modulo?.pasos.length || 0
  const step = modulo?.pasos[paso - 1] || null
  const esUltimo = paso === total

  const [rect, setRect] = useState(null)
  const [estado, setEstado] = useState('buscando') // buscando | listo | ausente (aviso, no terminal)
  const [mute, setMute] = useState(false)
  const [reproduciendo, setReproduciendo] = useState(false)
  const [terminando, setTerminando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState('')
  const audioRef = useRef(null)
  const targetRef = useRef(null)

  useEffect(() => { try { setMute(localStorage.getItem('tour_mute') === '1') } catch {} }, [])

  const conCentro = useCallback((ruta) => String(ruta || '').replace('{id}', String(centroId)), [centroId])

  // Ir al paso n EN LA PÁGINA QUE LE CORRESPONDE (rutaDePaso): Omitir, Anterior
  // y deep-links caen siempre donde vive el target. Misma página → pushState
  // nativo (Next lo intercepta: actualiza useSearchParams sin fetch RSC ni salto
  // de scroll). Otra página → navegación real.
  const irA = useCallback((n) => {
    if (!modulo) return
    const destino = conCentro(rutaDePaso(modulo, n))
    const url = `${destino}?tour=${encodeURIComponent(tourId)}&paso=${n}`
    if (destino === pathname) window.history.pushState(null, '', url)
    else router.push(url)
  }, [modulo, router, pathname, tourId, conCentro])

  // Quita ?tour sin fetch ni salto; TourHost deja de renderizar al no haber `tour`.
  const salir = useCallback(() => { window.history.pushState(null, '', pathname) }, [pathname])

  const terminar = useCallback(async () => {
    if (!modulo || terminando) return
    setTerminando(true); setErrorGuardar('')
    try {
      const r = await marcarTourVisto(modulo.id)
      if (r?.error) throw new Error(r.error)
      router.push(`/centro/${centroId}/entrenamiento/${modulo.id}#quiz`)
    } catch {
      setErrorGuardar('No se pudo guardar el recorrido. Revisa tu conexión y vuelve a pulsar Terminar.')
      setTerminando(false)
    }
  }, [modulo, terminando, router, centroId])

  const medir = useCallback(() => {
    const el = targetRef.current
    if (!el || !el.isConnected) return
    const r = el.getBoundingClientRect()
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
  }, [])

  // Buscar el elemento del paso. El aviso "todavía no veo…" NO es terminal: las
  // pantallas del centro pintan "Cargando…" hasta que vuelve la server action y
  // en frío eso pasa de 2,5 s; cuando el elemento aparece, el paso pasa a 'listo'.
  useEffect(() => {
    if (!modulo || !step) return
    let cancelado = false, avisado = false, timer = null
    const t0 = Date.now()
    setEstado('buscando'); setRect(null); targetRef.current = null
    const buscar = () => {
      if (cancelado) return
      const el = document.querySelector(`[data-tour="${step.target}"]`)
      if (el) {
        targetRef.current = el
        try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }) } catch {}
        medir()
        setEstado('listo')
        return
      }
      const t = Date.now() - t0
      if (t >= AVISO_MS && !avisado) { avisado = true; setEstado('ausente') }
      timer = setTimeout(buscar, t < AVISO_MS ? 150 : 400)
    }
    buscar()
    return () => { cancelado = true; if (timer) clearTimeout(timer) }
  }, [modulo, step, pathname, medir])

  // Re-medir en scroll/resize (y un par de veces tras el scroll suave).
  useEffect(() => {
    if (estado !== 'listo') return
    const on = () => medir()
    window.addEventListener('scroll', on, true)
    window.addEventListener('resize', on)
    const t1 = setTimeout(on, 250), t2 = setTimeout(on, 600)
    return () => { window.removeEventListener('scroll', on, true); window.removeEventListener('resize', on); clearTimeout(t1); clearTimeout(t2) }
  }, [estado, medir])

  // Paso "hazlo": avanzar cuando el usuario hace clic en el elemento real.
  useEffect(() => {
    if (estado !== 'listo' || step?.tipo !== 'hazlo') return
    const el = targetRef.current
    if (!el) return
    const onClick = (e) => {
      if (step.ruta) {
        // Navegación: la hacemos nosotros (irA resuelve la página del paso siguiente).
        e.preventDefault(); e.stopPropagation()
        irA(paso + 1)
        return
      }
      // Acción local (abrir modal, seleccionar, pestaña): dejamos pasar el clic y avanzamos.
      setTimeout(() => irA(paso + 1), 60)
    }
    el.addEventListener('click', onClick, { capture: true, once: true })
    return () => el.removeEventListener('click', onClick, { capture: true })
  }, [estado, step, paso, irA])

  // Audio del paso.
  useEffect(() => {
    const a = audioRef.current
    if (!a || !modulo || !step) return
    a.pause(); setReproduciendo(false)
    const clip = manifest[`${modulo.id}/${step.id}`]
    if (!clip || mute) { a.removeAttribute('src'); return }
    a.src = `/entrenamiento/${clip.file}`
    a.currentTime = 0
    a.play().then(() => setReproduciendo(true)).catch(() => setReproduciendo(false))
  }, [modulo, step, mute])

  // Teclado: Esc sale, → siguiente (solo en mostrar).
  useEffect(() => {
    if (!modulo) return
    const onKey = (e) => {
      if (e.key === 'Escape') salir()
      if (e.key === 'ArrowRight' && step?.tipo === 'mostrar' && !esUltimo) irA(paso + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modulo, step, paso, esUltimo, irA, salir])

  if (!modulo || !step) return null // módulo desconocido o paso fuera de rango

  const clip = manifest[`${modulo.id}/${step.id}`]
  const toggleMute = () => { const v = !mute; setMute(v); try { localStorage.setItem('tour_mute', v ? '1' : '0') } catch {} }
  const togglePlay = () => {
    const a = audioRef.current; if (!a || !clip) return
    if (a.paused) a.play().then(() => setReproduciendo(true)).catch(() => {}); else { a.pause(); setReproduciendo(false) }
  }

  // Posición de la tarjeta: debajo del elemento si cabe, si no encima; centrada si no hay rect.
  let cardStyle = { left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }
  if (rect && estado === 'listo') {
    const vw = window.innerWidth, vh = window.innerHeight
    const left = Math.min(Math.max(MARGEN, rect.left), vw - ANCHO_TARJETA - MARGEN)
    const abajo = rect.top + rect.height + MARGEN
    const cabeAbajo = abajo + 220 < vh
    cardStyle = cabeAbajo ? { left, top: abajo } : { left, bottom: vh - rect.top + MARGEN }
  }

  return (
    <>
      {rect && estado === 'listo' && (
        <div className="tour-spot" style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }} aria-hidden="true" />
      )}
      <div className="tour-card" style={cardStyle} role="dialog" aria-live="polite" aria-label={`Recorrido: ${modulo.titulo}`}>
        <div className="tour-card__head">
          <span className="label">Paso {paso} de {total} · {modulo.titulo}</span>
          <button className="tour-card__x" onClick={salir} title="Salir del recorrido (Esc)">×</button>
        </div>
        <h4 className="tour-card__title">{step.titulo}</h4>
        <p className="tour-card__text">{estado === 'ausente'
          ? 'Todavía no veo este elemento. Si la pantalla sigue cargando, espera un momento; si tu centro no tiene datos para mostrarlo, puedes omitir el paso.'
          : step.texto}</p>
        {clip && estado !== 'ausente' && (
          <div className="tour-card__audio">
            <button className="btn" onClick={togglePlay} title={reproduciendo ? 'Pausar' : 'Escuchar'}>{reproduciendo ? '❚❚' : '▶'}</button>
            <button className="btn" onClick={toggleMute} title={mute ? 'Activar voz' : 'Silenciar'}>{mute ? '🔇' : '🔊'}</button>
            <span className="h-sub" style={{ margin: 0 }}>{mute ? 'Voz silenciada' : 'Con la voz de Fernando'}</span>
          </div>
        )}
        {errorGuardar && <div className="alert alert--error" style={{ marginBottom: 10, fontSize: 12.5 }}>{errorGuardar}</div>}
        <div className="tour-card__actions">
          {estado === 'ausente' ? (
            <>
              <button className="btn" onClick={salir}>Salir</button>
              {esUltimo ? <button className="btn btn--primary" onClick={terminar} disabled={terminando}>Terminar</button>
                        : <button className="btn btn--primary" onClick={() => irA(paso + 1)}>Omitir →</button>}
            </>
          ) : step.tipo === 'hazlo' ? (
            <>
              <span className="tour-card__hint">Haz clic en el elemento resaltado</span>
              <button className="tour-card__link" onClick={() => irA(paso + 1)}>Omitir este paso</button>
            </>
          ) : (
            <>
              <button className="btn" onClick={() => irA(paso - 1)} disabled={paso <= 1}>← Anterior</button>
              {esUltimo ? <button className="btn btn--primary" onClick={terminar} disabled={terminando}>{terminando ? 'Guardando…' : 'Terminar ✓'}</button>
                        : <button className="btn btn--primary" onClick={() => irA(paso + 1)}>Siguiente →</button>}
            </>
          )}
        </div>
        <audio ref={audioRef} preload="none" onEnded={() => setReproduciendo(false)} />
      </div>
    </>
  )
}
