import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizarTexto,
  tokensNombre,
  nombresCompatibles,
  telefonosDe,
  mismoTelefono,
  mismoCorreo,
  mismoRepresentante,
  motivosCoincidencia,
  buscarFichasCoincidentes,
  fuerzaCoincidencia,
  registroEnFichaAnulada,
  describirMotivos,
  leerConfirmacionFichaNueva,
  decidirAlta,
  mensajeFichaExistente,
  enmascararTelefono,
  agruparFichasDuplicadas,
} from '../lib/ficha-existente.mjs'
import { armarReporteDuplicados, textoReporteDuplicados } from '../lib/fichas-duplicadas-reporte.mjs'

// Casos de producción (1-oct-2026): Calle 50 Luciano 946/999, David Genesis
// 923/1019 (Meghan 906 es su HERMANA con la misma representante), Anclas
// Angela 915/916, y hermanos reales del padrón con la misma representante.
const ficha = (id, overrides = {}) => ({ id, centro_id: 3, estado: 'activo', grupo_id: 50, ...overrides })

test('normaliza sin acentos, sin mayúsculas y sin signos; la ñ queda como n', () => {
  assert.equal(normalizarTexto('  Valeria Alejandra GANTES Ortíz '), 'valeria alejandra gantes ortiz')
  assert.equal(normalizarTexto('Peña-Núñez, José'), 'pena nunez jose')
  assert.equal(normalizarTexto(null), '')
})

test('las palabras del nombre ignoran partículas e iniciales sueltas', () => {
  assert.deepEqual(tokensNombre('Miah Zussete Castillo De Leon'), ['miah', 'zussete', 'castillo', 'leon'])
  assert.deepEqual(tokensNombre('Ana E. Pérez y López'), ['ana', 'perez', 'lopez'])
  assert.deepEqual(tokensNombre(''), [])
})

test('nombre: igual en cualquier orden, o el corto contenido en el largo con su primer nombre', () => {
  assert.equal(nombresCompatibles('Angela Maquensi', 'ANGELA MAQUENSI'), 'mismo_nombre')
  assert.equal(nombresCompatibles('Acosta Luciano', 'Luciano Acosta'), 'mismo_nombre')
  // Calle 50: la ficha retirada tenía el nombre corto (y al revés también).
  assert.equal(nombresCompatibles('Luciano Acosta', 'Luciano Andrés Acosta Sequera'), 'nombre_parecido')
  assert.equal(nombresCompatibles('Acosta Luciano', 'Luciano Andrés Acosta Sequera'), 'nombre_parecido')
  assert.equal(nombresCompatibles('Valeria Alejandra Gantes Ortíz', 'Valeria Gantes'), 'nombre_parecido')
  assert.equal(nombresCompatibles('Miah Castillo Leon', 'Miah Zussete Castillo De Leon'), 'nombre_parecido')
})

test('nombre: hermanos con apellidos iguales no calzan', () => {
  assert.equal(nombresCompatibles('Meghan Linton', 'Genesis Linton'), null)
  assert.equal(nombresCompatibles('José Alexander Rodríguez Acosta', 'José Angel Rodríguez Acosta'), null)
  assert.equal(nombresCompatibles('María José Rodríguez Acosta', 'José Angel Rodríguez Acosta'), null)
  // Sin el primer nombre del largo puede ser un hermano que lleva ese segundo nombre.
  assert.equal(nombresCompatibles('Andrés Acosta', 'Luciano Andrés Acosta Sequera'), null)
  assert.equal(nombresCompatibles('Alejandra Gantes', 'Valeria Alejandra Gantes Ortíz'), null)
  assert.equal(nombresCompatibles('', 'Luciano'), null)
})

