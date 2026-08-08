# Remodelado grupo/niño — v3 (gate 2: 20/24 aceptadas + 4 correcciones finales incorporadas)

Fecha: 2026-08-08 · Modelo dictado por Fernando · Base: rama `hermes/llenado-automatico`
Gate 1: NO-GO (24) · Gate 2: NO-GO (4 puntos) · Estado: v3 final

## El modelo de Fernando (contrato, no negociable)

1. Una sola fecha en el grupo: la de inicio de clases. `created_at` es la historia de publicación.
2. Grupo iniciado = cerrado a edición: solo horario y coach.
3. La planificación va por niño (ancla en su comienzo de nivel); en fusión cada niño la arrastra; en grupo
   nuevo todos inician igual. El plan del grupo queda como referencia del aula (CONFIRMADO).
4. KPI sin manos: venta = inscribir (traslados fuera de la meta comercial, CONFIRMADO), nuevo activo =
   inicio de clases, deserción = retiro con motivo.
5. Retiro guiado por asistencia: con clases este mes → "Retirar el próximo mes"; sin clases → "Retirar" ya.

## R1 — Una sola fecha (g1-1, g1-2, g1-3)

- **Muere `grupoYaDioClases`** (g1-1, bloqueante): la entrada del grupo al Cuadro depende EXCLUSIVAMENTE de
  `grupos.fecha_inicio_clases`; `fechaInicioOperativa = max(fecha del primer evento canónico de
  inscripción, fecha_inicio_clases del grupo de inscripción)` sin mirar niveles. Se elimina el helper de
  cuadro-snapshot, route Excel, centro.js, backfill y sus tests.
  - **Prerrequisito de datos**: los grupos veteranos cuya `fecha_inicio_clases` quedó con el arranque del
    NIVEL vigente (backfill D7) y ese arranque es FUTURO con niños activos, se corrigen a una fecha pasada
    demostrablemente segura: `LEAST(fecha actual asignada, min(fecha_inscripcion de sus niños atribuidos))`
    — la cota que garantiza cero reclasificación (patrón g2 del llenado). Script preflight con dry-run,
    listado nominal, comparable del cuadro before/after idéntico, y CAS por fila. El rollout de R1 se
    BLOQUEA hasta que este preflight pase en prod (cubre también el caso de que el --apply de D7 no se
    haya corrido: entonces no hay nada que corregir y el preflight lo reporta vacío).
- **Obligatoriedad** (g1-2): fecha requerida en server y UI para todo grupo nuevo, incluidos KINDER y
  online; pre-inicio se puede CAMBIAR, nunca BORRAR. Preflight de activos con fecha NULL (con o sin
  itinerario) que bloquea el rollout hasta resolverlos; después `CHECK (estado <> 'activo' OR
  fecha_inicio_clases IS NOT NULL)` (migración en dos pasos: datos primero, constraint después).
  `reabrirGrupo` exige fecha presente. Transición: NULL se trata como INICIADO (fail closed — nunca deja
  de contar en el cuadro). Grupo sin horario conserva ancla pero sus consumidores reciben estado explícito
  `sin_plan`; jamás se inventa fecha u horario.
- **Zona horaria** (g1-3): `fechaPublicacion = (created_at AT TIME Zone 'America/Panama')::date` como
  helper único para auditoría, fallback (`inicios-clase.mjs:76` → fechaPublicacion, jamás
  fecha_inicio_clases), protección de meses, display y la métrica de edad de `llenado.mjs:135`. La
  auditoría de historia usa `fecha_apertura <> (created_at AT TIME ZONE 'America/Panama')::date`.
- Modal: se elimina el input Fecha de apertura; columna se conserva sin escrituras nuevas.

## R2 — Inmutabilidad post-inicio (g1-4, g1-5, g1-6)

