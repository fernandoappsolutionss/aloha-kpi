'use client'
// "LO QUE FALTA POR CARGAR" — alerta de higiene de datos del centro.
//
// PERMANENCIA, QUE ES EL PUNTO. No hay X, no hay "recordarme mañana", no hay
// localStorage: nada de lo que se dibuja aquí depende de una decisión del
// usuario. La lista sale de `higieneDeDatos`, que es una función pura sobre los
// datos, así que un punto sólo desaparece cuando el dato está cargado — y
// vuelve solo si alguien lo borra. Si esta alerta llevara un botón de cerrar,
// estaría cerrada el primer día y nadie corregiría nada.
//
// CONTRA EL RUIDO. Los puntos vienen ordenados por lo que desbloquean: primero
// lo que mantiene la confianza en BAJA (y de eso, lo más corto), después lo que
// suma puntos, y al final lo que el centro no puede resolver. Cada punto dice
// cuánta confianza recupera y lleva el enlace a la pantalla donde se carga. Una
// lista que se ve terminable se termina; una que grita lo mismo todos los días
// sin salida se vuelve papel tapiz.
//
// ACCESIBILIDAD. El color nunca va solo: cada punto lleva FORMA (▲ ◆ ·) y
// PALABRA ("Bloquea la proyección" / "Suma confianza" / "No depende del
// centro"), y la sección entera se resume en una línea bajo el título
// ("6 puntos por cargar, de los cuales 3 mantienen la confianza en baja").
// Ese resumen se calculaba y se testeaba pero NO se renderizaba: quien usa
// lector de pantalla entraba sin saber cuántos puntos había ni cuántos
// bloqueaban, y tenía que recorrer los siete bloques para enterarse. Va en el
// documento, no en un aria-label, porque sirve a todo el mundo.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getHigienePendientes } from '../../app/actions/higiene'
import { higieneDeDatos } from '../../lib/higiene-datos.mjs'

// Cuántos nombres se ven sin desplegar. Veintiún grupos sin fecha en pantalla
// es una pared de texto; cinco y un "ver los otros 16" es una tarea.
const VISIBLES = 5

const TONO = {
  bloquea: { forma: '▲', palabra: 'Bloquea la proyección' },
  suma: { forma: '◆', palabra: 'Suma confianza' },
  ajeno: { forma: '·', palabra: 'No depende del centro' },
}

const tonoDe = (punto) => (punto.bloquea ? 'bloquea' : punto.dueno === 'direccion' ? 'ajeno' : 'suma')

function Items({ punto }) {
  if (punto.enlaces?.length) {
    return (
      <ul className="higiene__meses">
        {punto.enlaces.map((enlace) => (
          <li key={enlace.href + enlace.texto}>
            <Link className="higiene__mes" href={enlace.href}>{enlace.texto}</Link>
          </li>
        ))}
      </ul>
    )
  }
  if (!punto.items?.length) return null
  const visibles = punto.items.slice(0, VISIBLES)
  const resto = punto.items.slice(VISIBLES)
  return (
    <>
      <ul className="higiene__items">
        {visibles.map((item, i) => <li key={`${punto.clave}-${i}`}>{item}</li>)}
      </ul>
      {resto.length > 0 && (
        <details className="higiene__resto">
          <summary>Ver {resto.length === 1 ? 'el otro' : `los otros ${resto.length}`}</summary>
          <ul className="higiene__items">
            {resto.map((item, i) => <li key={`${punto.clave}-resto-${i}`}>{item}</li>)}
          </ul>
        </details>
      )}
    </>
  )
}

export default function AlertaHigieneDatos({ centroId, growth = null }) {
  const [pendientes, setPendientes] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    setError('')
    setPendientes(null)
    getHigienePendientes(centroId)
      .then((res) => { if (vivo) setPendientes(res) })
      .catch((causa) => {
        console.error('[AlertaHigieneDatos]', causa)
        // Se dice que no se pudo leer. Callar aquí sería exactamente el modo de
        // fallo que esta alerta existe para evitar: un dato ausente que nadie ve.
        if (vivo) setError('No se pudo revisar qué datos faltan por cargar en este centro. Recarga la página.')
      })
    return () => { vivo = false }
  }, [centroId])

  if (error) {
    return <p role="status" className="higiene__error">{error}</p>
  }
  if (!pendientes) return null

  const higiene = higieneDeDatos({ growth, centroId, ...pendientes })
  if (!higiene.hay) return null

  // Cuando lo único que queda es trabajo de Dirección, la sección se calma:
  // mismo contenido, sin borde de aviso y sin píldora de alarma. La lista no
  // puede llegar a cero (capacity_unverified la empuja siempre), así que un
  // centro impecable enmarcado en ámbar todos los días es papel tapiz.
  const sereno = higiene.soloDireccion && !higiene.bloqueantes

  return (
    <section
      className={`higiene${sereno ? ' higiene--sereno' : ''}`}
      aria-labelledby="higiene-titulo"
      data-higiene-puntos={higiene.total}
      data-higiene-bloqueantes={higiene.bloqueantes}
      data-higiene-sereno={sereno ? '1' : '0'}
    >
      <div className="higiene__head">
        <div className="higiene__head-texto">
          <h3 id="higiene-titulo" className="higiene__h">
            {sereno ? 'Datos completos en este centro' : 'Lo que falta por cargar en este centro'}
          </h3>
          {/* El resumen, en el documento: cuántos puntos hay y cuántos
              bloquean, sin tener que leer la lista entera. */}
          <p className="higiene__resumen">{higiene.resumen}</p>
          <p className="higiene__porque">{higiene.porQue}</p>
        </div>
        <span className={`pill${higiene.bloqueantes ? ' pill--bad' : sereno ? '' : ' pill--warn'}`}>
          <span className="dot" />
          <span aria-hidden="true">{higiene.bloqueantes ? '▲' : sereno ? '·' : '◆'}</span>{' '}
          Confianza {higiene.confianza.texto}
        </span>
      </div>

      {!growth && (
        <p className="higiene__aviso" role="status">
          No se pudo leer el motor de crecimiento: esta lista puede estar incompleta.
        </p>
      )}

      <ol className="higiene__lista">
        {higiene.puntos.map((punto) => {
          const tono = tonoDe(punto)
          return (
            <li key={punto.clave} className={`higiene__punto higiene__punto--${tono}`}>
              <span className="higiene__marca" aria-hidden="true">{TONO[tono].forma}</span>
              <div className="higiene__cuerpo">
                <div className="higiene__estado">{TONO[tono].palabra}</div>
                <h4 className="higiene__titulo">{punto.titulo}</h4>
                <p className="higiene__accion">{punto.accion}</p>
                <Items punto={punto} />
                <div className="higiene__pie">
                  <span className="higiene__ganancia">{punto.gananciaTexto}</span>
                  {punto.donde && (
                    <Link className="higiene__ir" href={punto.donde.href}>{punto.donde.texto} →</Link>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      <p className="higiene__cierre">{higiene.cierre}</p>
      <p className="higiene__nota">
        Esta lista no se cierra a mano: cada punto desaparece solo cuando el dato queda cargado.
      </p>
    </section>
  )
}
