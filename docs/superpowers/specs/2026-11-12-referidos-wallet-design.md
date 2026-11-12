# Referidos ALOHA con saldo y tarjeta de Wallet — diseño y plan (v4)

Fecha: 2026-11-12 · Repo principal: `aloha-kpi` (Next 15 JS + Neon) · Repo secundario: CRM (`v0-plataforma-teamsolutionss-me`)

**Cambios de la v2 (respuesta a la ronda 1 de Astra):** B1 la inscripción nueva ya no entrega la tarjeta de un miembro existente · B2 todo débito bloquea al miembro, canje con clave de operación obligatoria, reverso con saldo consumido definido · B3 bonos por **importe neto** (soporta asistió→no→asistió y cancelaciones), reconciliación serializada por evento · B4 un solo referidor por miembro, guardado en el miembro y congelado bajo bloqueo · B5 el código de referido viaja en su propio campo (`referral_code`), aparte del UTM: el cambio en la landing y el registro del CRM pasa a ser parte del núcleo · B6 carga histórica definida, conversiones sin caducidad · B7 se verifica inscripción→evento→centro antes de marcar asistencia y antes de acreditar · B8 Wallet con objeto estable y cola de pendientes. Menores incorporados en 4.x.

**Cambios de la v3 (ronda 2 de Astra):** C1 la reemisión invalida de verdad: enlace de alta de un solo uso, credenciales de Apple y objeto de Google versionados por emisión · C2 importar primero y acreditar después: la atribución solo se cierra en la pasada del cron con cobertura completa de la cuenta · C3 la anulación de matrícula entra al cálculo neto (reverso automático, puede dejar deuda); el ajuste manual ya no se usa para eso · C4 versión de saldo y envíos a Wallet serializados por miembro. Menores: evidencia de alta nueva, regla única de cierre de atribución, `already_registered`, clase de Google.

**Cambios de la v4 (ronda 3 de Astra):** D1 la cobertura es de **toda** la cuenta, sin fecha de inicio (la fecha `activo_desde` solo decide el dinero), y se certifica con el total exacto que devuelve el CRM con paginación; una corrida con cualquier importación fallida no cierra atribuciones. Menores: alta consumida atómicamente, `alta_nueva_estudiante_id` en la misma transacción del alta, reemisión bajo el bloqueo de envío.

## 1. Qué pidió Fernando

- Quien va a una clase de prueba recibe **dinero (saldo)** canjeable en su **mensualidad**.
- Esa persona queda **de una vez** inscrita en el sistema de referidos y recibe una **tarjeta** que puede guardar en la Wallet del iPhone o de Android, con su saldo y su **código/QR**.
- Otra persona **escanea el código**, ve las clases de prueba y **se inscribe sola**. Queda como **referida** del dueño de la tarjeta, que ya está enlistado en el KPI.
- Hay que resolver también a los que **ya se inscribieron** a clase de prueba: cómo se les agrega el saldo y cómo descargan la tarjeta.

## 2. Cómo funciona hoy (verificado en código, origin/main de ambos repos)

- Las clases de prueba son eventos del **CRM** (`crm_events`); los inscritos viven en `crm_event_registrations`. aloha-kpi guarda un espejo del evento (`centro_eventos`, no es inventario garantizado) y lee inscritos **en vivo** por `crmCall('list_registrations', {event_id})` (`select *`, del más reciente al más antiguo). No hay webhook CRM→KPI. El CRM expone también `list_events`.
- El prospecto se inscribe solo en la landing del CRM `https://promo.alohapanama.com/aloha/clase-de-prueba` (variante Venezuela aparte) → `POST /api/public/events/register`. La landing guarda UTM de **primer toque** por sesión: un UTM nuevo no pisa el anterior.
- Al inscribirse el CRM solo manda **correo** de confirmación (Resend).
- Asistencia: `marcarAsistencia` (KPI) → `update_registration`; hoy valida que el evento sea del centro pero **no** que la inscripción sea de ese evento. También se puede marcar desde el CRM.
- Conversión a alumno: `inscribirEstudiante` crea la fila en `estudiantes` con `crm_registration_id`; `vincularFichaExistente` enlaza una ficha previa. `origen_venta` acepta `'referido'` solo como etiqueta.
- **No existe**: quién refirió a quién, saldo, descuentos locales, escritura en Zoho, Wallet, WhatsApp por API.
- Rutas públicas del KPI: lo que no está en el `matcher` de `middleware.js`. Tokens opacos aleatorios en base.
- Hay cuenta de desarrollador de Apple pero **no** certificado de Pass Type ID; no hay cuenta emisora de Google Wallet.

