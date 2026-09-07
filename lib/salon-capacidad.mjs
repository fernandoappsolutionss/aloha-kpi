// Capacidad declarada por salón: puestos físicos simultáneos, no matrícula.
export function parseSalonCapacity(raw) {
  if (raw == null || (typeof raw === 'string' && !raw.trim())) return { value: null }
  const text = typeof raw === 'string' ? raw.trim() : String(raw)
  const value = Number(text)
  if (!['number', 'string'].includes(typeof raw) || !/^\d+$/.test(text)
    || !Number.isSafeInteger(value) || value < 1 || value > 2147483647) {
    return { error: 'La capacidad debe ser un número entero de niños mayor que cero.' }
  }
  return { value }
}

export function roomCapacitySummary(salons = []) {
  const active = salons.filter(salon => salon.activo === true)
  const missingRooms = []
  let recordedChildren = 0
  for (const salon of active) {
    const parsed = parseSalonCapacity(salon.capacidad_ninos)
    if (parsed.error || parsed.value == null) missingRooms.push({ id: salon.id, nombre: salon.nombre || `Salón #${salon.id}` })
    else recordedChildren += parsed.value
  }
  const complete = active.length > 0 && missingRooms.length === 0
  return {
    activeRooms: active.length,
    recordedRooms: active.length - missingRooms.length,
    missingRooms, recordedChildren, complete,
    simultaneousChildren: complete ? recordedChildren : null,
  }
}
