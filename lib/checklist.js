// Claves del checklist de cumplimiento (33 ítems), en el mismo orden que la
// hoja "Cumplimiento" de los Excel y la tabla `cumplimiento`. Módulo plano
// (sin 'use server') para poder importarlo desde acciones y utilidades.
export const CUMPLIMIENTO_KEYS = [
  'classdojo_activo', 'ninos_completos_classdojo', 'padres_conectados', 'muro_informacion', 'bienvenida',
  'calendario', 'clase_padres', 'fotos_grupo', 'seguimiento_evolucion', 'asistente_classdojo', 'portafolio',
  'grupo_study', 'ninos_activos_study', 'niveles_actualizados', 'coach_activo', 'ninos_trabajando_study', 'asistencia_dias',
  'centro_buen_estado', 'aromatizante', 'mesa_cafe', 'brochure', 'cartel_qr', 'wifi_gratis', 'saludo_cordial', 'encuestas_satisfaccion',
  'coach_estrella', 'reuniones_mensuales', 'monitoreo_camaras', 'actividades_equipo', 'encuestas_equipo',
  'meta_cobranza', 'meta_desercion', 'meta_nuevos_ingresos',
]

// Etiqueta legible de cada ítem del checklist (misma redacción que la página de
// Cumplimiento). Se comparte para poder generar las Fortalezas/Debilidades del
// FODA a partir del cumplimiento real (vinculación cumplimiento ↔ FODA).
export const CUMPLIMIENTO_LABELS = {
  classdojo_activo: 'Classdojo activo',
  ninos_completos_classdojo: 'Niños completos en Classdojo',
  padres_conectados: 'Padres conectados',
  muro_informacion: 'Muro con información',
  bienvenida: 'Bienvenida publicada',
  calendario: 'Calendario publicado',
  clase_padres: 'Clase de padres',
  fotos_grupo: 'Fotos de grupo',
  seguimiento_evolucion: 'Seguimiento evolución',
  asistente_classdojo: 'Asistente activa',
  portafolio: 'Portafolio con retroalimentación',
  grupo_study: 'Grupo creado en Study',
  ninos_activos_study: 'Niños activos completos en Study',
  niveles_actualizados: 'Niveles actualizados',
  coach_activo: 'Coach activo',
  ninos_trabajando_study: 'Niños trabajando (gráfica)',
  asistencia_dias: 'Asistencia con días trabajados',
  centro_buen_estado: 'Centro en buen estado',
  aromatizante: 'Aromatizante en recepción',
  mesa_cafe: 'Mesa de café y té',
  brochure: 'Brochure en recepción',
  cartel_qr: 'Cartel QR para Google',
  wifi_gratis: 'Mensaje WIFI Gratis',
  saludo_cordial: 'Saludo cordial a padres',
  encuestas_satisfaccion: 'Encuestas de satisfacción',
  coach_estrella: 'Premiar Coach estrella del mes',
  reuniones_mensuales: 'Reuniones mensuales con equipo',
  monitoreo_camaras: 'Monitoreo de cámaras',
  actividades_equipo: 'Actividades internas del equipo',
  encuestas_equipo: 'Encuestas al equipo (semestral)',
  meta_cobranza: 'Meta de cobranza lograda',
  meta_desercion: 'Meta de deserción lograda',
  meta_nuevos_ingresos: 'Meta 20+ nuevos ingresos',
}

// ── LOS 33, SEPARADOS EN DOS MARCADORES (no se borra ninguno) ────────────────
// El bug nunca estuvo en el código: estaba en el diseño de la lista. Los 33
// pesaban 1 punto igual, así que "Aromatizante en recepción" valía lo mismo que
// "Meta de deserción" y un centro podía fallar LAS TRES metas de resultado y
// sacar 30/33 = 91% en verde. La lista se queda entera; lo que cambia es a qué
// marcador pertenece cada criterio y cuánto pesa dentro del suyo.

// PRODUCTO · 3 claves. Dejan de ser un toggle: las CALCULA lib/marcadores.mjs
// desde la base (ventas, deserción real y cobranza del trimestre) y la pantalla
// de Cumplimiento las muestra de sólo lectura. Se siguen escribiendo en la
// tabla con el valor derivado para no romper el histórico.
export const PRODUCTO_KEYS = ['meta_nuevos_ingresos', 'meta_desercion', 'meta_cobranza']