test('teléfono: absorbe el código de país y no confunde números distintos', () => {
  assert.equal(mismoTelefono('6925-0722', '+507 6925 0722'), true)
  assert.equal(mismoTelefono('6925-0722', '507-69250722'), true)
  assert.equal(mismoTelefono('6925-0722', '6925-0723'), false)
  // Venezuela: el 0 de troncal y el +58 no estorban; la operadora sí cuenta.
  assert.equal(mismoTelefono('0414-1234567', '+58 414 1234567'), true)
  assert.equal(mismoTelefono('0414-1234567', '+58 0414 1234567'), true)
  assert.equal(mismoTelefono('0414-1234567', '0424-1234567'), false)
  // Un fijo de 7 dígitos no es el móvil que termina igual.
  assert.equal(mismoTelefono('225-1234', '6225-1234'), false)
  assert.equal(mismoTelefono('', ''), false)
  assert.equal(mismoTelefono(null, '6925-0722'), false)
})

test('teléfono: un campo con varios números cuenta cada uno', () => {
  assert.deepEqual(telefonosDe('6925-0722 / 6677-8899'), ['69250722', '66778899'])
  assert.deepEqual(telefonosDe('6925-0722 - 6677-8899'), ['69250722', '66778899'])
  assert.deepEqual(telefonosDe('Mamá 6925-0722 Papá 6677-8899'), ['69250722', '66778899'])
  assert.deepEqual(telefonosDe('6925-0722 6677-8899'), ['69250722', '66778899'])
  assert.deepEqual(telefonosDe('+507 6925 0722 6677 8899'), ['50769250722', '66778899'])
  assert.equal(mismoTelefono('6925-0722 o 6677-8899', '66778899'), true)
  // Menos de 7 dígitos no identifica a nadie.
  assert.deepEqual(telefonosDe('123'), [])
})

test('correo y representante', () => {
  assert.equal(mismoCorreo(' Mama@Correo.com ', 'mama@correo.com'), true)
  assert.equal(mismoCorreo('', ''), false)
  assert.equal(mismoCorreo('sin-arroba', 'sin-arroba'), false)
  assert.equal(mismoRepresentante('Norelvys Gonzalez', 'Norelvys González'), true)
  assert.equal(mismoRepresentante('Norelvys Gonzalez', 'Norelvys Gonzalez Pérez'), true)
  // Un solo nombre («Mamá») no identifica.
  assert.equal(mismoRepresentante('Mamá', 'Mamá'), false)
  assert.equal(mismoRepresentante('Norelvys Gonzalez', 'Carmen Gonzalez'), false)
})

test('un representante igual al nombre del niño (precarga de la clase de prueba) no cuenta', () => {
  // Formulario con el nombre de quien se registró en las dos casillas.
  const nuevo = { nombre: 'Norelvys Gonzalez', representante: 'Norelvys Gonzalez', telefono: '6000-1111' }
  const existente = ficha(1, { nombre: 'Norelvys Gonzalez Ruiz', representante: 'Norelvys Gonzalez Ruiz', telefono: '6000-2222' })
  assert.deepEqual(motivosCoincidencia(nuevo, existente), [])
})

test('coincidencia por crm_registration_id: misma ficha aunque el nombre no se parezca', () => {
  const motivos = motivosCoincidencia(
    { nombre: 'Mamá de Genesis', crm_registration_id: 'reg-77' },
    ficha(923, { nombre: 'Genesis Linton', crm_registration_id: 'reg-77' }),
  )
  assert.deepEqual(motivos, ['registro_crm'])
  assert.equal(fuerzaCoincidencia(motivos), 'registro')
  // Registros distintos no coinciden por esta vía.
  assert.deepEqual(motivosCoincidencia(
    { nombre: 'Otra Persona', crm_registration_id: 'reg-78' },
    ficha(923, { nombre: 'Genesis Linton', crm_registration_id: 'reg-77' }),
  ), [])
})

test('coincidencia por teléfono + nombre: Calle 50, Luciano retirado con el nombre corto', () => {
  const fichas = [
    ficha(946, { nombre: 'Luciano Acosta', estado: 'retirado', grupo_id: null, telefono: '6925-0722' }),
    ficha(950, { nombre: 'Mateo Acosta', telefono: '6925-0722' }), // hermano: mismo teléfono
  ]
  const r = buscarFichasCoincidentes({ nombre: 'Luciano Andrés Acosta Sequera', telefono: '69250722' }, fichas)
  assert.deepEqual(r.map((c) => c.ficha.id), [946])
  assert.deepEqual(r[0].motivos, ['nombre_parecido', 'telefono'])
  // Nombre solo parecido: el centro decide (puede ser un hermano con nombre corto).
  assert.equal(r[0].fuerza, 'posible')
  // Mismo nombre + contacto: muy probable.
  assert.equal(buscarFichasCoincidentes({ nombre: 'Luciano Acosta', telefono: '69250722' }, fichas)[0].fuerza, 'fuerte')
})

