export const CAJA_HCA = [
  { campo: 'ingresos', titulo: 'Ingresos proyectados' },
  { campo: 'egresos', titulo: 'Egresos y dueño proyectados', inversa: true },
  { campo: 'disponible', titulo: 'Disponible proyectado' },
]

const numero = v => v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v)

export function puntosCaja(curva, campo) {
  return curva.semanas.map((s, i) => {
    const gasto = numero(s.egresoTotal), dueno = numero(s.dueno)
    return {
      periodo: `${s.lunes} al ${s.domingo}`,
      etiqueta: `S${i + 1}`,
      subetiqueta: s.lunes.slice(5).split('-').reverse().join('/'),
      valor: campo === 'egresos' ? (gasto == null || dueno == null ? null : gasto + dueno) : numero(s[campo]),
      cuota: campo === 'disponible' ? numero(curva.piso) : null,
      abierto: true,
    }
  })
}
