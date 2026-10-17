export const PERIODOS_CLASES_PRUEBA = {
  mes: 'Mes en curso',
  actual: 'Semana actual · parcial',
  ultimoCierre: 'Último cierre',
  seisSemanas: 'Últimas 6 semanas',
}

const conteo = n => Number.isSafeInteger(n) && n >= 0

// Consolida únicamente los centros recibidos (ya autorizados en el tablero).
// El porcentaje se pondera por invitados y los fallos no se convierten en cero.
export function totalClasesPrueba(centros = [], periodo = 'mes') {
  if (!Object.hasOwn(PERIODOS_CLASES_PRUEBA, periodo)) throw new Error('Período de clases de prueba inválido.')
  const disponibles = centros.filter(c => {
    const datos = c.clasesPrueba, p = datos?.[periodo]
    return !datos?.error && p && conteo(p.invitados) && conteo(p.asistentes)
      && p.asistentes <= p.invitados && conteo(datos.proximas?.invitados)
  })
  const suma = leer => disponibles.length ? disponibles.reduce((n, c) => n + leer(c.clasesPrueba), 0) : null
  const invitados = suma(d => d[periodo].invitados)
  const asistentes = suma(d => d[periodo].asistentes)
  const conConversion = disponibles.filter(c => {
    const p = c.clasesPrueba[periodo]
    return conteo(p.matriculados) && p.matriculados <= p.asistentes
  })
  const matriculados = conConversion.length ? conConversion.reduce((n, c) => n + c.clasesPrueba[periodo].matriculados, 0) : null
  const asistentesConversion = conConversion.length ? conConversion.reduce((n, c) => n + c.clasesPrueba[periodo].asistentes, 0) : null
  const rangos = disponibles.map(c => ({ centro: c.nombre, desde: c.clasesPrueba[periodo].desde, hasta: c.clasesPrueba[periodo].hasta }))
  const rangoComun = rangos.length && rangos.every(r => r.desde === rangos[0].desde && r.hasta === rangos[0].hasta)
    ? { desde: rangos[0].desde, hasta: rangos[0].hasta } : null
  return { invitados, asistentes, matriculados, asistentesConversion,
    conversion: asistentesConversion ? matriculados / asistentesConversion * 100 : null,
    conversionDisponibles: conConversion.length,
    conversionFaltantes: centros.filter(c => !conConversion.includes(c)).map(c => c.nombre),
    agendados: suma(d => d.proximas.invitados),
    porcentaje: invitados ? asistentes / invitados * 100 : null,
    total: centros.length, disponibles: disponibles.length,
    faltantes: centros.filter(c => !disponibles.includes(c)).map(c => c.nombre), rangoComun, rangos }
}