- **Allowlist estricta** (g1-4): post-inicio `actualizarGrupo` acepta SOLO `horarios` y `coach_id` — ni
  notas. La UI construye un payload exclusivo de esos dos campos cuando el grupo inició; el server rechaza
  cualquier otra clave presente y usa una rama SQL separada que no menciona número/itinerario/online/
  fecha/notas. (Notas se edita pre-inicio; post-inicio va en el panel, no en el modal — decisión v2 para
  cumplir el contrato literal de Fernando.)
- **Candado en el instante correcto** (g1-5): tras el `SELECT … FOR UPDATE` se recalcula `hoyISO()` Panamá
  y `iniciado = hoyPanama >= fechaIso10(fecha_inicio_clases)` sobre la fila bloqueada. La UI solo
  anticipa. Tests: igualdad exacta, 19:30 Panamá/00:30 UTC, y petición que espera el lock cruzando
  medianoche.
- **Matriz de comandos post-inicio** (g1-6): `setInscripcionAbierta`, `cerrarGrupo`, `aplicarFusion`,
  `extenderVentanaLlenado` y `ajustarItinerarioGrupo` se declaran comandos de operación/lifecycle
  permitidos post-inicio, sujetos a sus invariantes propias y sin capacidad de tocar campos estructurales.
  `ajustarItinerarioGrupo` deja de ser bypass: es la transición de plan definida en R3 (cohorte exacta,
  fingerprint esperado). `reabrirGrupo` solo con fecha existente.

## R2b — Cambio de horario sin reescribir el pasado (g1-7, bloqueante)

- El cambio de horario post-inicio **entra en vigor al día siguiente** (Panamá). El itinerario de
  referencia se versiona: `itinerario_clases.versiones[] = {vigente_desde, dias}`; toda fecha `<= hoy` y
  toda fecha con asistencia registrada SE CONSERVA; solo se regenera el sufijo futuro desde el mismo
  índice de contenido (semana N sigue siendo semana N, cambian sus fechas futuras).
- La regeneración usa `grupoBloqueado.itinerario_clases.fecha_inicio`, nivel y excepciones de la fila
  bloqueada — `fecha_inicio_clases` solo inicializa el PRIMER plan del grupo, nunca re-ancla niveles
  posteriores.
- La página del coach lee el calendario versionado: las columnas históricas no desaparecen.

## R3 — Planificación por niño (g1-8 … g1-15)

**Ancla**: `estudiantes.fecha_inicio_nivel DATE`. Plan derivado al vuelo (no se persiste por niño).

- **Alta** (g1-8, corrección g2-1): con grupo asignado desde el inicio, `fecha_inicio_nivel =
  max(fecha_inscripcion, grupo.fecha_inicio_clases)`. Alta sin grupo = flujo `pendiente` SIN evento de
  venta; en la PRIMERA COLOCACIÓN nace la fecha KPI canónica: `evento_inscripcion.fecha =
  fecha_colocacion` (capturada bajo lock del mes de colocación) — el ancla usa ESA fecha canónica
  combinada con la fecha del grupo (`max(fecha_colocacion, grupo.fecha_inicio_clases)`), NUNCA la
  `fecha_inscripcion` vieja de la ficha pendiente (backdatearía venta y ancla). Alta, edición, graduación
  y reincorporación escriben ficha + ancla + cierre + evento + outbox en UNA transacción.
- **Traslado de grupo con días distintos** (g1-9): al cambiar de grupo/fusionar, bajo lock se calcula la
  posición semántica vigente (índice de semana en la fecha efectiva) y se busca en el calendario del
  destino la ancla que produce EL MISMO índice — la más cercana; empate → la más antigua; si no existe,
  se aborta con error legible. El evento guarda ancla y posición antes/después. Tests: días distintos,
  feriado, excepción exclusiva del destino.
- **Cohorte de `ajustarItinerarioGrupo`** (g1-10): cohorte base = activos/baja_potencial cuyo
  `(itinerario, nivel, fecha_inicio_nivel)` coincide EXACTAMENTE con la referencia anterior del grupo.
  Transacción: lock de grupo y niños, actualiza cohorte (nivel+ancla+eventos), intactos los demás; el
  cliente envía el fingerprint esperado del plan (CAS optimista). Transición futura → fila de transición
  pendiente idempotente; nivel y royalties no cambian anticipadamente.
