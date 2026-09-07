import { createHash, randomBytes } from 'node:crypto'
import { iniciosClase } from '../inicios-clase.mjs'
import { VERSION, periodoPanama, periodoAbierto, validarPeriodo, validarRespuesta, normalizarNombre, telefonoIdentidad, resumenEncuesta } from './domain.mjs'

const tokenNuevo = () => randomBytes(24).toString('hex')
const tokenValido = v => typeof v === 'string' && /^[a-f0-9]{48}$/.test(v)
const iso10 = v => v instanceof Date ? v.toISOString().slice(0,10) : v ? String(v).slice(0,10) : null
export const hashIdentidad = (nombre, telefono, salt) => telefonoIdentidad(telefono) && createHash('sha256').update(`${salt}|${normalizarNombre(nombre)}|${telefonoIdentidad(telefono)}`).digest('hex')

export function crearServicioEncuestas({ query, transaction, now = () => new Date() }) {
  const abierto = c => periodoAbierto(c.anio, c.mes, now())
  // La primera campaña emitida actúa como ancla persistente de la sede. Orden
  // por creación (id), no por periodo: un histórico posterior no cambia el QR.
  async function tokenCentro(q, centroId) {
    const [primera] = await q`SELECT token FROM encuesta_campanas WHERE centro_id=${centroId} ORDER BY id LIMIT 1`
    return primera.token
  }
  function exigirAbierto(c) { if (!abierto(c)) throw new Error('Esta encuesta está cerrada. Solicita al centro el enlace del mes actual.') }
  async function poblacion(q, centroId) {
    const [estudiantes, grupos, eventos] = await Promise.all([
      q`SELECT * FROM estudiantes WHERE centro_id=${centroId}`,
      q`SELECT * FROM grupos WHERE centro_id=${centroId}`,
      q`SELECT * FROM estudiante_eventos WHERE centro_id=${centroId}`,
    ])
    const hoy = periodoPanama(now()).hoy
    const inicios = new Map(iniciosClase(estudiantes, grupos, eventos).map(i => [Number(i.estudianteId), i.fechaInicio]))
    const gruposMap = new Map(grupos.map(g => [Number(g.id),g]))
    return estudiantes.filter(e => {
      const g = gruposMap.get(Number(e.grupo_id))
      const inicio = inicios.get(Number(e.id))
      return ['activo','baja_potencial'].includes(e.estado) && g && !['cerrado','fusionado'].includes(g.estado)
        && inicio && inicio <= hoy && (!e.fecha_retiro || iso10(e.fecha_retiro) > hoy)
        && (!e.retiro_programado_para || iso10(e.retiro_programado_para) > hoy)
    }).map(e => ({...e, grupo:gruposMap.get(Number(e.grupo_id))?.numero || ''}))
  }
  async function cargar(centroId, anio, mes) {
    validarPeriodo(anio,mes)
    const [centro] = await query`SELECT id,nombre FROM centros WHERE id=${centroId}`
    if (!centro) throw new Error('Centro no disponible.')
    const [c] = await query`SELECT * FROM encuesta_campanas WHERE centro_id=${centroId} AND anio=${anio} AND mes=${mes}`
    const vigente = periodoAbierto(anio,mes,now())
    if (!c) {
      const elegibles = vigente ? await poblacion(query,centroId) : []
      return {centro,anio,mes,abierta:vigente,campana:null,resumen:resumenEncuesta({activos:elegibles.length}),participantes:[],respuestas:[]}
    }
    const [participantes,respuestas,difusiones] = await Promise.all([
      query`SELECT p.id,p.nombre,p.grupo,p.token,(p.identity_hash IS NOT NULL) AS tiene_telefono,r.created_at AS respondida_at
        FROM encuesta_participantes p LEFT JOIN encuesta_respuestas r ON r.participante_id=p.id WHERE p.campana_id=${c.id} ORDER BY p.nombre,p.id`,
      query`SELECT general,avance,coach,atencion,mejorar,destacar,created_at FROM encuesta_respuestas WHERE campana_id=${c.id} ORDER BY created_at DESC`,
      query`SELECT d.tipo,d.created_at,u.nombre FROM encuesta_difusiones d JOIN usuarios u ON u.id=d.usuario_id WHERE d.campana_id=${c.id} ORDER BY d.created_at DESC LIMIT 15`,
    ])
    // Nunca devuelve hashes ni sal a la aplicación cliente.
    return {centro,anio,mes,abierta:vigente,campana:{id:c.id,token:c.token,token_permanente:await tokenCentro(query,centroId),corte:c.corte instanceof Date ? c.corte.toISOString().slice(0,10) : String(c.corte).slice(0,10),version:c.version,compartida_at:c.compartida_at},
      resumen:resumenEncuesta(c,respuestas),participantes,respuestas,difusiones}
  }
  async function preparar(centroId, anio, mes) {
    validarPeriodo(anio,mes);exigirAbierto({anio,mes})
    return transaction(async q => {
      // Una apertura concurrente toma el mismo corte, token y denominador.
      await q`SELECT id FROM centros WHERE id=${centroId} FOR UPDATE`
      const [existente] = await q`SELECT id,token FROM encuesta_campanas WHERE centro_id=${centroId} AND anio=${anio} AND mes=${mes}`
      if (existente) return {...existente,token_permanente:await tokenCentro(q,centroId)}
      const estudiantes = await poblacion(q,centroId)
      if (!estudiantes.length) throw new Error('No hay niños activos con inicio de clases registrado. Revisa Grupos y Fusiones antes de abrir la encuesta.')
      const salt = tokenNuevo()
      const [c] = await q`INSERT INTO encuesta_campanas(centro_id,anio,mes,token,identity_salt,version,activos,corte)
        VALUES(${centroId},${anio},${mes},${tokenNuevo()},${salt},${VERSION},${estudiantes.length},${periodoPanama(now()).hoy}) RETURNING id,token`
      const items = estudiantes.map(e => ({estudiante_id:e.id,nombre:e.nombre,grupo:e.grupo,identity_hash:hashIdentidad(e.nombre,e.telefono,salt),token:tokenNuevo()}))
      await q`INSERT INTO encuesta_participantes(campana_id,estudiante_id,nombre,grupo,identity_hash,token)
        SELECT ${c.id},x.estudiante_id,x.nombre,x.grupo,x.identity_hash,x.token FROM jsonb_to_recordset(${JSON.stringify(items)}::jsonb)
        AS x(estudiante_id int,nombre text,grupo text,identity_hash text,token text)`
      await q`SELECT encuesta_sincronizar(${c.id})`
      return {...c,token_permanente:await tokenCentro(q,centroId)}
    })
  }
  async function registrarDifusion(centroId, id, tipo, usuarioId) {
    if (!['copiar','qr','individual'].includes(tipo)) throw new Error('Acción inválida.')
    return transaction(async q => {
      const [c] = await q`SELECT * FROM encuesta_campanas WHERE id=${id} AND centro_id=${centroId} FOR UPDATE`
      if (!c) throw new Error('Encuesta no disponible.')
      exigirAbierto(c)
      await q`INSERT INTO encuesta_difusiones(campana_id,usuario_id,tipo) VALUES(${c.id},${usuarioId},${tipo})`
      await q`UPDATE encuesta_campanas SET compartida_at=COALESCE(compartida_at,now()) WHERE id=${c.id}`
      await q`SELECT encuesta_sincronizar(${c.id})`
      return {ok:true}
    })
  }
  async function publica(token, individual = null) {
    if (!tokenValido(token)) return null
    const [c] = await query`SELECT c.id,c.anio,c.mes,c.version,ce.nombre FROM encuesta_campanas c JOIN centros ce ON ce.id=c.centro_id WHERE c.token=${token}`
    if (!c) return null
    if (individual) {
      if (!tokenValido(individual)) return null
      const [p] = await query`SELECT id FROM encuesta_participantes WHERE campana_id=${c.id} AND token=${individual}`
      if (!p) return null
    }
    return {nombre:c.nombre,anio:c.anio,mes:c.mes,version:c.version,abierta:abierto(c),individual:Boolean(individual)}
  }
  async function vigente(token) {
    if (!tokenValido(token)) return null
    // Solo acepta un token general ya emitido. Un token individual no puede
    // convertirse en acceso permanente ni transportar la identidad del niño.
    const [ancla] = await query`SELECT centro_id FROM encuesta_campanas WHERE token=${token}`
    if (!ancla) return null
    const {anio,mes} = periodoPanama(now())
    const c = await preparar(ancla.centro_id,anio,mes)
    // Preparar fija el nuevo corte bajo candado; no copia respuestas ni
    // difusión del mes anterior. Esta lectura pública no marca Cumplimiento.
    return {token:c.token,datos:await publica(c.token)}
  }
  async function responder(token, input, ip) {
    if (!tokenValido(token)) throw new Error('Encuesta no disponible.')
    const [c] = await query`SELECT id,identity_salt FROM encuesta_campanas WHERE token=${token}`
    if (!c) throw new Error('Encuesta no disponible.')
    const clave = createHash('sha256').update(`${c.identity_salt}:${ip}`).digest('hex')
    const ventana = Math.floor(now().getTime()/600000)
    // Persistente entre instancias. Los intentos fallidos también consumen cupo.
    const [intento] = await query`INSERT INTO encuesta_intentos(campana_id,clave,ventana) VALUES(${c.id},${clave},${ventana})
      ON CONFLICT(campana_id,clave,ventana) DO UPDATE SET intentos=encuesta_intentos.intentos+1 RETURNING intentos`
    if (Number(intento.intentos)>60) throw new Error('Hay demasiados intentos. Espera diez minutos y vuelve a intentar.')
    await query`DELETE FROM encuesta_intentos WHERE campana_id=${c.id} AND ventana < ${ventana-6}`
    const respuestas=validarRespuesta(input)
    if (input.trampa) throw new Error('No se pudo enviar la encuesta.')
    return transaction(async q => {
      const [campana] = await q`SELECT * FROM encuesta_campanas WHERE id=${c.id} FOR UPDATE`
      exigirAbierto(campana)
      let participantes
      if (input.individual) {
        if (!tokenValido(input.individual)) throw new Error('Enlace individual inválido.')
        participantes=await q`SELECT id FROM encuesta_participantes WHERE campana_id=${c.id} AND token=${input.individual}`
      } else {
        const nombre=String(input.nombre || ''), telefono=String(input.telefono || '')
        if (nombre.length>160 || telefono.length>30) throw new Error('Revisa el nombre y teléfono.')
        const identidad=hashIdentidad(nombre,telefono,c.identity_salt)
        participantes=identidad ? await q`SELECT id FROM encuesta_participantes WHERE campana_id=${c.id} AND identity_hash=${identidad}` : []
      }
      if (participantes.length!==1) throw new Error('No pudimos validar los datos. Usa el nombre completo y teléfono registrados, o pide al centro tu enlace individual.')
      const p=participantes[0]
      await q`INSERT INTO encuesta_respuestas(campana_id,participante_id,general,avance,coach,atencion,mejorar,destacar)
        VALUES(${c.id},${p.id},${respuestas.general},${respuestas.avance},${respuestas.coach},${respuestas.atencion},${respuestas.mejorar},${respuestas.destacar})
        ON CONFLICT(participante_id) DO NOTHING`
      await q`SELECT encuesta_sincronizar(${c.id})`
      // Reintento idéntico o diferente: no sobrescribe, no duplica, misma confirmación.
      return {ok:true}
    })
  }
  return {cargar,preparar,registrarDifusion,publica,vigente,responder}
}