## 3. Enfoques considerados

| Enfoque | Qué es | Por qué sí / no |
|---|---|---|
| **A. Libro y tarjeta en aloha-kpi; el CRM solo transporta el código (elegido)** | Saldo, miembros, tarjeta y canje en Neon. El QR apunta al KPI (`/r/<código>`), que redirige a la landing con `referido=<código>`; la landing lo manda en el registro y el CRM lo guarda en una columna propia. El KPI lo lee al reconciliar. | El alumno y la mensualidad viven en el KPI; el CRM recibe un cambio mínimo y aditivo (un campo opcional). |
| B. Referidos dentro del CRM | Lógica y saldo en Supabase. | Fernando lo pidió para el KPI; duplica el concepto de alumno. |
| C. SaaS de tarjetas (PassKit, etc.) | Servicio de terceros. | Costo por pase y otra plataforma para algo de ~200 líneas. |
| D. Atribución solo por UTM (v1 de este plan) | Sin tocar el CRM. | Descartado: el primer toque de la sesión puede tapar el código y el referido no queda automático. |

## 4. Diseño

### 4.1 Reglas de negocio

1. **Miembro** = un representante por país: clave `(crm_account_id, telefono_norm)`. `telefono_norm` = solo dígitos, con el prefijo del país de la cuenta si falta (507 Panamá, 58 Venezuela, quitando el 0 inicial local). Una inscripción **sin teléfono válido no crea miembro**: aparece en pantalla como «sin teléfono» y no genera bonos hasta que el personal lo corrija en el CRM.
2. Todo inscrito con teléfono válido se vuelve miembro al ser visto por la reconciliación (4.3). El miembro nace con los datos de la inscripción que lo creó; **inscripciones posteriores no sobrescriben** nombre, correo ni teléfono.
3. **Bonos** (montos por país, centavos de USD):
   - `bono_clase_prueba`: al miembro, por cada inscripción suya en estado **asistió**.
   - `bono_referido_asiste`: al referidor, cuando la inscripción que originó el referido está en **asistió**.
   - `bono_referido_inscrito`: al referidor, cuando esa inscripción produce una **ficha nueva** con inscripción efectiva y vigente. Evidencia: `inscribirEstudiante` anota en `referidos_registros.alta_nueva_estudiante_id`, **en la misma transacción que crea la ficha**, la ficha que creó para ese registro (los upserts de importación nunca pisan ese campo) (`vincularFichaExistente` no la anota: un alumno previo no es referido nuevo). La condición se cumple cuando esa ficha tiene evento `inscripcion` en `estudiante_eventos` (nace al inscribir con grupo o en la primera colocación de una ficha pendiente) **y** no tiene `anulacion_matricula`.
   El importe de cada bono se **congela** en su primer movimiento; cambios de configuración posteriores no lo alteran.
