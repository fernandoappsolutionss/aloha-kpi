import { ventana13, sumarDias, fechasDelCompromiso } from './semanas.mjs'

const PESOS_DEFECTO = Object.freeze([0.18, 0.19, 0.21, 0.42]) // perfil medido de Altavia mar–ago 2026
const r2 = (n) => Math.round(n * 100) / 100
const bloqueDelDia = (dia) => (dia <= 7 ? 0 : dia <= 14 ? 1 : dia <= 21 ? 2 : 3)
const diasDelMes = (iso) => { const [y, m] = iso.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate() }
const diasDelBloque = (iso, b) => (b < 3 ? 7 : diasDelMes(iso) - 21)

export function perfilIngresos(movimientos, hoy, meses = 3) {
  const mesHoy = hoy.slice(0, 7)
  const cerrados = [...new Set(movimientos.map((m) => m.fecha.slice(0, 7)).filter((k) => k < mesHoy))].sort().slice(-meses)
  if (!cerrados.length) return { promedioMensual: 0, pesos: PESOS_DEFECTO, meses: [] }
  const ingresos = movimientos.filter((m) => m.clase === 'ingreso' && cerrados.includes(m.fecha.slice(0, 7)))
  const total = ingresos.reduce((s, m) => s + Number(m.monto), 0)
  const porBloque = [0, 0, 0, 0]
  for (const m of ingresos) porBloque[bloqueDelDia(Number(m.fecha.slice(8, 10)))] += Number(m.monto)
  return {
    promedioMensual: total / cerrados.length,
    pesos: total > 0 ? porBloque.map((v) => v / total) : PESOS_DEFECTO,
    meses: cerrados,
  }
}

function ingresoDelDia(iso, perfil) {
  const b = bloqueDelDia(Number(iso.slice(8, 10)))
  return (perfil.promedioMensual * perfil.pesos[b]) / diasDelBloque(iso, b)
}

export function baldeVigente(baldes, fecha) {
  return [...baldes].filter((b) => b.vigente_desde <= fecha)
    .sort((a, b) => (a.vigente_desde < b.vigente_desde ? 1 : -1))[0] || { dueno_pct: 0, impuesto_pct: 0 }
}

// Movimientos de las cuentas operativas/recaudadoras de UNA empresa.
export function estadoBaldes(movimientos, baldes, hoy) {
  const inicio = baldes.map((b) => b.vigente_desde).sort()[0]
  if (!inicio) return { duenoPendiente: 0, reservaImpuesto: 0 }
  let dueno = 0
  let impuesto = 0
  for (const m of movimientos) {
    if (m.fecha < inicio || m.fecha > hoy) continue
    if (m.clase === 'ingreso') {
      const b = baldeVigente(baldes, m.fecha)
      dueno += (Number(m.monto) * Number(b.dueno_pct)) / 100
      impuesto += (Number(m.monto) * Number(b.impuesto_pct)) / 100
    } else if (m.clase === 'dueno') dueno += Number(m.monto) // negativo: lo que ya se transfirió
    else if (m.clase === 'impuesto') impuesto += Number(m.monto)
  }
  return { duenoPendiente: r2(Math.max(0, dueno)), reservaImpuesto: r2(Math.max(0, impuesto)) }
}

export function conSemaforo(semanas, lineaDisponible = 0) {
  const promedioEgreso = semanas.reduce((s, x) => s + x.egresoTotal, 0) / (semanas.length || 1)
  const piso = 2 * promedioEgreso
  return {
    piso: r2(piso),
    lineaDisponible,
    semanas: semanas.map((s) => ({
      ...s,
      lineaNecesaria: r2(Math.max(0, -s.disponible)),
      lineaExcedida: Math.max(0, -s.disponible) > lineaDisponible,
      semaforo: s.disponible < 0 ? 'rojo' : s.disponible < piso ? 'ambar' : 'verde',
    })),
  }
}

