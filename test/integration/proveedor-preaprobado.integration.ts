import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Readable } from 'node:stream'
import { PDFDocument } from 'pdf-lib'
import { sql, withTransaction } from '../../lib/db.js'
import { peticionesRepository as repo } from '../../lib/peticiones-repository.js'
import { createPeticionesService } from '../../lib/peticiones-service.mjs'
import { createPeticionUploadService } from '../../lib/peticion-upload-service.mjs'
import { inspectPdfStream } from '../../lib/peticion-pdf.mjs'
import { createPeticionDownloadHandler } from '../../lib/peticion-download.mjs'

const url = new URL(process.env.DATABASE_URL || 'https://invalid.test')
if (process.env.E2E_DATABASE_CONFIRM !== 'disposable' || !['127.0.0.1','localhost'].includes(url.hostname) || url.pathname !== '/aloha_proveedor_test') throw new Error('Solo base local exclusiva aloha_proveedor_test.')
const autora = { id: 8, nombre: 'Administradora ficticia', rol: 'administradora', centro_id: 10 }
const coordinator = { id: 2, nombre: 'Coordinador ficticio', rol: 'coordinador', centros: [10] }
const datos = { centroId: 10, anio: 2026, trimestre: 3, texto: 'DB TEST: reparar servicio', categoria: 'reparacion', proveedor_preaprobado: true, proveedor_preaprobado_nombre: '  Servicio ficticio  ' }
// Solo se sustituye el transporte privado a Blob: el repositorio, los permisos,
// el ciclo de carga y la inspección/hash de los bytes son los de producción.
const archivos = new Map<string, Uint8Array>()
const blob = {
  inspect: async (path: string) => {
    const bytes = archivos.get(path)
    if (!bytes) throw new Error('El PDF cargado no existe.')
    return inspectPdfStream(Readable.from([bytes]))
  },
  get: async (path: string) => archivos.has(path) ? { statusCode: 200, stream: new Blob([archivos.get(path)!]).stream() } : null,
}
const service = createPeticionesService({ repo, verifyQuote: async quote => {
  const info = await blob.inspect(quote.blob_pathname)
  if (info.sha256 !== quote.archivo_sha256 || info.bytes !== quote.archivo_bytes) throw new Error('El PDF guardado cambió.')
} })
const uploads = createPeticionUploadService({ repo, blob })
const download = actor => createPeticionDownloadHandler({ authenticate: async () => actor, findQuote: repo.findDownloadableQuote, getBlob: blob.get })

async function cleanup(id: number) {
  await withTransaction(async q => {
    await q('UPDATE peticiones SET cotizacion_aprobada_id=NULL WHERE id=$1',[id])
    await q('DELETE FROM peticion_cotizaciones WHERE peticion_id=$1',[id])
    await q('DELETE FROM peticion_estado_historial WHERE peticion_id=$1',[id])
    await q('DELETE FROM peticiones WHERE id=$1',[id])
    await q('DELETE FROM peticion_blob_cleanup WHERE blob_pathname LIKE $1',[`peticiones/${id}/%`])
  })
}

