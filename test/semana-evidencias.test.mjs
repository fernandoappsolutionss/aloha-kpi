import test from 'node:test'
import assert from 'node:assert/strict'
import { leerArchivoEvidencia, MAX_EVIDENCIA } from '../lib/semana-evidencias.mjs'
import { guardarEvidenciaEn } from '../lib/semana-evidencias-servicio.js'
const pdf = () => new File(['%PDF-1.4\nPrueba'], 'comprobante.pdf', { type: 'application/pdf' })

test('adjuntos: firma real, nombre sin rutas y tamaño acotado', async () => {
  const r = await leerArchivoEvidencia(pdf())
  assert.equal(r.tipo, 'application/pdf'); assert.equal(r.nombre, 'comprobante.pdf')
  const png = new File([new Uint8Array([137,80,78,71,13,10,26,10])], '../../soporte.png')
  assert.equal((await leerArchivoEvidencia(png)).nombre, 'soporte.png')
  assert.equal((await leerArchivoEvidencia(new File([new Uint8Array([255,216,255])], 'foto.jpg'))).tipo, 'image/jpeg')
  await assert.rejects(leerArchivoEvidencia(new File(['<script>'], 'falso.pdf', { type:'application/pdf' })), /contenido/)
  await assert.rejects(leerArchivoEvidencia(new File([], 'vacio.pdf')), /Selecciona/)
  await assert.rejects(leerArchivoEvidencia(new File([new Uint8Array(MAX_EVIDENCIA+1)], 'grande.pdf')), /2 MB/)
})

test('no se sustituye evidencia realizada, ni se adjunta a otro centro u orden', async () => {
  for (const objetivo of [null, {id:1,hecho:true,seccion:'formula'}, {id:1,hecho:false,seccion:'orden'}]) {
    let escrituras = 0
    const query = async (s, ...v) => {
      if(s.join('').includes('SELECT')) { assert.deepEqual(v,[1,2]); assert.match(s.join(''),/FOR UPDATE OF o/); return objetivo ? [objetivo] : [] }
      escrituras++; return []
    }
    await assert.rejects(guardarEvidenciaEn(2,1,pdf(),101,{transaction:fn=>fn(query)}), /Reabre|no disponible/)
    assert.equal(escrituras,0)
  }
})

test('adjunto guarda contenido y autor dentro de la transacción del objetivo', async () => {
  let values
  const r = await guardarEvidenciaEn(2,1,pdf(),101,{transaction:fn=>fn(async (s,...v)=>{
    if(s.join('').includes('SELECT')) return [{id:1,hecho:false,seccion:'formula'}]
    values=v; return []
  })})
  assert.deepEqual(r,{nombre:'comprobante.pdf',tipo:'application/pdf'})
  assert.equal(values[0],1); assert.equal(values.at(-1),101)
  assert.equal(Buffer.from(values[3],'base64').toString(), '%PDF-1.4\nPrueba')
})
