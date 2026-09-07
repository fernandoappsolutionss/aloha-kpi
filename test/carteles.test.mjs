import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PDFDocument } from 'pdf-lib'
import { FORMATOS, datosWifi, enlaceGoogle, nombreArchivo } from '../lib/carteles/domain.mjs'
import { crearCartelPdf } from '../lib/carteles/pdf.mjs'

test('Google conserva el destino y rechaza enlaces ajenos o engañosos', () => {
  for (const url of ['https://g.page/r/centro123/review', 'https://search.google.com/local/writereview?placeid=Ch123', 'https://maps.app.goo.gl/abc123', 'https://www.google.com/maps/place/ALOHA']) assert.equal(enlaceGoogle(url), url)
  for (const url of ['', 'javascript:alert(1)', 'https://google.com.ejemplo.com/maps', 'https://www.google.com/url?q=https://example.com', 'https://example.com', 'https://usuario:clave@g.page/r/uno/review', 'http://maps.app.goo.gl/uno', 'https://search.google.com/local/writereview']) assert.throws(()=>enlaceGoogle(url))
})
test('WiFi conserva espacios y escapa delimitadores, con recepción y red abierta válidas', () => {
  assert.equal(datosWifi().qr, null)
  assert.equal(datosWifi(' ALOHA;Invitados ', '1234:5678').qr, 'WIFI:T:WPA;S: ALOHA\\;Invitados ;P:1234\\:5678;;')
  assert.equal(datosWifi('ALOHA').qr, 'WIFI:T:nopass;S:ALOHA;P:;;')
  for (const args of [['', '12345678'], ['ñ'.repeat(17)], ['red\n'], ['ALOHA', '123'], ['ALOHA', 'x'.repeat(64)]]) assert.throws(()=>datosWifi(...args))
})
test('el nombre descargado distingue centro y tamaño y permanece entre meses', () => {
  assert.equal(nombreArchivo({tipo:'encuesta',centroId:2,anio:2026,mes:9,formato:'a4'}), 'ALOHA-encuesta-2-permanente-a4.pdf')
  assert.equal(nombreArchivo({tipo:'encuesta',centroId:2,anio:2026,mes:9}),nombreArchivo({tipo:'encuesta',centroId:2,anio:2027,mes:1}))
  assert.notEqual(nombreArchivo({tipo:'google',centroId:2}),nombreArchivo({tipo:'google',centroId:3}))
})
const assets = {mono:readFileSync(new URL('../public/carteles/mono-oficial.pdf',import.meta.url)),logo:readFileSync(new URL('../public/carteles/logo-oficial.png',import.meta.url)),regular:readFileSync(new URL('../public/fonts/FuturaMdBT.ttf',import.meta.url)),bold:readFileSync(new URL('../public/fonts/FuturaMdBT-Bold.ttf',import.meta.url))}
for (const formato of Object.keys(FORMATOS)) for (const tipo of ['encuesta','google','wifi']) test(`${tipo} ${formato}: PDF real, una página y papel exacto`,async()=>{
  const bytes=await crearCartelPdf({tipo,centro:'ANCLAS MALL',enlace:tipo==='google'?'https://g.page/r/ejemplo/review':`https://example.com/encuesta/centro/${'a'.repeat(48)}`,formato},assets)
  assert.equal(new TextDecoder().decode(bytes.slice(0,5)), '%PDF-')
  const doc=await PDFDocument.load(bytes)
  assert.equal(doc.getPageCount(),1)
  assert.deepEqual([doc.getPage(0).getWidth(),doc.getPage(0).getHeight()],FORMATOS[formato])
  assert.match(doc.getTitle(),/ANCLAS MALL/)
  assert.ok(bytes.length > 10000)
})
test('cartel permanente nunca imprime un enlace mensual ni individual de un niño',async()=>{
  const base={tipo:'encuesta',centro:'Anclas',enlace:`https://example.com/encuesta/centro/${'a'.repeat(48)}`}
  await assert.rejects(crearCartelPdf({...base,enlace:`${base.enlace}?p=${'b'.repeat(48)}`},assets),/Enlace/)
  await assert.rejects(crearCartelPdf({...base,enlace:base.enlace.replace('/centro/','/')},assets),/Enlace/)
  await assert.rejects(crearCartelPdf({...base,centro:''},assets),/centro/)
  await assert.rejects(crearCartelPdf({...base,formato:'otro'},assets),/papel/)
})
test('WiFi no sustituye silenciosamente símbolos que cambiarían la red impresa', async()=>{
  await assert.rejects(crearCartelPdf({tipo:'wifi',centro:'Anclas',red:'ALOHA🌴'},assets),/símbolo/)
})