- **`fecha_cierre_nivel` = override manual** (g1-11): nullable, los valores legacy se preservan como
  manuales; efectivo = `manual ?? derivado` calculado al vuelo, NUNCA persistido automático. El formulario
  solo la envía si fue tocada. El cierre real de un nivel terminado queda en `estudiante_eventos.detalle
  JSONB` (con anclas y posiciones antes/después). Se agrega la columna `detalle JSONB` a
  estudiante_eventos si no existe.
- **Backfill de anclas** (g1-12, bloqueante): un evento de cambio solo se acepta si su destino concuerda
  con itinerario+nivel ACTUALES del niño y no hay evento posterior contradictorio; inscripción solo la
  canónica; referencia del grupo solo si coinciden itinerario y nivel y no hay movimiento incompatible.
  Todo lo demás → `sin_resolver`/`ambiguo` — NUNCA inferido. Cierres manuales preservados. Dry-run con
  fuente por niño, fingerprints, conflictos y no-resueltos; `--apply` en una transacción con CAS y
  rollback total. Validación: cobertura (% de niños con ancla) y muestreo de posiciones, no solo el
  comparable del cuadro.
- **Derivación batch memoizada** (g1-13, corrección g2-2): existe UN solo generador
  `generarItinerarioVersionado({fechaInicio, calendarioVersionado, nivel, pais, excepciones})` usado por
  los CUATRO consumidores — referencia del grupo, plan por niño, columnas del coach y validación de
  asistencia — donde `calendarioVersionado` es la lista normalizada de versiones `{vigente_desde, dias}`
  del grupo (no un único `dias`): así un cambio de horario post-inicio jamás reescribe el pasado de los
  planes por niño derivados al vuelo. Memo request-scoped por
  `(ancla, nivel, pais, fingerprintCalendarioVersionado, excepciones normalizadas)`; se enriquece cada
  niño UNA vez por carga (operaciones, coach, fusiones — antes del bucle de pares). Estados explícitos `por_iniciar | en_curso |
  cerrado | sin_plan` (no interpretar -1). `generated_at` sale del motor puro (se agrega solo al persistir
  la referencia del grupo) — el motor vuelve a ser determinista.
- **`liberacionDe` por niño** (g1-14): un bloque solo se anuncia por liberarse cuando TODOS los
  activos/baja_potencial del grupo están en el último nivel de su propio programa y todos tienen cierre
  resoluble; fecha = máximo de `override ?? derivado`. Grupo vacío, niño no-final o `sin_plan` → sin aviso.
- **CRM/ventana** (g1-15): toda mutación de horario/excepciones/nivel/fecha de la referencia ejecuta
  `encolarSyncCrm([grupoId], 'itinerario', query)` EN LA MISMA transacción (hoy actualizarGrupo y
  ajustarItinerario no encolan). Las anclas individuales NO alimentan ni la ventana ni el CRM: solo la
  referencia del grupo.
- `cierreScore` de fusiones: por niño (override ?? derivado), muere el fallback al grupo; pesos intactos.
- Chips "va por S{x}" por niño en FusionCard/GrupoLado/roster; aviso de fusión = distribución de semanas
  en destino; página del coach con columna "va por" por niño (calendario del grupo versionado para las
  columnas de fechas).

## R4 — KPI semanal sin manos (g1-16 … g1-21)

Gate `VENTAS_AUTO_DESDE = 202608`.