4. **Referidor único por miembro**, guardado en `referidos_miembros.referidor_id` y decidido **una sola vez**, bajo bloqueo de la fila del miembro, **únicamente en la pasada de acreditación del cron** (4.3), que corre después de importar todos los eventos de la cuenta: así nunca se decide con antecedentes incompletos, sin importar el orden en que se cargaron los eventos. Mientras no esté cerrada, los bonos `ref_*` de ese miembro quedan pendientes (el `bono_clase_prueba` no depende de la atribución y se acredita de inmediato). Se decide con la inscripción **más antigua** del miembro (`registered_at` del CRM, desempate por id): hay referidor si esa inscripción trae un código válido de otro miembro del mismo país y además (a) el referidor no es el mismo miembro, y (b) el miembro no tenía ficha en `estudiantes` (por teléfono normalizado) con fecha anterior a esa inscripción. Decidido (con o sin referidor) queda `atribucion_cerrada=true` y no se recalcula.
5. **Código de referido**: la inscripción lo trae en `referral_code` (campo propio, 4.7). Respaldo: `utm_source='referido'` + `utm_campaign=<código>` para inscripciones anteriores al despliegue del CRM.
6. Los bonos solo nacen de hechos que marca el **personal** (asistencia, inscripción), y solo sobre inscripciones verificadas como del evento y del centro (4.3). Inscribirse en la landing no da nada.
7. **Canje**: lo registra el personal con escritura en el centro: monto entero positivo + nota, con **clave de operación** obligatoria (UUID que genera el formulario al abrirse; un reintento con la misma clave no descuenta dos veces). Bloquea la fila del miembro, calcula el saldo dentro de la transacción y rechaza si `monto > saldo`. El descuento en la factura lo aplica el personal a mano; el KPI es el libro. Sin escritura a Zoho en esta versión.
8. **Reversos**: los genera la reconciliación por importe neto (4.3). Si el bono ya se había canjeado, el reverso se aplica igual y el saldo queda **negativo**: se muestra en rojo, bloquea canjes y se compensa con bonos futuros. La **anulación de matrícula** es un reverso automático más: apaga la condición de `ref_inscrito` (regla 3) y el neto lo revierte una sola vez, con deuda si ya se canjeó. Los **ajustes** manuales (solo gerencia, nota obligatoria, clave de operación) son discrecionales, no tocan ningún concepto y no pueden dejar el saldo por debajo de cero.
9. El sistema nace **apagado** por país (`activo=false`, montos 0): se crean miembros y tarjetas, no se acredita nada. `activo_desde` (fecha): solo clases con fecha ≥ esa fecha generan bono. **Para acreditar a quienes ya fueron a clase de prueba, Fernando pone una fecha pasada**; quienes queden antes de la fecha reciben tarjeta y pueden referir, sin saldo inicial. (Regla explícita: el alcance del saldo histórico lo fija esa fecha.)
10. Saldo sin vencimiento y sin tope por canje en v1 (decisión pendiente de Fernando; no bloquea).

### 4.2 Datos (migración `db/migrations/2026-11-12-referidos.sql` + `scripts/migrate-referidos.mjs`, en seco por defecto)

```
referidos_config(crm_account_id text PK, activo bool default false, activo_desde date,
  cobertura_completa_at timestamptz null,   -- carga histórica de TODA la cuenta terminada y certificada
  bono_clase_prueba_cent int default 0 CHECK >=0, bono_referido_asiste_cent …, bono_referido_inscrito_cent …,
  updated_by int, updated_at timestamptz)

referidos_miembros(id serial PK, crm_account_id text, telefono_norm text, nombre text, telefono text, correo text,
  codigo text UNIQUE, token text UNIQUE, origen_registration_id text,           -- la inscripción que lo creó
  referidor_id int FK null, referido_por_registration_id text null, atribucion_cerrada bool default false,
  emision int default 1,                    -- sube al reemitir; versiona token, apple_auth, serial de Apple y objeto de Google
  apple_auth text, google_objeto_at timestamptz null,
  version int default 0, wallet_version_enviada int default 0,   -- pendiente de Wallet = version > wallet_version_enviada
  tarjeta_vista_at timestamptz null, actualizado_at timestamptz default now(), created_at timestamptz default now(),
  UNIQUE(crm_account_id, telefono_norm), CHECK(referidor_id <> id))

referidos_registros(crm_registration_id text PK, crm_event_id text, crm_account_id text, centro_id int null,
  miembro_id int FK null, codigo_referido text null, participante text, registered_at timestamptz,
  clase_fecha timestamptz, estado text,                 -- attendance_status del CRM, incluye cancelled
  alta_nueva_estudiante_id int null, visto_at timestamptz)

referidos_movimientos(id serial PK, miembro_id int FK, tipo text CHECK in
  ('bono_clase_prueba','bono_referido_asiste','bono_referido_inscrito','reverso','canje','ajuste'),
  monto_cent int NOT NULL CHECK <> 0, concepto text null,     -- 'cp:<reg>' | 'ref_asiste:<reg>' | 'ref_inscrito:<reg>'
  clave text NOT NULL UNIQUE,                                  -- '<concepto>#<n>' o 'op:<uuid>'
  centro_id int null, nota text, creado_por int null, created_at timestamptz default now())

referidos_apple_dispositivos(device_id text, miembro_id int FK, push_token text, PK(device_id, miembro_id))
referidos_intentos(ip text, minuto timestamptz, n int, PK(ip, minuto))   -- límite de /tarjeta/alta compartido entre instancias
```