test('hermanas con la misma representante no se toman por la misma niña', () => {
  const fichas = [ficha(906, { nombre: 'Meghan Linton', representante: 'Genesis Suira', telefono: '6111-2222' })]
  assert.deepEqual(buscarFichasCoincidentes({ nombre: 'Genesis Linton', representante: 'Genesis Suira', telefono: '6111-2222' }, fichas), [])
})

test('sin coincidencia la lista sale vacía y el alta procede', () => {
  const fichas = [
    ficha(1, { nombre: 'Sofía Pérez', telefono: '6000-0001' }),
    ficha(2, { nombre: 'Luciano Acosta', telefono: '6000-0002' }),
  ]
  const r = buscarFichasCoincidentes({ nombre: 'Valeria Gantes', telefono: '6925-0722' }, fichas)
  assert.deepEqual(r, [])
  assert.deepEqual(decidirAlta(r), { crear: true, confirmacion: null })
})

test('mismo nombre sin contacto en común: solo con 3+ palabras o una ficha sin teléfono ni correo', () => {
  // Angela 915 cargada sin teléfono: el mismo nombre basta para preguntar.
  const sinContacto = [ficha(915, { nombre: 'Angela Maquensi', telefono: null, representante: null })]
  assert.deepEqual(
    buscarFichasCoincidentes({ nombre: 'Ángela Maquensi', telefono: '6555-1234' }, sinContacto).map((c) => [c.ficha.id, c.motivos, c.fuerza]),
    [[915, ['mismo_nombre'], 'posible']],
  )
  // «Sofía Pérez» con otro teléfono es otra Sofía.
  assert.deepEqual(buscarFichasCoincidentes({ nombre: 'Sofía Pérez', telefono: '6000-0001' }, [ficha(1, { nombre: 'Sofía Pérez', telefono: '6000-0009' })]), [])
  // Con tres palabras ya vale la pena preguntar.
  assert.equal(buscarFichasCoincidentes({ nombre: 'Sofía Pérez Ruiz', telefono: '6000-0001' }, [ficha(1, { nombre: 'Sofía Pérez Ruiz', telefono: '6000-0009' })]).length, 1)
  // Un solo nombre, o nombre solo PARECIDO sin contacto, no basta.
  assert.deepEqual(buscarFichasCoincidentes({ nombre: 'Angela' }, [ficha(1, { nombre: 'Angela' })]), [])
  assert.deepEqual(buscarFichasCoincidentes({ nombre: 'Angela Maquensi Ruiz' }, sinContacto), [])
})

test('la matrícula anulada no frena una venta nueva; su registro de CRM se suelta', () => {
  const anulada = ficha(30, { nombre: 'Ana Ruiz', estado: 'matricula_anulada', telefono: '6123-4567', crm_registration_id: 'reg-1' })
  assert.deepEqual(buscarFichasCoincidentes({ nombre: 'Ana Ruiz', telefono: '6123-4567' }, [anulada]), [])
  assert.deepEqual(buscarFichasCoincidentes({ nombre: 'Ana Ruiz', crm_registration_id: 'reg-1' }, [anulada]), [])
  assert.equal(registroEnFichaAnulada('reg-1', [anulada]), true)
  assert.equal(registroEnFichaAnulada('reg-2', [anulada]), false)
  assert.equal(registroEnFichaAnulada('reg-1', [ficha(31, { crm_registration_id: 'reg-1' })]), false)
})

