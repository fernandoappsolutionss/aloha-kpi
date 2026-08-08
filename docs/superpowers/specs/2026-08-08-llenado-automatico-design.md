# Llenado automático de grupos — v3 (gate 2: 9/15 resueltos, 6 correcciones prescriptivas incorporadas textuales)

Fecha: 2026-08-08 · Autor: Hermes (Opus 5) · Gate 1: NO-GO (15) · Gate 2: NO-GO (6 parciales con corrección exacta) · Estado: v3 final

## Cambio de arquitectura clave respecto a v1 (responde defectos 2, 3, 7, 8)

**El cierre de llenado es un ESTADO DERIVADO, no un flag que un cron muta.**

- `inscripcion_abierta` queda como lo que siempre fue: **la palanca manual de Fernando** (regla 2026-08-01,
  schema:355-359: cerrada = no entra nadie — ni inscripción, ni reincorporación, ni cambio, ni fusión).
  El modal de edición DEJA de enviarla (defecto 7: hoy `page.js:1714-1718` reenvía el flag viejo y puede
  revertir un cierre concurrente); solo `setInscripcionAbierta(id, deseado, esperado)` con CAS
  `UPDATE … WHERE inscripcion_abierta = esperado RETURNING id` la cambia.
- **Nuevo concepto: `ventanaNuevos(grupo, hoyIso)`** (derivado, lib pura): la regla del manual
  "TINY acepta niños nuevos hasta la semana 4 del libro, KIDS hasta la 2" aplicada al **nivel vigente** del
  itinerario. Lookup exacto (defecto 1): `semanas.find(s => s.tipo==='clase' && s.corto===String(N))`
  → última fecha de esa semana = fecha límite. Preflight para itinerarios legacy sin `tipo`/`corto` →
  `estado:'sin_itinerario_valido'`, nunca cerrar a ciegas. KINDER y sin-itinerario: exentos.
  Al pasar de nivel, la ventana se reabre sola (nueva semana límite del nivel nuevo) — coherente con el
  manual ("aprovecha la inducción de cada nivel") y con los grupos multi-nivel reales (G23 = TINY 5-10 · KIDS 7).
- **Qué bloquea cada cosa** (defecto 2 — el manual habla de NIÑOS NUEVOS):
  - Alta nueva (`inscribirEstudiante`) y colocación en clase de prueba: bloqueadas por
    `inscripcion_abierta=false` **o** `ventanaNuevos` vencida (con override, abajo).
  - Reincorporación, cambio de grupo interno, fusión hacia el grupo: SOLO respetan `inscripcion_abierta`
    (palanca manual). El cierre automático **jamás** frena una fusión — pedido explícito de Fernando.
  - **Primera colocación** (corrección g2-6): asignar grupo a un niño SIN historial de grupo previo no-nulo
    (alta sin grupo → luego `actualizarEstudiante` le pone grupo) cuenta como niño NUEVO → usa
    `grupoAceptaNinosNuevos`. Solo el traslado real (tenía grupo) es movimiento.
- **Override consciente**: columna `llenado_extendido_hasta DATE NULL` — un admin puede extender la ventana
  (queda rastro; vence sola). Es la única escritura de "estado" nueva y es manual.
- **Sin cron que cierre**: al ser derivado no hay UPDATE masivo, no hay carreras de cierre (defecto 7 se
  reduce al toggle manual, que ahora lleva CAS), no hay backfill de flags (defecto 15 rollout se simplifica).

**Race real que queda y su cierre (defecto 8, corrección g2-3):** el wrapper `lib/db.js` NO expone
`transaction` — se agrega `export tx(statements)` que usa el `transaction()` del cliente Neon (o CTE única
cuando aplique). El alta valida TODO en el mismo statement: `estado='activo'`, palanca, snapshot del
itinerario (fecha límite derivada pasada como parámetro calculado del MISMO grupo releído), override
`llenado_extendido_hasta` y `hoyPanama <= límite efectivo`; estudiante + evento + outbox se insertan juntos
(CTE escribible o `tx()`). `aplicarFusion`: CTE condicional que verifica el número EXACTO de niños del origen
antes de mover (si el conteo cambió, 0 filas → aborta) + updates + eventos + marca de origen + outbox en la
misma transacción — serializa contra el toggle sin locks de sesión.

## Sincronización al CRM — outbox durable (defecto 14)