Saldo = `SUM(monto_cent)`. **Toda** escritura al libro (bono, reverso, canje, ajuste) corre en transacción con `SELECT … FOR UPDATE` de la fila del miembro, y en la misma transacción pone `actualizado_at=now()` y `version = version + 1`.

### 4.3 Reconciliación (una función, idempotente, serializada)

Dos operaciones separadas: **importar** (`importarEvento`) y **acreditar** (`acreditar`).

`importarEvento({crmEventId})`:

1. Toma un bloqueo consultivo de Postgres por evento y **dentro** del bloqueo lee los inscritos frescos del CRM (nunca reusa una lectura de pantalla), así dos corridas no se cruzan ni una lectura vieja pisa a una nueva.
2. Resuelve cuenta y centro del evento (`centro_eventos` si existe; si no, la cuenta que devolvió el CRM y centro nulo). Ordena por `registered_at` ascendente.
3. Por cada inscripción (incluidas las **canceladas** y las ya conocidas): asegura miembro (si hay teléfono válido), hace upsert de `referidos_registros` con el estado actual.
`acreditar({cuenta, cerrarAtribucion})` — SQL local, sin CRM:

4. **Importe neto por concepto**: para cada concepto calcula lo debido (`importe congelado` si la condición se cumple hoy, si no 0; importe congelado = primer movimiento del concepto, o el monto de configuración si aún no hay ninguno y el país está activo y la clase ≥ `activo_desde`) y lo ya asentado (`SUM` del concepto). Si difieren inserta el delta (`tipo` bono o `reverso`, `clave = concepto#n`) bajo bloqueo del miembro. Soporta cualquier secuencia de correcciones.
5. Con `cerrarAtribucion=true` (solo el cron y el final de la carga histórica; solo si la cuenta tiene `cobertura_completa_at` **y** la importación de esa misma corrida terminó completa y certificada: si un solo evento falló o no cuadró su total, esa corrida no cierra ninguna atribución): cierra la atribución de los miembros abiertos (regla 4) antes de calcular los `ref_*`. Sin atribución cerrada, los `ref_*` de ese miembro no se calculan todavía.
6. La conversión (`ref_inscrito`) se evalúa por `alta_nueva_estudiante_id` + eventos locales (regla 3), **sin límite de fecha del evento**: no caduca.

Importar y acreditar toman un **bloqueo consultivo por cuenta** cuando corren en lote (cron y carga histórica no se pisan).

Disparadores: `listarRegistros`, `marcarAsistencia`, `inscribirEstudiante`, la primera colocación en `actualizarEstudiante` y la anulación de matrícula llaman a `importarEvento` (si aplica) + `acreditar({cerrarAtribucion:false})` después de su trabajo; un fallo se registra y no rompe la acción. Botón «Reconciliar» por evento (igual). **Cron diario** `/api/cron/referidos` (registrado en `vercel.json`, protegido con `rechazoCron`/`CRON_SECRET`), en este orden: (a) **importa** todos los eventos de `list_events` de cada cuenta ALOHA con fecha en los últimos 45 días y futuros; (b) **acredita** con `cerrarAtribucion=true`; (c) reintenta los envíos de Wallet pendientes. El bono al referidor puede tardar hasta la siguiente corrida del cron (≤ 24 h). Límite declarado: una asistencia corregida **en el CRM** más de 45 días después de la clase solo entra con el botón «Reconciliar».

**Verificación de pertenencia (B7):** `marcarAsistencia` y `marcarPago` comprueban, antes de escribir, que `registrationId` aparece en `list_registrations` de ese evento (que ya se validó como del centro). Se añade prueba del intento cruzado entre centros.

### 4.4 Carga histórica («los que ya se inscribieron»)

Acción de gerencia «Cargar históricos» (y script equivalente): recorre **todos** los eventos de la cuenta en el CRM, **sin fecha de inicio** (la cobertura sirve para resolver identidad y antecedentes; el dinero lo limita aparte `activo_desde`), por lotes reanudables, **solo importando** (`importarEvento`, idempotente). **Certificación**: `list_events` y `list_registrations` del CRM pasan a aceptar `offset`/`limit` y a devolver `total` (conteo exacto, 4.7); el KPI pagina hasta que lo recibido es igual a `total` en la lista de eventos y en cada evento. Únicamente cuando todos los eventos cuadraron marca `cobertura_completa_at` y corre `acreditar` con `cerrarAtribucion=true`. Con el CRM aún sin `total` (PR del CRM sin publicar) no hay certificación posible. Sin cobertura completa no se cierra ninguna atribución ni se paga ningún `ref_*` en esa cuenta. Al terminar muestra cobertura: eventos del CRM vs. reconciliados, inscripciones vistas, miembros creados, sin teléfono. La entrega: `/centro/[id]/referidos` tiene el filtro **«tarjeta sin abrir»** (`tarjeta_vista_at IS NULL`) con botón por fila que copia el enlace y abre `wa.me` con el mensaje escrito (lo envía la persona), y exportación a Excel con los enlaces.