test('orden: registro, luego muy probable, luego posible; los que siguen en el centro primero', () => {
  const nuevo = { nombre: 'Luciano Acosta', telefono: '6925-0722', crm_registration_id: 'reg-9' }
  const r = buscarFichasCoincidentes(nuevo, [
    ficha(5, { nombre: 'Luciano Andrés Acosta', telefono: '6925-0722' }), // posible
    ficha(4, { nombre: 'Luciano Acosta', estado: 'retirado', telefono: '6925-0722' }), // fuerte, retirado
    ficha(6, { nombre: 'Luciano Acosta', telefono: '6925-0722' }), // fuerte, activo
    ficha(7, { nombre: 'Otro Nombre', crm_registration_id: 'reg-9' }),
  ])
  assert.deepEqual(r.map((c) => [c.ficha.id, c.fuerza]), [[7, 'registro'], [6, 'fuerte'], [4, 'fuerte'], [5, 'posible']])
})

test('confirmación "es otro niño": fichas vistas, motivo y nota', () => {
  assert.deepEqual(leerConfirmacionFichaNueva(undefined), { descartadas: [], motivo: null, nota: null })
  assert.deepEqual(leerConfirmacionFichaNueva({ descartadas: ['946', 946, 'x'], motivo: 'hermano' }), { descartadas: [946], motivo: 'hermano', nota: null })
  assert.match(leerConfirmacionFichaNueva({ descartadas: [], motivo: 'hermano' }).error, /cuáles fichas revisaste/)
  assert.match(leerConfirmacionFichaNueva({ descartadas: [946] }).error, /Elige por qué/)
  assert.match(leerConfirmacionFichaNueva({ descartadas: [946], motivo: 'porque sí' }).error, /Elige por qué/)
  assert.match(leerConfirmacionFichaNueva({ descartadas: [946], motivo: 'otro' }).error, /Escribe por qué/)
  assert.deepEqual(leerConfirmacionFichaNueva({ descartadas: [946], motivo: 'otro', nota: '  vive con la abuela ' }), { descartadas: [946], motivo: 'otro', nota: 'vive con la abuela' })
  assert.match(leerConfirmacionFichaNueva({ descartadas: [946], motivo: 'otro', nota: 'x'.repeat(201) }).error, /200/)
})

test('decidirAlta: el registro no se salta; lo demás solo confirmado con TODAS las fichas a la vista', () => {
  const porRegistro = [{ ficha: { id: 7 }, motivos: ['registro_crm'], fuerza: 'registro' }]
  const dos = [
    { ficha: { id: 4 }, motivos: ['mismo_nombre', 'telefono'], fuerza: 'fuerte' },
    { ficha: { id: 9 }, motivos: ['nombre_parecido', 'telefono'], fuerza: 'posible' },
  ]
  assert.deepEqual(decidirAlta(porRegistro), { crear: false, registroYaInscrito: true })
  assert.deepEqual(decidirAlta(porRegistro, { descartadas: [7], motivo: 'hermano' }), { crear: false, registroYaInscrito: true })
  assert.deepEqual(decidirAlta(dos), { crear: false, requiereConfirmacion: true })
  // Confirmó viendo solo la 4: la 9 apareció después → vuelve a preguntar.
  assert.deepEqual(decidirAlta(dos, { descartadas: [4], motivo: 'hermano' }), { crear: false, requiereConfirmacion: true })
  // Sin motivo no hay confirmación.
  assert.deepEqual(decidirAlta(dos, { descartadas: [4, 9] }), { crear: false, requiereConfirmacion: true })
  assert.deepEqual(decidirAlta(dos, { descartadas: [4, 9], motivo: 'otro', nota: 'primos' }), {
    crear: true, confirmacion: { descartadas: [4, 9], motivo: 'otro', nota: 'primos' },
  })
})

