'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { EFIMEROS, pasoActual } from '../../lib/entrenamiento/oficio/guia-pasos'

const GuiaContext = createContext(null)
const EFIMEROS_SET = new Set(EFIMEROS)

export function useGuia() {
  return useContext(GuiaContext)
}

const filtra = (ids, validos, { soloEfimeros = false } = {}) => {
  const out = []
  for (const id of Array.isArray(ids) ? ids : []) {
    if (!validos.has(id) || id === 'cierre') continue
    if (soloEfimeros && !EFIMEROS_SET.has(id)) continue
    if (!out.includes(id)) out.push(id)
  }
  return out
}

function leerJsonLocal(clave, validos) {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(clave)
    const parsed = raw ? JSON.parse(raw) : []
    return filtra(parsed, validos, { soloEfimeros: true })
  } catch {
    return []
  }
}

function persistirEfimeros(clave, hechos) {
  if (typeof window === 'undefined') return
  const datos = [...hechos].filter((id) => EFIMEROS_SET.has(id))
  try { window.localStorage.setItem(clave, JSON.stringify(datos)) } catch {}
}

function archivoClip(clip) {
  if (!clip) return ''
  if (typeof clip === 'string') return clip
  return clip.file || ''
}

function srcClip(clip) {
  const file = archivoClip(clip)
  if (!file) return ''
  return file.startsWith('/entrenamiento/') ? file : `/entrenamiento/${file}`
}