### 4.5 Rutas públicas (aloha-kpi)

Todas con `Cache-Control: private, no-store`, `Referrer-Policy: no-referrer` y `noindex`.

- `GET /r/[codigo]` → 302 a la landing del país con `referido=<codigo>&utm_source=referido&utm_medium=tarjeta&utm_campaign=<codigo>`. Código desconocido → landing limpia.
- `GET /tarjeta/[token]` → tarjeta web: logo ALOHA, nombre, **saldo**, QR de `/r/<codigo>`, compartir, botones de Wallet si están configurados, últimos movimientos (**solo tipo, fecha y monto; nunca notas internas**) y las reglas en dos líneas. Marca ALOHA, clara, sin header ni footer, primero a 390 px. Marca `tarjeta_vista_at`.
- `GET /tarjeta/alta?e=<event_id>&r=<registration_id>` → verifica con el CRM que la inscripción existe en ese evento de una cuenta ALOHA y reconcilia. **Solo redirige a la tarjeta si esa inscripción es la que creó al miembro** (`origen_registration_id`), el miembro sigue en su primera emisión (`emision = 1`) y la tarjeta aún no se ha abierto (`tarjeta_vista_at IS NULL`): el enlace de alta es de **un solo uso**, consumido de forma atómica antes de redirigir (`UPDATE … SET tarjeta_vista_at = now() WHERE id = … AND tarjeta_vista_at IS NULL AND emision = 1 RETURNING token`: dos peticiones simultáneas, solo una pasa). En cualquier otro caso (incluida la respuesta `already_registered` del CRM, que no trae identificador y por eso la confirmación no muestra el botón) no revela nada: muestra «Ya tienes tarjeta ALOHA; pídele el enlace a tu centro». Límite por IP en `referidos_intentos`.
- El personal, **tras verificar a la familia en el centro**, puede **reemitir** la tarjeta: `emision + 1`, `token` y `apple_auth` nuevos. Efecto: el enlace web anterior y el enlace de alta dejan de servir; el pase de Apple anterior (serial `<id>-<emision vieja>`) recibe 401 del servicio web y no se actualiza más; el objeto de Google anterior se marca `INACTIVE` y no recibe más saldo. La reemisión toma el mismo bloqueo de envío por miembro, sube `version`, y `enviarWallet` confirma solo si la emisión no cambió; la desactivación del objeto de Google anterior se reintenta en el cron hasta lograrse. La familia guarda la tarjeta nueva desde el enlace que le da el personal. El enlace es al portador para **ver**; canjear exige al personal, que atiende a la familia en el centro.
- `/api/wallet/apple/[token]`, `/api/wallet/apple/v1/[...ruta]`, `/api/wallet/google/[token]`.

### 4.6 Pantallas internas

- **Inscritos de la clase de prueba**: etiqueta «Referido por <nombre>», «sin teléfono» cuando aplique, botón **Tarjeta**, botón **Reconciliar**. En `InscribirModal`, si el miembro tiene referidor, `origen_venta` preseleccionado en `referido`.
- **`/centro/[id]/referidos`**: buscar por nombre, teléfono o código; saldo, movimientos, referidos; **canje**; filtro «tarjeta sin abrir»; reemitir tarjeta. Listas de 10 (opción 50/100).
- **`/dashboard/referidos`** (gerencia): interruptor, montos y `activo_desde` por país (solo `admin_master`); totales incluido **saldo pendiente = pasivo** y saldos negativos; ajuste manual; «Cargar históricos».
- Server actions con el patrón del repo (`try/catch → fallo()`, guards de centro).

### 4.7 Cambio en el CRM (parte del núcleo, PR aparte, aditivo)