test('mensajes legibles para cualquier pantalla', () => {
  assert.equal(describirMotivos(['nombre_parecido', 'telefono', 'representante']), 'nombre parecido, mismo teléfono y mismo representante')
  const fuerte = [{ ficha: { id: 4, nombre: 'Luciano Acosta', estado: 'retirado', grupo_numero: null }, motivos: ['mismo_nombre', 'telefono'], fuerza: 'fuerte' }]
  assert.equal(
    mensajeFichaExistente(fuerte),
    'Luciano Acosta (retirado) ya tiene ficha en el centro (mismo nombre y mismo teléfono). Si es el mismo niño, no crees otra ficha: corrige la que ya tiene. Si es otro niño, confirma por qué.',
  )
  const posible = [{ ficha: { id: 4, nombre: 'Luciano Acosta', estado: 'activo', grupo_numero: '12' }, motivos: ['nombre_parecido', 'telefono'], fuerza: 'posible' }]
  assert.match(mensajeFichaExistente(posible), /^Puede que Luciano Acosta \(activo, grupo 12\) ya tenga ficha en el centro/)
  const registro = [{ ficha: { id: 7, nombre: 'Genesis Linton', estado: 'activo', grupo_numero: '65' }, motivos: ['registro_crm'], fuerza: 'registro' }]
  assert.match(mensajeFichaExistente(registro), /^Este registro ya fue inscrito: es la ficha de Genesis Linton \(activo, grupo 65\)\./)
  assert.equal(mensajeFichaExistente([]), null)
  assert.equal(enmascararTelefono('+507 6925-0722'), '…0722')
  assert.equal(enmascararTelefono(''), '—')
})

test('agrupación del script: pares del mismo centro y cadenas marcadas', () => {
  const fichas = [
    { id: 915, centro_id: 4, nombre: 'Angela Maquensi', estado: 'activo', representante: 'Norelvys Gonzalez' },
    { id: 916, centro_id: 4, nombre: 'Angela Maquensi', estado: 'activo', representante: 'Norelvys González' },
    { id: 20, centro_id: 4, nombre: 'José Alexander Rodríguez Acosta', representante: 'Atenas Acosta', estado: 'activo' },
    { id: 21, centro_id: 4, nombre: 'José Angel Rodríguez Acosta', representante: 'Atenas Acosta', estado: 'activo' },
    // Mismo niño en OTRO centro: no es duplicado de este centro.
    { id: 300, centro_id: 9, nombre: 'Angela Maquensi', estado: 'activo', representante: 'Norelvys Gonzalez' },
    // Un nombre corto que calza con dos hermanos: cadena, no un mismo niño.
    { id: 22, centro_id: 4, nombre: 'José Rodríguez Acosta', representante: 'Atenas Acosta', estado: 'activo' },
  ]
  const grupos = agruparFichasDuplicadas(fichas)
  assert.deepEqual(grupos.map((g) => [g.centroId, g.ids, g.completo]), [[4, [20, 21, 22], false], [4, [915, 916], true]])
  assert.deepEqual(grupos[1].pares, [{ a: 915, b: 916, motivos: ['mismo_nombre', 'representante'], fuerza: 'fuerte' }])
})

// ── Reporte del script de solo lectura (lib/fichas-duplicadas-reporte.mjs) ──