- **Un solo cálculo, superposición en vivo** (g1-16, bloqueante): `calcularKpiSemanalAuto(centroId, y, m)`
  único. Meses abiertos >= gate: `loadKpiMes`, Centro, Dashboard, Growth y Cuadro SUPERPONEN el cálculo
  vivo sobre `kpi_semanas` (la tabla deja de ser fuente para ing/des en abierto). `guardarKpiMes` y
  `cerrarMes` recalculan bajo el lock mensual y materializan SOLO `ing_*`/`des_*` (cob_* intacto). Mes
  cerrado = histórico congelado. Fallo del cálculo = fallback manual explícito.
- **Evento de venta canónico** (g1-17): el evento `inscripcion` gana `origen` (copiado atómicamente del
  alta) e identidad estable. Tras manifiesto/dedupe de historia: índice parcial único "una inscripción
  canónica por estudiante" y único `(centro_id, crm_registration_id)` cuando exista. El derivado elige el
  primer evento GLOBAL del niño antes de filtrar mes/origen. Fecha nula/inválida/discordante con
  year-month → FALLO del cálculo (fallback manual), no clamp. Traslados salen como `trasladosTotal`
  aparte, jamás en ing_*.
- **Bucket de día hábil civil exacto** (g1-18): validación `AAAA-MM-DD` civil coincidente con year/month;
  weekday por `Date.UTC/getUTCDay` (sin TZ del runtime). Lun-vie → ordinal hábil n; sábado/domingo
  posterior al primer hábil → retrocede al viernes; mes que empieza en fin de semana → esas ventas avanzan
  al primer lunes. `semana = 1 + floor((n-1)/5)`, `dia = 1 + ((n-1)%5)`. Sin feriados. Tests obligatorios:
  1-2 ago 2026 → 3 ago S1/D1; 9 ago → 7 ago S1/D5; hábil 23 → S5/D3. Dato inválido ⇒ fallback manual.
- **Corrección de `fecha_inscripcion` = 4 periodos** (g1-19, corrección g2-1): PRIMERO distingue
  `pendiente sin evento` (solo se corrige la ficha, ningún periodo KPI se toca) de `colocado con evento
  canónico` (flujo completo siguiente). Transacción con lock de estudiante y evento canónico; bloqueo de la unión ordenada de {periodo ficha vieja, event.year/month, periodo real de
  event.fecha, periodo nuevo}; actualiza ficha + evento (fecha y year/month) + ancla inicial (si no hubo
  transición de nivel posterior). Evento ausente o múltiple ⇒ rollback con error de reparación. La fecha
  no puede vaciarse y se expone en el modal de edición.
- **Resultado discriminado** (g1-20): `manual_pre_gate | auto {ing, des, cp, traslados} | fallo
  {mensaje}`. Solo `auto` bloquea las filas ing/des en la UI (cero también es auto); `fallo` las
  desbloquea con advertencia visible. Al guardar, el server recalcula DESPUÉS del lock: en `auto` ignora
  ing/des del cliente; solo en `fallo` acepta manual.
- **`cp_matriculados` con override** (g1-21): columna `cp_matriculados_override INTEGER NULL`; efectivo =
  `override ?? derivado`; editar fija override, "Usar valor del módulo" lo limpia; se materializa el
  efectivo en `cp_matriculados` para no tocar consumidores. cp_invitados/asistieron y orig_* siguen
  manuales (documentado).

## R5 — Retiro guiado por asistencia (g1-22 … g1-24)

- **Población "as of" por eventos** (g1-22, bloqueante): el Cuadro de un mes abierto deja de filtrar por
  `estudiantes.estado` actual y proyecta el estado AL CIERRE DEL MES desde eventos (un retiro de
  septiembre no borra al niño de agosto aunque agosto siga abierto). La fórmula monetaria no cambia; la
  selección de población sí. El cron atrasado registra `fecha = retiro_programado_para` (no el día físico
  de ejecución); `created_at` del evento conserva cuándo corrió.