1. Migración: `ALTER TABLE crm_event_registrations ADD COLUMN IF NOT EXISTS referral_code text`.
2. Landing (`landing.tsx`, PA y VE): lee `?referido=`, lo valida contra `^[a-z2-9]{6}$`, lo guarda en `sessionStorage` con clave propia (el **último** código escaneado gana; no toca la atribución de marketing ni su primer toque) y lo envía como `referral_code` en el POST.
3. `register/route.ts`: acepta `referral_code` opcional, lo valida con el mismo patrón y lo guarda; cualquier otro valor se descarta. No cambia la respuesta ni el resto del flujo.
4. Pantalla de confirmación y correo de confirmación (solo cuentas ALOHA): botón «Guarda tu tarjeta ALOHA» → `<KPI>/tarjeta/alta?e=<event_id>&r=<registration_id>`.
5. Integrador (`app/api/integrations/aloha/route.ts`): `list_events` y `list_registrations` aceptan `offset`/`limit` opcionales y devuelven además `total` (conteo exacto). Aditivo: sin esos parámetros responden como hoy.
6. Pruebas de contrato: sesión con UTM previo + `referido` nuevo → se guardan ambos intactos.

### 4.8 Wallet (se enciende con variables de entorno; sin ellas la tarjeta web funciona igual)

**Apple** — pase `storeCard`: Saldo, Nombre, Código, QR `/r/<codigo>`, `serialNumber` = `<id>-<emision>`, `authenticationToken` = `apple_auth` (≥16 caracteres), `webServiceURL` = `<base>/api/wallet/apple`. Firma con `passkit-generator` (única dependencia nueva). Servicio web: registro/baja de dispositivo y entrega del pase exigen `Authorization: ApplePass <apple_auth>` comparado en tiempo constante; listado de seriales por `passesUpdatedSince` usando `actualizado_at` como etiqueta; `Last-Modified`/`If-Modified-Since` → 304; `log`. Push vacío a APNs con el certificado del pase (HTTP/2 de Node); un 410 de APNs borra ese dispositivo.

**Google** — objeto `loyalty` con id `<issuer>.m<id_miembro>_<emision>` y clase `<issuer>.aloha_referidos`. Al pulsar «Agregar a Google Wallet» el servidor **asegura la clase y luego el objeto por REST** (insert, o patch si existe; token OAuth de la cuenta de servicio firmado con `jose`), marca `google_objeto_at` y redirige al enlace de guardado: JWT RS256 con `iss`, `aud=google`, `typ=savetowallet`, `iat`, `origins` y `payload.loyaltyObjects=[{id}]`. Actualización de saldo: `PATCH` del objeto para todo miembro con `google_objeto_at` (no depende de saber si lo guardó).

**Envíos serializados y versionados** — una sola función `enviarWallet(miembro)` (la usan el post-commit del libro, el botón de Google y el cron): toma un bloqueo consultivo por miembro (si está ocupado, sale: el que lo tiene o el cron lo cubre), lee `version` y saldo, envía APNs + PATCH de Google y, solo si ambos salen bien, hace `wallet_version_enviada = GREATEST(wallet_version_enviada, <versión leída>)`. Si el saldo cambió durante el envío, `version` ya es mayor y sigue pendiente. El cron reintenta todo miembro con `version > wallet_version_enviada`.

Variables: `APPLE_PASS_TYPE_ID`, `APPLE_TEAM_ID`, `APPLE_PASS_CERT_PEM`, `APPLE_PASS_KEY_PEM`, `APPLE_WWDR_PEM`, `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SA_EMAIL`, `GOOGLE_WALLET_SA_KEY`, `REFERIDOS_BASE_URL`.

## 5. Fases de construcción