test('reporte: los 4 pares de producción salen con su evidencia y la venta de más', () => {
  const centros = [{ id: 3, nombre: 'Calle 50' }, { id: 4, nombre: 'Anclas' }, { id: 5, nombre: 'David' }]
  const grupos = [{ id: 121, numero: '64' }, { id: 136, numero: '66' }, { id: 122, numero: '65' }, { id: 135, numero: '67' }, { id: 134, numero: '91' }]
  const f = (id, centro_id, nombre, extra = {}) => ({ id, centro_id, nombre, estado: 'activo', itinerario: 'TINY', nivel: 1, origen: 'clase_prueba', created_at: '2026-09-01T12:00:00Z', ...extra })
  const fichas = [
    f(946, 3, 'Luciano Acosta', { estado: 'retirado', grupo_id: null, telefono: '6925-0722', origen: 'directo', created_at: '2026-06-01T12:00:00Z' }),
    f(999, 3, 'Luciano Andrés Acosta Sequera', { grupo_id: 136, telefono: '6925-0722', created_at: '2026-09-21T12:00:00Z' }),
    f(1001, 3, 'Mateo Acosta Sequera', { grupo_id: 136, telefono: '6925-0722' }), // hermano: misma familia
    f(915, 4, 'Angela Maquensi', { grupo_id: 134, representante: 'Norelvys Gonzalez' }),
    f(916, 4, 'Angela Maquensi', { grupo_id: 134, representante: 'Norelvys Gonzalez' }),
    f(906, 5, 'Meghan Linton', { grupo_id: 121, representante: 'Genesis Suira', telefono: '6111-2222' }),
    f(907, 5, 'Valeria Alejandra Gantes Ortíz', { grupo_id: 121, origen: 'directo', telefono: '6333-4444' }),
    f(1029, 5, 'Valeria Alejandra Gantes Ortíz', { grupo_id: 136, crm_registration_id: 'reg-1029', telefono: '+507 6333-4444', created_at: '2026-09-29T12:00:00Z' }),
    f(923, 5, 'Genesis Linton', { grupo_id: 122, representante: 'Genesis Suira', telefono: '6111-2222', crm_registration_id: 'reg-923' }),
    f(1019, 5, 'Genesis Linton', { grupo_id: 135, representante: 'Genesis Suira', telefono: '6111-2222', crm_registration_id: 'reg-1019' }),
  ]
  const venta = (id, estudiante_id, fecha, extra = {}) => ({ id, estudiante_id, tipo: 'inscripcion', fecha, year: Number(fecha.slice(0, 4)), month: Number(fecha.slice(5, 7)), ...extra })
  const eventos = [
    venta(1, 946, '2026-06-01'), { id: 2, estudiante_id: 946, tipo: 'retiro', fecha: '2026-09-25', motivo: 'OTRO' },
    venta(3, 999, '2026-09-21'),
    venta(4, 916, '2026-08-28'), venta(5, 915, '2026-09-01'),
    venta(6, 907, '2026-09-01'),
    venta(7, 1029, '2026-09-25', { detalle: JSON.stringify({ ficha_nueva_confirmada: { descartadas: [907], motivo: 'mismo_nombre' } }) }),
    venta(8, 923, '2026-09-01'), venta(9, 1019, '2026-09-24'),
  ]
  const asistencias = [
    { estudiante_id: 907, fechas: ['2026-09-02', '2026-09-30'] },
    { estudiante_id: 1029, fechas: ['2026-09-30'] },
  ]
  const meses = [{ centro_id: 4, year: 2026, month: 8, estado: 'cerrado' }, { centro_id: 4, year: 2026, month: 9, estado: 'abierto' }]
  const reporte = armarReporteDuplicados({ centros, fichas, eventos, grupos, asistencias, meses })
  assert.deepEqual(reporte.map((g) => [g.centro, g.miembros.map((m) => m.id), g.fuerza, g.completo, g.ventasDeMas]), [
    ['Calle 50', [946, 999], 'posible', true, 1],
    ['Anclas', [915, 916], 'fuerte', true, 1],
    ['David', [907, 1029], 'fuerte', true, 1],
    ['David', [923, 1019], 'fuerte', true, 1],
  ])
  // Meghan (hermana, misma representante y teléfono) no entra en ningún grupo.
  assert.ok(!reporte.some((g) => g.miembros.some((m) => m.id === 906)))
  const [luciano, angela, valeria, genesis] = reporte
  assert.deepEqual(luciano.miembros[0].retiros, [{ fecha: '2026-09-25', motivo: 'OTRO' }])
  assert.deepEqual(luciano.retirosPosteriores, [{ ficha: 946, fecha: '2026-09-25', otra: 999 }])
  assert.deepEqual(luciano.familia, [{ id: 1001, nombre: 'Mateo Acosta Sequera', estado: 'activo' }])
  assert.equal(luciano.miembros[0].telefono, '…0722')
  assert.equal(angela.miembros.find((m) => m.id === 916).mesVentaEstado, 'cerrado')
  assert.deepEqual(valeria.mismosDias, [{ a: 907, b: 1029, dias: 1, primero: '2026-09-30' }])
  assert.deepEqual(valeria.confirmadasDistintas, [{ ficha: 1029, descartada: 907, motivo: 'mismo_nombre' }])
  assert.deepEqual(valeria.miembros[0].asistencias, { presentes: 2, primera: '2026-09-02', ultima: '2026-09-30' })
  assert.deepEqual(genesis.familia, [{ id: 906, nombre: 'Meghan Linton', estado: 'activo' }])

  const texto = textoReporteDuplicados(reporte)
  assert.match(texto, /══ Calle 50 \(centro 3\) — 1 posible duplicado ══/)
  assert.match(texto, /946 ~ 999: nombre parecido y mismo teléfono/)
  assert.match(texto, /Si son el mismo niño sobra 1 venta: hoy cuentan 916 \(KPI 2026-08\), 915 \(KPI 2026-09\)\./)
  assert.match(texto, /venta 2026-08-28 \(KPI 2026-08, mes cerrado\)/)
  assert.match(texto, /El retiro de 946 \(2026-09-25\) es posterior a la ficha 999: si son el mismo niño, es un retiro espurio\./)
  assert.match(texto, /907 y 1029 tienen presente el mismo día 1 vez/)
  assert.match(texto, /Al inscribir 1029 el centro confirmó que NO es 907 \(mismo_nombre\)\./)
  assert.match(texto, /Misma familia \(teléfono o correo\): 1001 Mateo Acosta Sequera \(activo\)/)
  assert.match(texto, /Total: 4 grupos · ventas de más si se confirman: 4/)
  assert.doesNotMatch(texto, /6925-0722|69250722/, 'el teléfono completo no sale del script')
  assert.equal(textoReporteDuplicados([]), 'Sin fichas duplicadas con las reglas de lib/ficha-existente.mjs.')
})