export default function GuiaModulo({
  usuarioId,
  moduloId,
  pasos,
  hechosServidor,
  portada,
  vista,
  palabras,
  laminas,
  lectura,
  preguntas,
  cierre,
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const slots = { portada, vista, palabras, laminas, lectura, preguntas, cierre }
  const pasosLista = useMemo(() => Array.isArray(pasos) ? pasos.filter((p) => p?.id) : [], [pasos])
  const pasosValidos = useMemo(() => new Set(pasosLista.map((p) => p.id)), [pasosLista])
  const clave = `ofi-guia:${usuarioId}:${moduloId}`
  const inicial = useMemo(() => new Set(filtra(hechosServidor, pasosValidos)), [hechosServidor, pasosValidos])
  const [hechosLista, setHechosLista] = useState(() => [...inicial])
  const [actual, setActual] = useState(() => pasoActual(pasosLista, inicial))
  const [abiertos, setAbiertos] = useState([])
  const [audio, setAudio] = useState('idle')
  const [mute, setMute] = useState(false)
  const audioRef = useRef(null)
  const hechosRef = useRef(inicial)
  const actualRef = useRef(actual)
  const muteRef = useRef(false)

  const escribirHechos = useCallback((next, { conservarAbiertos = false } = {}) => {
    hechosRef.current = next
    const nextActual = pasoActual(pasosLista, next)
    actualRef.current = nextActual
    setHechosLista([...next])
    setActual(nextActual)
    setAbiertos((prev) => conservarAbiertos ? prev.filter((id) => next.has(id) && pasosValidos.has(id)) : [])
    return nextActual
  }, [pasosLista, pasosValidos])

  const detenerAudio = useCallback(() => {
    const a = audioRef.current
    if (!a) return
    try { a.pause() } catch {}
    try { a.currentTime = 0 } catch {}
    try { a.removeAttribute('src') } catch {}
    try { a.load() } catch {}
    setAudio('idle')
  }, [])

  const reproducirPaso = useCallback((id) => {
    const paso = pasosLista.find((p) => p.id === id)
    const src = srcClip(paso?.clip)
    detenerAudio()
    if (!src || muteRef.current) return
    const a = audioRef.current
    if (!a) return
    a.src = src
    try { a.load() } catch {}
    try { a.currentTime = 0 } catch {}
    const promesa = a.play()
    if (promesa?.then) {
      promesa.then(() => setAudio('playing')).catch(() => setAudio('blocked'))
    } else {
      setAudio('playing')
    }
  }, [detenerAudio, pasosLista])

  useEffect(() => {
    const next = new Set([...filtra(hechosServidor, pasosValidos), ...leerJsonLocal(clave, pasosValidos)])
    escribirHechos(next)
    try {
      const v = window.localStorage.getItem('ofi_voz_mute') === '1'
      muteRef.current = v
      setMute(v)
    } catch {}
  }, [clave])

  useEffect(() => {
    const durable = filtra(hechosServidor, pasosValidos)
    if (durable.length === 0) return
    const next = new Set([...hechosRef.current, ...durable])
    escribirHechos(next, { conservarAbiertos: true })
  }, [escribirHechos, hechosServidor, pasosValidos])

  const completar = useCallback((id, { durable = false } = {}) => {
    if (!pasosValidos.has(id) || id === 'cierre') return
    const next = new Set(hechosRef.current)
    next.add(id)
    const nextActual = escribirHechos(next)
    persistirEfimeros(clave, next)
    reproducirPaso(nextActual)
    if (durable) startTransition(() => router.refresh())
  }, [clave, pasosValidos, reproducirPaso, router, startTransition, escribirHechos])

  const ver = useCallback((id) => {
    if (!pasosValidos.has(id)) return
    if (id === actualRef.current) return
    if (!hechosRef.current.has(id)) return
    setAbiertos((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }, [pasosValidos])

  const silenciar = () => {
    const v = !mute
    muteRef.current = v
    setMute(v)
    try { window.localStorage.setItem('ofi_voz_mute', v ? '1' : '0') } catch {}
    if (v) detenerAudio()
  }

  const pausar = () => {
    const a = audioRef.current
    if (!a) return
    try { a.pause() } catch {}
    setAudio('paused')
  }

  const reanudar = () => {
    const a = audioRef.current
    if (!a || !a.getAttribute('src')) {
      reproducirPaso(actualRef.current)
      return
    }
    const promesa = a.play()
    if (promesa?.then) promesa.then(() => setAudio('playing')).catch(() => setAudio('blocked'))
    else setAudio('playing')
  }

  const hechos = useMemo(() => new Set(hechosLista), [hechosLista])
  const contexto = useMemo(() => ({ completar, actual, hechos }), [actual, completar, hechos])
  const clipActual = srcClip(pasosLista.find((p) => p.id === actual)?.clip)
  const tieneClipActual = Boolean(clipActual)

  return (
    <GuiaContext.Provider value={contexto}>
      <section className="ofi-guia card" aria-labelledby="ofi-guia-titulo">
        <div className="ofi-guia__head">
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Recorrido guiado</div>
            <h2 id="ofi-guia-titulo">Estudia este módulo paso a paso</h2>
          </div>
          <div className="ofi-guia__audio" aria-live="polite">
            {audio === 'playing' ? (
              <button type="button" className="btn" onClick={pausar}>Pausar voz</button>
            ) : (
              <button type="button" className="btn" onClick={reanudar} disabled={mute || !tieneClipActual}>
                {audio === 'blocked' ? 'Seguir con Fernando' : 'Escuchar paso'}
              </button>
            )}
            <button type="button" className="btn" onClick={silenciar}>{mute ? 'Activar voz' : 'Silenciar'}</button>
            <span className="h-sub" style={{ margin: 0 }}>{mute ? 'Voz silenciada' : tieneClipActual ? 'Con la voz de Fernando' : 'Sin voz todavía'}</span>
          </div>
        </div>

        <ol className="ofi-guia__indice">
          {pasosLista.map((paso, i) => {
            const cumplido = hechos.has(paso.id)
            const estaAbierto = paso.id === actual || abiertos.includes(paso.id)
            const disponible = paso.id === actual || cumplido
            return (
              <li key={paso.id} className={paso.id === actual ? 'ofi-guia__idx ofi-guia__idx--actual' : cumplido ? 'ofi-guia__idx ofi-guia__idx--hecho' : 'ofi-guia__idx'}>
                <button
                  type="button"
                  onClick={() => ver(paso.id)}
                  disabled={!disponible}
                  aria-current={paso.id === actual ? 'step' : undefined}
                  aria-expanded={estaAbierto}
                >
                  <span>{i + 1}</span>
                  <strong>{paso.titulo}</strong>
                </button>
              </li>
            )
          })}
        </ol>

        <div className="ofi-guia__cuerpo">
          {pasosLista.map((paso) => {
            const estaAbierto = paso.id === actual || abiertos.includes(paso.id)
            const esActual = paso.id === actual
            return (
              <section
                key={paso.id}
                className="ofi-guia__paso"
                hidden={!estaAbierto}
                aria-labelledby={`ofi-guia-${paso.id}`}
              >
                <div className="ofi-guia__paso-head">
                  <div>
                    <div className="label">Paso guiado</div>
                    <h3 id={`ofi-guia-${paso.id}`}>{paso.titulo}</h3>
                    {paso.detalle && <p className="h-sub">{paso.detalle}</p>}
                  </div>
                  {hechos.has(paso.id) && <span className="ent-pill ent-pill--ok">Listo</span>}
                </div>
                <div key={`${paso.id}-slot`} className="ofi-guia__slot">{slots[paso.id]}</div>
                {paso.id === 'portada' && esActual && (
                  <div className="ofi-guia__acciones">
                    <button type="button" className="btn" onClick={() => reproducirPaso('portada')} disabled={!srcClip(paso.clip)}>Empezar</button>
                    <button type="button" className="btn btn--primary" onClick={() => completar('portada')}>Continuar</button>
                  </div>
                )}
                {paso.id === 'laminas' && esActual && (
                  <div className="ofi-guia__acciones">
                    <button type="button" className="btn btn--primary" onClick={() => completar('laminas')}>Continuar</button>
                  </div>
                )}
              </section>
            )
          })}
        </div>
        <audio ref={audioRef} preload="none" onEnded={() => setAudio('idle')} />
      </section>
    </GuiaContext.Provider>
  )
}