1. **F1 — núcleo en aloha-kpi**: migración, `lib/referidos/` (teléfono, código, reglas puras, neto, reconciliación, libro), cron, verificación de pertenencia, `/r`, `/tarjeta`, `/tarjeta/alta`, pantallas, carga histórica. Pruebas `node:test`: referido válido / autorreferido / alumno previo; ciclo asistió→no→asistió y cancelación; importe congelado; inscripción antigua sin código + inscripción nueva con código (no es referido nuevo); cobertura no certificada o corrida con un evento fallido (no cierra atribuciones); dos altas simultáneas con el mismo enlace; atribución con eventos cargados en orden inverso y carga histórica a la vez que el cron; anulación de matrícula tras canje y reconciliaciones posteriores; reemisión (enlace de alta, token y apple_auth viejos rechazados); canje durante un envío a Wallet y dos envíos concurrentes; intento cruzado entre centros; `/tarjeta/alta` no revela miembro existente. Integración en Postgres: canjes concurrentes, canje contra reverso, repetición de la misma clave de operación, dos reconciliaciones simultáneas del mismo evento.
2. **F2 — CRM**: columna, landing, registro, botón en confirmación y correo, pruebas de contrato.
3. **F3 — Wallet**: pkpass + servicio web + push; Google. Pruebas: pkpass con certificado de prueba (manifest con hashes correctos y firma presente), autenticación del servicio web, 304; JWT de Google con todos los campos. **Declarado**: instalar y ver actualizarse el pase en un iPhone y un Android reales solo se puede probar cuando Fernando entregue las credenciales; hasta entonces Wallet queda «construido, sin probar en dispositivo».

Cada fase: `npm test`, `next build`, revisión en navegador a 390 / 760 / 1440 px contra base local. PR por repo. **No se fusiona, no se migra producción ni se enciende** sin el OK de Fernando.

## 6. Lo que necesita Fernando (no bloquea construir)

1. Los tres montos (y confirmar la frase dictada «damos dinero a los $1 en las clases de prueba») y la fecha `activo_desde` (define a qué inscritos anteriores se les acredita).
2. Crear el **Pass Type ID** y su certificado en developer.apple.com.
3. Crear la cuenta emisora de **Google Wallet** y una cuenta de servicio.
4. Dominio público para la tarjeta (hoy `aloha-kpi.vercel.app`).
5. Decidir vencimiento del saldo y tope por canje.

## 7. Riesgos conocidos

- **Código falsificable**: cualquiera puede armar un enlace con un código ajeno; solo le regala el referido al dueño del código, y el bono exige asistencia real y referido nuevo.
- **Teléfono declarado**: alguien puede inscribirse primero con el teléfono de otro y quedarse con el enlace de esa tarjeta; no puede canjear (lo hace el personal con la familia presente) y, al reemitir, pierde todo acceso (web, alta, Apple y Google).
- **Pasivo**: el saldo emitido es deuda con los padres; el tablero muestra el pendiente y el sistema nace apagado.
- **Descuento manual**: el canje depende de que el personal lo aplique en la factura; queda rastro (nota y usuario).
- **Wallet sin dispositivo real** hasta tener credenciales (ver F3).

## 8. Validación

ChatGPT Astra (`gpt-6-astra`, sesión Codex `01a1cf5e-14e2-79d0-9616-630cbd6e8e32`): ronda 1 NO-GO (8 bloqueantes), ronda 2 NO-GO (4), ronda 3 NO-GO (1), **ronda 4 GO** sobre esta v4. Menores que quedan para la construcción: paginación por ids únicos con orden estable; el botón de Google espera o pide reintento si el bloqueo está ocupado; lista persistente de objetos de Google por desactivar; «pierde acceso» = deja de recibir información actualizada (no borra lo ya descargado).

## 9. Lo construido frente al plan (12-nov)

Construido según la v4, con estas diferencias deliberadas:

- **Bonos al referidor por familia, no por inscripción**: `ref_asiste` y `ref_inscrito` se pagan una vez por miembro referido y cuenta cualquiera de sus inscripciones (si la familia no fue a la primera clase y vuelve a inscribirse sin el QR, el que la refirió igual cobra).
- **Conversión y anulación de matrícula las recoge el cron diario**: el alta del alumno solo deja la evidencia (`alta_nueva_estudiante_id`, misma transacción). No se tocaron `actualizarEstudiante` ni la anulación; el bono al referidor ya dependía del cron para cerrar la atribución.
- **Sin botón «Reconciliar»**: abrir los inscritos de la clase ya reconcilia ese evento.
- **Sin exportación a Excel** de enlaces: la entrega es el filtro «Tarjeta sin abrir» con el botón Tarjeta por fila.
- **Etiqueta de actualización de Apple** = `version` (entero) en vez de `actualizado_at`.
- La carga histórica guarda la última importación certificada de cada evento (`referidos_eventos`) para reanudarse.

Sin probar (no hay con qué): instalación y actualización del pase en un iPhone y un Android reales (faltan certificado de Pass Type ID y emisor de Google), la pantalla de inscritos contra el CRM real, y la landing del CRM en navegador.