- **Evidencia confiable** (g1-23): `marcarAsistencia` valida que la fecha sea una clase real del
  calendario versionado del grupo y `<= hoy Panamá`, respetando bloqueo de mes. Asistencia y retiro toman
  el MISMO lock de estudiante y el `EXISTS` sobre `asistencias` corre DENTRO de la transacción del retiro.
  `ultimaAsistencia` sale del contrato público (se recalcula server-side; se recalcula también al borrar o
  cambiar una presencia). Override de la validación: exactamente rol `admin_general`, con actor, motivo y
  evidencia en el evento.
- **Servicio e idempotencia** (g1-24, correcciones g2-3 y g2-4):
  - `programarRetiro(estudianteId, motivo)`: exige motivo; en UNA transacción guarda el ESTADO PREVIO del
    niño en el evento de programación (`detalle` JSONB), escribe estado='baja_potencial' +
    `retiro_programado_para` = día 1 del mes siguiente + evento, **bloquea el mes objetivo**
    (`bloquearMesesEditables` sobre el periodo del retiro programado — g2-4) y encola CRM.
  - `cancelarRetiroProgramado` TRANSACCIONAL COMPLETO (g2-3): lock del estudiante + lock del mes objetivo;
    valida que la programación siga activa; RESTAURA el estado previo guardado por `programarRetiro`
    (normalmente 'activo'); LIMPIA `retiro_programado_para`; escribe el evento de cancelación con clave
    idempotente DISTINTA a la de programación; y encola CRM — todo en la misma transacción. Si no limpia
    estado+fecha, el cron lo retiraría igual: por eso la limpieza es parte del contrato, no un detalle.
  - Servicio interno `ejecutarRetiroEn(query, datos)` compartido por cron, acciones y `cerrarMes`.
  - **`cerrarMes` reconcilia ANTES del snapshot** (g2-4): ejecuta vía `ejecutarRetiroEn` todos los retiros
    programados con `retiro_programado_para <= finMes` dentro de la misma transacción de cierre, y solo
    entonces congela la foto. Un cron atrasado que encuentre un programado cuyo mes lógico ya está CERRADO
    no escribe ningún evento KPI-afectante: marca la fila `requiere_reparacion` y la reporta en el
    response del cron para reparación manual (patrón antes/después). Jamás un evento nuevo en mes cerrado.
  - El cron reclama por lotes con `FOR UPDATE SKIP LOCKED`, re-verifica estado+fecha, ejecuta UN retiro
    por fila con `fecha = retiro_programado_para`, limpia programación y encola CRM en la misma
    transacción. Índice parcial por `retiro_programado_para WHERE estado='baja_potencial'`, `CHECK` de
    coherencia estado/fecha, clave idempotente estudiante+fecha. Bajas legacy sin fecha quedan marcadas
    `legacy` y NO entran al cron (se listan para decisión humana).
- Botón único por asistencia del mes (presente cuenta; justificada/ausente no), tooltip con evidencia,
  validación que dirige al botón correcto (reemplaza el aviso consultivo).

## Rollout (orden estricto)

1. Preflight de datos (g1-1 fechas veteranas futuras, g1-2 activos sin fecha) — bloquea todo lo demás.
2. R1 + R2 + R2b código (fecha única, candado, allowlist, calendario versionado) + constraint en dos pasos.
3. Schema por-niño (`fecha_inicio_nivel`, `detalle JSONB`, `retiro_programado_para`,
   `cp_matriculados_override`, origen/identidad en evento) + backfill de anclas (dry-run → apply).
4. R3 consumidores (derivación batch, chips, fusiones, coach, liberación, CRM en transacción).
5. R4 (`calcularKpiSemanalAuto` + superposición + materialización + índices únicos post-dedupe).
6. R5 (as-of por eventos, botones, programación, cron).
7. Meses cerrados: intocados siempre.

## Tests mínimos

Los del gate 1 punto por punto (bordes de bucket, cruce de medianoche en lock, traslado con días
distintos, cohorte exacta, backfill ambiguo → sin_resolver, as-of con retiro futuro, cron atrasado,
override de asistencia, 4 periodos bloqueados, resultado discriminado con cero-auto y fallo).