- El estado derivado cambia sin evento, pero ventas debe ver 0 cupos al vencer la ventana. Nueva tabla
  `crm_sync_outbox (id, crm_event_id, grupo_id NULL, op CHECK (op IN ('sync_group','clear_group')), motivo,
  clave_idem TEXT UNIQUE, creado_at, procesado_at NULL, intentos, ultimo_error, locked_at NULL, lock_token NULL)`
  — **por evento CRM, no por grupo** (corrección Sol g2-5): al cerrar/fusionar, los `centro_eventos.grupo_id`
  se capturan ANTES de desvincular y la desvinculación local + el encolado `clear_group` van en la misma
  transacción; el consumidor nunca pierde a quién limpiarle `aloha_group`.
- Productores: toggle manual (CAS OK → encola), inscribir/retirar/reincorporar/**fusionar y cerrarGrupo**
  (encolan en la misma transacción — el origen fusionado y el grupo cerrado producen `clear_group`, ver abajo),
  y el **cron diario** que detecta cambios de estado de ventana por **fingerprint** (corrección Sol g2-4):
  columna `llenado_fingerprint TEXT` en grupos = `nivel|fecha_limite_efectiva|abierta`. El cron calcula el
  fingerprint vigente en JS y ejecuta UN solo statement CTE:
  `WITH cambiado AS (UPDATE grupos SET llenado_fingerprint=$fp WHERE id=$id AND llenado_fingerprint IS DISTINCT
  FROM $fp RETURNING id) INSERT INTO crm_sync_outbox (...) SELECT ... FROM cambiado RETURNING id` — el marcador
  y el encolado son atómicos: si el proceso cae, no se pierde la transición (cubre apertura Y vencimiento de la
  misma fecha límite).
- Consumidor: el mismo cron reclama filas con UN statement
  `UPDATE crm_sync_outbox SET locked_at=now(), lock_token=$t WHERE id IN (SELECT id FROM crm_sync_outbox WHERE
  procesado_at IS NULL AND intentos<5 AND (locked_at IS NULL OR locked_at<now()-interval '5 minutes')
  ORDER BY id LIMIT 20 FOR UPDATE SKIP LOCKED) RETURNING *` y procesa con concurrencia ≤3, marcando
  `procesado_at` (con `lock_token` correcto) o `intentos+1`/`ultimo_error`. **Presupuesto** (corrección g2-6):
  el route declara `export const maxDuration` y el consumo corta por tiempo (deja filas pendientes para la
  próxima corrida); el response reporta procesadas/pendientes/fallidas POR CENTRO. `pushCuposAlCrm` deja de
  llamarse inline en server actions; las actions solo encolan. `loadOperaciones` NO espera red externa.
- Cron Vercel: `vercel.json` `{"crons":[{"path":"/api/cron/llenado","schedule":"0 10 * * *"}]}` (UTC ≈ 5am
  Panamá). Handler fail-closed:
  `const s = process.env.CRON_SECRET; if (!s || auth !== `Bearer ${s}`) return 401` (defecto 14). La lógica
  vive en un servicio `server-only` (`lib/llenado-service.js`) compartido por el route (auth por secreto) y
  por un wrapper de server action (auth por sesión) — nunca invocar server actions con cookie desde el cron.

## Payload CRM y PR coordinado (defecto 11)

- `armarAlohaGroup` agrega claves aditivas null-safe: `fecha_limite_nuevos`, `dias_para_iniciar`,
  `faltan_para_meta`, `ritmo_semanal_necesario`. Las 6 claves actuales intactas (tipos incluidos). **La fórmula
  cambia** (corrección g2-5): `cupos_disponibles = 0` cuando la palanca esté cerrada **o** la ventana derivada
  de nuevos haya vencido — hoy solo mira la palanca (`cupos-sync.js:26-34`).
- **PR hermano en el CRM** (repo `crm-worktrees/centros-invisibles`): tipos + render en `events-tab.tsx`
  (tarjeta y modal muestran fecha límite, faltantes y ritmo en las notas del vendedor), test de contrato
  viejo+nuevo, y fix: al duplicar evento se recalcula `aloha_group` (hoy copia el snapshot viejo,
  `route.ts:168-183`). Sin PR del CRM los vendedores no ven lo nuevo — es parte del paquete, no opcional.

## Clase de prueba ↔ grupo (defectos 9, 10 — extender lo que YA existe)

- El vínculo, selector y preselección YA existen (`eventos/page.js:226-230, 555-563`). Se extiende:
  - Server-side al vincular/cambiar vínculo: exigir grupo activo + abierto a nuevos (`grupoValido` hoy
    acepta cualquier activo, `eventos.js:91-96`). Al editar un evento cuyo grupo se cerró: el vínculo se
    conserva visible como opción deshabilitada con aviso "cerrado a nuevos — reasignar", nunca se
    desvincula en silencio.
  - Selector: solo grupos con ventana abierta, ordenados por fecha límite asc, mostrando cupos + ritmo.
  - Modal de inscripción desde evento: inicializa itinerario/nivel DESDE el grupo vinculado (hoy siempre
    TINY nivel 1) — `listarGruposActivos` devuelve también nivel del itinerario. Validación server-side de
    colocación con la matriz existente de fusiones (Tiny no entra a grupo Kids; Kids <3 no entra a Tiny —
    `lib/fusiones.js:130-148`) reutilizada como matriz de colocación.
  - Botón "+ Inscribir niño aquí" del panel de grupo: deshabilitado si no acepta nuevos, con motivo.

## Ritmo de llenado — fórmula exacta (defecto 13)

`ritmoLlenado(grupo, meta, eventosInscripcion, hoyIso)` devuelve:
- `ninos` (activos+baja_potencial), `meta` (aperturaMinima del nivel si no inició; gpnMin si ya inició),
  `faltan = max(0, meta − ninos)`.
- `diasParaInicio` (hasta `fecha_inicio` del nivel vigente; null si ya inició),
  `diasHastaLimite` (hasta fecha límite de ventana; negativo = vencida).
- `ritmoSemanalNecesario = faltan / max(1, diasHastaLimite/7)` redondeado a 1 decimal (0 si faltan=0;
  null si vencida).
- `ritmoSemanalObservado`: inscripciones al grupo en los últimos 14 días × 7/14 (de `estudiante_eventos`
  tipo inscripcion con `a_grupo_id`), 1 decimal; `'sin_datos'` si el grupo tiene <14 días creado.
- `estado`: `'meta_cumplida'` (faltan=0) · `'a_ritmo'` (observado ≥ necesario) · `'apretado'`
  (observado < necesario) · `'vencida'` (límite pasado) · `'sin_datos'`.
- Tests de borde: faltan=0, límite hoy, límite pasado, sin itinerario, fechas string vs Date, <14 días.

## Sugerencias del manual (igual que v1, con datos del ritmo)

`sugerenciasLlenado(ritmo)` — herramientas aprobadas (`GUIA_FRANJAS_DIFICILES` + protocolo escalonado
10% s/lím · 15% máx3/mes · 25% máx2/mes · 25%+10% máx1/mes), escalonadas por `diasParaInicio`/`estado`,
siempre con "toda promo la aprueba la Administración General". Devuelve dato estructurado, la UI no inventa.

## UI Grupos (defecto 12 — una sola secuencia)

```
base      = grupos.filter(pasaFiltro && coincideBusqueda)
enLlenado = base.filter(activo && inscripcion_abierta!==false && ventanaNuevos.abierta)
            .sort(fechaLimite asc, nulls al final)
resto     = base.filter(el complemento)   // incluye cerrados a nuevos, palanca cerrada, cerrados, fusionados
visibles  = [...enLlenado, ...resto]      // TODO deriva de aquí: render, visiblesKey, flechas, conteos
```
- Sección destacada arriba (cards en-llenado con countdown, cupos, ritmo); `resto` debajo con el orden
  actual por número. Cada ID se renderiza UNA vez.
- Chips del panel: "En llenado · cierra en X días" / "Cerrado a nuevos (manual, semana Y)" /
  "🔒 Inscripciones cerradas" (palanca). Filtro nuevo "Cerrados a nuevos".
- Panel derecho: bloque Llenado (ritmo + fecha límite + botón "Extender ventana" → `llenado_extendido_hasta`)
  + sugerencias del manual.
- Convención `!== false` para `inscripcion_abierta` se mantiene en cliente; en DB se migra NULL→TRUE y
  `SET NOT NULL DEFAULT TRUE` (defecto 15; sentencias planas idempotentes para migrate.mjs).

## Fecha de inicio de clases (defectos 4, 5, 6 — D7 v2, SIN regresión)

`itinerario.fecha_inicio` = inicio del NIVEL vigente ≠ inicio operativo del grupo. Backfillear a ciegas
reclasifica nuevos del mes (reproducción de Sol: nuevos agosto 0→1). Corrección:

- **No se crea columna nueva**: la fecha del nivel ya vive en el JSON; la UI la lee de ahí.
- **Backfill selectivo con manifiesto** (script one-shot `scripts/backfill-fecha-inicio-2026-08-08.mjs`,
  dry-run por defecto, `--apply`, patrón antes/después/conflicto de `kpi-history-repair`):
  - Grupo sin niños activos → `fecha_inicio_clases = it_inicio` (es un grupo nuevo: semántica exacta).
  - Grupo con niños → cota calculada REPRODUCIENDO `iniciosClase` (corrección g2-1): el universo es todo
    estudiante cuya PRIMERA inscripción efectiva apunta a este grupo (`a_grupo_id` del primer evento
    'inscripcion', con fallback a `estudiante.grupo_id` actual si no hay evento — exactamente
    `inicios-clase.mjs:40-43`), no solo los miembros activos actuales.
    `fecha_inicio_clases = LEAST(it_inicio, min(fecha_inscripcion de ese universo))` ⇒ cero reclasificación.
  - **Se elimina** el UPDATE de `ajustarItinerarioGrupo` que copia el inicio del nivel a
    `fecha_inicio_clases` (`grupos.js:350-354`) — mezcla las dos semánticas (corrección g2-1).
  - Manifiesto fijo de IDs (los 31 del dry-run del 8-ago) con valor esperado NULL; CAS por fila
    (`WHERE fecha_inicio_clases IS NULL`); verificación before/after (corrección g2-2) sobre TODOS los meses
    abiertos Y los cerrados SIN snapshot desde 2026-08 (esos se reconstruyen con datos vivos,
    `cuadro.js:32-39`): IDs de grupos, niños, nuevos, royalties, aPagar — IDÉNTICO o aborta. EXCEPCIÓN
    DOCUMENTADA: grupos vacíos con `it_inicio` futuro salen del cuadro de meses previos al asignarles fecha —
    variación intencional aprobada (semántica "entra al cuadro ese mes"), se lista aparte en el reporte y no
    rompe la verificación.
- **Modal** (defecto 6): FECHA DE INICIO DE CLASES muestra hint de solo lectura "Nivel vigente inicia
  {it_inicio}" cuando la columna es NULL; el form NO envía la fecha si el usuario no la editó (hoy el modal
  siempre reenvía todo). `regenerarItinerarioClases` NO escribe la columna (v1 lo proponía; retirado —
  mezclaba semánticas).
- **Rollout en fases** (defecto 15): PR código → deploy → backfill D7 con verificación → recién entonces la
  ventana derivada queda visible (feature-safe: derivado no depende del backfill; solo mejora el ritmo).

## Qué NO entra (sin cambios de v1)

- Cierre de GRUPO (estado) automático: no. Descuentos automáticos: no, solo sugerencia con topes.
- Reapertura de palanca manual automática: no.

## Plan de implementación (TDD, orden de fases)

1. `lib/llenado.mjs` (ventanaNuevos, fechaLimite lookup por corto+tipo con preflight legacy, ritmoLlenado,
   sugerenciasLlenado, ordenarPorCierre) + `test/llenado.test.mjs` exhaustivo.
2. Schema: `llenado_extendido_hasta`, `llenado_fingerprint`, `crm_sync_outbox`,
   `inscripcion_abierta` NULL→TRUE + NOT NULL. Sentencias planas idempotentes.
3. `lib/llenado-service.js` (server-only): detección de transiciones (CAS RETURNING), outbox
   producer/consumer con lotes y reintentos; wrapper server action; route cron fail-closed; vercel.json;
   `.env.example` CRON_SECRET.
4. Server actions: `setInscripcionAbierta` CAS; modal deja de enviar el flag y la fecha no editada;
   inscripción condicional en transacción batch; `aplicarFusion` transaccional; `grupoAceptaNinosNuevos`
   (palanca + ventana + override) vs `grupoAceptaMovimientos` (solo palanca); fix filtro sugerencias
   fusión (destino con palanca cerrada).
5. Eventos/clase de prueba: validación server-side de vínculo, selector filtrado+ordenado, modal
   inicializado desde grupo, matriz de colocación, opción deshabilitada al editar.
6. UI Grupos: secuencia única visibles, sección destacada, chips, filtro nuevo, panel Llenado + Extender.
7. `armarAlohaGroup` extendido + outbox en actions.
8. PR CRM hermano (tipos, render notas vendedor, contrato, fix duplicar).
9. Script backfill D7 v2 + verificación → correr con aprobación de Fernando.
10. Tests integración listados por Sol (concurrencia de cierre, cierre vs alta/fusión, override, secreto
    ausente y `Bearer undefined`, fallo de un centro no aborta, CRM viejo/nuevo, orden DOM=visiblesKey,
    snapshots ausentes, preflight legacy). Smoke browser + PR.