test('proveedor aprobado: migración, rechazo sin PDF, carga/reintento, envío concurrente, aprobación y descarga privada', async () => {
  const ddl = readFileSync('db/migrations/2026-09-07-peticion-proveedor-preaprobado.sql','utf8')
  await withTransaction(q=>q(ddl,[]))
  await withTransaction(q=>q(ddl,[]))
  const { draft } = await service.createDraft(autora, datos)
  try {
    assert.equal(draft.proveedor_preaprobado, true)
    assert.equal(draft.proveedor_preaprobado_nombre, 'Servicio ficticio')
    const update = await service.updateDraft(autora, { ...datos, id:draft.id, proveedor_preaprobado_nombre:'Servicio corregido' })
    assert.equal(update.draft.proveedor_preaprobado_nombre, 'Servicio corregido')
    await assert.rejects(service.submitPeticion(autora,{centroId:10,id:draft.id}),/cotización válida/)
    const input = {centroId:10,peticionId:draft.id,archivoNombre:'Cotización servicio.pdf', proveedorRazonSocial:'No confiar en nombre del cliente'}
    const prepared = await uploads.prepare(autora,input)
    const token = await uploads.authorizeToken(autora,prepared)
    archivos.set(prepared.pathname,new TextEncoder().encode('Esto no es un PDF'))
    assert.equal((await uploads.complete({blob:{pathname:prepared.pathname,contentType:'application/pdf'},tokenPayload:token.tokenPayload})).invalid,true)
    assert.equal((await uploads.status(autora,{peticionId:draft.id,cotizacionId:prepared.cotizacionId})).upload_status,'invalid')
    await assert.rejects(service.submitPeticion(autora,{centroId:10,id:draft.id}),/cotización válida/)
    await assert.rejects(uploads.prepare(autora,input),/una cotización/)
    await assert.rejects(service.updateDraft(autora,{...datos,id:draft.id,proveedor_preaprobado_nombre:'Otro proveedor'}),/cambiar el proveedor/)
    const retry = await uploads.prepare(autora,{...input,cotizacionId:prepared.cotizacionId})
    const pdf = await PDFDocument.create()
    pdf.addPage().drawText('Cotizacion ficticia del servicio: USD 100')
    const pdfBytes = await pdf.save()
    archivos.set(retry.pathname,pdfBytes)
    const retryToken = await uploads.authorizeToken(autora,retry)
    const completed = {blob:{pathname:retry.pathname,contentType:'application/pdf'},tokenPayload:retryToken.tokenPayload}
    assert.equal((await uploads.complete(completed)).valid,true)
    assert.equal((await uploads.complete(completed)).idempotent,true)
    const [quote] = await repo.listQuotes(sql,draft.id)
    assert.equal(quote.proveedor_preaprobado,true)
    assert.equal(quote.proveedor_razon_social,'Servicio corregido')
    assert.equal(quote.proveedor_pais,null)
    assert.equal(quote.proveedor_id_fiscal,null)
    assert.equal(quote.empresa_constituida,null)
    assert.equal(quote.emite_factura_fiscal,null)
    assert.equal(quote.upload_attempts,2)
    await assert.rejects(sql('UPDATE peticion_cotizaciones SET archivo_mime=NULL WHERE id=$1',[quote.id]),/check constraint/)
    await assert.rejects(sql("UPDATE peticion_cotizaciones SET proveedor_preaprobado=FALSE,proveedor_pais='PA',proveedor_id_fiscal='test',proveedor_id_fiscal_clave='test',empresa_constituida=TRUE,emite_factura_fiscal=TRUE WHERE id=$1",[quote.id]),/foreign key constraint/)
    assert.equal((await download(coordinator)(quote.id)).status,404,'el coordinador no ve PDFs de borradores ajenos')
    archivos.delete(retry.pathname)
    await assert.rejects(service.submitPeticion(autora,{centroId:10,id:draft.id}),/no existe/)
    archivos.set(retry.pathname,pdfBytes)
    const result = await Promise.all([service.submitPeticion(autora,{centroId:10,id:draft.id}),service.submitPeticion(autora,{centroId:10,id:draft.id})])
    assert.deepEqual(result.map(p=>p.alreadySubmitted).sort(), [false,true])
    assert.equal(result[0].peticion.estado,'Próximo trimestre')
    await assert.rejects(uploads.prepare(autora,{...input,cotizacionId:quote.id}),/no se puede cambiar/)
    await assert.rejects(service.changeStatus(autora,{centroId:10,id:draft.id,estado:'Aprobado'}),/autorizado/)
    await assert.rejects(service.changeStatus({...coordinator,centros:[11]},{centroId:10,id:draft.id,estado:'Aprobado'}),/autorizado/)
    const response = await download(coordinator)(quote.id)
    assert.equal(response.status,200)
    assert.equal(response.headers.get('cache-control'),'private, no-store')
    assert.match(response.headers.get('content-disposition'),/Cotizacion_servicio.pdf/)
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()),pdfBytes)
    assert.equal((await download({...coordinator,centros:[11]})(quote.id)).status,404)
    const approved = await service.changeStatus(coordinator,{centroId:10,id:draft.id,estado:'Aprobado'})
    assert.equal(approved.peticion.cotizacion_aprobada_id,quote.id)
    assert.equal(approved.peticion.proveedor_preaprobado_nombre,'Servicio corregido')
    const panel = await service.listPanel(autora, datos)
    const visible = panel.items.find(p=>p.id===draft.id)
    assert.equal(visible.cotizaciones.length,1)
    assert.equal(visible.cotizaciones[0].proveedor_preaprobado,true)
    assert.equal(visible.cotizaciones[0].archivo_nombre,'Cotizacion_servicio.pdf')
    assert.equal(visible.canAddQuote,false)
    const history = await sql('SELECT estado_nuevo, changed_by FROM peticion_estado_historial WHERE peticion_id=$1 ORDER BY id',[draft.id])
    assert.deepEqual(history.map(h=>h.estado_nuevo),['Próximo trimestre','Aprobado'])
    assert.equal(history[1].changed_by,2)
    assert.equal((await service.changeStatus(coordinator,{centroId:10,id:draft.id,estado:'Aprobado'})).unchanged,true)
  } finally { await cleanup(draft.id) }
})

test('modalidad normal conserva tres cotizaciones y requisitos fiscales aunque el cliente declare proveedor aprobado',async()=>{
  const {draft}=await service.createDraft(autora,{...datos,proveedor_preaprobado:false})
  try {
    assert.equal(draft.proveedor_preaprobado,false)
    assert.equal(draft.proveedor_preaprobado_nombre,null)
    await assert.rejects(service.submitPeticion(autora,{centroId:10,id:draft.id}),/tres cotizaciones/)
    await assert.rejects(uploads.prepare(autora,{centroId:10,peticionId:draft.id,proveedor_preaprobado:true,proveedorRazonSocial:'Proveedor sin datos fiscales',archivoNombre:'servicio.pdf'}),/razón social, país ISO válido e identificación fiscal/)
  } finally {await service.discardDraft(autora,{centroId:10,id:draft.id})}
})
