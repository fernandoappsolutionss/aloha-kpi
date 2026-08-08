# Sincronizacion operativa del KPI desde agosto de 2026

Fecha: 2026-08-08
Estado: aprobado por Fernando

## Objetivo

Desde agosto de 2026, el KPI de cada mes abierto debe reflejar las acciones reales de Clases de Prueba, Grupos y Cuadro de Negocio. Los meses cerrados conservan exactamente su fotografia y nunca vuelven a consultar fuentes vivas.

La automatizacion debe separar tres hechos:

1. Una persona registrada en una clase de prueba es un invitado.
2. La accion `Inscribir` confirma una venta y crea la ficha del nino.
3. El nino se vuelve activo solo cuando tiene grupo y llega su inicio efectivo de clases.

## Enfoques evaluados

### Elegido: datos derivados en servidor con conciliacion inicial

El servidor consulta las fuentes operativas, calcula el KPI y persiste el mismo resultado al guardar. Un ajuste inicial de agosto conserva cualquier dato manual que todavia no tenga una entidad operativa equivalente.

Ventajas: una sola fuente por indicador, protege lo ya capturado y evita duplicados entre el cliente y el servidor.

### Descartado: copiar contadores en el cliente

Actualizar el formulario despues de cada clic seria rapido, pero quedaria desactualizado ante registros publicos, cambios desde el CRM, otra sesion o una recarga.

### Pospuesto: replica completa del CRM en Neon

Un webhook o una tabla espejo daria trazabilidad local completa, pero agrega infraestructura, reintentos y recuperacion historica que no hacen falta para este alcance. El CRM expondra una lectura agregada por lote.

## Fuentes de verdad

| Indicador | Fuente desde 2026-08 | Regla mensual |
|---|---|---|
| Invitados | Registros de Clases de Prueba en CRM | Registro no cancelado cuya `registered_at` cae en el mes |
| Asistieron | Registros de Clases de Prueba en CRM | `attendance_status = attended`; usa `checked_in_at` y respaldo en la fecha de la clase |
| Matriculados | `estudiante_eventos.tipo = inscripcion` unido a estudiante con `crm_registration_id` | Fecha de la venta/inscripcion |
| Nuevos ingresos venta | Todo `estudiante_eventos.tipo = inscripcion` | Fecha de la venta; incluye clase de prueba e inscripcion directa |
| Nuevos activos | Inicio operativo del nino | Requiere grupo; fecha efectiva = mayor entre asignacion al grupo e inicio de clases del grupo |
| Retiros y motivos | `estudiante_eventos.tipo = retiro` | Fecha declarada del retiro; usa el motivo guardado |
| Origen comercial | `estudiantes.origen_venta` | Referido, Marketing, Centro, Activaciones o Medios |

`estudiantes.origen` conserva su significado tecnico actual: clase de prueba, directo o traslado. No se reutiliza para el origen comercial.

## Flujo de clase de prueba

1. Al registrarse una persona, el KPI abierto suma un invitado sin crear un estudiante. El registro puede pertenecer al representante y todavia no confirma una venta.
2. Al marcar asistencia, el KPI abierto suma un asistente.
3. Al pulsar `Inscribir`, el modal exige:
   - nombre del nino, precargado cuando el CRM lo tenga en una respuesta explicita o, como ayuda para revision, en el nombre del registro;
   - origen comercial;
   - datos disponibles del representante.
4. El administrador confirma o corrige el nombre antes de guardar. La accion crea una sola ficha, protegida por `crm_registration_id`.
5. Si la clase de prueba conserva un `centro_eventos.grupo_id` valido, activo y abierto a inscripciones, el modal lo preselecciona y la ficha queda asociada a ese grupo en apertura.
6. Si la clase no tiene grupo asociado, el grupo ya no es valido o el administrador elige `Sin grupo`, la ficha se crea con `grupo_id = NULL` para asignarla despues sin perder la venta.
7. La misma transaccion crea el evento de inscripcion. Ese evento suma una venta y, por venir de una clase de prueba, un matriculado.
8. Mientras no tenga grupo, la venta no aumenta `Nuevos activos` ni `Ninos final mes`.

Denny Li (Anclas) y Angie Chong (Condado) ya cumplen la parte de ficha sin grupo. La conciliacion los incorpora como ventas/matriculados de agosto, sin contarlos como activos hasta su asignacion e inicio.

## Inscripcion directa

El modal de Grupos tambien exige origen comercial. Una inscripcion directa suma una venta, pero no un matriculado de clase de prueba. El grupo sigue siendo opcional; si queda vacio, el nino espera asignacion y no se vuelve activo.

Reincorporaciones, traslados y cambios de grupo no crean ventas nuevas.

## Distribucion semanal

Las filas de `Nuevos Ingresos - Ventas` y `Desercion (Retirados)` se vuelven automaticas para meses abiertos desde agosto de 2026.

