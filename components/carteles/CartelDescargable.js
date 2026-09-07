'use client'
import { useEffect, useRef, useState } from 'react'
import { enlaceGoogle } from '../../lib/carteles/domain.mjs'
import { descargarArchivo, prepararCartel } from '../../lib/carteles/descargar.mjs'

export default function CartelDescargable({ tipo, centroId, centro }) {
  const [enlace,setEnlace]=useState(''),[red,setRed]=useState(''),[clave,setClave]=useState('')
  const [formato,setFormato]=useState('carta'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('')
  const [detallesWifi,setDetallesWifi]=useState(false)
  const revision=useRef(0), trabajando=useRef(false)
  useEffect(()=>{
    ++revision.current;setEnlace('');setRed('');setClave('');setError('');setStatus('');setBusy(false);trabajando.current=false
    try { if(tipo==='google')setEnlace(localStorage.getItem(`aloha-cartel-google-${centroId}`)||'') } catch {}
    return()=>{++revision.current}
  },[centroId,tipo])
  let valido=''
  try { valido=enlaceGoogle(enlace) } catch {}
  async function descargar() {
    if(trabajando.current)return
    trabajando.current=true;setBusy(true);setError('');setStatus('')
    const version=revision.current
    try {
      const r=await prepararCartel({tipo,centroId,centro,formato,enlace,red:detallesWifi?red:'',clave:detallesWifi?clave:''})
      if(version!==revision.current)return
      descargarArchivo(r.blob,r.nombre)
      if(tipo==='google')try {localStorage.setItem(`aloha-cartel-google-${centroId}`,enlaceGoogle(enlace))} catch {}
      setStatus('PDF descargado. Imprime a tamaño real, prueba el QR si lo incluye y coloca el cartel en recepción.')
    } catch(e) {if(version===revision.current)setError(e.message)}
    finally {if(version===revision.current){setBusy(false);trabajando.current=false}}
  }
  const titulo=tipo==='google'?'Reseñas en Google':'WiFi gratis'
  return <details className="poster-download" data-tour={`carteles.${tipo}`}>
    <summary>Preparar cartel PDF</summary>
    <div className="poster-download__body">
      <h4>{titulo} · {centro}</h4>
      <p>Una hoja con diseño ALOHA, lista para imprimir y colocar en tu centro.</p>
      {tipo==='google'?<>
        <label>Enlace de reseñas de Google<input type="url" value={enlace} maxLength={2000} disabled={busy} onChange={e=>{setEnlace(e.target.value);setStatus('');setError('')}} placeholder="https://g.page/r/…/review"/></label>
        <p>En el Perfil de Empresa de Google, abre «Pedir reseñas» y copia el enlace. También puedes usar el enlace de su ficha en Maps. Se recuerda solo en este navegador para este centro.</p>
        {valido&&<a href={valido} target="_blank" rel="noopener noreferrer">Comprobar que abre {centro} ↗</a>}
      </>:<>
        <p>El cartel indica «Pida la red y clave en recepción».</p>
        <label className="poster-download__check"><input type="checkbox" checked={detallesWifi} disabled={busy} onChange={e=>setDetallesWifi(e.target.checked)}/> Incluir red de invitados, clave y QR de conexión</label>
        {detallesWifi&&<>
          <label>Nombre exacto de la red de invitados<input autoComplete="off" value={red} maxLength={32} disabled={busy} onChange={e=>setRed(e.target.value)}/></label>
          <label>Clave de invitados (vacía si la red es abierta)<input type="text" autoComplete="off" value={clave} maxLength={63} disabled={busy} onChange={e=>setClave(e.target.value)}/></label>
          <p>Estos datos aparecerán en el papel. Usa la red de invitados WPA/WPA2, no la interna. La clave no se guarda en la plataforma ni en este navegador.</p>
        </>}
      </>}
      <label>Tamaño del papel<select value={formato} disabled={busy} onChange={e=>setFormato(e.target.value)}><option value="carta">Carta (21,6 × 27,9 cm)</option><option value="a4">A4 (21 × 29,7 cm)</option></select></label>
      <button type="button" className="btn" disabled={busy||!centroId||!centro||centro==='Centro'||(tipo==='google'&&!valido)||(tipo==='wifi'&&detallesWifi&&!red)} onClick={descargar}>{busy?'Preparando PDF…':`Descargar PDF de ${titulo}`}</button>
      <p>Descargar prepara el material. Marca Sí cuando esté colocado y comprobado.</p>
      {error&&<p role="alert" className="survey-error">{error}</p>}{status&&<p role="status">{status}</p>}
    </div>
  </details>
}