test('reporte: una cadena de posibles hermanos no promete ventas de más', () => {
  const fichas = [
    { id: 20, centro_id: 4, nombre: 'José Alexander Rodríguez Acosta', representante: 'Atenas Acosta', estado: 'activo' },
    { id: 21, centro_id: 4, nombre: 'José Angel Rodríguez Acosta', representante: 'Atenas Acosta', estado: 'activo' },
    { id: 22, centro_id: 4, nombre: 'José Rodríguez Acosta', representante: 'Atenas Acosta', estado: 'activo' },
  ]
  const eventos = fichas.map((f, i) => ({ id: i + 1, estudiante_id: f.id, tipo: 'inscripcion', fecha: '2026-09-01', year: 2026, month: 9 }))
  const reporte = armarReporteDuplicados({ fichas, eventos })
  assert.equal(reporte[0].completo, false)
  const texto = textoReporteDuplicados(reporte)
  assert.match(texto, /EN CADENA: no todos coinciden entre sí, revisar \(pueden ser hermanos\)/)
  assert.doesNotMatch(texto, /Si son el mismo niño sobra/)
  assert.match(texto, /ventas de más si se confirman: 0 \(sin contar 1 en cadena\)/)
})

test('reporte: la llegada por traslado no cuenta como venta de más', () => {
  const fichas = [
    { id: 1, centro_id: 1, nombre: 'Ana Ruiz Pérez', estado: 'activo', telefono: '6123-4567' },
    { id: 2, centro_id: 1, nombre: 'Ana Ruiz Pérez', estado: 'activo', telefono: '6123-4567' },
  ]
  const eventos = [
    { id: 1, estudiante_id: 1, tipo: 'inscripcion', fecha: '2026-08-01', year: 2026, month: 8, origen: 'traslado' },
    { id: 2, estudiante_id: 2, tipo: 'inscripcion', fecha: '2026-09-01', year: 2026, month: 9, origen: 'clase_prueba' },
  ]
  const [g] = armarReporteDuplicados({ fichas, eventos })
  assert.equal(g.ventasDeMas, 0)
  assert.deepEqual(g.ventas.map((v) => v.id), [2])
  assert.match(textoReporteDuplicados([g]), /llegó por traslado el 2026-08-01 \(no cuenta como venta\)/)
})

test('reporte: la venta de una matrícula anulada no cuenta y la anulada no se agrupa', () => {
  const fichas = [
    { id: 1, centro_id: 1, nombre: 'Ana Ruiz', estado: 'matricula_anulada', telefono: '6123-4567' },
    { id: 2, centro_id: 1, nombre: 'Ana Ruiz', estado: 'activo', telefono: '6123-4567' },
  ]
  assert.deepEqual(armarReporteDuplicados({ fichas }), [])
})