- Semana 1: dias 1 al 7 del mes.
- Semana 2: dias 8 al 14.
- Semana 3: dias 15 al 21.
- Semana 4: dias 22 al 28.
- Semana 5: dias 29 al cierre.
- Dia 1 a Dia 5 representan lunes a viernes. Movimientos de sabado o domingo se acumulan en Dia 5 para que ningun movimiento se pierda.

El servidor vuelve a calcular las celdas al guardar; el cliente no puede enviar un total distinto.

## Origen comercial

Se agrega `estudiantes.origen_venta TEXT NULL` con una validacion de aplicacion sobre estos valores:

- `referido`
- `marketing`
- `centro`
- `activaciones`
- `medios`

Toda inscripcion nueva requiere uno. El editor del estudiante permite clasificar registros existentes. El KPI muestra una fila `Por clasificar` cuando una venta heredada o una ficha anterior no tiene origen; nunca adjudica un origen a partir de quien registro a la persona.

## Conciliacion de agosto

Agosto ya contiene cifras manuales validas en algunos centros. Se crea `kpi_auto_ajustes` con una fila por centro y mes y un JSONB de diferencias heredadas.

Para cada metrica, al activar la automatizacion:

`ajuste = max(0, valor_guardado - valor_fuente_actual)`

El valor visible y guardado sera:

`valor_automatico = valor_fuente_actual + ajuste`

Esto produce el comportamiento esperado:

- una cifra manual sin ficha operativa se conserva;
- una ficha real que no aparecia en el KPI entra inmediatamente;
- una ficha ya incluida manualmente no se duplica;
- los movimientos posteriores incrementan o corrigen el dato vivo.

Los origenes se concilian por categoria. La diferencia entre ventas totales y origenes clasificados aparece como `Por clasificar`.

La inicializacion usa `INSERT ... ON CONFLICT DO NOTHING`, de modo que dos cargas simultaneas no cambian la base dos veces.

## Integracion con CRM

El CRM agrega una accion autenticada `list_registrations_by_event_ids` al endpoint ALOHA. Recibe solo IDs de eventos del centro y devuelve, en un lote, los campos necesarios para el KPI:

- `id`
- `event_id`
- `attendance_status`
- `registered_at`
- `checked_in_at`
- `updated_at`

ALOHA valida que los eventos pertenecen al centro antes de llamar al CRM. Se excluyen cancelados y se deduplican registros por ID.

Si el CRM no responde, la pantalla conserva el ultimo valor guardado y muestra que la sincronizacion esta pendiente. El cierre mensual se bloquea hasta obtener una lectura completa; asi no congela un embudo parcial.

## Meses cerrados

La automatizacion se activa solo cuando:

- `year * 100 + month >= 202608`; y
- el estado del mes es `abierto`.

Un mes cerrado lee `resumen_mes` y `kpi_semanas` sin consultar CRM, estudiantes vivos ni ajustes. La implementacion y la conciliacion no ejecutan `UPDATE` sobre ningun mes cerrado.

## Interfaz

- Los campos automaticos quedan deshabilitados y muestran su fuente.
- Clase de Prueba indica que viene del CRM.
- Ventas, retiros y motivos indican que vienen de Cuadro/Grupos.
- Origen indica que viene de las fichas inscritas.
- `Por clasificar` enlaza el problema con las fichas sin origen, sin inventar categorias.
- Cobranza y meta mensual permanecen editables.

## Pruebas

1. Registrar invitado incrementa solo invitados.
2. Marcar asistencia incrementa asistentes.
3. `Inscribir` desde clase de prueba usa el grupo asociado cuando es valido; sin asociacion crea una ficha sin grupo. En ambos casos suma venta + matriculado una sola vez.
4. Inscripcion directa suma venta, no matriculado.
5. Un nino sin grupo no suma nuevos activos.
6. Al asignarlo, inicia en la fecha mayor entre asignacion e inicio del grupo.
7. Retiro actualiza total, celda semanal y motivo.
8. Origen comercial actualiza una sola categoria y el total clasificado no excede ventas.
9. La conciliacion conserva ventas manuales sin duplicar fuentes existentes.
10. Meses cerrados no invocan fuentes vivas ni cambian filas.
11. Fallo del CRM conserva datos y bloquea el cierre, sin escribir ceros.
12. Dos inicializaciones simultaneas de agosto producen un solo ajuste.

## Despliegue

1. Fusionar y desplegar la lectura por lote en el CRM.
2. Fusionar y desplegar ALOHA con esquema, calculos, interfaz y pruebas.
3. Abrir agosto de los seis centros para inicializar la conciliacion.
4. Auditar fuente, ajuste y total de cada indicador antes de cualquier cierre.
5. Verificar Anclas y Condado: venta/matricula presente, grupo vacio y nuevos activos en cero hasta su inicio real.