// DISCIPLINA · 30 claves en 3 grupos con peso. El peso NO pinta el semáforo:
// ordena la lista de trabajo diaria de la administradora.
//   A · RETENCIÓN (peso 2) ataca las causas controlables de retiro que el motor
//       ya reconoce (CONTROLLABLE_ATTRITION_KEYS = classLoss/technique/schedule).
//   B · CAPTACIÓN (peso 2) alimenta CONTROLLABLE_ACQUISITION_KEYS
//       (referred/center/activations).
//   C · HIGIENE Y EQUIPO (peso 1) sostiene, no mueve el número.
// ponytail: el 2/1 es una calibración a ojo del negocio, no una regresión.
// Techo: nadie ha comprobado que un grupo A al 100% correlacione de verdad con
// menos bajas controlables. Salida: con 6 trimestres de historia, recalibrar
// los pesos contra las bajas por causa controlable y sustituir estas constantes.
export const DISCIPLINA_GRUPOS = [
  {
    id: 'A',
    titulo: 'Retención',
    proposito: 'Lo que evita que un niño se vaya',
    peso: 2,
    claves: [
      'asistencia_dias', 'seguimiento_evolucion', 'ninos_trabajando_study', 'portafolio', 'padres_conectados',
      'clase_padres', 'coach_activo', 'niveles_actualizados', 'ninos_activos_study', 'encuestas_satisfaccion',
    ],
  },
  {
    id: 'B',
    titulo: 'Captación',
    proposito: 'Lo que trae niños nuevos por el centro',
    peso: 2,
    claves: ['brochure', 'cartel_qr', 'saludo_cordial', 'fotos_grupo', 'muro_informacion', 'bienvenida'],
  },
  {
    id: 'C',
    titulo: 'Higiene y equipo',
    proposito: 'Sostiene la operación, no mueve el número',
    peso: 1,
    claves: [
      'classdojo_activo', 'ninos_completos_classdojo', 'calendario', 'asistente_classdojo', 'grupo_study',
      'centro_buen_estado', 'aromatizante', 'mesa_cafe', 'wifi_gratis', 'coach_estrella',
      'reuniones_mensuales', 'monitoreo_camaras', 'actividades_equipo', 'encuestas_equipo',
    ],
  },
]

export const DISCIPLINA_KEYS = DISCIPLINA_GRUPOS.flatMap((g) => g.claves)

export const DISCIPLINA_PESOS = Object.fromEntries(
  DISCIPLINA_GRUPOS.flatMap((g) => g.claves.map((k) => [k, g.peso]))
)

// Puntaje máximo de un mes registrado: 2×16 + 1×14 = 46. "Aromatizante en
// recepción" vale 1 de 46 de un marcador que NO pinta el semáforo.
export const DISCIPLINA_PUNTAJE_MAX = DISCIPLINA_KEYS.reduce((total, k) => total + DISCIPLINA_PESOS[k], 0)

// % de cumplimiento de un centro en un trimestre: promedio de 'si' sobre el
// total de ítems, a partir de las filas de `cumplimiento` (1 por mes).
// `keys` permite acotarlo a un marcador; por defecto conserva el
// comportamiento histórico (los 33) para no cambiar a ningún caller existente.
export function cumplimientoPct(rows, keys = CUMPLIMIENTO_KEYS) {
  let si = 0, tot = 0
  for (const row of rows) {
    for (const k of keys) { tot++; if (row[k] === 'si') si++ }
  }
  return tot ? Math.round((si / tot) * 100) : null
}

// ── MARCADOR 2 · DISCIPLINA OPERATIVA (soporte) ──────────────────────────────
// Ponderado por grupo y calculado SÓLO sobre las filas que EXISTEN: un mes sin
// registrar no cuenta como cumplido ni como incumplido, se reporta aparte. Ese
// denominador a la vista es lo que mata el 88% fantasma —un centro con dos
// meses buenos y septiembre en blanco ya no puede mostrar "88%" a secas.
export function disciplinaPct(rows) {
  const filas = (rows || []).filter(Boolean)
  let puntos = 0, maximo = 0
  for (const row of filas) {
    for (const k of DISCIPLINA_KEYS) {
      const peso = DISCIPLINA_PESOS[k]
      maximo += peso
      if (row[k] === 'si') puntos += peso
    }
  }
  // Desglose por grupo: el FODA necesita poder decir "faltan 3 de 10 criterios
  // de peso alto", no sólo un porcentaje global.
  const grupos = {}
  for (const grupo of DISCIPLINA_GRUPOS) {
    let si = 0, total = 0
    for (const row of filas) {
      for (const k of grupo.claves) { total++; if (row[k] === 'si') si++ }
    }
    grupos[grupo.id] = { id: grupo.id, titulo: grupo.titulo, peso: grupo.peso, si, total }
  }
  return {
    pct: maximo ? Math.round((puntos / maximo) * 100) : null,
    puntos,
    maximo,
    mesesRegistrados: filas.length,
    grupos: {
      ...grupos,
      // Alias por nombre para que quien lea el FODA no tenga que saberse las
      // letras de los grupos.
      retencion: grupos.A,
      captacion: grupos.B,
      higiene: grupos.C,
    },
  }
}

// @deprecated Devuelve ETIQUETAS, no diagnósticos: por eso una "debilidad" del
// FODA llegaba a decir literalmente "Meta de cobranza lograda" —el nombre del
// criterio— en vez de la brecha con su número. Lo sustituye lib/foda-datos.mjs.
// Se conserva mientras quede algún consumidor del contrato viejo.
// Deriva Fortalezas/Debilidades del cumplimiento real del trimestre.
// Para cada ítem se toma su estado en el ÚLTIMO mes que tenga registro:
// 'si' → fortaleza, 'no' → debilidad. Así el FODA queda vinculado al
// cumplimiento de metas y al checklist operativo. `rows` = filas de
// `cumplimiento` del trimestre (cada una con su campo `mes`).
export function fortalezasDebilidades(rows) {
  const fortalezas = [], debilidades = []
  const ordered = [...(rows || [])].sort((a, b) => (a.mes || 0) - (b.mes || 0))
  for (const k of CUMPLIMIENTO_KEYS) {
    let estado = null
    for (const row of ordered) if (row[k] === 'si' || row[k] === 'no') estado = row[k]
    if (estado === 'si') fortalezas.push(CUMPLIMIENTO_LABELS[k])
    else if (estado === 'no') debilidades.push(CUMPLIMIENTO_LABELS[k])
  }
  return { fortalezas, debilidades }
}