export function calcularCurva({ hoy, saldoHoy, perfil, compromisos = [], ajustes = [], baldes = [], baldesEstado = { duenoPendiente: 0, reservaImpuesto: 0 }, lineaDisponible = 0 }) {
  const lunes = ventana13(hoy)
  const manana = sumarDias(hoy, 1)
  const fin = sumarDias(lunes[12], 6)
  const ajustePorSemana = new Map(ajustes.map((a) => [a.semana, Number(a.ingreso)]))
  const pagos = compromisos.flatMap((c) => fechasDelCompromiso(c, manana, fin).map((fecha) => ({ fecha, clase: c.clase, monto: Number(c.monto) })))

  let saldo = saldoHoy
  let reserva = baldesEstado.reservaImpuesto
  const semanas = lunes.map((l, i) => {
    const domingo = sumarDias(l, 6)
    const desde = i === 0 ? manana : l
    // Cada día usa el balde vigente ESE día (como estadoBaldes con lo real): un cambio de
    // escalón a mitad de semana no arrastra el % viejo a toda la semana. El ajuste manual
    // reemplaza el monto y hereda el % ponderado de la proyección.
    let proyectado = 0
    let duenoPond = 0
    let impuestoPond = 0
    for (let d = desde; d <= domingo; d = sumarDias(d, 1)) {
      const v = ingresoDelDia(d, perfil)
      const bd = baldeVigente(baldes, d)
      proyectado += v
      duenoPond += v * Number(bd.dueno_pct)
      impuestoPond += v * Number(bd.impuesto_pct)
    }
    const ingresos = ajustePorSemana.has(l) ? ajustePorSemana.get(l) : proyectado
    const bRef = baldeVigente(baldes, desde <= domingo ? desde : domingo)
    const pctDueno = proyectado > 0 ? duenoPond / proyectado : Number(bRef.dueno_pct)
    const pctImpuesto = proyectado > 0 ? impuestoPond / proyectado : Number(bRef.impuesto_pct)
    const dueno = (ingresos * pctDueno) / 100 + (i === 0 ? baldesEstado.duenoPendiente : 0)
    const egresos = {}
    for (const p of pagos) if (p.fecha >= desde && p.fecha <= domingo) egresos[p.clase] = (egresos[p.clase] || 0) + p.monto
    const egresoTotal = Object.values(egresos).reduce((s, v) => s + v, 0)
    const saldoInicial = saldo
    saldo = saldo + ingresos - egresoTotal - dueno
    reserva = Math.max(0, reserva + (ingresos * pctImpuesto) / 100 - (egresos.impuesto || 0))
    return {
      lunes: l, domingo,
      saldoInicial: r2(saldoInicial), ingresos: r2(ingresos),
      egresos: Object.fromEntries(Object.entries(egresos).map(([k, v]) => [k, r2(v)])),
      egresoTotal: r2(egresoTotal), dueno: r2(dueno), saldoFinal: r2(saldo),
      reservaImpuesto: r2(reserva), disponible: r2(saldo - reserva),
      ajustado: ajustePorSemana.has(l),
    }
  })
  return conSemaforo(semanas, lineaDisponible)
}

// Intercompañía no se proyecta, así que el consolidado es la suma semana a semana.
export function consolidar(a, b) {
  const campos = ['saldoInicial', 'ingresos', 'egresoTotal', 'dueno', 'saldoFinal', 'reservaImpuesto', 'disponible']
  const semanas = a.semanas.map((sa, i) => {
    const sb = b.semanas[i]
    const out = { lunes: sa.lunes, domingo: sa.domingo, ajustado: sa.ajustado || sb.ajustado, egresos: { ...sa.egresos } }
    for (const [k, v] of Object.entries(sb.egresos)) out.egresos[k] = r2((out.egresos[k] || 0) + v)
    for (const c of campos) out[c] = r2(sa[c] + sb[c])
    return out
  })
  return conSemaforo(semanas, a.lineaDisponible)
}
