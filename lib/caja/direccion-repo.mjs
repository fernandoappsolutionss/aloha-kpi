import { validarPlanCaja, validarRitual } from './direccion.mjs'

// El candado por empresa/ciclo y la versión evitan que una pestaña antigua
// sobrescriba un cierre o una autorización. Cada versión conserva su foto.
export async function persistirDireccion(query, input, usuario, contexto) {
  await query`SELECT pg_advisory_xact_lock(hashtext(${'caja-direccion:' + input.empresa + ':' + input.ciclo}))`
  const [previo] = await query`SELECT * FROM caja_direccion_ciclos WHERE empresa = ${input.empresa} AND ciclo = ${input.ciclo}::date FOR UPDATE`
  if (Number(previo?.version || 0) !== input.version) throw new Error('El plan cambió en otra sesión. Recarga antes de guardar.')
  const documento = validarPlanCaja(input, previo?.documento, usuario, contexto.hoy)
  validarRitual(input.tipo, documento, { ...contexto, ciclo: input.ciclo, cierre: previo?.cierre_at })
  const version = input.version + 1
  const [guardado] = await query`
    INSERT INTO caja_direccion_ciclos (empresa,ciclo,version,documento,cierre_at,lunes_at,actualizado_por)
    VALUES (${input.empresa},${input.ciclo}::date,${version},${JSON.stringify(documento)}::jsonb,
      CASE WHEN ${input.tipo} = 'cerrar_viernes' THEN now() ELSE NULL END,
      CASE WHEN ${input.tipo} = 'revisar_lunes' THEN now() ELSE NULL END,${usuario.id})
    ON CONFLICT (empresa,ciclo) DO UPDATE SET version = EXCLUDED.version,documento = EXCLUDED.documento,
      cierre_at = COALESCE(caja_direccion_ciclos.cierre_at,EXCLUDED.cierre_at),
      lunes_at = COALESCE(caja_direccion_ciclos.lunes_at,EXCLUDED.lunes_at),
      actualizado_por = EXCLUDED.actualizado_por,updated_at = now()
    RETURNING version`
  await query`INSERT INTO caja_direccion_eventos (empresa,ciclo,version,tipo,documento,foto,usuario_id)
    VALUES (${input.empresa},${input.ciclo}::date,${version},${input.tipo},${JSON.stringify(documento)}::jsonb,${JSON.stringify(contexto.foto)}::jsonb,${usuario.id})`
  return { ok: true, version: guardado.version }
}
