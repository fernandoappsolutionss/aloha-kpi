// Servicio web de Apple Wallet (PassKit Web Service):
//   POST   devices/<dispositivo>/registrations/<passTypeId>/<serial>   registrar (push token)
//   DELETE devices/<dispositivo>/registrations/<passTypeId>/<serial>   dar de baja
//   GET    devices/<dispositivo>/registrations/<passTypeId>?passesUpdatedSince=<etiqueta>
//   GET    passes/<passTypeId>/<serial>                                pase vigente
//   POST   log
import { sql } from '../../../../../../lib/db'
import { baseUrl } from '../../../../../../lib/referidos'
import { appleConfig, authValida, crearPase, serialDe } from '../../../../../../lib/referidos/wallet-apple.mjs'
import { miembroParaWallet } from '../../../../../../lib/referidos/wallet'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const vacio = (status) => new Response(null, { status })

// Serial "<id>-<emisión>": solo vale el de la emisión vigente y con su token.
async function miembroAutorizado(request, serial) {
  const [id, emision] = String(serial || '').split('-').map(Number)
  if (!Number.isInteger(id) || !Number.isInteger(emision)) return null
  const m = await miembroParaWallet(sql, id)
  return m && m.emision === emision && authValida(request.headers.get('authorization'), m.apple_auth) ? m : null
}

async function manejar(request, { params }) {
  const config = appleConfig()
  if (!config) return vacio(404)
  const ruta = (await params).ruta || []
  const metodo = request.method
  if (ruta[0] === 'log') return vacio(200)

  if (ruta[0] === 'passes' && metodo === 'GET') {
    if (ruta[1] !== config.passTypeId) return vacio(404)
    const m = await miembroAutorizado(request, ruta[2])
    if (!m) return vacio(401)
    const modificado = new Date(m.actualizado_at)
    modificado.setMilliseconds(0)
    const desde = Date.parse(request.headers.get('if-modified-since') || '')
    if (desde && modificado.getTime() <= desde) return vacio(304)
    return new Response(crearPase(m, { config, base: baseUrl() }), {
      headers: { 'content-type': 'application/vnd.apple.pkpass', 'last-modified': modificado.toUTCString(), 'cache-control': 'private, no-store' },
    })
  }

  if (ruta[0] === 'devices' && ruta[2] === 'registrations' && ruta[3] === config.passTypeId) {
    const dispositivo = ruta[1]
    if (ruta.length === 4 && metodo === 'GET') {
      // Sin Authorization (así lo define Apple): el id del dispositivo es el secreto.
      const desde = Number(new URL(request.url).searchParams.get('passesUpdatedSince') || 0)
      const filas = await sql`
        SELECT m.id, m.emision, m.version FROM referidos_apple_dispositivos d JOIN referidos_miembros m ON m.id = d.miembro_id
        WHERE d.device_id = ${dispositivo} AND m.version > ${Number.isFinite(desde) ? desde : 0}`
      if (!filas.length) return vacio(204)
      return Response.json({ serialNumbers: filas.map(serialDe), lastUpdated: String(Math.max(...filas.map((f) => f.version))) })
    }
    const m = await miembroAutorizado(request, ruta[4])
    if (!m) return vacio(401)
    if (metodo === 'POST') {
      const pushToken = String((await request.json().catch(() => ({}))).pushToken || '')
      if (!/^[0-9a-f]{32,200}$/i.test(pushToken)) return vacio(400)
      const [previo] = await sql`SELECT 1 AS x FROM referidos_apple_dispositivos WHERE device_id = ${dispositivo} AND miembro_id = ${m.id}`
      await sql`INSERT INTO referidos_apple_dispositivos (device_id, miembro_id, push_token) VALUES (${dispositivo}, ${m.id}, ${pushToken})
        ON CONFLICT (device_id, miembro_id) DO UPDATE SET push_token = EXCLUDED.push_token`
      return vacio(previo ? 200 : 201)
    }
    if (metodo === 'DELETE') {
      await sql`DELETE FROM referidos_apple_dispositivos WHERE device_id = ${dispositivo} AND miembro_id = ${m.id}`
      return vacio(200)
    }
  }
  return vacio(404)
}

export async function GET(request, contexto) { return manejar(request, contexto) }
export async function POST(request, contexto) { return manejar(request, contexto) }
export async function DELETE(request, contexto) { return manejar(request, contexto) }
