# Peticiones con cotizaciones en FODA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar comentarios de peticiones formales en FODA y exigir al menos tres cotizaciones PDF privadas, válidas y de proveedores fiscales distintos antes de enviar una petición.

**Architecture:** Las reglas y decisiones transaccionales viven en módulos de dominio y servicios comprobables con dependencias inyectadas; las Server Actions y rutas API quedan como adaptadores delgados. Neon conserva solicitudes, proveedores, auditoría y una cola durable; Vercel Blob privado conserva los PDF y solo se accede mediante rutas autenticadas.

**Tech Stack:** Next.js 15 App Router, React 18, JavaScript/ESM, Neon PostgreSQL, `@neondatabase/serverless`, Vercel Blob privado (`@vercel/blob` `2.8.0`), `node:test`.

**Spec:** `docs/superpowers/specs/2026-08-21-peticiones-cotizaciones-foda-design.md`

## Global Constraints

- Tipos persistidos: `legado`, `comentario`, `peticion`; códigos de categoría: `reparacion`, `activaciones_mercadeo`, `contratacion`, `capacitacion`, `otros`.
- Una petición requiere tres identificaciones fiscales distintas por la clave `(proveedor_pais, proveedor_id_fiscal_clave)` y acepta hasta diez cotizaciones.
- Cada cotización requiere razón social, un país del catálogo ISO 3166-1 alfa-2 (no texto libre), RUC/RIF/identificación fiscal, `empresa_constituida = true`, `emite_factura_fiscal = true` y un PDF entre 1 y 10.485.760 bytes.
- Cada cotización admite cinco intentos de token; el servidor valida MIME, firma `%PDF-`, tamaño real y SHA-256 no repetido dentro de la petición.
- Los PDF usan un Blob Store privado; la base nunca guarda ni devuelve `url` o `downloadUrl`, solo un `blob_pathname` generado por el servidor.
- La implementación fija `@vercel/blob` en `2.8.0` y declara Node `>=20`.
- Solo `admin_general` y `supervisor` cambian estados. Las operaciones nuevas releen usuario, rol y centro desde Neon en cada llamada.
- Una petición enviada es inmutable salvo por agregar cotizaciones mientras no esté `Cumplido` ni `Anulada`; nunca se borra físicamente.
- Los borradores vencen tras 30 días sin actividad y los registros `legado` siguen visibles sin requisitos retroactivos.
- Toda transición de estado y toda limpieza de Blob se registra transaccionalmente antes de responder éxito.
- `SESSION_SECRET`, `BLOB_READ_WRITE_TOKEN` y `CRON_SECRET` fallan cerrados en producción o en la operación que los necesita.
- La migración versionada hace dry-run por defecto y solo escribe con `--apply`; no se ejecuta contra producción ni se despliega sin autorización explícita.
- Fuera de alcance: tablero `/dashboard/peticiones`, OCR, comparación de precios, registro mercantil automático, antivirus avanzado y notificaciones.

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `lib/session-secret.mjs` | Resolver el secreto de JWT y fallar cerrado en producción. |
| `lib/current-user.mjs` | Releer el usuario por `uid` y aplicar acceso por rol/centro. |
| `lib/iso-countries.mjs` | Catálogo canónico ISO 3166-1 alfa-2 compartido por dominio e interfaz. |
| `lib/peticiones-domain.mjs` | Constantes, normalización y validaciones puras. |
| `lib/peticiones-service.mjs` | Casos de uso transaccionales sobre un repositorio inyectado. |
| `lib/peticiones-repository.js` | SQL parametrizado y bloqueos `FOR UPDATE`. |
| `lib/peticion-pdf.mjs` | Sanear nombres, validar firma/tamaño por stream y calcular SHA-256. |
| `lib/peticion-upload-service.mjs` | Autorizar token y procesar callback idempotente. |
| `lib/peticion-upload-runtime.js` | Componer repositorio, servicio de carga y Blob solo en servidor. |
| `lib/peticion-blob.js` | Adaptador único de `get`, `del` y `list` para Blob privado. |
| `lib/peticion-download.mjs` | Construir respuestas de descarga autenticadas y uniformes. |
| `lib/peticion-cleanup.mjs` | Política pura de reintentos, expiración y lotes. |
| `lib/peticion-cleanup-runtime.js` | Componer expiración, reconciliación y consumo de cola solo en servidor. |
| `app/actions/foda.js` | Guardar y leer solo los cuatro cuadrantes FODA. |
| `app/actions/peticiones.js` | Adaptadores de comentarios, borradores, cotizaciones y estados con errores legibles. |
| `app/api/peticiones/cotizaciones/upload/route.js` | Intercambio de token y callback de Vercel Blob. |
| `app/api/peticiones/cotizaciones/[id]/download/route.js` | Descarga autenticada sin revelar la URL Blob. |
| `app/api/cron/peticiones-cleanup/route.js` | Cron diario protegido por `CRON_SECRET`. |
| `components/foda/*.js` | Compositor, tarjetas de proveedor, lista y panel responsivo. |
| `db/schema.sql` | Estado final para bases nuevas, incluida cola generacional y checkpoint del barrido. |
| `db/migrations/2026-08-21-peticiones-cotizaciones-{expand,contract}.sql` | Migración expand/contract sin el migrador que divide por `;`. |
| `scripts/migrate-peticiones-cotizaciones-2026-08-21.mjs` | Preflight, advisory lock, dry-run y aplicación transaccional. |
| `test/peticiones-*.test.mjs` | Dominio, servicio, rutas, migración, limpieza e interfaz. |

---

### Task 1: Autenticación fresca y secreto fail-closed

**Files:**
- Create: `lib/session-secret.mjs`
- Create: `lib/current-user.mjs`
- Create: `test/session-secret.test.mjs`
- Create: `test/current-user.test.mjs`
- Modify: `lib/auth.js:1-89`
- Modify: `middleware.js:1-20`

**Interfaces:**
- Produces: `resolveSessionSecret(env): Uint8Array`.
- Produces: `loadCurrentUser(session, query): Promise<CurrentUser>` where `CurrentUser = { id, nombre, email, rol, centro_id }`.
- Produces: `assertCentroAccess(user, centroId): CurrentUser` and `assertAdmin(user): CurrentUser`.
- Produces from `lib/auth.js`: `requireCurrentUser()`, `requireCurrentCentroAccess(centroId)`, `requireCurrentAdmin()`.

- [x] **Step 1: Write the failing secret and current-user tests**

```js
// test/session-secret.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveSessionSecret } from '../lib/session-secret.mjs'

test('producción sin SESSION_SECRET falla cerrado', () => {
  assert.throws(
    () => resolveSessionSecret({ NODE_ENV: 'production' }),
    /Falta SESSION_SECRET/
  )
})

test('desarrollo conserva un secreto local explícitamente inseguro', () => {
  const value = new TextDecoder().decode(resolveSessionSecret({ NODE_ENV: 'development' }))
  assert.equal(value, 'dev-insecure-secret-change-me-please')
})

test('un secreto configurado se usa en cualquier entorno', () => {
  const value = new TextDecoder().decode(resolveSessionSecret({ NODE_ENV: 'production', SESSION_SECRET: 'seguro-123' }))
  assert.equal(value, 'seguro-123')
})
```

```js
// test/current-user.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { loadCurrentUser, assertCentroAccess, assertAdmin } from '../lib/current-user.mjs'

const queryWith = (rows) => async () => rows

test('relee el usuario por el uid del JWT', async () => {
  const user = await loadCurrentUser({ uid: 8, rol: 'admin_general' }, queryWith([
    { id: 8, nombre: 'Ana', email: 'ana@aloha.com', rol: 'administradora', centro_id: 10, password_hash: 'hash' },
  ]))
  assert.equal(user.rol, 'administradora')
  assert.equal(user.centro_id, 10)
})

test('un usuario eliminado pierde acceso aunque conserve cookie', async () => {
  await assert.rejects(() => loadCurrentUser({ uid: 8 }, queryWith([])), /No autenticado/)
})

test('un usuario sin acceso activado pierde acceso aunque conserve cookie', async () => {
  await assert.rejects(() => loadCurrentUser({ uid: 8 }, queryWith([
    { id: 8, nombre: 'Ana', email: 'ana@aloha.com', rol: 'administradora', centro_id: 10, password_hash: null },
  ])), /No autenticado/)
})

test('administradora solo entra a su centro y no cambia estados', () => {
  const user = { id: 8, rol: 'administradora', centro_id: 10 }
  assert.equal(assertCentroAccess(user, 10), user)
  assert.throws(() => assertCentroAccess(user, 11), /No autorizado/)
  assert.throws(() => assertAdmin(user), /No autorizado/)
})
```

- [x] **Step 2: Install the locked baseline dependencies and run the tests to verify they fail**

Run: `npm ci`

Expected: dependencies from the existing `package-lock.json` install without changing the lockfile.

Run: `node --test test/session-secret.test.mjs test/current-user.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/session-secret.mjs` and `lib/current-user.mjs`.

- [x] **Step 3: Implement the pure authentication helpers**

```js
// lib/session-secret.mjs
const DEV_SECRET = 'dev-insecure-secret-change-me-please'

export function resolveSessionSecret(env = process.env) {
  const configured = String(env.SESSION_SECRET || '').trim()
  if (configured) return new TextEncoder().encode(configured)
  if (env.NODE_ENV === 'production') {
    throw new Error('Falta SESSION_SECRET en producción.')
  }
  return new TextEncoder().encode(DEV_SECRET)
}
```

```js
// lib/current-user.mjs
export const ADMIN_ROLES = new Set(['admin_general', 'supervisor'])

export async function loadCurrentUser(session, query) {
  if (!session?.uid) throw new Error('No autenticado')
  const rows = await query`
    SELECT id, nombre, email, rol, centro_id, password_hash
    FROM usuarios
    WHERE id = ${Number(session.uid)}
  `
  if (!rows[0]?.password_hash) throw new Error('No autenticado')
  const { password_hash: _passwordHash, ...user } = rows[0]
  return user
}

export function assertCentroAccess(user, centroId) {
  if (!user) throw new Error('No autenticado')
  if (!ADMIN_ROLES.has(user.rol) && String(user.centro_id) !== String(centroId)) {
    throw new Error('No autorizado para este centro')
  }
  return user
}

export function assertAdmin(user) {
  if (!user || !ADMIN_ROLES.has(user.rol)) throw new Error('No autorizado')
  return user
}
```

- [x] **Step 4: Wire the helpers into server auth and middleware**

```js
// additions/replacements in lib/auth.js
import { sql } from './db'
import { resolveSessionSecret } from './session-secret.mjs'
import { loadCurrentUser, assertCentroAccess, assertAdmin } from './current-user.mjs'

function getSecret() {
  return resolveSessionSecret(process.env)
}

export async function requireCurrentUser() {
  return await loadCurrentUser(await requireSession(), sql)
}

export async function requireCurrentCentroAccess(centroId) {
  return assertCentroAccess(await requireCurrentUser(), centroId)
}

export async function requireCurrentAdmin() {
  return assertAdmin(await requireCurrentUser())
}
```

```js
// middleware.js
import { resolveSessionSecret } from './lib/session-secret.mjs'

function getSecret() {
  return resolveSessionSecret(process.env)
}
```

Keep `requireSession`, `requireAdmin` and `requireCentroAccess` exported for unchanged modules; every new petition/file operation must use the `requireCurrent*` variants.

- [x] **Step 5: Run auth tests and the full regression suite**

Run: `node --test test/session-secret.test.mjs test/current-user.test.mjs`

Expected: PASS.

Run: `npm test`

Expected: all pre-existing tests PASS.

- [x] **Step 6: Commit**

```bash
git add lib/session-secret.mjs lib/current-user.mjs lib/auth.js middleware.js test/session-secret.test.mjs test/current-user.test.mjs
git commit -m "fix: endurecer autenticacion de peticiones"
```

---

### Task 2: Reglas de dominio y normalización

**Files:**
- Create: `lib/iso-countries.mjs`
- Create: `lib/peticiones-domain.mjs`
- Create: `test/peticiones-domain.test.mjs`

**Interfaces:**
- Produces constants: `PETICION_CATEGORIAS`, `PETICION_ESTADOS`, `MAX_PDF_BYTES`, `MAX_COTIZACIONES`, `MAX_UPLOAD_ATTEMPTS`, `DRAFT_TTL_DAYS`.
- Produces `ISO_COUNTRY_CODES` and `isIsoCountryCode(value)`; fictitious two-letter values never pass as countries.
- Produces: `normalizeSupplierName(value)`, `normalizeFiscalId(value)`, `supplierIdentityKey(cotizacion)`.
- Produces: `validateSupplier(cotizacion)`, `validateSubmission({ texto, categoria, cotizaciones })`, `submissionErrorMessage(codes)`, `canAddQuote(estado)`.
- Later tasks consume the exact error codes returned by `validateSubmission`: `texto_requerido`, `categoria_invalida`, `minimo_tres`, `proveedor_invalido`, `proveedor_duplicado`, `pdf_duplicado`, `maximo_diez`.

- [x] **Step 1: Write failing domain tests**

```js
// test/peticiones-domain.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_COTIZACIONES,
  MAX_UPLOAD_ATTEMPTS,
  normalizeSupplierName,
  normalizeFiscalId,
  validateSupplier,
  supplierIdentityKey,
  validateSubmission,
  submissionErrorMessage,
  canAddQuote,
} from '../lib/peticiones-domain.mjs'

const quote = (id, extra = {}) => ({
  proveedor_razon_social: `Proveedor ${id}`,
  proveedor_pais: 'PA',
  proveedor_id_fiscal: id,
  empresa_constituida: true,
  emite_factura_fiscal: true,
  upload_status: 'valid',
  archivo_sha256: `hash-${id}`,
  ...extra,
})

test('normaliza variantes triviales de razón social e identificación fiscal', () => {
  assert.equal(normalizeSupplierName('  Reparación Ágil, S.A. '), 'reparacion agil s a')
  assert.equal(normalizeFiscalId(' ruc-155-123 '), 'RUC155123')
  assert.equal(supplierIdentityKey(quote(' RUC-1 ')), 'PA:RUC1')
})

test('acepta códigos ISO reales y rechaza países ficticios', () => {
  assert.equal(validateSupplier(quote('1', { proveedor_pais: 'PA' })), true)
  assert.equal(validateSupplier(quote('2', { proveedor_pais: 'VE' })), true)
  assert.equal(validateSupplier(quote('3', { proveedor_pais: 'ZZ' })), false)
  const variants = validateSubmission({
    texto: 'Reparar', categoria: 'reparacion', cotizaciones: [
      quote('1', { proveedor_pais: 'PA', proveedor_id_fiscal: '155' }),
      quote('2', { proveedor_pais: 'ZZ', proveedor_id_fiscal: '155' }),
      quote('3', { proveedor_pais: 'XX', proveedor_id_fiscal: '155' }),
    ],
  })
  assert.ok(variants.includes('proveedor_invalido'))
  assert.ok(variants.includes('minimo_tres'))
})

test('exige tres proveedores fiscales distintos y PDF distinto', () => {
  const valid = validateSubmission({ texto: 'Reparar fregador', categoria: 'reparacion', cotizaciones: [quote('1'), quote('2'), quote('3')] })
  assert.deepEqual(valid, [])
  const duplicateSupplier = validateSubmission({ texto: 'x', categoria: 'reparacion', cotizaciones: [quote('1'), quote('1', { archivo_sha256: 'otro' }), quote('3')] })
  assert.ok(duplicateSupplier.includes('proveedor_duplicado'))
  const duplicatePdf = validateSubmission({ texto: 'x', categoria: 'reparacion', cotizaciones: [quote('1'), quote('2', { archivo_sha256: 'hash-1' }), quote('3')] })
  assert.ok(duplicatePdf.includes('pdf_duplicado'))
  const withFailedAttempt = validateSubmission({
    texto: 'x', categoria: 'reparacion',
    cotizaciones: [quote('1'), quote('2'), quote('3'), quote('4', { upload_status: 'invalid', archivo_sha256: null })],
  })
  assert.deepEqual(withFailedAttempt, [])
})

test('aplica topes y estados terminales', () => {
  assert.equal(MAX_COTIZACIONES, 10)
  assert.equal(MAX_UPLOAD_ATTEMPTS, 5)
  assert.equal(canAddQuote('En proceso'), true)
  assert.equal(canAddQuote('Cumplido'), false)
  assert.equal(canAddQuote('Anulada'), false)
  assert.equal(canAddQuote('estado-inventado'), false)
})

test('traduce códigos internos a un mensaje operativo', () => {
  assert.equal(
    submissionErrorMessage(['minimo_tres', 'proveedor_duplicado']),
    'Adjunta al menos tres cotizaciones válidas de proveedores fiscales distintos. Las cotizaciones deben pertenecer a proveedores fiscales distintos.'
  )
})
```

- [x] **Step 2: Run the test to verify it fails**

Run: `node --test test/peticiones-domain.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [x] **Step 3: Implement the domain module**

```js
// lib/iso-countries.mjs
export const ISO_COUNTRY_CODES = Object.freeze(`AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`.split(' '))
const isoCountrySet = new Set(ISO_COUNTRY_CODES)

export function isIsoCountryCode(value) {
  return isoCountrySet.has(String(value || '').trim().toUpperCase())
}
```

```js
// lib/peticiones-domain.mjs
import { isIsoCountryCode } from './iso-countries.mjs'

export const PETICION_CATEGORIAS = Object.freeze([
  { value: 'reparacion', label: 'Reparación' },
  { value: 'activaciones_mercadeo', label: 'Activaciones Mercadeo' },
  { value: 'contratacion', label: 'Contratación' },
  { value: 'capacitacion', label: 'Capacitación' },
  { value: 'otros', label: 'Otros' },
])
export const PETICION_ESTADOS = Object.freeze(['Próximo trimestre', 'Negado', 'Aprobado', 'En proceso', 'Cumplido', 'Anulada'])
export const MAX_PDF_BYTES = 10 * 1024 * 1024
export const MAX_COTIZACIONES = 10
export const MAX_UPLOAD_ATTEMPTS = 5
export const DRAFT_TTL_DAYS = 30

const categoryCodes = new Set(PETICION_CATEGORIAS.map((item) => item.value))
const quoteOpenStates = new Set(['Próximo trimestre', 'Negado', 'Aprobado', 'En proceso'])
const stripMarks = (value) => String(value || '').normalize('NFKD').replace(/\p{Diacritic}/gu, '')
const submissionMessages = Object.freeze({
  texto_requerido: 'Escribe la descripción de la petición.',
  categoria_invalida: 'Selecciona una categoría válida.',
  minimo_tres: 'Adjunta al menos tres cotizaciones válidas de proveedores fiscales distintos.',
  proveedor_invalido: 'Cada proveedor necesita razón social, país, identificación fiscal, ambas certificaciones y un PDF válido.',
  proveedor_duplicado: 'Las cotizaciones deben pertenecer a proveedores fiscales distintos.',
  pdf_duplicado: 'No puedes usar el mismo PDF en más de una cotización.',
  maximo_diez: 'Una petición admite hasta diez cotizaciones.',
})

export function normalizeSupplierName(value) {
  return stripMarks(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
}

export function normalizeFiscalId(value) {
  return stripMarks(value).toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function supplierIdentityKey(row) {
  return `${String(row?.proveedor_pais || '').toUpperCase()}:${normalizeFiscalId(row?.proveedor_id_fiscal)}`
}

export function validateSupplier(row) {
  const country = String(row?.proveedor_pais || '').toUpperCase()
  return Boolean(
    normalizeSupplierName(row?.proveedor_razon_social) &&
    isIsoCountryCode(country) &&
    normalizeFiscalId(row?.proveedor_id_fiscal) &&
    row?.empresa_constituida === true &&
    row?.emite_factura_fiscal === true &&
    row?.upload_status === 'valid' &&
    row?.archivo_sha256
  )
}

export function validateSubmission({ texto, categoria, cotizaciones }) {
  const errors = []
  const rows = Array.isArray(cotizaciones) ? cotizaciones : []
  if (!String(texto || '').trim()) errors.push('texto_requerido')
  if (!categoryCodes.has(categoria)) errors.push('categoria_invalida')
  if (rows.length > MAX_COTIZACIONES) errors.push('maximo_diez')
  const declaredValid = rows.filter((row) => row?.upload_status === 'valid')
  if (declaredValid.some((row) => !validateSupplier(row))) errors.push('proveedor_invalido')
  const valid = declaredValid.filter(validateSupplier)
  if (valid.length < 3) errors.push('minimo_tres')
  const identities = valid.map(supplierIdentityKey)
  if (new Set(identities).size !== identities.length) errors.push('proveedor_duplicado')
  const hashes = valid.map((row) => row.archivo_sha256)
  if (new Set(hashes).size !== hashes.length) errors.push('pdf_duplicado')
  return [...new Set(errors)]
}

export function submissionErrorMessage(codes) {
  return [...new Set(codes)].map((code) => submissionMessages[code] || code).join(' ')
}

export function canAddQuote(estado) {
  return quoteOpenStates.has(estado)
}
```

- [x] **Step 4: Run the focused and full tests**

Run: `node --test test/peticiones-domain.test.mjs`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

- [x] **Step 5: Commit**

```bash
git add lib/iso-countries.mjs lib/peticiones-domain.mjs test/peticiones-domain.test.mjs
git commit -m "feat: definir reglas de peticiones y proveedores"
```

---

### Task 3: Esquema final y migración expand/contract

**Files:**
- Create: `db/migrations/2026-08-21-peticiones-cotizaciones-expand.sql`
- Create: `db/migrations/2026-08-21-peticiones-cotizaciones-contract.sql`
- Create: `scripts/migrate-peticiones-cotizaciones-2026-08-21.mjs`
- Create: `test/peticiones-schema.test.mjs`
- Create: `test/integration/peticiones-db.integration.mjs`
- Modify: `db/schema.sql:182-212`
- Modify: `package.json:5-12`
- Modify: `app/actions/centros.js:46-50`

**Interfaces:**
- Produces tables: `peticiones`, `peticion_cotizaciones`, `peticion_estado_historial`, `peticion_blob_cleanup`.
- Produces command: `npm run db:migrate:peticiones -- [--phase=expand|--phase=contract] [--apply]`.
- The default command performs reads only; `--apply` runs the selected SQL file inside one transaction after `pg_advisory_xact_lock(2026082101)`.
- `peticiones.centro_id` and `peticion_cotizaciones.peticion_id` use `ON DELETE RESTRICT`; actor FKs use `ON DELETE SET NULL`.

- [x] **Step 1: Write the failing schema contract test**

```js
// test/peticiones-schema.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ISO_COUNTRY_CODES } from '../lib/iso-countries.mjs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('la expansión conserva legacy, restringe borrados y crea auditoría/cola', () => {
  const sql = read('../db/migrations/2026-08-21-peticiones-cotizaciones-expand.sql')
  assert.match(sql, /UPDATE peticiones[\s\S]+tipo = 'legado'/)
  assert.match(sql, /peticiones_centro_id_fkey[\s\S]+ON DELETE RESTRICT/)
  assert.match(sql, /conkey = ARRAY[\s\S]+attname = 'centro_id'/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS peticion_cotizaciones/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS iso_paises/)
  assert.match(sql, /proveedor_pais CHAR\(2\) NOT NULL REFERENCES iso_paises\(codigo\)/)
  assert.match(sql, /UNIQUE \(peticion_id, proveedor_pais, proveedor_id_fiscal_clave\)/)
  assert.match(sql, /CONSTRAINT uq_peticion_proveedor_fiscal UNIQUE/)
  assert.match(sql, /CONSTRAINT uq_peticion_pdf_sha UNIQUE/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS peticion_estado_historial/)
  assert.match(sql, /peticion_historial_inicial_check[\s\S]+estado_anterior IS NOT NULL OR estado_nuevo = 'Próximo trimestre'/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS peticion_blob_cleanup/)
  const seed = sql.match(/regexp_split_to_table\('([A-Z ]+)'/)
  assert.deepEqual(seed?.[1].split(' '), ISO_COUNTRY_CODES)
})

test('la contracción elimina el default temporal y valida restricciones', () => {
  const sql = read('../db/migrations/2026-08-21-peticiones-cotizaciones-contract.sql')
  assert.match(sql, /ALTER COLUMN tipo DROP DEFAULT/)
  assert.match(sql, /ALTER COLUMN tipo SET NOT NULL/)
  assert.match(sql, /VALIDATE CONSTRAINT peticiones_tipo_categoria_check/)
})

test('el runner es dry-run por defecto y usa transacción con advisory lock', () => {
  const source = read('../scripts/migrate-peticiones-cotizaciones-2026-08-21.mjs')
  assert.match(source, /const apply = args\.includes\('--apply'\)/)
  assert.match(source, /if \(!apply\)/)
  assert.match(source, /BEGIN/)
  assert.match(source, /pg_advisory_xact_lock/)
  assert.match(source, /SET LOCAL lock_timeout/)
  assert.match(source, /LOCK TABLE peticiones IN ACCESS EXCLUSIVE MODE/)
  assert.match(source, /ROLLBACK/)
  assert.ok(source.indexOf('LOCK TABLE peticiones IN ACCESS EXCLUSIVE MODE') < source.indexOf('const lockedPreflight'))
  assert.ok(source.indexOf('const lockedPreflight') < source.indexOf('client.query(ddl)'))
})
```

- [x] **Step 2: Run the contract test to verify it fails**

Run: `node --test test/peticiones-schema.test.mjs`

Expected: FAIL because the migration files do not exist.

- [x] **Step 3: Write the expand migration and mirror it in the final schema**

The expand SQL must contain these named structures and checks; use catalog checks before replacing the existing center FK so a differently named production constraint is handled safely.

```sql
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS tipo TEXT;
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS categoria TEXT;
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS created_by_snapshot JSONB;
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS anulada_at TIMESTAMPTZ;
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS draft_expires_at TIMESTAMPTZ;

UPDATE peticiones
SET tipo = 'legado',
    submitted_at = COALESCE(submitted_at, created_at, updated_at, now())
WHERE tipo IS NULL;

UPDATE peticiones
SET anulada_at = COALESCE(anulada_at, updated_at, created_at, now())
WHERE estado = 'Anulada' AND anulada_at IS NULL;

ALTER TABLE peticiones ALTER COLUMN tipo SET DEFAULT 'legado';

DO $$
DECLARE fk_name TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'peticiones'::regclass AND conname = 'peticiones_created_by_fkey') THEN
    ALTER TABLE peticiones
      ADD CONSTRAINT peticiones_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL;
  END IF;

  FOR fk_name IN
    SELECT c.conname FROM pg_constraint c
    WHERE c.contype = 'f'
      AND c.conrelid = 'peticiones'::regclass
      AND c.confrelid = 'centros'::regclass
      AND c.conkey = ARRAY[(
        SELECT a.attnum FROM pg_attribute a
        WHERE a.attrelid = 'peticiones'::regclass AND a.attname = 'centro_id'
      )]::smallint[]
  LOOP
    EXECUTE format('ALTER TABLE peticiones DROP CONSTRAINT %I', fk_name);
  END LOOP;
  ALTER TABLE peticiones
    ADD CONSTRAINT peticiones_centro_id_fkey
    FOREIGN KEY (centro_id) REFERENCES centros(id) ON DELETE RESTRICT;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'peticiones'::regclass AND conname = 'peticiones_tipo_check') THEN
    ALTER TABLE peticiones ADD CONSTRAINT peticiones_tipo_check
      CHECK (tipo IN ('legado', 'comentario', 'peticion')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'peticiones'::regclass AND conname = 'peticiones_estado_check') THEN
    ALTER TABLE peticiones ADD CONSTRAINT peticiones_estado_check
      CHECK (estado IN ('Próximo trimestre', 'Negado', 'Aprobado', 'En proceso', 'Cumplido', 'Anulada')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'peticiones'::regclass AND conname = 'peticiones_tipo_categoria_check') THEN
    ALTER TABLE peticiones ADD CONSTRAINT peticiones_tipo_categoria_check
      CHECK (
        (tipo = 'peticion' AND categoria IN ('reparacion', 'activaciones_mercadeo', 'contratacion', 'capacitacion', 'otros'))
        OR (tipo IN ('legado', 'comentario') AND categoria IS NULL)
      ) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'peticiones'::regclass AND conname = 'peticiones_anulada_at_check') THEN
    ALTER TABLE peticiones ADD CONSTRAINT peticiones_anulada_at_check
      CHECK ((estado = 'Anulada') = (anulada_at IS NOT NULL)) NOT VALID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS iso_paises (
  codigo CHAR(2) PRIMARY KEY
);
INSERT INTO iso_paises (codigo)
SELECT codigo::CHAR(2)
FROM regexp_split_to_table('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW', ' ') AS codes(codigo)
ON CONFLICT (codigo) DO NOTHING;

CREATE TABLE IF NOT EXISTS peticion_cotizaciones (
  id SERIAL PRIMARY KEY,
  peticion_id INTEGER NOT NULL REFERENCES peticiones(id) ON DELETE RESTRICT,
  proveedor_razon_social TEXT NOT NULL,
  proveedor_clave TEXT NOT NULL,
  proveedor_pais CHAR(2) NOT NULL REFERENCES iso_paises(codigo) ON DELETE RESTRICT,
  proveedor_id_fiscal TEXT NOT NULL,
  proveedor_id_fiscal_clave TEXT NOT NULL,
  empresa_constituida BOOLEAN NOT NULL,
  emite_factura_fiscal BOOLEAN NOT NULL,
  blob_pathname TEXT UNIQUE,
  archivo_nombre TEXT,
  archivo_mime TEXT,
  archivo_bytes INTEGER,
  archivo_sha256 CHAR(64),
  upload_nonce TEXT,
  expected_pathname TEXT UNIQUE,
  upload_status TEXT NOT NULL DEFAULT 'pending',
  upload_attempts INTEGER NOT NULL DEFAULT 0,
  validation_error TEXT,
  uploaded_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  uploaded_by_snapshot JSONB,
  validada_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT peticion_cotizaciones_status_check CHECK (upload_status IN ('pending', 'validating', 'valid', 'invalid', 'cleanup_pending')),
  CONSTRAINT peticion_cotizaciones_attempts_check CHECK (upload_attempts BETWEEN 0 AND 5),
  CONSTRAINT peticion_cotizaciones_pdf_check CHECK (archivo_bytes IS NULL OR archivo_bytes BETWEEN 1 AND 10485760),
  CONSTRAINT peticion_cotizaciones_sha_check CHECK (archivo_sha256 IS NULL OR archivo_sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT peticion_cotizaciones_path_check CHECK (blob_pathname IS NULL OR (expected_pathname IS NOT NULL AND blob_pathname = expected_pathname)),
  CONSTRAINT peticion_cotizaciones_valid_check CHECK (
    upload_status <> 'valid' OR (
      empresa_constituida AND emite_factura_fiscal AND blob_pathname IS NOT NULL AND expected_pathname IS NOT NULL AND
      archivo_nombre IS NOT NULL AND archivo_mime = 'application/pdf' AND
      archivo_bytes BETWEEN 1 AND 10485760 AND archivo_sha256 IS NOT NULL AND
      uploaded_by_snapshot IS NOT NULL AND validada_at IS NOT NULL
    )
  ),
  CONSTRAINT uq_peticion_proveedor_fiscal UNIQUE (peticion_id, proveedor_pais, proveedor_id_fiscal_clave),
  CONSTRAINT uq_peticion_pdf_sha UNIQUE (peticion_id, archivo_sha256)
);

CREATE TABLE IF NOT EXISTS peticion_estado_historial (
  id SERIAL PRIMARY KEY,
  peticion_id INTEGER NOT NULL REFERENCES peticiones(id) ON DELETE RESTRICT,
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL,
  changed_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  changed_by_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT peticion_historial_inicial_check CHECK (estado_anterior IS NOT NULL OR estado_nuevo = 'Próximo trimestre'),
  CONSTRAINT peticion_historial_anterior_check CHECK (estado_anterior IS NULL OR estado_anterior IN ('Próximo trimestre', 'Negado', 'Aprobado', 'En proceso', 'Cumplido', 'Anulada')),
  CONSTRAINT peticion_historial_nuevo_check CHECK (estado_nuevo IN ('Próximo trimestre', 'Negado', 'Aprobado', 'En proceso', 'Cumplido', 'Anulada'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_peticion_historial_inicial
  ON peticion_estado_historial (peticion_id) WHERE estado_anterior IS NULL;

CREATE TABLE IF NOT EXISTS peticion_blob_cleanup (
  id SERIAL PRIMARY KEY,
  blob_pathname TEXT NOT NULL UNIQUE,
  motivo TEXT NOT NULL,
  intentos INTEGER NOT NULL DEFAULT 0,
  proximo_intento_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_error TEXT,
  generation INTEGER NOT NULL DEFAULT 1,
  locked_at TIMESTAMPTZ,
  lock_token TEXT,
  lock_generation INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_peticiones_medicion
  ON peticiones (centro_id, anio, trimestre, tipo, categoria, estado);
CREATE INDEX IF NOT EXISTS idx_peticion_cleanup_pendiente
  ON peticion_blob_cleanup (proximo_intento_at, id) WHERE completed_at IS NULL;
```

In `db/schema.sql`, define the same final columns/tables directly and omit the temporary `DEFAULT 'legado'`.

- [x] **Step 4: Write the contract migration**

```sql
ALTER TABLE peticiones ALTER COLUMN tipo DROP DEFAULT;
ALTER TABLE peticiones ALTER COLUMN tipo SET NOT NULL;
ALTER TABLE peticiones VALIDATE CONSTRAINT peticiones_tipo_check;
ALTER TABLE peticiones VALIDATE CONSTRAINT peticiones_estado_check;
ALTER TABLE peticiones VALIDATE CONSTRAINT peticiones_tipo_categoria_check;
ALTER TABLE peticiones VALIDATE CONSTRAINT peticiones_anulada_at_check;
```

- [x] **Step 5: Implement the dry-run/apply runner**

```js
// scripts/migrate-peticiones-cotizaciones-2026-08-21.mjs
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { Pool } from '@neondatabase/serverless'
import ws from 'ws'
import { neonConfig } from '@neondatabase/serverless'

neonConfig.webSocketConstructor = ws

async function inspectDatabase(db, phase) {
  const total = await db.query(`SELECT COUNT(*)::int AS total FROM peticiones`)
  const stateCounts = await db.query(`SELECT estado, COUNT(*)::int AS filas FROM peticiones GROUP BY estado ORDER BY estado`)
  const contractBlockers = phase === 'contract'
    ? await db.query(`
        SELECT
          COUNT(*) FILTER (WHERE tipo IS NULL OR tipo NOT IN ('legado', 'comentario', 'peticion'))::int AS tipo_invalido,
          COUNT(*) FILTER (WHERE
            (tipo = 'peticion' AND (categoria IS NULL OR categoria NOT IN ('reparacion', 'activaciones_mercadeo', 'contratacion', 'capacitacion', 'otros')))
            OR (tipo IN ('legado', 'comentario') AND categoria IS NOT NULL)
          )::int AS categoria_invalida,
          COUNT(*) FILTER (WHERE (estado = 'Anulada') <> (anulada_at IS NOT NULL))::int AS anulacion_invalida
        FROM peticiones
      `)
    : { rows: [] }
  return {
    total: total.rows[0].total,
    estados: stateCounts.rows,
    cierre: contractBlockers.rows[0] || null,
  }
}

export function assertPreflight(report) {
  const allowed = new Set(['Próximo trimestre', 'Negado', 'Aprobado', 'En proceso', 'Cumplido', 'Anulada'])
  const unexpectedStates = report.estados.filter((row) => !allowed.has(row.estado))
  if (unexpectedStates.length) throw new Error('Existen estados de petición que la migración no puede mapear.')
  if (report.cierre && Object.values(report.cierre).some((value) => Number(value) > 0)) {
    throw new Error('La fase contract tiene filas incompletas.')
  }
  return { ...report, inesperados: unexpectedStates }
}

const assertSchema = (schema) => {
  if (schema != null && !/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error('Schema de prueba inválido.')
  return schema
}

export async function runMigration({ client, phase, ddl, apply = false, schema = null, injectFailure = false, log = () => {} }) {
  if (!['expand', 'contract'].includes(phase)) throw new Error('La fase debe ser expand o contract.')
  assertSchema(schema)
  if (schema) await client.query(`SET search_path TO "${schema}"`)
  const initialPreflight = assertPreflight(await inspectDatabase(client, phase))
  log(JSON.stringify({ modo: apply ? 'apply-preflight' : 'dry-run', phase, ...initialPreflight }, null, 2))
  if (!apply) return { applied: false, report: initialPreflight }
  try {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE')
    await client.query("SET LOCAL lock_timeout = '10s'")
    if (schema) await client.query(`SET LOCAL search_path TO "${schema}"`)
    await client.query('SELECT pg_advisory_xact_lock($1)', [2026082101])
    await client.query('LOCK TABLE peticiones IN ACCESS EXCLUSIVE MODE')
    const lockedPreflight = assertPreflight(await inspectDatabase(client, phase))
    log(JSON.stringify({ modo: 'apply-locked', phase, ...lockedPreflight }, null, 2))
    await client.query(ddl)
    if (injectFailure) throw new Error('Fallo de prueba después del DDL.')
    await client.query('COMMIT')
    return { applied: true, report: lockedPreflight }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  }
}

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const phaseArg = args.find((arg) => arg.startsWith('--phase=')) || '--phase=expand'
  const phase = phaseArg.split('=')[1]
  if (!['expand', 'contract'].includes(phase)) throw new Error('La fase debe ser expand o contract.')
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL.')
  const ddl = readFileSync(new URL(`../db/migrations/2026-08-21-peticiones-cotizaciones-${phase}.sql`, import.meta.url), 'utf8')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const client = await pool.connect()
  try {
    const result = await runMigration({ client, phase, ddl, apply, log: console.log })
    console.log(result.applied ? `Migración ${phase} aplicada.` : 'Dry-run terminado: no se ejecutó DDL.')
  } finally {
    client.release()
    await pool.end()
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main()
```

Add to `package.json`:

```json
"db:migrate:peticiones": "node scripts/migrate-peticiones-cotizaciones-2026-08-21.mjs",
"test:peticiones:db": "node --test --test-concurrency=1 test/integration/peticiones-*.integration.mjs"
```

- [x] **Step 6: Add the isolated PostgreSQL integration test**

`test/integration/peticiones-db.integration.mjs` uses only `PETICIONES_TEST_DATABASE_URL`, creates a unique temporary schema and invokes the exported production runner—not raw DDL—to prove dry-run read-only behavior, rollback of a fault injected after the real expand DDL, idempotent expand and successful contract. It also asserts legacy backfill; catálogo ISO idéntico al módulo compartido y rechazo de `ZZ`; duplicate `(peticion_id, pais, id_fiscal_clave)` rejected; duplicate SHA rejected; actor deletion sets FK to null while snapshots remain; center deletion with a petition returns SQLSTATE `23503`; and validated contract constraints. Drop only the explicit temporary schema in `after()`.

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import { runMigration } from '../../scripts/migrate-peticiones-cotizaciones-2026-08-21.mjs'

neonConfig.webSocketConstructor = ws
const DATABASE_URL = process.env.PETICIONES_TEST_DATABASE_URL
if (!DATABASE_URL) throw new Error('Define PETICIONES_TEST_DATABASE_URL con una base desechable.')

test('migración y restricciones en PostgreSQL real', async (t) => {
  const schema = `peticiones_test_${randomUUID().replaceAll('-', '')}`
  const pool = new Pool({ connectionString: DATABASE_URL })
  const db = await pool.connect()
  t.after(async () => {
    await db.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
    db.release()
    await pool.end()
  })
  await db.query(`CREATE SCHEMA "${schema}"`)
  await db.query(`SET search_path TO "${schema}"`)
  await db.query(`CREATE TABLE centros (id SERIAL PRIMARY KEY, nombre TEXT NOT NULL)`)
  await db.query(`CREATE TABLE usuarios (id SERIAL PRIMARY KEY, nombre TEXT NOT NULL, email TEXT NOT NULL, rol TEXT NOT NULL, centro_id INTEGER, password_hash TEXT)`)
  await db.query(`CREATE TABLE peticiones (id SERIAL PRIMARY KEY, centro_id INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE, anio INTEGER NOT NULL, trimestre INTEGER NOT NULL, texto TEXT NOT NULL, estado TEXT NOT NULL DEFAULT 'Próximo trimestre', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`)
  await db.query(`INSERT INTO centros (id, nombre) VALUES (10, 'CENTRO 10')`)
  await db.query(`INSERT INTO usuarios (id, nombre, email, rol, centro_id, password_hash) VALUES (8, 'Ana', 'ana@aloha.com', 'administradora', 10, 'hash')`)
  await db.query(`INSERT INTO peticiones (id, centro_id, anio, trimestre, texto) VALUES (41, 10, 2026, 3, 'Anterior')`)
  const expand = readFileSync(new URL('../../db/migrations/2026-08-21-peticiones-cotizaciones-expand.sql', import.meta.url), 'utf8')
  const contract = readFileSync(new URL('../../db/migrations/2026-08-21-peticiones-cotizaciones-contract.sql', import.meta.url), 'utf8')
  await assert.rejects(
    () => runMigration({ client: db, phase: 'expand', ddl: expand, apply: true, schema, injectFailure: true }),
    /Fallo de prueba después del DDL/
  )
  const rolledBack = await db.query(`
    SELECT to_regclass($1) AS quote_table,
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = $2 AND table_name = 'peticiones' AND column_name = 'tipo') AS tipo_exists
  `, [`${schema}.peticion_cotizaciones`, schema])
  assert.deepEqual(rolledBack.rows[0], { quote_table: null, tipo_exists: false })
  const dryRun = await runMigration({ client: db, phase: 'expand', ddl: expand, apply: false, schema })
  assert.equal(dryRun.applied, false)
  await runMigration({ client: db, phase: 'expand', ddl: expand, apply: true, schema })
  await runMigration({ client: db, phase: 'expand', ddl: expand, apply: true, schema })
  const legacy = await db.query(`SELECT tipo, submitted_at IS NOT NULL AS submitted FROM peticiones WHERE id = 41`)
  assert.deepEqual(legacy.rows[0], { tipo: 'legado', submitted: true })

  await db.query(`
    INSERT INTO peticiones
      (id, centro_id, anio, trimestre, texto, estado, tipo, categoria, created_by, created_by_snapshot, submitted_at)
    VALUES
      (42, 10, 2026, 3, 'Reparar', 'Próximo trimestre', 'peticion', 'reparacion', 8, '{"id":8,"nombre":"Ana"}'::jsonb, now())
  `)
  await assert.rejects(() => db.query(`
    INSERT INTO peticion_cotizaciones
      (peticion_id, proveedor_razon_social, proveedor_clave, proveedor_pais, proveedor_id_fiscal,
       proveedor_id_fiscal_clave, empresa_constituida, emite_factura_fiscal, upload_status)
    VALUES (42, 'Proveedor Ficticio', 'proveedor ficticio', 'ZZ', '155-ZZ', '155ZZ', true, true, 'pending')
  `), (error) => error.code === '23503')
  await db.query(`
    INSERT INTO peticion_cotizaciones
      (peticion_id, proveedor_razon_social, proveedor_clave, proveedor_pais, proveedor_id_fiscal,
       proveedor_id_fiscal_clave, empresa_constituida, emite_factura_fiscal, blob_pathname,
       archivo_nombre, archivo_mime, archivo_bytes, archivo_sha256, upload_nonce, expected_pathname,
       upload_status, upload_attempts, uploaded_by, uploaded_by_snapshot, validada_at)
    VALUES
      (42, 'Proveedor Uno', 'proveedor uno', 'PA', '155-1', '1551', true, true,
       'peticiones/42/a.pdf', 'a.pdf', 'application/pdf', 10, repeat('a', 64), 'n-a',
       'peticiones/42/a.pdf', 'valid', 1, 8, '{"id":8,"nombre":"Ana"}'::jsonb, now())
  `)
  await assert.rejects(() => db.query(`
    INSERT INTO peticion_cotizaciones
      (peticion_id, proveedor_razon_social, proveedor_clave, proveedor_pais, proveedor_id_fiscal,
       proveedor_id_fiscal_clave, empresa_constituida, emite_factura_fiscal, upload_status)
    VALUES (42, 'Proveedor Duplicado', 'proveedor duplicado', 'PA', '1551', '1551', true, true, 'pending')
  `), (error) => error.code === '23505' && error.constraint === 'uq_peticion_proveedor_fiscal')
  await assert.rejects(() => db.query(`
    INSERT INTO peticion_cotizaciones
      (peticion_id, proveedor_razon_social, proveedor_clave, proveedor_pais, proveedor_id_fiscal,
       proveedor_id_fiscal_clave, empresa_constituida, emite_factura_fiscal, blob_pathname,
       archivo_nombre, archivo_mime, archivo_bytes, archivo_sha256, upload_nonce, expected_pathname,
       upload_status, upload_attempts, uploaded_by, uploaded_by_snapshot, validada_at)
    VALUES
      (42, 'Proveedor Dos', 'proveedor dos', 'PA', '155-2', '1552', true, true,
       'peticiones/42/b.pdf', 'b.pdf', 'application/pdf', 10, repeat('a', 64), 'n-b',
       'peticiones/42/b.pdf', 'valid', 1, 8, '{"id":8,"nombre":"Ana"}'::jsonb, now())
  `), (error) => error.code === '23505' && error.constraint === 'uq_peticion_pdf_sha')

  await db.query(`INSERT INTO peticion_blob_cleanup (blob_pathname, motivo) VALUES ('peticiones/cola-a.pdf', 'test'), ('peticiones/cola-b.pdf', 'test')`)
  const claimSql = `
    WITH claimed AS (
      SELECT id FROM peticion_blob_cleanup
      WHERE completed_at IS NULL AND intentos < $1 AND proximo_intento_at <= now()
        AND (locked_at IS NULL OR locked_at < $2)
      ORDER BY id FOR UPDATE SKIP LOCKED LIMIT $3
    )
    UPDATE peticion_blob_cleanup q SET locked_at = now(), lock_token = $4, lock_generation = q.generation
    FROM claimed WHERE q.id = claimed.id RETURNING q.*
  `
  const worker2 = await pool.connect()
  let firstClaim
  try {
    await worker2.query(`SET search_path TO "${schema}"`)
    await db.query('BEGIN')
    await worker2.query('BEGIN')
    firstClaim = await db.query(claimSql, [5, new Date('2026-08-21T11:55:00Z'), 1, 'lock-a'])
    const secondClaim = await worker2.query(claimSql, [5, new Date('2026-08-21T11:55:00Z'), 1, 'lock-b'])
    assert.equal(firstClaim.rowCount, 1)
    assert.equal(secondClaim.rowCount, 1)
    assert.notEqual(firstClaim.rows[0].id, secondClaim.rows[0].id)
    await db.query('COMMIT')
    await worker2.query('COMMIT')
  } finally {
    await db.query('ROLLBACK').catch(() => {})
    await worker2.query('ROLLBACK').catch(() => {})
    worker2.release()
  }
  const staleWorker = await db.query(
    `UPDATE peticion_blob_cleanup SET completed_at = now() WHERE id = $1 AND lock_token = $2 RETURNING id`,
    [firstClaim.rows[0].id, 'lock-obsoleto']
  )
  assert.equal(staleWorker.rowCount, 0)
  await db.query(`UPDATE peticion_blob_cleanup SET intentos = 5, ultimo_error = 'agotado' WHERE id = $1`, [firstClaim.rows[0].id])
  await db.query(`
    INSERT INTO peticion_blob_cleanup (blob_pathname, motivo)
    VALUES ($1, 'nueva_obligacion')
    ON CONFLICT (blob_pathname) DO UPDATE SET
      motivo = EXCLUDED.motivo, generation = peticion_blob_cleanup.generation + 1,
      intentos = 0, ultimo_error = NULL, locked_at = NULL, lock_token = NULL,
      lock_generation = NULL, completed_at = NULL, proximo_intento_at = now()
  `, [firstClaim.rows[0].blob_pathname])
  const reopened = await db.query(`SELECT generation, intentos, locked_at, lock_token, lock_generation FROM peticion_blob_cleanup WHERE id = $1`, [firstClaim.rows[0].id])
  assert.deepEqual(reopened.rows[0], { generation: 2, intentos: 0, locked_at: null, lock_token: null, lock_generation: null })
  const fencedWorker = await db.query(
    `UPDATE peticion_blob_cleanup SET completed_at = now() WHERE id = $1 AND lock_token = $2 AND lock_generation = generation RETURNING id`,
    [firstClaim.rows[0].id, 'lock-a']
  )
  assert.equal(fencedWorker.rowCount, 0)

  await db.query(`DELETE FROM usuarios WHERE id = 8`)
  const actors = await db.query(`
    SELECT p.created_by, p.created_by_snapshot->>'nombre' AS creator,
           c.uploaded_by, c.uploaded_by_snapshot->>'nombre' AS uploader
    FROM peticiones p JOIN peticion_cotizaciones c ON c.peticion_id = p.id
    WHERE p.id = 42
  `)
  assert.deepEqual(actors.rows[0], { created_by: null, creator: 'Ana', uploaded_by: null, uploader: 'Ana' })
  await assert.rejects(() => db.query(`DELETE FROM centros WHERE id = 10`), (error) => error.code === '23503')

  await runMigration({ client: db, phase: 'contract', ddl: contract, apply: true, schema })
  const contracted = await db.query(`
    SELECT is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = 'peticiones' AND column_name = 'tipo'
  `, [schema])
  assert.deepEqual(contracted.rows[0], { is_nullable: 'NO', column_default: null })
  const constraints = await db.query(`
    SELECT bool_and(convalidated) AS all_valid
    FROM pg_constraint
    WHERE conrelid = $1::regclass AND conname = ANY($2::text[])
  `, [`${schema}.peticiones`, ['peticiones_tipo_check', 'peticiones_estado_check', 'peticiones_tipo_categoria_check', 'peticiones_anulada_at_check']])
  assert.equal(constraints.rows[0].all_valid, true)
})
```

- [x] **Step 7: Return a clear center-deletion error**

Import `requireCurrentAdmin` from `lib/auth` in place of the stale-JWT `requireAdmin` used by this action, and import `fallo` from `lib/errores` so authentication and unexpected database failures remain legible Server Action results.

```js
// app/actions/centros.js
export async function deleteCentro(id) {
  try {
    await requireCurrentAdmin()
    await sql`DELETE FROM centros WHERE id = ${id}`
    return { ok: true }
  } catch (error) {
    if (error?.code === '23503') {
      return { error: 'Este centro tiene historial operativo o peticiones y no puede eliminarse.' }
    }
    return fallo('deleteCentro', error)
  }
}
```

- [x] **Step 8: Run schema tests without touching production**

Run: `node --test test/peticiones-schema.test.mjs`

Expected: schema contract PASS without opening a database connection.

Run: `node --check scripts/migrate-peticiones-cotizaciones-2026-08-21.mjs`

Expected: no output and exit 0. Do not run `npm run db:migrate:peticiones` against the configured `DATABASE_URL` during local implementation.

When an explicitly disposable database URL exists, run:

```bash
test -z "$PETICIONES_TEST_DATABASE_URL" || npm run test:peticiones:db
```

Expected: the real production runner dry-run/rollback/expand/contract, constraint/idempotence/FK and concurrency tests pass, or the command exits 0 without opening a connection when the dedicated variable is absent. Record the latter as `SKIPPED`, not `PASS`.

- [x] **Step 9: Commit**

```bash
git add db/schema.sql db/migrations scripts/migrate-peticiones-cotizaciones-2026-08-21.mjs package.json app/actions/centros.js test/peticiones-schema.test.mjs test/integration/peticiones-db.integration.mjs
git commit -m "feat: preparar esquema auditable de peticiones"
```

---

### Task 4: Servicio transaccional, repositorio y Server Actions

**Files:**
- Create: `lib/peticiones-service.mjs`
- Create: `lib/peticiones-repository.js`
- Create: `app/actions/peticiones.js`
- Create: `test/peticiones-service.test.mjs`
- Create: `test/peticiones-actions.test.mjs`
- Create: `test/integration/peticiones-submit.integration.mjs`
- Modify: `app/actions/foda.js:79-131`

**Interfaces:**
- Produces: `createPeticionesService({ repo, now, sleep, verifyQuote }): PeticionesService`.
- `PeticionesService` methods: `listPanel(actor, period)`, `createComentario(actor, input)`, `updateComentario(actor, input)`, `createDraft(actor, input)`, `updateDraft(actor, input)`, `submitPeticion(actor, input)`, `changeStatus(actor, input)`, `discardDraft(actor, input)`.
- `PeticionRepository` methods: `transaction(work, options)`, `listSubmitted(period)`, `listDrafts(period, actor)`, `insertComentario(query, data)`, `insertDraft(query, data)`, `lockPeticion(query, id)`, `listQuotes(query, peticionId, { forUpdate })`, `updateComentario(query, data)`, `updateDraft(query, data)`, `markSubmitted(query, data)`, `changeStatus(query, data)`, `insertHistory(query, event)`, `enqueueCleanup(query, item)`, `deleteIncompleteDraftQuotes(query, id)`, `deleteDraftQuotes(query, id)`, `deleteDraft(query, id)`.
- `app/actions/peticiones.js` exports: `listPeticiones`, `createComentario`, `updateComentario`, `createPeticionDraft`, `updatePeticionDraft`, `submitPeticion`, `changePeticionStatus`, `discardPeticionDraft`.
- All action results use `{ ok: true, ... }` or `{ error: string }`; no expected user error escapes as a thrown Server Action exception.

- [x] **Step 1: Write failing service tests for comments, drafts and legacy visibility**

```js
// first section of test/peticiones-service.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { createPeticionesService } from '../lib/peticiones-service.mjs'

const admin = { id: 1, nombre: 'Gerencia', email: 'g@aloha.com', rol: 'admin_general', centro_id: null }
const centerUser = { id: 8, nombre: 'Centro 10', email: 'c10@aloha.com', rol: 'administradora', centro_id: 10 }

test('comentario se envía sin categoría ni archivos y crea evento inicial', async () => {
  const calls = []
  const repo = {
    transaction: async (work) => work(repo),
    insertComentario: async (_query, row) => ({ id: 41, ...row }),
    insertHistory: async (_query, event) => { calls.push(event) },
  }
  const service = createPeticionesService({ repo, now: () => new Date('2026-08-21T12:00:00Z') })
  const result = await service.createComentario(centerUser, { centroId: 10, anio: 2026, trimestre: 3, texto: 'Revisar horario' })
  assert.equal(result.peticion.tipo, 'comentario')
  assert.equal(result.peticion.categoria, null)
  assert.equal(result.peticion.submitted_at, '2026-08-21T12:00:00.000Z')
  assert.deepEqual(calls.map((event) => [event.estado_anterior, event.estado_nuevo]), [[null, 'Próximo trimestre']])
})

test('lista enviados y solo borradores de la autora', async () => {
  const repo = {
    listSubmitted: async () => [{
      id: 1, tipo: 'legado', texto: 'Anterior', cotizaciones: [{
        id: 9, proveedor_razon_social: 'Proveedor', proveedor_pais: 'PA', proveedor_id_fiscal: '155',
        archivo_nombre: 'oferta.pdf', upload_status: 'valid', blob_pathname: 'privado/a.pdf',
        expected_pathname: 'privado/a.pdf', upload_nonce: 'secreto', archivo_sha256: 'a'.repeat(64),
      }],
    }],
    listDrafts: async (_period, user) => [{ id: 2, tipo: 'peticion', created_by: user.id, submitted_at: null }],
  }
  const service = createPeticionesService({ repo })
  const panel = await service.listPanel(centerUser, { centroId: 10, anio: 2026, trimestre: 3 })
  assert.deepEqual(panel.items.map((row) => row.id), [1])
  assert.deepEqual(panel.drafts.map((row) => row.id), [2])
  assert.equal(panel.items[0].legacy, true)
  assert.equal(panel.permissions.canChangeStatus, false)
  assert.equal(panel.items[0].cotizaciones[0].archivo_nombre, 'oferta.pdf')
  assert.doesNotMatch(JSON.stringify(panel), /blob_pathname|expected_pathname|upload_nonce|archivo_sha256|privado\/a\.pdf|secreto/)
})

test('un registro legado no se edita ni se borra', async () => {
  const repo = { transaction: async (work) => work(repo), lockPeticion: async () => ({ id: 1, tipo: 'legado', centro_id: 10 }) }
  const service = createPeticionesService({ repo })
  await assert.rejects(() => service.updateComentario(centerUser, { centroId: 10, id: 1, texto: 'cambio' }), /registro anterior/)
  assert.equal(typeof service.deletePeticion, 'undefined')
})

test('un comentario no se puede vaciar al editar', async () => {
  let updated = false
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 3, tipo: 'comentario', centro_id: 10, created_by: 8, estado: 'Próximo trimestre' }),
    updateComentario: async () => { updated = true },
  }
  await assert.rejects(
    () => createPeticionesService({ repo }).updateComentario(centerUser, { centroId: 10, id: 3, texto: '   ' }),
    /Escribe el comentario/
  )
  assert.equal(updated, false)
  const foreignRepo = {
    transaction: async (work) => work(foreignRepo),
    lockPeticion: async () => ({ id: 3, tipo: 'comentario', centro_id: 11, created_by: 8, estado: 'Próximo trimestre' }),
    updateComentario: async () => { updated = true },
  }
  await assert.rejects(
    () => createPeticionesService({ repo: foreignRepo }).updateComentario(centerUser, { centroId: 10, id: 3, texto: 'Cambio' }),
    /registro anterior/i
  )
})
```

- [x] **Step 2: Run the focused test to verify it fails**

Run: `node --test test/peticiones-service.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/peticiones-service.mjs`.

- [x] **Step 3: Implement actor snapshots, retry serializable and basic cases**

```js
// core of lib/peticiones-service.mjs
import { assertAdmin, assertCentroAccess, ADMIN_ROLES } from './current-user.mjs'
import { DRAFT_TTL_DAYS, PETICION_ESTADOS, canAddQuote, submissionErrorMessage, validateSubmission } from './peticiones-domain.mjs'

const RETRYABLE_SQLSTATES = new Set(['40001', '40P01'])
const iso = (value) => new Date(value).toISOString()
const draftExpired = (row, at) => Boolean(!row.submitted_at && row.draft_expires_at && new Date(row.draft_expires_at).getTime() <= new Date(at).getTime())
const assertDraftActive = (row, at) => { if (draftExpired(row, at)) throw new Error('El borrador venció y ya no puede modificarse ni enviarse.') }
const actorSnapshot = (actor) => ({ id: actor.id, nombre: actor.nombre, email: actor.email, rol: actor.rol })
const presentQuote = (quote) => ({
  id: quote.id,
  proveedor_razon_social: quote.proveedor_razon_social,
  proveedor_pais: quote.proveedor_pais,
  proveedor_id_fiscal: quote.proveedor_id_fiscal,
  empresa_constituida: quote.empresa_constituida,
  emite_factura_fiscal: quote.emite_factura_fiscal,
  archivo_nombre: quote.archivo_nombre,
  archivo_bytes: quote.archivo_bytes,
  upload_status: quote.upload_status,
  upload_attempts: quote.upload_attempts,
  validation_error: quote.validation_error,
  validada_at: quote.validada_at,
  created_at: quote.created_at,
})
const presentRecord = (row) => ({
  ...row,
  cotizaciones: Array.isArray(row.cotizaciones) ? row.cotizaciones.map(presentQuote) : [],
})

export function createPeticionesService({
  repo,
  now = () => new Date(),
  sleep = () => Promise.resolve(),
  verifyQuote = async () => { throw new Error('Verificador de Blob no configurado.') },
}) {
  async function serializable(work) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await repo.transaction(work, { isolationLevel: 'Serializable' })
      } catch (error) {
        if (!RETRYABLE_SQLSTATES.has(error?.code) || attempt === 3) throw error
        await sleep(attempt * 25)
      }
    }
  }

  return {
    async listPanel(actor, period) {
      assertCentroAccess(actor, period.centroId)
      const [items, drafts] = await Promise.all([
        repo.listSubmitted(period),
        repo.listDrafts(period, actor),
      ])
      return {
        items: items.map((source) => {
          const row = presentRecord(source)
          return {
            ...row,
            legacy: row.tipo === 'legado',
            canEditText: row.tipo === 'comentario' && row.estado === 'Próximo trimestre' && String(row.created_by) === String(actor.id),
            canAddQuote: row.tipo === 'peticion' && canAddQuote(row.estado),
          }
        }),
        drafts: drafts.map((source) => ({ ...presentRecord(source), expired: draftExpired(source, now()) })),
        permissions: { canChangeStatus: ADMIN_ROLES.has(actor.rol) },
      }
    },

    async createComentario(actor, input) {
      assertCentroAccess(actor, input.centroId)
      const texto = String(input.texto || '').trim()
      if (!texto) throw new Error('Escribe el comentario.')
      const timestamp = iso(now())
      return serializable(async (query) => {
        const peticion = await repo.insertComentario(query, {
          centro_id: Number(input.centroId), anio: Number(input.anio), trimestre: Number(input.trimestre),
          texto, tipo: 'comentario', categoria: null, estado: 'Próximo trimestre',
          created_by: actor.id, created_by_snapshot: actorSnapshot(actor), submitted_at: timestamp,
        })
        await repo.insertHistory(query, {
          peticion_id: peticion.id, estado_anterior: null, estado_nuevo: 'Próximo trimestre',
          changed_by: actor.id, changed_by_snapshot: actorSnapshot(actor), created_at: timestamp,
        })
        return { ok: true, peticion }
      })
    },

    async createDraft(actor, input) {
      assertCentroAccess(actor, input.centroId)
      const errors = validateSubmission({ texto: input.texto, categoria: input.categoria, cotizaciones: [] })
        .filter((code) => code !== 'minimo_tres')
      if (errors.length) throw new Error(submissionErrorMessage(errors))
      const timestamp = now()
      return serializable(async (query) => ({ ok: true, draft: await repo.insertDraft(query, {
        centro_id: Number(input.centroId), anio: Number(input.anio), trimestre: Number(input.trimestre),
        texto: input.texto.trim(), tipo: 'peticion', categoria: input.categoria,
        estado: 'Próximo trimestre', created_by: actor.id, created_by_snapshot: actorSnapshot(actor),
        submitted_at: null, draft_expires_at: iso(new Date(timestamp.getTime() + DRAFT_TTL_DAYS * 86400000)),
      }) }))
    },
  }
}
```

The final returned object must also expose the five methods implemented in the next steps; do not create a second service factory.

- [x] **Step 4: Add failing tests for submit, status, edit and discard**

```js
// append to test/peticiones-service.test.mjs
test('un borrador incompleto no se envía ni crea historial', async () => {
  let writes = 0
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, created_by: 8, tipo: 'peticion', categoria: 'reparacion', texto: 'Reparar', submitted_at: null }),
    listQuotes: async () => [],
    markSubmitted: async () => { writes++ },
    insertHistory: async () => { writes++ },
  }
  const service = createPeticionesService({ repo })
  await assert.rejects(() => service.submitPeticion(centerUser, { centroId: 10, id: 4 }), /al menos tres cotizaciones válidas/)
  assert.equal(writes, 0)
})

test('un borrador vencido solo puede descartarse, no editarse ni enviarse', async () => {
  let writes = 0
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({
      id: 4, centro_id: 10, created_by: 8, tipo: 'peticion', categoria: 'reparacion', texto: 'Reparar',
      submitted_at: null, draft_expires_at: '2026-08-20T12:00:00Z',
    }),
    listQuotes: async () => { throw new Error('no debe leer cotizaciones') },
    updateDraft: async () => { writes++ },
    markSubmitted: async () => { writes++ },
  }
  const service = createPeticionesService({ repo, now: () => new Date('2026-08-21T12:00:00Z') })
  await assert.rejects(() => service.submitPeticion(centerUser, { centroId: 10, id: 4 }), /borrador venció/i)
  await assert.rejects(() => service.updateDraft(centerUser, { centroId: 10, id: 4, texto: 'Reparar', categoria: 'reparacion' }), /borrador venció/i)
  assert.equal(writes, 0)
})

test('tres cotizaciones válidas permiten enviar aunque exista un intento inválido', async () => {
  const events = []
  const valid = ['1', '2', '3'].map((id) => ({
    id: Number(id), proveedor_razon_social: `Proveedor ${id}`, proveedor_pais: 'PA', proveedor_id_fiscal: id,
    empresa_constituida: true, emite_factura_fiscal: true, upload_status: 'valid', archivo_sha256: id.repeat(64),
  }))
  const failed = { id: 9, upload_status: 'invalid', blob_pathname: 'peticiones/4/fallo.pdf', expected_pathname: 'peticiones/4/fallo.pdf' }
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, created_by: 8, tipo: 'peticion', categoria: 'reparacion', texto: 'Reparar', submitted_at: null }),
    listQuotes: async () => [...valid, failed],
    enqueueCleanup: async (_query, row) => { events.push(`queue:${row.blob_pathname}`) },
    deleteIncompleteDraftQuotes: async () => { events.push('delete:incomplete') },
    markSubmitted: async (_query, row) => { events.push('submit'); return row },
    insertHistory: async () => { events.push('history') },
  }
  let verified = 0
  const result = await createPeticionesService({ repo, verifyQuote: async () => { verified++ } })
    .submitPeticion(centerUser, { centroId: 10, id: 4 })
  assert.equal(result.ok, true)
  assert.equal(verified, 3)
  assert.deepEqual(events, ['queue:peticiones/4/fallo.pdf', 'delete:incomplete', 'submit', 'history'])
})

test('reintentar submit devuelve la petición enviada sin segundo evento', async () => {
  let histories = 0
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, created_by: 8, tipo: 'peticion', submitted_at: '2026-08-21T12:00:00Z' }),
    insertHistory: async () => { histories++ },
  }
  const result = await createPeticionesService({ repo }).submitPeticion(centerUser, { centroId: 10, id: 4 })
  assert.equal(result.alreadySubmitted, true)
  assert.equal(histories, 0)
})

test('dos submits concurrentes producen un envío y un evento inicial', async () => {
  let row = { id: 4, centro_id: 10, created_by: 8, tipo: 'peticion', categoria: 'reparacion', texto: 'Reparar', estado: 'Próximo trimestre', submitted_at: null }
  const quotes = ['1', '2', '3'].map((id) => ({
    proveedor_razon_social: `Proveedor ${id}`, proveedor_pais: 'PA', proveedor_id_fiscal: id,
    empresa_constituida: true, emite_factura_fiscal: true, upload_status: 'valid', archivo_sha256: id.repeat(64),
  }))
  let chain = Promise.resolve()
  let histories = 0
  let verified = 0
  const repo = {
    transaction: async (work) => {
      const result = chain.then(() => work(repo))
      chain = result.catch(() => {})
      return result
    },
    lockPeticion: async () => ({ ...row }),
    listQuotes: async () => quotes,
    markSubmitted: async (_query, patch) => { row = { ...row, submitted_at: patch.submitted_at }; return { ...row } },
    insertHistory: async () => { histories++ },
  }
  const service = createPeticionesService({ repo, verifyQuote: async () => { verified++ } })
  const results = await Promise.all([
    service.submitPeticion(centerUser, { centroId: 10, id: 4 }),
    service.submitPeticion(centerUser, { centroId: 10, id: 4 }),
  ])
  assert.deepEqual(results.map((result) => result.alreadySubmitted).sort(), [false, true])
  assert.equal(histories, 1)
  assert.equal(verified, 3)
})

test('si el Blob ya no coincide el borrador permanece sin enviar', async () => {
  let writes = 0
  const quotes = ['1', '2', '3'].map((id) => ({
    proveedor_razon_social: `Proveedor ${id}`, proveedor_pais: 'PA', proveedor_id_fiscal: id,
    empresa_constituida: true, emite_factura_fiscal: true, upload_status: 'valid', archivo_sha256: id.repeat(64),
  }))
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, created_by: 8, tipo: 'peticion', categoria: 'reparacion', texto: 'Reparar', submitted_at: null }),
    listQuotes: async () => quotes,
    markSubmitted: async () => { writes++ },
    insertHistory: async () => { writes++ },
  }
  const service = createPeticionesService({ repo, verifyQuote: async () => { throw new Error('El PDF cambió después de validarse.') } })
  await assert.rejects(() => service.submitPeticion(centerUser, { centroId: 10, id: 4 }), /PDF cambió/)
  assert.equal(writes, 0)
})

test('solo gerencia cambia estado y cada cambio conserva transición', async () => {
  const events = []
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, tipo: 'peticion', estado: 'Aprobado', submitted_at: '2026-08-21T12:00:00Z' }),
    changeStatus: async (_query, row) => row,
    insertHistory: async (_query, row) => { events.push(row) },
  }
  const service = createPeticionesService({ repo, now: () => new Date('2026-08-22T12:00:00Z') })
  await assert.rejects(() => service.changeStatus(centerUser, { centroId: 10, id: 4, estado: 'Cumplido' }), /No autorizado/)
  await service.changeStatus(admin, { centroId: 10, id: 4, estado: 'Cumplido' })
  assert.deepEqual(events.map((event) => [event.estado_anterior, event.estado_nuevo]), [['Aprobado', 'Cumplido']])
})

test('descartar borrador encola cada ruta antes de borrar filas', async () => {
  const order = []
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, created_by: 8, submitted_at: null }),
    listQuotes: async () => [{ blob_pathname: 'peticiones/4/a.pdf', expected_pathname: 'peticiones/4/b.pdf' }],
    enqueueCleanup: async (_query, row) => { order.push(`queue:${row.blob_pathname}`) },
    deleteDraftQuotes: async () => { order.push('delete:quotes') },
    deleteDraft: async () => { order.push('delete:draft') },
  }
  await createPeticionesService({ repo }).discardDraft(centerUser, { centroId: 10, id: 4 })
  assert.deepEqual(order, ['queue:peticiones/4/a.pdf', 'queue:peticiones/4/b.pdf', 'delete:quotes', 'delete:draft'])
})
```

- [x] **Step 5: Implement submit, edit, status and discard inside the same factory**

```js
async submitPeticion(actor, input) {
  assertCentroAccess(actor, input.centroId)
  return serializable(async (query) => {
    const row = await repo.lockPeticion(query, input.id)
    if (!row || String(row.centro_id) !== String(input.centroId)) throw new Error('Petición no encontrada.')
    if (row.submitted_at) return { ok: true, peticion: row, alreadySubmitted: true }
    assertDraftActive(row, now())
    if (String(row.created_by) !== String(actor.id) && !ADMIN_ROLES.has(actor.rol)) throw new Error('No autorizado')
    const quotes = await repo.listQuotes(query, row.id, { forUpdate: true })
    const errors = validateSubmission({ texto: row.texto, categoria: row.categoria, cotizaciones: quotes })
    if (errors.length) throw new Error(submissionErrorMessage(errors))
    const validQuotes = quotes.filter((quote) => quote.upload_status === 'valid')
    await Promise.all(validQuotes.map((quote) => verifyQuote(quote)))
    const incomplete = quotes.filter((quote) => quote.upload_status !== 'valid')
    const incompletePaths = [...new Set(incomplete.flatMap((quote) => [quote.blob_pathname, quote.expected_pathname]).filter(Boolean))]
    for (const blob_pathname of incompletePaths) {
      await repo.enqueueCleanup(query, { blob_pathname, motivo: 'incomplete_draft_attempt' })
    }
    if (incomplete.length) await repo.deleteIncompleteDraftQuotes(query, row.id)
    const timestamp = iso(now())
    const peticion = await repo.markSubmitted(query, { id: row.id, submitted_at: timestamp, draft_expires_at: null })
    await repo.insertHistory(query, {
      peticion_id: row.id, estado_anterior: null, estado_nuevo: 'Próximo trimestre',
      changed_by: actor.id, changed_by_snapshot: actorSnapshot(actor), created_at: timestamp,
    })
    return { ok: true, peticion, alreadySubmitted: false }
  })
},

async updateComentario(actor, input) {
  assertCentroAccess(actor, input.centroId)
  const texto = String(input.texto || '').trim()
  if (!texto) throw new Error('Escribe el comentario.')
  return serializable(async (query) => {
    const row = await repo.lockPeticion(query, input.id)
    if (!row || row.tipo !== 'comentario' || String(row.centro_id) !== String(input.centroId)) throw new Error('El registro anterior no se puede editar.')
    if (row.estado !== 'Próximo trimestre' || String(row.created_by) !== String(actor.id)) throw new Error('El comentario ya no puede editarse.')
    return { ok: true, peticion: await repo.updateComentario(query, { id: row.id, texto }) }
  })
},

async changeStatus(actor, input) {
  assertAdmin(actor)
  if (!PETICION_ESTADOS.includes(input.estado)) throw new Error('Estado inválido.')
  return serializable(async (query) => {
    const row = await repo.lockPeticion(query, input.id)
    if (!row || String(row.centro_id) !== String(input.centroId) || !row.submitted_at) throw new Error('Petición no encontrada.')
    if (row.estado === input.estado) return { ok: true, peticion: row, unchanged: true }
    const timestamp = iso(now())
    const peticion = await repo.changeStatus(query, {
      id: row.id, estado: input.estado,
      anulada_at: input.estado === 'Anulada' ? timestamp : null,
    })
    await repo.insertHistory(query, {
      peticion_id: row.id, estado_anterior: row.estado, estado_nuevo: input.estado,
      changed_by: actor.id, changed_by_snapshot: actorSnapshot(actor), created_at: timestamp,
    })
    return { ok: true, peticion, unchanged: false }
  })
},

async discardDraft(actor, input) {
  assertCentroAccess(actor, input.centroId)
  return serializable(async (query) => {
    const row = await repo.lockPeticion(query, input.id)
    if (!row || row.submitted_at || String(row.centro_id) !== String(input.centroId)) throw new Error('Borrador no encontrado.')
    if (String(row.created_by) !== String(actor.id) && !ADMIN_ROLES.has(actor.rol)) throw new Error('No autorizado')
    const quotes = await repo.listQuotes(query, row.id, { forUpdate: true })
    const paths = [...new Set(quotes.flatMap((quote) => [quote.blob_pathname, quote.expected_pathname]).filter(Boolean))]
    for (const blob_pathname of paths) await repo.enqueueCleanup(query, { blob_pathname, motivo: 'draft_discarded' })
    await repo.deleteDraftQuotes(query, row.id)
    await repo.deleteDraft(query, row.id)
    return { ok: true }
  })
},
```

Add this method beside the four methods above; `canAddQuote` is enforced later by the upload service for submitted petitions.

```js
async updateDraft(actor, input) {
  assertCentroAccess(actor, input.centroId)
  const errors = validateSubmission({ texto: input.texto, categoria: input.categoria, cotizaciones: [] })
    .filter((code) => code !== 'minimo_tres')
  if (errors.length) throw new Error(submissionErrorMessage(errors))
  return serializable(async (query) => {
    const row = await repo.lockPeticion(query, input.id)
    if (!row || row.submitted_at || String(row.centro_id) !== String(input.centroId)) throw new Error('Borrador no encontrado.')
    assertDraftActive(row, now())
    if (String(row.created_by) !== String(actor.id) && !ADMIN_ROLES.has(actor.rol)) throw new Error('No autorizado')
    const timestamp = now()
    const draft = await repo.updateDraft(query, {
      id: row.id,
      texto: String(input.texto).trim(),
      categoria: input.categoria,
      draft_expires_at: iso(new Date(timestamp.getTime() + DRAFT_TTL_DAYS * 86400000)),
    })
    return { ok: true, draft }
  })
},
```

- [x] **Step 6: Implement the SQL repository**

`lib/peticiones-repository.js` must parameterize values, aggregate cotizaciones for list display and hide `submitted_at IS NULL` in `listSubmitted`. Both list queries aggregate safe metadata for every attempt so failed post-submit uploads can resume by the same `cotizacionId`; the UI counts and downloads only rows with `upload_status = 'valid'`. `listDrafts` filters by `created_by` for an `administradora`, while `admin_general` and `supervisor` receive all drafts for the requested center/period. Neither query selects Blob URLs. The service presenter additionally strips `blob_pathname`, `expected_pathname`, `upload_nonce` and `archivo_sha256` before any action response. Use these exact concurrency clauses:

```sql
SELECT * FROM peticiones WHERE id = $1 FOR UPDATE;
SELECT * FROM peticion_cotizaciones WHERE peticion_id = $1 ORDER BY id FOR UPDATE;
UPDATE peticiones
SET submitted_at = $2, draft_expires_at = NULL, updated_at = now()
WHERE id = $1 AND submitted_at IS NULL
RETURNING *;
DELETE FROM peticion_cotizaciones
WHERE peticion_id = $1 AND upload_status <> 'valid';
INSERT INTO peticion_estado_historial
  (peticion_id, estado_anterior, estado_nuevo, changed_by, changed_by_snapshot, created_at)
VALUES ($1, $2, $3, $4, $5::jsonb, $6)
ON CONFLICT (peticion_id) WHERE estado_anterior IS NULL DO NOTHING;
INSERT INTO peticion_blob_cleanup (blob_pathname, motivo)
VALUES ($1, $2)
ON CONFLICT (blob_pathname) DO UPDATE
SET motivo = EXCLUDED.motivo,
    generation = peticion_blob_cleanup.generation + 1,
    intentos = 0,
    ultimo_error = NULL,
    locked_at = NULL,
    lock_token = NULL,
    lock_generation = NULL,
    completed_at = NULL,
    proximo_intento_at = now();
```

The adapter's `transaction` method delegates to `withTransaction`; all other methods accept either the transaction tag or the shared `sql` tag.

- [x] **Step 7: Wire fresh-auth Server Actions and retire destructive exports**

```js
// app/actions/peticiones.js
'use server'
import { requireCurrentCentroAccess, requireCurrentAdmin } from '../../lib/auth'
import { fallo } from '../../lib/errores'
import { peticionesRepository } from '../../lib/peticiones-repository'
import { createPeticionesService } from '../../lib/peticiones-service.mjs'

const service = createPeticionesService({ repo: peticionesRepository })
async function runAction(name, work) {
  try { return await work() } catch (error) { return fallo(name, error) }
}

export async function listPeticiones(centroId, anio, trimestre) {
  return runAction('listPeticiones', async () => {
    const panel = await service.listPanel(await requireCurrentCentroAccess(centroId), { centroId, anio, trimestre })
    return { ...panel, capabilities: { uploadsAvailable: Boolean(process.env.BLOB_READ_WRITE_TOKEN) } }
  })
}

export async function createComentario(centroId, anio, trimestre, texto) {
  return runAction('createComentario', async () =>
    service.createComentario(await requireCurrentCentroAccess(centroId), { centroId, anio, trimestre, texto }))
}

export async function updateComentario(centroId, id, texto) {
  return runAction('updateComentario', async () =>
    service.updateComentario(await requireCurrentCentroAccess(centroId), { centroId, id, texto }))
}

export async function createPeticionDraft(centroId, anio, trimestre, input) {
  return runAction('createPeticionDraft', async () =>
    service.createDraft(await requireCurrentCentroAccess(centroId), { ...input, centroId, anio, trimestre }))
}

export async function updatePeticionDraft(centroId, id, input) {
  return runAction('updatePeticionDraft', async () =>
    service.updateDraft(await requireCurrentCentroAccess(centroId), { ...input, centroId, id }))
}

export async function submitPeticion(centroId, id) {
  return runAction('submitPeticion', async () =>
    service.submitPeticion(await requireCurrentCentroAccess(centroId), { centroId, id }))
}

export async function changePeticionStatus(centroId, id, estado) {
  return runAction('changePeticionStatus', async () =>
    service.changeStatus(await requireCurrentAdmin(), { centroId, id, estado }))
}

export async function discardPeticionDraft(centroId, id) {
  return runAction('discardPeticionDraft', async () =>
    service.discardDraft(await requireCurrentCentroAccess(centroId), { centroId, id }))
}
```

Remove `listPeticiones`, `addPeticion`, `updatePeticion` and `deletePeticion` from `app/actions/foda.js`; that file retains only quadrants and compliance-derived FODA.

- [x] **Step 8: Add the static Server Action contract test**

```js
// test/peticiones-actions.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../app/actions/peticiones.js', import.meta.url), 'utf8')
test('acciones usan auth fresca y no exponen borrado físico', () => {
  assert.match(source, /requireCurrentCentroAccess/)
  assert.match(source, /requireCurrentAdmin/)
  for (const name of ['listPeticiones', 'createComentario', 'createPeticionDraft', 'submitPeticion', 'changePeticionStatus']) {
    assert.match(source, new RegExp(`export async function ${name}\\b`))
  }
  assert.doesNotMatch(source, /DELETE FROM peticiones/)
  assert.doesNotMatch(source, /export (async function|const) deletePeticion/)
})
```

- [x] **Step 9: Run service/action tests and regression suite**

Run: `node --test test/peticiones-service.test.mjs test/peticiones-actions.test.mjs`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

Add `test/integration/peticiones-submit.integration.mjs` using only `PETICIONES_TEST_DATABASE_URL`. In a unique temporary schema, apply the real expand migration, seed one draft and three valid quotes, then create a small `PeticionesService` repository adapter backed by `Pool` connections and the same SQL methods implemented in `lib/peticiones-repository.js`. Launch two real `submitPeticion` calls without an artificial promise chain or JavaScript mutex. Assert one result has `alreadySubmitted: false`, the other `true`, `submitted_at` is non-null and this query returns exactly one row:

```sql
SELECT * FROM peticion_estado_historial
WHERE peticion_id = $1 AND estado_anterior IS NULL;
```

Run only when the disposable URL exists:

```bash
test -z "$PETICIONES_TEST_DATABASE_URL" || node --test test/integration/peticiones-submit.integration.mjs
```

Expected: PASS with two independent PostgreSQL connections, or `SKIPPED` when the dedicated URL is absent.

- [x] **Step 10: Commit**

```bash
git add lib/peticiones-service.mjs lib/peticiones-repository.js app/actions/peticiones.js app/actions/foda.js test/peticiones-service.test.mjs test/peticiones-actions.test.mjs test/integration/peticiones-submit.integration.mjs
git commit -m "feat: agregar flujo transaccional de peticiones"
```

---

### Task 5: Carga privada, token limitado y callback idempotente

**Files:**
- Create: `lib/peticion-pdf.mjs`
- Create: `lib/peticion-upload-service.mjs`
- Create: `lib/peticion-upload-runtime.js`
- Create: `lib/peticion-blob.js`
- Create: `app/api/peticiones/cotizaciones/upload/route.js`
- Create: `test/peticion-pdf.test.mjs`
- Create: `test/peticion-upload.test.mjs`
- Create: `test/integration/peticiones-callback.integration.mjs`
- Modify: `app/actions/peticiones.js`
- Modify: `lib/peticiones-repository.js`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Pin `@vercel/blob` to `2.8.0` and declare Node `>=20`.
- Produces: `inspectPdfStream(stream): Promise<{ bytes, sha256 }>` and `sanitizePdfName(name): string`.
- Produces: `createPeticionUploadService({ repo, blob, now, uuid }): UploadService`.
- `UploadService` methods: `prepare(actor, input)`, `authorizeToken(actor, input)`, `complete({ blob, tokenPayload })`, `status(actor, input)`, `discardAttempt(actor, input)`.
- `prepare` returns only `{ cotizacionId, pathname, nonce, attempt }`; it never returns a Blob URL.
- `authorizeToken` returns `{ allowedContentTypes, maximumSizeInBytes, validUntil, addRandomSuffix, allowOverwrite, tokenPayload }`.

- [x] **Step 1: Install the private Blob SDK version and record the runtime floor**

Run: `npm install @vercel/blob@2.8.0 --save-exact`

Expected: `package.json` and `package-lock.json` record `2.8.0`.

Add to `package.json`:

```json
"engines": { "node": ">=20" }
```

- [x] **Step 2: Write failing PDF stream tests**

```js
// test/peticion-pdf.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectPdfStream, sanitizePdfName } from '../lib/peticion-pdf.mjs'

const stream = (chunks) => new ReadableStream({
  start(controller) {
    for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk))
    controller.close()
  },
})

test('acepta firma PDF repartida entre chunks y calcula hash fijo', async () => {
  const result = await inspectPdfStream(stream(['%P', 'DF-1.7\ncontenido']))
  assert.equal(result.bytes, 18)
  assert.match(result.sha256, /^[0-9a-f]{64}$/)
})

test('rechaza firma incorrecta, vacío y exceso de 10 MiB', async () => {
  await assert.rejects(() => inspectPdfStream(stream(['texto'])), /firma PDF/)
  await assert.rejects(() => inspectPdfStream(stream([])), /vacío/)
  const huge = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(10 * 1024 * 1024 + 1)); controller.close() } })
  await assert.rejects(() => inspectPdfStream(huge), /10 MB/)
})

test('sanea el nombre sin usarlo como pathname', () => {
  assert.equal(sanitizePdfName('../../Cotización Ágil.pdf'), 'Cotizacion_Agil.pdf')
})
```

- [x] **Step 3: Run the PDF test to verify it fails**

Run: `node --test test/peticion-pdf.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [x] **Step 4: Implement streaming validation**

```js
// lib/peticion-pdf.mjs
import { createHash } from 'node:crypto'
import { MAX_PDF_BYTES } from './peticiones-domain.mjs'

export class PdfValidationError extends Error {
  constructor(message) { super(message); this.name = 'PdfValidationError' }
}

export function sanitizePdfName(name) {
  const base = String(name || 'cotizacion.pdf').split(/[\\/]/).pop()
  const clean = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^\.+/, '')
  return `${clean.replace(/\.pdf$/i, '') || 'cotizacion'}.pdf`
}

export async function inspectPdfStream(readable) {
  const hash = createHash('sha256')
  let bytes = 0
  let prefix = new Uint8Array()
  for await (const chunkValue of readable) {
    const chunk = chunkValue instanceof Uint8Array ? chunkValue : new Uint8Array(chunkValue)
    bytes += chunk.byteLength
    if (bytes > MAX_PDF_BYTES) throw new PdfValidationError('El PDF supera 10 MB.')
    if (prefix.byteLength < 5) {
      const take = chunk.slice(0, 5 - prefix.byteLength)
      const joined = new Uint8Array(prefix.byteLength + take.byteLength)
      joined.set(prefix)
      joined.set(take, prefix.byteLength)
      prefix = joined
    }
    hash.update(chunk)
  }
  if (bytes === 0) throw new PdfValidationError('El PDF está vacío.')
  if (new TextDecoder().decode(prefix) !== '%PDF-') throw new PdfValidationError('El archivo no tiene firma PDF válida.')
  return { bytes, sha256: hash.digest('hex') }
}
```

- [x] **Step 5: Write failing upload lifecycle tests**

```js
// core cases in test/peticion-upload.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createPeticionUploadService } from '../lib/peticion-upload-service.mjs'

const actor = { id: 8, nombre: 'Centro', email: 'c@aloha.com', rol: 'administradora', centro_id: 10, password_hash: 'hash' }

test('prepare genera pathname servidor, nonce y consume un intento', async () => {
  let renewedDraft = null
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, created_by: 8, submitted_at: null, estado: 'Próximo trimestre' }),
    countQuotes: async () => 2,
    prepareQuote: async (_query, row) => ({ id: 9, ...row }),
    touchDraft: async (_query, row) => { renewedDraft = row },
  }
  const ids = ['nonce-1', 'path-1']
  const service = createPeticionUploadService({ repo, uuid: () => ids.shift(), now: () => new Date('2026-08-21T12:00:00Z') })
  const result = await service.prepare(actor, {
    centroId: 10, peticionId: 4, archivoNombre: 'cotizacion.pdf',
    proveedorRazonSocial: 'Proveedor Uno', proveedorPais: 'PA', proveedorIdFiscal: '155-1',
    empresaConstituida: true, emiteFacturaFiscal: true,
  })
  assert.deepEqual(result, { cotizacionId: 9, pathname: 'peticiones/4/path-1.pdf', nonce: 'nonce-1', attempt: 1 })
  assert.deepEqual(renewedDraft, { id: 4, draft_expires_at: '2026-09-20T12:00:00.000Z' })
})

test('una cotización nueva fallida puede reintentar después del envío', async () => {
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, created_by: 8, submitted_at: '2026-08-20T12:00:00Z', estado: 'En proceso' }),
    lockQuote: async () => ({ id: 9, peticion_id: 4, upload_status: 'invalid', upload_attempts: 1, expected_pathname: 'peticiones/4/viejo.pdf' }),
    prepareQuote: async (_query, row) => ({ id: 9, ...row }),
    enqueueCleanup: async () => {},
  }
  const ids = ['nonce-2', 'path-2']
  const service = createPeticionUploadService({ repo, uuid: () => ids.shift() })
  const result = await service.prepare(actor, {
    centroId: 10, peticionId: 4, cotizacionId: 9, archivoNombre: 'cotizacion.pdf',
    proveedorRazonSocial: 'Proveedor Uno', proveedorPais: 'PA', proveedorIdFiscal: '155-1',
    empresaConstituida: true, emiteFacturaFiscal: true,
  })
  assert.equal(result.attempt, 2)
  assert.equal(result.cotizacionId, 9)
})

test('prepare no renueva un borrador que ya venció', async () => {
  let prepared = false
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({
      id: 4, centro_id: 10, created_by: 8, submitted_at: null, estado: 'Próximo trimestre',
      draft_expires_at: '2026-08-20T12:00:00Z',
    }),
    prepareQuote: async () => { prepared = true },
  }
  const service = createPeticionUploadService({ repo, now: () => new Date('2026-08-21T12:00:00Z') })
  await assert.rejects(() => service.prepare(actor, {
    centroId: 10, peticionId: 4, archivoNombre: 'cotizacion.pdf', proveedorRazonSocial: 'Proveedor Uno',
    proveedorPais: 'PA', proveedorIdFiscal: '155-1', empresaConstituida: true, emiteFacturaFiscal: true,
  }), /borrador venció/i)
  assert.equal(prepared, false)
})

test('prepare rechaza un código de país ficticio aunque tenga dos letras', async () => {
  let prepared = false
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, created_by: 8, submitted_at: null, estado: 'Próximo trimestre' }),
    countQuotes: async () => 0,
    prepareQuote: async () => { prepared = true },
  }
  const service = createPeticionUploadService({ repo })
  await assert.rejects(() => service.prepare(actor, {
    centroId: 10, peticionId: 4, archivoNombre: 'cotizacion.pdf', proveedorRazonSocial: 'Proveedor Uno',
    proveedorPais: 'ZZ', proveedorIdFiscal: '155-1', empresaConstituida: true, emiteFacturaFiscal: true,
  }), /país ISO válido/i)
  assert.equal(prepared, false)
})

test('un intento no válido se puede retirar sin borrar una cotización válida', async () => {
  const events = []
  const quote = { id: 9, peticion_id: 4, upload_status: 'invalid', expected_pathname: 'peticiones/4/fallo.pdf' }
  const repo = {
    transaction: async (work) => work(repo),
    lockPeticion: async () => ({ id: 4, centro_id: 10, created_by: 8, submitted_at: null, estado: 'Próximo trimestre' }),
    lockQuote: async () => quote,
    enqueueCleanup: async (_query, row) => { events.push(`queue:${row.blob_pathname}`) },
    deleteQuoteAttempt: async () => { events.push('delete:attempt') },
  }
  const service = createPeticionUploadService({ repo })
  const result = await service.discardAttempt(actor, { centroId: 10, peticionId: 4, cotizacionId: 9 })
  assert.equal(result.ok, true)
  assert.deepEqual(events, ['queue:peticiones/4/fallo.pdf', 'delete:attempt'])
  quote.upload_status = 'valid'
  await assert.rejects(
    () => service.discardAttempt(actor, { centroId: 10, peticionId: 4, cotizacionId: 9 }),
    /cotización válida/
  )
})

test('token exige coincidencia exacta y limita tipo, tamaño y vencimiento', async () => {
  const repo = { getUploadAttempt: async () => ({ id: 9, peticion_id: 4, centro_id: 10, created_by: 8, submitted_at: null, upload_nonce: 'n-1', expected_pathname: 'peticiones/4/n-1.pdf', upload_status: 'pending' }) }
  const service = createPeticionUploadService({ repo, now: () => new Date('2026-08-21T12:00:00Z') })
  const token = await service.authorizeToken(actor, { pathname: 'peticiones/4/n-1.pdf', cotizacionId: 9, nonce: 'n-1' })
  assert.deepEqual(token.allowedContentTypes, ['application/pdf'])
  assert.equal(token.maximumSizeInBytes, 10485760)
  assert.equal(token.addRandomSuffix, false)
  assert.equal(token.allowOverwrite, false)
  assert.equal(token.validUntil, Date.parse('2026-08-21T12:10:00Z'))
  await assert.rejects(() => service.authorizeToken(actor, { pathname: 'peticiones/otro.pdf', cotizacionId: 9, nonce: 'n-1' }), /Carga no autorizada/)
  await assert.rejects(() => service.authorizeToken({ ...actor, id: 99 }, { pathname: 'peticiones/4/n-1.pdf', cotizacionId: 9, nonce: 'n-1' }), /Carga no autorizada/)
})

test('la acción exige Blob configurado antes de crear un intento', () => {
  const source = readFileSync(new URL('../app/actions/peticiones.js', import.meta.url), 'utf8')
  const action = source.slice(source.indexOf('export async function prepareCotizacionUpload'))
  assert.ok(action.indexOf('requireBlobToken()') < action.indexOf('peticionUploadService.prepare'))
})

test('el adaptador solo inspecciona respuestas Blob 200 con stream', () => {
  const source = readFileSync(new URL('../lib/peticion-blob.js', import.meta.url), 'utf8')
  assert.match(source, /result\.statusCode !== 200/)
  assert.match(source, /!result\.stream/)
})

test('callback repetido es idempotente y callback obsoleto encola limpieza', async () => {
  const events = []
  const repo = {
    transaction: async (work) => work(repo),
    getCallbackContext: async (payload) => payload.nonce === 'vigente'
      ? { user_exists: true, user_password_hash: 'hash', user_centro_id: 10, user_rol: 'administradora', centro_id: 10, created_by: 8, submitted_at: null, id: 9, peticion_id: 4, upload_nonce: 'vigente', expected_pathname: 'peticiones/4/a.pdf', upload_status: 'valid' }
      : { user_exists: true, user_password_hash: 'hash', user_centro_id: 10, user_rol: 'administradora', centro_id: 10, created_by: 8, submitted_at: null, id: 9, peticion_id: 4, upload_nonce: 'nuevo', expected_pathname: 'peticiones/4/nuevo.pdf', upload_status: 'pending' },
    markValidating: async () => false,
    enqueueCleanup: async (_query, row) => { events.push(row) },
  }
  const blob = { pathname: 'peticiones/4/a.pdf', contentType: 'application/pdf' }
  const service = createPeticionUploadService({ repo, blob: { inspect: async () => ({ bytes: 10, sha256: 'a'.repeat(64) }) } })
  assert.equal((await service.complete({ blob, tokenPayload: JSON.stringify({ v: 1, uid: 8, peticionId: 4, cotizacionId: 9, nonce: 'vigente', pathname: blob.pathname }) })).idempotent, true)
  await service.complete({ blob, tokenPayload: JSON.stringify({ v: 1, uid: 8, peticionId: 4, cotizacionId: 9, nonce: 'viejo', pathname: blob.pathname }) })
  assert.deepEqual(events.map((row) => row.motivo), ['stale_callback'])
})

test('dos callbacks vigentes pueden observar validating sin borrar el PDF activo', async () => {
  const cleanup = []
  const valid = []
  const context = {
    user_exists: true, user_password_hash: 'hash', user_centro_id: 10, user_rol: 'administradora',
    centro_id: 10, created_by: 8, submitted_at: null, id: 9, peticion_id: 4, upload_nonce: 'vigente',
    expected_pathname: 'peticiones/4/a.pdf', upload_status: 'validating',
  }
  const repo = {
    transaction: async (work) => work(repo),
    getCallbackContext: async () => context,
    lockPeticion: async () => ({ id: 4, submitted_at: null, estado: 'Próximo trimestre' }),
    markValid: async (_query, row) => { valid.push(row); return row },
    enqueueCleanup: async (_query, row) => { cleanup.push(row) },
  }
  const uploaded = { pathname: context.expected_pathname, contentType: 'application/pdf' }
  const service = createPeticionUploadService({ repo, blob: { inspect: async () => ({ bytes: 10, sha256: 'a'.repeat(64) }) } })
  const result = await service.complete({
    blob: uploaded,
    tokenPayload: JSON.stringify({ v: 1, uid: 8, peticionId: 4, cotizacionId: 9, nonce: 'vigente', pathname: uploaded.pathname }),
  })
  assert.equal(result.valid, true)
  assert.equal(valid.length, 1)
  assert.deepEqual(cleanup, [])
})

test('degradar al emisor revoca un callback sobre borrador ajeno', async () => {
  const events = []
  const context = {
    user_exists: true, user_password_hash: 'hash', user_centro_id: 10, user_rol: 'administradora',
    centro_id: 10, created_by: 7, submitted_at: null, estado: 'Próximo trimestre', id: 9, peticion_id: 4,
    upload_nonce: 'vigente', expected_pathname: 'peticiones/4/a.pdf', upload_status: 'pending',
  }
  const repo = {
    transaction: async (work) => work(repo),
    getCallbackContext: async () => context,
    markInvalid: async () => { events.push('invalid'); return { id: 9 } },
    enqueueCleanup: async (_query, row) => { events.push(row.motivo) },
  }
  const uploaded = { pathname: context.expected_pathname, contentType: 'application/pdf' }
  const result = await createPeticionUploadService({ repo, blob: { inspect: async () => { throw new Error('no debe inspeccionar') } } })
    .complete({ blob: uploaded, tokenPayload: JSON.stringify({ v: 1, uid: 8, peticionId: 4, cotizacionId: 9, nonce: 'vigente', pathname: uploaded.pathname }) })
  assert.equal(result.invalid, true)
  assert.deepEqual(events, ['invalid', 'revoked_access'])
})

test('invalidación que pierde contra validación no encola el PDF activo', async () => {
  const cleanup = []
  let reads = 0
  const context = {
    user_exists: false, user_password_hash: null, centro_id: 10, created_by: 8, submitted_at: null,
    id: 9, peticion_id: 4, upload_nonce: 'vigente', expected_pathname: 'peticiones/4/a.pdf', upload_status: 'pending',
  }
  const repo = {
    transaction: async (work) => work(repo),
    getCallbackContext: async () => ++reads === 1
      ? context
      : { ...context, user_exists: true, user_password_hash: 'hash', user_centro_id: 10, user_rol: 'administradora', upload_status: 'valid' },
    markInvalid: async () => null,
    enqueueCleanup: async (_query, row) => { cleanup.push(row) },
  }
  const uploaded = { pathname: context.expected_pathname, contentType: 'application/pdf' }
  const result = await createPeticionUploadService({ repo, blob: { inspect: async () => ({ bytes: 10, sha256: 'a'.repeat(64) }) } })
    .complete({ blob: uploaded, tokenPayload: JSON.stringify({ v: 1, uid: 8, peticionId: 4, cotizacionId: 9, nonce: 'vigente', pathname: uploaded.pathname }) })
  assert.equal(result.idempotent, true)
  assert.deepEqual(cleanup, [])
})

test('un estado terminal posterior al token invalida y limpia la carga', async () => {
  const events = []
  const context = {
    user_exists: true, user_password_hash: 'hash', user_centro_id: 10, user_rol: 'administradora',
    centro_id: 10, id: 9, peticion_id: 4, submitted_at: '2026-08-20T12:00:00Z', estado: 'Cumplido',
    upload_nonce: 'vigente', expected_pathname: 'peticiones/4/a.pdf', upload_status: 'pending',
  }
  const repo = {
    transaction: async (work) => work(repo),
    getCallbackContext: async () => context,
    markInvalid: async () => { events.push('invalid'); return { id: 9 } },
    enqueueCleanup: async (_query, row) => { events.push(row.motivo) },
  }
  const uploaded = { pathname: context.expected_pathname, contentType: 'application/pdf' }
  const result = await createPeticionUploadService({ repo, blob: { inspect: async () => { throw new Error('no debe inspeccionar') } } })
    .complete({ blob: uploaded, tokenPayload: JSON.stringify({ v: 1, uid: 8, peticionId: 4, cotizacionId: 9, nonce: 'vigente', pathname: uploaded.pathname }) })
  assert.equal(result.invalid, true)
  assert.deepEqual(events, ['invalid', 'terminal_state'])
})
```

- [x] **Step 6: Implement the private Blob adapter and upload service**

```js
// lib/peticion-blob.js
import { get, del, list } from '@vercel/blob'
import { inspectPdfStream } from './peticion-pdf.mjs'

export function requireBlobToken() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('Falta BLOB_READ_WRITE_TOKEN para gestionar cotizaciones.')
}

export const peticionBlob = {
  async inspect(pathname) {
    requireBlobToken()
    const result = await get(pathname, { access: 'private' })
    if (!result || result.statusCode !== 200 || !result.stream) throw new Error('El PDF cargado no existe.')
    return await inspectPdfStream(result.stream)
  },
  async get(pathname) { requireBlobToken(); return await get(pathname, { access: 'private' }) },
  async delete(pathname) { requireBlobToken(); return await del(pathname) },
  async listPage({ prefix, cursor, limit = 250 }) {
    requireBlobToken()
    const page = await list({ prefix, cursor, limit })
    return {
      blobs: page.blobs.map(({ pathname, size, uploadedAt }) => ({ pathname, size, uploadedAt })),
      hasMore: page.hasMore,
      cursor: page.hasMore ? page.cursor : undefined,
    }
  },
}
```

```js
// lib/peticion-upload-service.mjs
import { ADMIN_ROLES, assertCentroAccess } from './current-user.mjs'
import {
  MAX_COTIZACIONES,
  MAX_UPLOAD_ATTEMPTS,
  DRAFT_TTL_DAYS,
  canAddQuote,
  normalizeFiscalId,
  normalizeSupplierName,
} from './peticiones-domain.mjs'
import { PdfValidationError, sanitizePdfName } from './peticion-pdf.mjs'
import { isIsoCountryCode } from './iso-countries.mjs'

const actorSnapshot = (actor) => ({ id: actor.id, nombre: actor.nombre, email: actor.email, rol: actor.rol })
const activeCallbackActor = (row, payload) => Boolean(
  row?.user_exists && row?.user_password_hash && (
    ADMIN_ROLES.has(row.user_rol) || (
      String(row.user_centro_id) === String(row.centro_id) &&
      (row.submitted_at || String(row.created_by) === String(payload.uid))
    )
  )
)
const callbackMatches = (row, payload, pathname) => Boolean(
  row && Number(row.id) === Number(payload.cotizacionId) &&
  Number(row.peticion_id) === Number(payload.peticionId) &&
  String(row.upload_nonce) === String(payload.nonce) &&
  row.expected_pathname === payload.pathname && payload.pathname === pathname
)
const assertQuoteAccess = (actor, row) => {
  assertCentroAccess(actor, row.centro_id)
  if (!row.submitted_at && String(row.created_by) !== String(actor.id) && !ADMIN_ROLES.has(actor.rol)) {
    throw new Error('Carga no autorizada.')
  }
}

export function createPeticionUploadService({ repo, blob, now = () => new Date(), uuid = () => crypto.randomUUID() }) {
  async function queue(pathname, motivo) {
    if (!pathname) return
    await repo.transaction((query) => repo.enqueueCleanup(query, { blob_pathname: pathname, motivo }))
  }

  async function invalidate(payload, pathname, message, motivo = 'invalid_pdf') {
    const invalidated = await repo.transaction(async (query) => {
      const changed = await repo.markInvalid(query, { cotizacionId: payload.cotizacionId, nonce: payload.nonce, pathname, error: message })
      if (changed) await repo.enqueueCleanup(query, { blob_pathname: pathname, motivo })
      return Boolean(changed)
    })
    if (invalidated) return { ok: true, invalid: true }
    const current = await repo.getCallbackContext(payload)
    if (callbackMatches(current, payload, pathname) && current.upload_status === 'valid') {
      return { ok: true, idempotent: true }
    }
    if (callbackMatches(current, payload, pathname) && ['invalid', 'cleanup_pending'].includes(current.upload_status)) {
      return { ok: true, invalid: true, idempotent: true }
    }
    await queue(pathname, 'stale_callback')
    return { ok: true, stale: true }
  }

  return {
    async prepare(actor, input) {
      try {
        return await repo.transaction(async (query) => {
          const petition = await repo.lockPeticion(query, input.peticionId)
        if (!petition || String(petition.centro_id) !== String(input.centroId)) throw new Error('Petición no encontrada.')
        assertCentroAccess(actor, petition.centro_id)
        if (!petition.submitted_at && String(petition.created_by) !== String(actor.id) && !ADMIN_ROLES.has(actor.rol)) throw new Error('No autorizado')
        if (!petition.submitted_at && petition.draft_expires_at && new Date(petition.draft_expires_at).getTime() <= now().getTime()) throw new Error('El borrador venció y ya no admite cargas.')
        if (petition.submitted_at && !canAddQuote(petition.estado)) throw new Error('Esta petición ya no admite cotizaciones.')

        const current = input.cotizacionId ? await repo.lockQuote(query, input.cotizacionId) : null
        if (current && Number(current.peticion_id) !== Number(petition.id)) throw new Error('Cotización no encontrada.')
        if (petition.submitted_at && current?.upload_status === 'valid') throw new Error('Una cotización enviada no se puede sustituir.')
        if (!current && await repo.countQuotes(query, petition.id) >= MAX_COTIZACIONES) throw new Error('La petición admite hasta diez cotizaciones.')

        const reason = String(input.proveedorRazonSocial || '').trim()
        const country = String(input.proveedorPais || '').trim().toUpperCase()
        const fiscal = String(input.proveedorIdFiscal || '').trim()
        if (!normalizeSupplierName(reason) || !isIsoCountryCode(country) || !normalizeFiscalId(fiscal)) throw new Error('Completa razón social, país ISO válido e identificación fiscal.')
        if (input.empresaConstituida !== true || input.emiteFacturaFiscal !== true) throw new Error('Debes certificar empresa constituida y factura fiscal.')

        const attempt = Number(current?.upload_attempts || 0) + 1
        if (attempt > MAX_UPLOAD_ATTEMPTS) throw new Error('Esta cotización agotó sus cinco intentos de carga.')
        for (const oldPath of new Set([current?.blob_pathname, current?.expected_pathname].filter(Boolean))) {
          await repo.enqueueCleanup(query, { blob_pathname: oldPath, motivo: 'upload_retried' })
        }
        const nonce = uuid()
        const pathname = `peticiones/${petition.id}/${uuid()}.pdf`
        const quote = await repo.prepareQuote(query, {
          id: current?.id || null,
          peticion_id: petition.id,
          proveedor_razon_social: reason,
          proveedor_clave: normalizeSupplierName(reason),
          proveedor_pais: country,
          proveedor_id_fiscal: fiscal,
          proveedor_id_fiscal_clave: normalizeFiscalId(fiscal),
          empresa_constituida: true,
          emite_factura_fiscal: true,
          archivo_nombre: sanitizePdfName(input.archivoNombre),
          archivo_mime: null,
          archivo_bytes: null,
          archivo_sha256: null,
          blob_pathname: null,
          upload_nonce: nonce,
          expected_pathname: pathname,
          upload_status: 'pending',
          upload_attempts: attempt,
          validation_error: null,
          uploaded_by: actor.id,
          uploaded_by_snapshot: actorSnapshot(actor),
          validada_at: null,
        })
        if (!petition.submitted_at) {
          await repo.touchDraft(query, {
            id: petition.id,
            draft_expires_at: new Date(now().getTime() + DRAFT_TTL_DAYS * 86400000).toISOString(),
          })
        }
        return { cotizacionId: quote.id, pathname, nonce, attempt }
        })
      } catch (error) {
        if (error?.code === '23505' && error.constraint === 'uq_peticion_proveedor_fiscal') {
          throw new Error('Ese proveedor fiscal ya está registrado en la petición.')
        }
        throw error
      }
    },

    async authorizeToken(actor, input) {
      const row = await repo.getUploadAttempt(input.cotizacionId)
      if (!row || Number(row.peticion_id) !== Number(input.peticionId)) throw new Error('Carga no autorizada.')
      assertQuoteAccess(actor, row)
      if (row.upload_status !== 'pending' || row.upload_nonce !== input.nonce || row.expected_pathname !== input.pathname) throw new Error('Carga no autorizada.')
      if (row.submitted_at && !canAddQuote(row.estado)) throw new Error('Esta petición ya no admite cotizaciones.')
      return {
        allowedContentTypes: ['application/pdf'],
        maximumSizeInBytes: 10 * 1024 * 1024,
        validUntil: now().getTime() + 10 * 60000,
        addRandomSuffix: false,
        allowOverwrite: false,
        tokenPayload: JSON.stringify({
          v: 1, uid: actor.id, peticionId: Number(row.peticion_id),
          cotizacionId: Number(row.id), nonce: row.upload_nonce, pathname: row.expected_pathname,
        }),
      }
    },

    async complete({ blob: uploaded, tokenPayload }) {
      let payload
      try { payload = JSON.parse(tokenPayload || '{}') } catch { throw new Error('Payload de carga inválido.') }
      if (payload.v !== 1 || !payload.uid || !payload.peticionId || !payload.cotizacionId || !payload.nonce || !payload.pathname) throw new Error('Payload de carga incompleto.')
      let context = await repo.getCallbackContext(payload)
      if (!callbackMatches(context, payload, uploaded.pathname)) {
        await queue(uploaded.pathname, 'stale_callback')
        return { ok: true, stale: true }
      }
      if (context.upload_status === 'valid') return { ok: true, idempotent: true }
      if (!activeCallbackActor(context, payload)) {
        return invalidate(payload, uploaded.pathname, 'La cuenta que inició la carga ya no está activa o autorizada.', 'revoked_access')
      }
      if (context.submitted_at && !canAddQuote(context.estado)) {
        return invalidate(payload, uploaded.pathname, 'La petición ya no admite cotizaciones.', 'terminal_state')
      }
      if (context.upload_status === 'invalid' || context.upload_status === 'cleanup_pending') {
        return { ok: true, invalid: true, idempotent: true }
      }
      if (context.upload_status === 'pending') {
        await repo.transaction((query) => repo.markValidating(query, {
          cotizacionId: payload.cotizacionId, nonce: payload.nonce, pathname: uploaded.pathname,
        }))
        context = await repo.getCallbackContext(payload)
      }
      if (!callbackMatches(context, payload, uploaded.pathname)) {
        await queue(uploaded.pathname, 'stale_callback')
        return { ok: true, stale: true }
      }
      if (context.upload_status === 'valid') return { ok: true, idempotent: true }
      if (!activeCallbackActor(context, payload)) {
        return invalidate(payload, uploaded.pathname, 'La cuenta que inició la carga ya no está activa o autorizada.', 'revoked_access')
      }
      if (context.upload_status === 'invalid' || context.upload_status === 'cleanup_pending') {
        return { ok: true, invalid: true, idempotent: true }
      }
      if (context.upload_status !== 'validating') {
        await queue(uploaded.pathname, 'stale_callback')
        return { ok: true, stale: true }
      }
      if (uploaded.contentType !== 'application/pdf') return invalidate(payload, uploaded.pathname, 'El archivo no tiene MIME application/pdf.')
      let inspected
      try { inspected = await blob.inspect(uploaded.pathname) } catch (error) {
        if (error instanceof PdfValidationError) return invalidate(payload, uploaded.pathname, error.message)
        throw error
      }
      try {
        const finalized = await repo.transaction(async (query) => {
          const petition = await repo.lockPeticion(query, payload.peticionId)
          if (!petition) return { stale: true }
          const fresh = await repo.getCallbackContext(payload, query, { lockUser: true })
          if (!callbackMatches(fresh, payload, uploaded.pathname)) return { stale: true }
          if (fresh.upload_status === 'valid') return { valid: true, idempotent: true }
          if (petition.submitted_at && !canAddQuote(petition.estado)) return { terminal: true }
          if (!activeCallbackActor(fresh, payload)) return { revoked: true }
          if (['invalid', 'cleanup_pending'].includes(fresh.upload_status)) return { invalid: true }
          if (fresh.upload_status !== 'validating') return { stale: true }
          const quote = await repo.markValid(query, {
            cotizacionId: payload.cotizacionId, nonce: payload.nonce, pathname: uploaded.pathname,
            mime: 'application/pdf', bytes: inspected.bytes, sha256: inspected.sha256,
            validadaAt: now().toISOString(),
          })
          return quote ? { valid: true } : { stale: true }
        })
        if (finalized.terminal) return invalidate(payload, uploaded.pathname, 'La petición ya no admite cotizaciones.', 'terminal_state')
        if (finalized.revoked) return invalidate(payload, uploaded.pathname, 'La cuenta que inició la carga ya no está activa o autorizada.', 'revoked_access')
        if (finalized.invalid) return { ok: true, invalid: true, idempotent: true }
        if (finalized.idempotent) return { ok: true, idempotent: true }
        if (finalized.stale) {
          await queue(uploaded.pathname, 'stale_callback')
          return { ok: true, stale: true }
        }
      } catch (error) {
        if (error?.code === '23505' && error.constraint === 'uq_peticion_pdf_sha') {
          return invalidate(payload, uploaded.pathname, 'El mismo PDF ya fue presentado en esta petición.')
        }
        throw error
      }
      return { ok: true, valid: true }
    },

    async status(actor, input) {
      const row = await repo.getUploadStatus(input.cotizacionId)
      if (!row || Number(row.peticion_id) !== Number(input.peticionId)) throw new Error('Cotización no encontrada.')
      assertQuoteAccess(actor, row)
      return { id: row.id, upload_status: row.upload_status, error: row.validation_error || null }
    },

    async discardAttempt(actor, input) {
      return repo.transaction(async (query) => {
        const petition = await repo.lockPeticion(query, input.peticionId)
        if (!petition || String(petition.centro_id) !== String(input.centroId)) throw new Error('Petición no encontrada.')
        assertCentroAccess(actor, petition.centro_id)
        if (!petition.submitted_at && String(petition.created_by) !== String(actor.id) && !ADMIN_ROLES.has(actor.rol)) throw new Error('No autorizado')
        if (petition.submitted_at && !canAddQuote(petition.estado)) throw new Error('Esta petición ya no admite cambios documentales.')
        const quote = await repo.lockQuote(query, input.cotizacionId)
        if (!quote || Number(quote.peticion_id) !== Number(petition.id)) throw new Error('Cotización no encontrada.')
        if (quote.upload_status === 'valid') throw new Error('Una cotización válida no se puede retirar.')
        const paths = [...new Set([quote.blob_pathname, quote.expected_pathname].filter(Boolean))]
        for (const blob_pathname of paths) await repo.enqueueCleanup(query, { blob_pathname, motivo: 'attempt_discarded' })
        await repo.deleteQuoteAttempt(query, { id: quote.id, peticionId: petition.id })
        return { ok: true }
      })
    },
  }
}
```

- [x] **Step 7: Add repository methods and upload actions**

Add parameterized repository methods `prepareQuote`, `touchDraft`, `getUploadAttempt`, `getCallbackContext`, `markValidating`, `markValid`, `markInvalid`, `countQuotes`, `getUploadStatus`, and `deleteQuoteAttempt`. The delete uses both quote and petition ids plus `upload_status <> 'valid'`. `touchDraft` executes the following guarded update; every quote state change uses `WHERE upload_nonce = $nonce AND expected_pathname = $pathname`.

Both `getUploadAttempt` and `getUploadStatus` join `peticiones` and return `centro_id`, `created_by`, `submitted_at` and `estado` with the quote, so draft ownership is enforced again during token issuance and polling. `getCallbackContext(payload, query?, options?)` returns those petition fields too; it additionally joins the current `usuarios` row selected by signed `payload.uid` and returns `user_exists`, `user_password_hash`, `user_rol` and `user_centro_id`. With `{ lockUser: true }`, it uses the transaction connection and locks that `usuarios` row with `FOR SHARE` before the final quote mutation, so a concurrent role/center/password change has a definite order. A callback for a draft still requires that current actor to be the creator or retain an admin role; same-center access alone is sufficient only after submission. A row already `valid` is an idempotent no-op even if the actor was later revoked, because the callback no longer mutates data.

`markValidating` changes only `pending → validating` and returns the claimed row. Después del claim, el servicio siempre relee contexto fresco antes de inspeccionar. A matching callback that already observes `validating` may safely repeat the read-only PDF inspection; it must never enqueue the active pathname. Before `markValid`, the same transaction locks the parent petition, rereads and locks the current actor, rechecks owner/role and confirms that a submitted petition is still open; this serializes the callback against `changeStatus` and revocation. `markValid` accepts `upload_status IN ('validating', 'valid')` so concurrent confirmations are idempotent, explicitly excludes `cleanup_pending` and returns the row. `markInvalid` accepts `pending`, `validating` or `invalid`, but never overwrites `valid`; the service enqueues the pathname only when its `RETURNING` confirms the transition, otherwise relee el estado y trata `valid` como idempotente. All three predicates also require the exact nonce and expected pathname.

```sql
UPDATE peticiones
SET draft_expires_at = $2, updated_at = now()
WHERE id = $1 AND submitted_at IS NULL
RETURNING id;

DELETE FROM peticion_cotizaciones
WHERE id = $1 AND peticion_id = $2 AND upload_status <> 'valid'
RETURNING id;
```

Import the upload runtime, replace Task 4's `const service = ...` composition line, and add these actions in `app/actions/peticiones.js`:

```js
import { peticionUploadService, verifyStoredQuote } from '../../lib/peticion-upload-runtime'
import { requireBlobToken } from '../../lib/peticion-blob'

const service = createPeticionesService({ repo: peticionesRepository, verifyQuote: verifyStoredQuote })

export async function prepareCotizacionUpload(centroId, input) {
  return runAction('prepareCotizacionUpload', async () => {
    requireBlobToken()
    return await peticionUploadService.prepare(await requireCurrentCentroAccess(centroId), { ...input, centroId })
  })
}

export async function getCotizacionUploadStatus(centroId, peticionId, cotizacionId) {
  return runAction('getCotizacionUploadStatus', async () =>
    peticionUploadService.status(await requireCurrentCentroAccess(centroId), { centroId, peticionId, cotizacionId }))
}

export async function discardCotizacionAttempt(centroId, peticionId, cotizacionId) {
  return runAction('discardCotizacionAttempt', async () =>
    peticionUploadService.discardAttempt(await requireCurrentCentroAccess(centroId), { centroId, peticionId, cotizacionId }))
}
```

- [x] **Step 8: Implement the `handleUpload` route**

```js
// app/api/peticiones/cotizaciones/upload/route.js
import { handleUpload } from '@vercel/blob/client'
import { requireCurrentUser } from '../../../../../lib/auth'
import { peticionUploadService } from '../../../../../lib/peticion-upload-runtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const body = await request.json()
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const input = JSON.parse(clientPayload || '{}')
        const actor = await requireCurrentUser()
        return await peticionUploadService.authorizeToken(actor, { ...input, pathname })
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        await peticionUploadService.complete({ blob, tokenPayload })
      },
    })
    return Response.json(response)
  } catch (error) {
    console.error('[peticion-upload]', error)
    return Response.json({ error: error?.message || 'No se pudo procesar la carga.' }, { status: 400 })
  }
}
```

Create `lib/peticion-upload-runtime.js` as the server-only composition root that constructs `peticionUploadService` with `peticionesRepository` and `peticionBlob`; no client component imports this file.

```js
// lib/peticion-upload-runtime.js
import { createPeticionUploadService } from './peticion-upload-service.mjs'
import { peticionBlob } from './peticion-blob'
import { peticionesRepository } from './peticiones-repository'

export async function verifyStoredQuote(quote) {
  const actual = await peticionBlob.inspect(quote.blob_pathname)
  if (Number(actual.bytes) !== Number(quote.archivo_bytes) || actual.sha256 !== quote.archivo_sha256) {
    throw new Error('El PDF cambió después de validarse.')
  }
  return true
}

export const peticionUploadService = createPeticionUploadService({ repo: peticionesRepository, blob: peticionBlob })
```

- [x] **Step 9: Run upload tests and build**

Run: `node --test test/peticion-pdf.test.mjs test/peticion-upload.test.mjs`

Expected: PASS.

Run: `npm run build`

Expected: build completes without requiring a Blob token at import/build time.

Add `test/integration/peticiones-callback.integration.mjs` against only `PETICIONES_TEST_DATABASE_URL`. Apply expand in a unique schema, seed a submitted petition in `En proceso` and a `validating` quote, then hold the parent row on connection A, change it to `Cumplido`, and start `peticionUploadService.complete` through a real SQL repository adapter on connection B before committing A. The callback may inspect the mocked PDF while waiting, but after A commits it must return `invalid: true`, leave no `valid` quote and enqueue `terminal_state`. Repeat the test with `Anulada`. This proves the parent `FOR UPDATE` recheck—not test scheduling—prevents a PDF from becoming valid after a terminal transition.

Run only with the disposable database:

```bash
test -z "$PETICIONES_TEST_DATABASE_URL" || node --test test/integration/peticiones-callback.integration.mjs
```

Expected: PASS with two independent PostgreSQL connections, or `SKIPPED` when absent.

- [x] **Step 10: Commit**

```bash
git add package.json package-lock.json lib/peticion-pdf.mjs lib/peticion-upload-service.mjs lib/peticion-upload-runtime.js lib/peticion-blob.js lib/peticiones-repository.js app/actions/peticiones.js app/api/peticiones/cotizaciones/upload/route.js test/peticion-pdf.test.mjs test/peticion-upload.test.mjs test/integration/peticiones-callback.integration.mjs
git commit -m "feat: validar cotizaciones en blob privado"
```

---

### Task 6: Descarga privada autorizada y CORS cerrado

**Files:**
- Create: `lib/peticion-download.mjs`
- Create: `app/api/peticiones/cotizaciones/[id]/download/route.js`
- Create: `test/peticion-download.test.mjs`
- Modify: `lib/current-user.mjs`
- Modify: `lib/peticiones-repository.js`
- Modify: `next.config.js:14-23`
- Modify: `test/next-config.test.mjs`

**Interfaces:**
- Produces: `canAccessCentro(user, centroId): boolean`.
- Produces: `createPeticionDownloadHandler({ authenticate, findQuote, getBlob }): (id) => Promise<Response>`.
- Repository method: `findDownloadableQuote(id)` returns `{ id, centro_id, archivo_nombre, blob_pathname }` only when `upload_status = 'valid'`.
- Unauthenticated returns `401`; nonexistent and unauthorized return the same `404`; success streams a PDF attachment with `private, no-store` and `nosniff`.

- [x] **Step 1: Write the failing download tests**

```js
// test/peticion-download.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { createPeticionDownloadHandler } from '../lib/peticion-download.mjs'

const actor = { id: 8, rol: 'administradora', centro_id: 10 }
const body = () => new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('%PDF-x')); controller.close() } })

test('stream autorizado usa cabeceras privadas y nunca devuelve URL', async () => {
  const handler = createPeticionDownloadHandler({
    authenticate: async () => actor,
    findQuote: async () => ({ id: 9, centro_id: 10, archivo_nombre: 'Cotización Uno.pdf', blob_pathname: 'peticiones/4/a.pdf' }),
    getBlob: async () => ({ statusCode: 200, stream: body() }),
  })
  const response = await handler(9)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/pdf')
  assert.match(response.headers.get('content-disposition'), /^attachment;/)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  assert.equal((await response.text()).startsWith('%PDF-'), true)
})

test('id inexistente y centro ajeno producen el mismo 404', async () => {
  const missing = createPeticionDownloadHandler({ authenticate: async () => actor, findQuote: async () => null, getBlob: async () => null })
  const denied = createPeticionDownloadHandler({
    authenticate: async () => actor,
    findQuote: async () => ({ id: 9, centro_id: 11, archivo_nombre: 'x.pdf', blob_pathname: 'x' }),
    getBlob: async () => { throw new Error('no debe leer Blob') },
  })
  assert.equal((await missing(9)).status, 404)
  assert.equal((await denied(9)).status, 404)
  const gone = createPeticionDownloadHandler({
    authenticate: async () => actor,
    findQuote: async () => ({ id: 9, centro_id: 10, archivo_nombre: 'x.pdf', blob_pathname: 'x' }),
    getBlob: async () => ({ statusCode: 500, stream: body() }),
  })
  assert.equal((await gone(9)).status, 404)
})

test('sesión ausente devuelve 401', async () => {
  const handler = createPeticionDownloadHandler({ authenticate: async () => { throw new Error('No autenticado') }, findQuote: async () => null, getBlob: async () => null })
  assert.equal((await handler(9)).status, 401)
  const outage = createPeticionDownloadHandler({ authenticate: async () => { throw new Error('Neon no disponible') }, findQuote: async () => null, getBlob: async () => null })
  await assert.rejects(() => outage(9), /Neon no disponible/)
})
```

- [x] **Step 2: Run the test to verify it fails**

Run: `node --test test/peticion-download.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [x] **Step 3: Implement the handler factory and access predicate**

```js
// addition to lib/current-user.mjs
export function canAccessCentro(user, centroId) {
  return Boolean(user && (ADMIN_ROLES.has(user.rol) || String(user.centro_id) === String(centroId)))
}
```

```js
// lib/peticion-download.mjs
import { canAccessCentro } from './current-user.mjs'
import { sanitizePdfName } from './peticion-pdf.mjs'

const notFound = () => Response.json({ error: 'Cotización no encontrada.' }, { status: 404 })

export function createPeticionDownloadHandler({ authenticate, findQuote, getBlob }) {
  return async function download(cotizacionId) {
    let actor
    try { actor = await authenticate() } catch (error) {
      if (/No autenticado/i.test(String(error?.message || error))) {
        return Response.json({ error: 'No autenticado.' }, { status: 401 })
      }
      throw error
    }
    const quote = await findQuote(cotizacionId)
    if (!quote || !canAccessCentro(actor, quote.centro_id)) return notFound()
    const blob = await getBlob(quote.blob_pathname)
    if (!blob || blob.statusCode !== 200 || !blob.stream) return notFound()
    const filename = sanitizePdfName(quote.archivo_nombre)
    return new Response(blob.stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  }
}
```

- [x] **Step 4: Wire the repository and route**

```js
// app/api/peticiones/cotizaciones/[id]/download/route.js
import { requireCurrentUser } from '../../../../../../lib/auth'
import { createPeticionDownloadHandler } from '../../../../../../lib/peticion-download.mjs'
import { peticionBlob } from '../../../../../../lib/peticion-blob'
import { peticionesRepository } from '../../../../../../lib/peticiones-repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const download = createPeticionDownloadHandler({
  authenticate: requireCurrentUser,
  findQuote: (id) => peticionesRepository.findDownloadableQuote(id),
  getBlob: (pathname) => peticionBlob.get(pathname),
})

export async function GET(_request, { params }) {
  const { id } = await params
  return await download(id)
}
```

The repository query receives only `cotizacionId` and derives `centro_id` with `JOIN peticiones p ON p.id = c.peticion_id`; it never accepts `centroId` or `pathname` from the URL.

- [x] **Step 5: Remove the global wildcard CORS header**

Delete `next.config.js`'s `headers()` block that applies `Access-Control-Allow-Origin: *` to every route. Extend `test/next-config.test.mjs`:

```js
test('no publica CORS wildcard sobre descargas autenticadas', async () => {
  const rules = typeof nextConfig.headers === 'function' ? await nextConfig.headers() : []
  const values = rules.flatMap((rule) => rule.headers || []).filter((header) => header.key.toLowerCase() === 'access-control-allow-origin')
  assert.equal(values.some((header) => header.value === '*'), false)
})
```

- [x] **Step 6: Run focused tests and build**

Run: `node --test test/peticion-download.test.mjs test/next-config.test.mjs`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add lib/current-user.mjs lib/peticion-download.mjs lib/peticiones-repository.js 'app/api/peticiones/cotizaciones/[id]/download/route.js' next.config.js test/peticion-download.test.mjs test/next-config.test.mjs
git commit -m "feat: servir cotizaciones con autorizacion privada"
```

---

### Task 7: Cola durable, vencimiento y cron de reconciliación

**Files:**
- Create: `lib/peticion-cleanup.mjs`
- Create: `lib/peticion-cleanup-runtime.js`
- Create: `app/api/cron/peticiones-cleanup/route.js`
- Create: `test/peticion-cleanup.test.mjs`
- Create: `test/integration/peticiones-cleanup-race.integration.mjs`
- Modify: `lib/peticiones-repository.js`
- Modify: `db/schema.sql`
- Modify: `db/migrations/2026-08-21-peticiones-cotizaciones-expand.sql`
- Modify: `test/peticiones-schema.test.mjs`
- Modify: `vercel.json`
- Modify: `.env.example`

**Interfaces:**
- Adds queue columns `generation`, `locked_at`, `lock_token`, `lock_generation` and a singleton cursor table `peticion_cleanup_checkpoint`; claims use `FOR UPDATE SKIP LOCKED`, a five-minute stale-lock threshold and generation fencing.
- Produces constants: `MAX_CLEANUP_ATTEMPTS = 5`, `CLEANUP_BATCH = 20`, `UPLOAD_STALE_MINUTES = 60`, `RECONCILE_PAGE_SIZE = 250`, `RECONCILE_MAX_PAGES = 3`.
- Produces: `retryAt(now, attempts): Date` using delays 5 minutes, 30 minutes, 2 hours, 12 hours and 24 hours.
- Produces: `createPeticionCleanupService({ repo, blob, now, uuid }): CleanupService` with `run({ budgetMs })`.
- `run` returns only counters: `{ expiredDrafts, reconciled, processed, skippedActive, failed, pending }`.

- [x] **Step 1: Extend schema tests for recoverable queue locks**

```js
// append assertion in test/peticiones-schema.test.mjs
test('la cola tiene claim recuperable para cron concurrente', () => {
  const sql = read('../db/migrations/2026-08-21-peticiones-cotizaciones-expand.sql')
  assert.match(sql, /locked_at TIMESTAMPTZ/)
  assert.match(sql, /lock_token TEXT/)
  assert.match(sql, /generation INTEGER NOT NULL DEFAULT 1/)
  assert.match(sql, /lock_generation INTEGER/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS peticion_cleanup_checkpoint/)
})
```

- [x] **Step 2: Write failing cleanup tests**

```js
// test/peticion-cleanup.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createPeticionCleanupService, retryAt } from '../lib/peticion-cleanup.mjs'

test('backoff es determinista y acotado', () => {
  const now = new Date('2026-08-21T12:00:00Z')
  assert.equal(retryAt(now, 1).toISOString(), '2026-08-21T12:05:00.000Z')
  assert.equal(retryAt(now, 5).toISOString(), '2026-08-22T12:00:00.000Z')
  assert.equal(retryAt(now, 99).toISOString(), '2026-08-22T12:00:00.000Z')
})

test('falta de Blob no reclama filas ni consume intentos', async () => {
  let claimed = false
  const repo = { expireDrafts: async () => 0, reconcileStaleAttempts: async () => 0, claimCleanup: async () => { claimed = true; return [] } }
  const service = createPeticionCleanupService({ repo, blob: { assertConfigured: () => { throw new Error('Falta BLOB_READ_WRITE_TOKEN') } } })
  await assert.rejects(() => service.run({ budgetMs: 1000 }), /BLOB_READ_WRITE_TOKEN/)
  assert.equal(claimed, false)
})

test('éxito completa y falla conserva la fila con próximo intento', async () => {
  const complete = []
  const failed = []
  const deleted = []
  const order = []
  const rows = [
    { id: 1, blob_pathname: 'peticiones/a.pdf', intentos: 0 },
    { id: 2, blob_pathname: 'peticiones/b.pdf', intentos: 1 },
    { id: 3, blob_pathname: 'peticiones/activo.pdf', intentos: 0 },
  ]
  const repo = {
    expireDrafts: async () => 1,
    claimCleanup: async () => { order.push('claim'); return rows },
    isBlobPathActive: async (path) => path.endsWith('activo.pdf'),
    completeCleanup: async (row, result) => { complete.push([row.id, result?.note || null]) },
    failCleanup: async (row) => { failed.push(row.id) },
    releaseCleanup: async () => { throw new Error('no debe liberar filas terminadas') },
    reconcileStaleAttempts: async () => { order.push('stale-db'); return 2 },
    getReconcileCursor: async () => null,
    reconcileBlobPage: async () => 0,
    countPendingCleanup: async () => 1,
  }
  const blob = {
    assertConfigured: () => {},
    delete: async (path) => { deleted.push(path); if (path.endsWith('b.pdf')) throw new Error('rate limited') },
    listPage: async () => { order.push('list-page'); return { blobs: [], hasMore: false, cursor: undefined } },
  }
  const result = await createPeticionCleanupService({ repo, blob, now: () => new Date('2026-08-21T12:00:00Z'), uuid: () => 'lock-1' }).run({ budgetMs: 1000 })
  assert.deepEqual(complete, [[1, null], [3, 'active_reference']])
  assert.deepEqual(failed, [2])
  assert.deepEqual(deleted, ['peticiones/a.pdf', 'peticiones/b.pdf'])
  assert.ok(order.indexOf('claim') < order.indexOf('list-page'))
  assert.deepEqual(result, { expiredDrafts: 1, reconciled: 2, processed: 1, skippedActive: 1, failed: 1, pending: 1 })
})

test('al cortar presupuesto libera todas las filas reclamadas sin listar el store', async () => {
  const released = []
  const rows = [{ id: 1, blob_pathname: 'peticiones/a.pdf' }, { id: 2, blob_pathname: 'peticiones/b.pdf' }]
  const repo = {
    expireDrafts: async () => 0,
    claimCleanup: async () => rows,
    releaseCleanup: async (items, options) => { released.push([items.map((row) => row.id), options.lockToken]) },
    countPendingCleanup: async () => 2,
  }
  const blob = { assertConfigured: () => {}, listPage: async () => { throw new Error('no debe listar') } }
  const result = await createPeticionCleanupService({ repo, blob, uuid: () => 'lock-budget' }).run({ budgetMs: 0 })
  assert.deepEqual(released, [[[1, 2], 'lock-budget']])
  assert.equal(result.pending, 2)
})

test('ruta cron aplica rechazo fail-closed antes de ejecutar el servicio', () => {
  const source = readFileSync(new URL('../app/api/cron/peticiones-cleanup/route.js', import.meta.url), 'utf8')
  assert.match(source, /rechazoCron\(request, process\.env\.CRON_SECRET\)/)
  assert.ok(source.indexOf('rechazoCron') < source.indexOf('peticionCleanupService.run'))
})

test('reconciliar invalida la autoridad del callback antes de encolar', () => {
  const source = readFileSync(new URL('../lib/peticiones-repository.js', import.meta.url), 'utf8')
  assert.match(source, /UPDATE peticion_cotizaciones[\s\S]+SET upload_status = 'cleanup_pending'[\s\S]+upload_status IN \('pending', 'validating'\)/)
})

test('reencolar una ruta agotada reinicia intentos y libera locks viejos', () => {
  const source = readFileSync(new URL('../lib/peticiones-repository.js', import.meta.url), 'utf8')
  assert.match(source, /ON CONFLICT \(blob_pathname\) DO UPDATE[\s\S]+generation = peticion_blob_cleanup\.generation \+ 1[\s\S]+intentos = 0[\s\S]+lock_generation = NULL/)
})
```

- [x] **Step 3: Implement cleanup policy and service**

```js
// lib/peticion-cleanup.mjs
export const MAX_CLEANUP_ATTEMPTS = 5
export const CLEANUP_BATCH = 20
export const UPLOAD_STALE_MINUTES = 60
export const RECONCILE_PAGE_SIZE = 250
export const RECONCILE_MAX_PAGES = 3
const DELAYS_MS = [5 * 60000, 30 * 60000, 2 * 3600000, 12 * 3600000, 24 * 3600000]

export function retryAt(now, attempts) {
  const index = Math.min(Math.max(1, Number(attempts) || 1), DELAYS_MS.length) - 1
  return new Date(new Date(now).getTime() + DELAYS_MS[index])
}

export function createPeticionCleanupService({ repo, blob, now = () => new Date(), uuid = () => crypto.randomUUID() }) {
  return {
    async run({ budgetMs = 240000 } = {}) {
      blob.assertConfigured()
      const started = Date.now()
      const current = now()
      const expiredDrafts = await repo.expireDrafts(current)
      const lockToken = uuid()
      const rows = await repo.claimCleanup({
        lockToken, limit: CLEANUP_BATCH,
        lockBefore: new Date(current.getTime() - 5 * 60000), maxAttempts: MAX_CLEANUP_ATTEMPTS,
      })
      let processed = 0
      let skippedActive = 0
      let failed = 0
      const settled = new Set()
      try {
        for (const row of rows) {
          if (Date.now() - started >= budgetMs) break
          try {
            if (await repo.isBlobPathActive(row.blob_pathname)) {
              await repo.completeCleanup(row, { note: 'active_reference' })
              settled.add(row.id)
              skippedActive++
              continue
            }
            await blob.delete(row.blob_pathname)
            await repo.completeCleanup(row)
            settled.add(row.id)
            processed++
          } catch (error) {
            await repo.failCleanup(row, { error: String(error?.message || error), retryAt: retryAt(current, row.intentos + 1) })
            settled.add(row.id)
            failed++
          }
        }
      } finally {
        const remaining = rows.filter((row) => !settled.has(row.id))
        if (remaining.length) await repo.releaseCleanup(remaining, { lockToken })
      }

      let reconciled = 0
      if (Date.now() - started < budgetMs) {
        reconciled += await repo.reconcileStaleAttempts(current, {
          staleMinutes: UPLOAD_STALE_MINUTES,
          limit: 100,
        })
      }
      if (Date.now() - started < budgetMs) {
        let cursor = await repo.getReconcileCursor('peticiones')
        for (let pageNumber = 0; pageNumber < RECONCILE_MAX_PAGES; pageNumber++) {
          if (Date.now() - started >= budgetMs) break
          const page = await blob.listPage({ prefix: 'peticiones/', cursor, limit: RECONCILE_PAGE_SIZE })
          const nextCursor = page.hasMore ? page.cursor : null
          reconciled += await repo.reconcileBlobPage(current, {
            checkpoint: 'peticiones', listedBlobs: page.blobs,
            staleMinutes: UPLOAD_STALE_MINUTES, expectedCursor: cursor, nextCursor,
          })
          cursor = nextCursor
          if (!page.hasMore) break
        }
      }
      return { expiredDrafts, reconciled, processed, skippedActive, failed, pending: await repo.countPendingCleanup() }
    },
  }
}
```

- [x] **Step 4: Implement transactional expiry, reconciliation and claim SQL**

Add `locked_at` and `lock_token` to both the expand migration and final schema. Add and seed the bounded-scan checkpoint:

```sql
CREATE TABLE IF NOT EXISTS peticion_cleanup_checkpoint (
  checkpoint_key TEXT PRIMARY KEY,
  cursor TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO peticion_cleanup_checkpoint (checkpoint_key, cursor)
VALUES ('peticiones', NULL)
ON CONFLICT (checkpoint_key) DO NOTHING;
```

Repository operations use these exact patterns:

```sql
WITH claimed AS (
  SELECT id
  FROM peticion_blob_cleanup
  WHERE completed_at IS NULL
    AND intentos < $1
    AND proximo_intento_at <= now()
    AND (locked_at IS NULL OR locked_at < $2)
  ORDER BY id
  FOR UPDATE SKIP LOCKED
  LIMIT $3
)
UPDATE peticion_blob_cleanup q
SET locked_at = now(), lock_token = $4, lock_generation = q.generation
FROM claimed
WHERE q.id = claimed.id
RETURNING q.*;

SELECT EXISTS (
  SELECT 1 FROM peticion_cotizaciones
  WHERE blob_pathname = $1 AND upload_status = 'valid'
) AS active;

UPDATE peticion_blob_cleanup
SET locked_at = NULL, lock_token = NULL, lock_generation = NULL
WHERE id = ANY($1::int[]) AND lock_token = $2 AND completed_at IS NULL;

WITH stale AS (
  SELECT id
  FROM peticion_cotizaciones
  WHERE upload_status IN ('pending', 'validating') AND updated_at < $1
  ORDER BY id
  FOR UPDATE SKIP LOCKED
  LIMIT $2
)
UPDATE peticion_cotizaciones c
SET upload_status = 'cleanup_pending', validation_error = 'La carga venció antes de validarse.', updated_at = now()
FROM stale
WHERE c.id = stale.id AND c.upload_status IN ('pending', 'validating')
RETURNING c.id, c.blob_pathname, c.expected_pathname;
```

`expireDrafts(now)` uses one serializable transaction: lock drafts whose `submitted_at IS NULL` and `draft_expires_at <= now`, enqueue both path columns, explicitly delete child rows, then delete the drafts. `reconcileStaleAttempts` reclama en una transacción los intentos con `upload_status IN ('pending', 'validating')` y `updated_at` anterior a 60 minutos aunque el objeto no exista: primero los cambia condicionalmente a `cleanup_pending`, después encola ambas rutas y solo entonces confirma. Así, un callback tardío ya no puede promover el mismo pathname a `valid` mientras el worker lo borra.

Después de procesar la cola existente, el servicio lee como máximo tres páginas de 250 objetos del prefijo privado `peticiones/`. `reconcileBlobPage` bloquea la fila de checkpoint, exige que su cursor coincida con `expectedCursor`, encola en la misma transacción objetos de más de 60 minutos sin vínculo y avanza a `nextCursor`; al terminar el prefijo guarda `NULL` para iniciar un nuevo barrido en la próxima ejecución. Nunca conserva `url` ni `downloadUrl` del resultado de Blob. Immediately before each destructive `del`, `isBlobPathActive(pathname)` checks for a current `upload_status = 'valid'` reference; an active path is marked complete with `active_reference` and never deleted. `completeCleanup` and `failCleanup` include `WHERE id = $id AND lock_token = $lockToken AND lock_generation = generation` and clear all three lock fields. `releaseCleanup` clears those fields only for the unprocessed ids with the matching token.

Re-enqueuing an existing pathname is a new cleanup obligation, not a continuation of a dead letter: the `ON CONFLICT` clause increments `generation`, sets `intentos = 0`, clears error and lock fields, reopens `completed_at` and schedules `proximo_intento_at = now()`. The generation fence makes a worker from the previous obligation unable to complete or fail the reopened row. Add the corresponding SQL to the repository method and retain the static test above.

- [x] **Step 5: Compose the runtime and protected cron route**

```js
// lib/peticion-cleanup-runtime.js
import { createPeticionCleanupService } from './peticion-cleanup.mjs'
import { peticionBlob, requireBlobToken } from './peticion-blob'
import { peticionesRepository } from './peticiones-repository'

export const peticionCleanupService = createPeticionCleanupService({
  repo: peticionesRepository,
  blob: { ...peticionBlob, assertConfigured: requireBlobToken },
})
```

```js
// app/api/cron/peticiones-cleanup/route.js
import { rechazoCron } from '../../../../lib/cron-auth.mjs'
import { peticionCleanupService } from '../../../../lib/peticion-cleanup-runtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request) {
  const rechazo = rechazoCron(request, process.env.CRON_SECRET)
  if (rechazo) return rechazo
  try {
    return Response.json({ ok: true, ...(await peticionCleanupService.run({ budgetMs: 260000 })) })
  } catch (error) {
    console.error('[peticiones-cleanup]', error)
    return Response.json({ error: 'La limpieza de peticiones falló.' }, { status: 500 })
  }
}
```

- [x] **Step 6: Configure schedule and environment documentation**

```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "outputDirectory": ".next",
  "crons": [
    { "path": "/api/cron/llenado", "schedule": "0 10 * * *" },
    { "path": "/api/cron/peticiones-cleanup", "schedule": "15 11 * * *" }
  ]
}
```

Add to `.env.example`, never with a real value:

```dotenv
# Token servidor del Blob Store PRIVADO conectado a este proyecto.
BLOB_READ_WRITE_TOKEN=""
# Solo desarrollo con túnel; permite que Vercel entregue onUploadCompleted.
VERCEL_BLOB_CALLBACK_URL=""
```

- [x] **Step 7: Run cleanup/schema/cron tests**

Run: `node --test test/peticion-cleanup.test.mjs test/peticiones-schema.test.mjs test/cron-auth.test.mjs`

Expected: PASS.

Run: `npm run build`

Expected: PASS without invoking the cron or requiring `CRON_SECRET` at build time.

Add `test/integration/peticiones-cleanup-race.integration.mjs` on `PETICIONES_TEST_DATABASE_URL`. Seed a stale `validating` quote with complete PDF metadata. On connection A, run the real repository reconciliation transaction so it locks the quote, changes it to `cleanup_pending` and enqueues its pathname; while A still holds the row, start the callback's exact conditional `markValid` on connection B. Commit A, then assert B returns zero rows, the quote remains `cleanup_pending` and the queue contains one generation. Invoke reconciliation a second time and assert it returns zero and does not increment that generation. This is the required callback-versus-cron race and idempotence test.

```bash
test -z "$PETICIONES_TEST_DATABASE_URL" || node --test test/integration/peticiones-cleanup-race.integration.mjs
```

Expected: PASS with two independent PostgreSQL connections, or `SKIPPED` when absent.

- [x] **Step 8: Commit**

```bash
git add lib/peticion-cleanup.mjs lib/peticion-cleanup-runtime.js lib/peticiones-repository.js app/api/cron/peticiones-cleanup/route.js db/schema.sql db/migrations/2026-08-21-peticiones-cotizaciones-expand.sql test/peticion-cleanup.test.mjs test/peticiones-schema.test.mjs test/integration/peticiones-cleanup-race.integration.mjs vercel.json .env.example
git commit -m "feat: limpiar blobs y borradores con cola durable"
```

---

### Task 8: Interfaz de comentario, petición y cotizaciones

**Files:**
- Create: `components/foda/PeticionesPanel.js`
- Create: `components/foda/ComentarioForm.js`
- Create: `components/foda/PeticionDraftForm.js`
- Create: `components/foda/CotizacionCard.js`
- Create: `components/foda/PeticionesList.js`
- Create: `test/foda-peticiones-ui.test.mjs`
- Modify: `app/centro/[id]/foda/page.js:1-10,35-102,171-216`
- Modify: `app/globals.css`

**Interfaces:**
- `PeticionesPanel({ centroId, anio, trimestre, onStatus })` owns loading, mode and refresh.
- `ComentarioForm({ disabled, centroId, anio, trimestre, onCreate, onStatus })` submits plain text.
- `PeticionDraftForm({ centroId, anio, trimestre, drafts, uploadsAvailable, onRefresh, onStatus })` manages category, description, 3–10 provider cards and final submit; it fails closed when private uploads are not configured.
- `CotizacionCard({ centroId, peticionId, quote, index, onValidated, onStatus })` prepares and uploads one PDF; it discards the returned Blob URL.
- `PeticionesList({ items, permissions, uploadsAvailable, onRefresh, onStatus })` renders legacy, comments and petitions; status controls depend on `permissions.canChangeStatus` and post-submit uploads fail closed with the same capability.

- [x] **Step 1: Write the failing static UI contract test**

```js
// test/foda-peticiones-ui.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('panel separa comentario y petición sin permisos desde localStorage', () => {
  const panel = read('../components/foda/PeticionesPanel.js')
  assert.match(panel, /Comentario/)
  assert.match(panel, /Petición/)
  assert.doesNotMatch(panel, /localStorage/)
})

test('tarjeta exige proveedor fiscal, certificaciones y PDF', () => {
  const card = read('../components/foda/CotizacionCard.js')
  for (const token of ['proveedorRazonSocial', 'proveedorPais', 'proveedorIdFiscal', 'empresaConstituida', 'emiteFacturaFiscal', 'application/pdf']) {
    assert.ok(card.includes(token), `falta ${token}`)
  }
  assert.match(card, /onUploadProgress/)
  assert.match(card, /getCotizacionUploadStatus/)
  assert.match(card, /discardCotizacionAttempt/)
  assert.match(card, /ISO_COUNTRY_CODES/)
  assert.match(card, /Intl\.DisplayNames/)
  assert.match(card, /<select[^>]+name="proveedorPais"/)
  assert.ok(card.indexOf('setCotizacionId(prepared.cotizacionId)') < card.indexOf('await upload('))
})

test('sin Blob se bloquea solo la creación documental y se explica la causa', () => {
  const panel = read('../components/foda/PeticionesPanel.js')
  const form = read('../components/foda/PeticionDraftForm.js')
  const list = read('../components/foda/PeticionesList.js')
  assert.match(panel, /uploadsAvailable/)
  assert.match(form, /uploadsAvailable/)
  assert.match(form, /Carga de cotizaciones no disponible/)
  assert.match(form, /const documentFormDisabled = !uploadsAvailable \|\| busy/)
  assert.match(form, /<fieldset[^>]*disabled=\{documentFormDisabled\}/)
  assert.match(list, /uploadsAvailable/)
})

test('lista marca legacy, descarga por id y no muestra borrado físico', () => {
  const list = read('../components/foda/PeticionesList.js')
  assert.match(list, /Anterior · sin requisitos documentales/)
  assert.match(list, /\/api\/peticiones\/cotizaciones\/\$\{quote\.id\}\/download/)
  assert.doesNotMatch(list, /deletePeticion/)
})

test('página FODA delega el panel y retira CRUD anterior', () => {
  const page = read('../app/centro/[id]/foda/page.js')
  assert.match(page, /<PeticionesPanel/)
  assert.doesNotMatch(page, /addPeticion|updatePeticion|deletePeticion/)
})
```

- [x] **Step 2: Run the UI contract test to verify it fails**

Run: `node --test test/foda-peticiones-ui.test.mjs`

Expected: FAIL because `components/foda/PeticionesPanel.js` does not exist.

- [x] **Step 3: Implement panel loading and the two-mode composer**

```js
// essential state/flow in components/foda/PeticionesPanel.js
'use client'
import { useCallback, useEffect, useState } from 'react'
import { listPeticiones } from '../../app/actions/peticiones'
import ComentarioForm from './ComentarioForm'
import PeticionDraftForm from './PeticionDraftForm'
import PeticionesList from './PeticionesList'

export default function PeticionesPanel({ centroId, anio, trimestre, onStatus }) {
  const [mode, setMode] = useState('comentario')
  const [data, setData] = useState({ items: [], drafts: [], permissions: { canChangeStatus: false }, capabilities: { uploadsAvailable: false } })
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    setLoading(true)
    const result = await listPeticiones(centroId, anio, trimestre)
    if (result?.error) onStatus(`Error: ${result.error}`)
    else setData(result)
    setLoading(false)
  }, [centroId, anio, trimestre, onStatus])
  useEffect(() => { refresh() }, [refresh])
  return (
    <section className="card foda-requests">
      <h3 className="panel__title">Comentarios y peticiones del administrador</h3>
      <div className="foda-request-tabs" role="tablist" aria-label="Tipo de registro">
        <button type="button" role="tab" aria-selected={mode === 'comentario'} onClick={() => setMode('comentario')}>Comentario</button>
        <button type="button" role="tab" aria-selected={mode === 'peticion'} onClick={() => setMode('peticion')}>Petición</button>
      </div>
      {mode === 'comentario'
        ? <ComentarioForm disabled={loading} centroId={centroId} anio={anio} trimestre={trimestre} onCreate={refresh} onStatus={onStatus} />
        : <PeticionDraftForm centroId={centroId} anio={anio} trimestre={trimestre} drafts={data.drafts} uploadsAvailable={data.capabilities.uploadsAvailable} onRefresh={refresh} onStatus={onStatus} />}
      <PeticionesList items={data.items} permissions={data.permissions} uploadsAvailable={data.capabilities.uploadsAvailable} centroId={centroId} onRefresh={refresh} onStatus={onStatus} />
    </section>
  )
}
```

`ComentarioForm` calls `createComentario`, clears text only after `{ ok: true }`, supports Ctrl/Cmd+Enter, and keeps the text after an error.

- [x] **Step 4: Implement provider cards and direct client upload**

```js
// upload function inside components/foda/CotizacionCard.js
import { useState } from 'react'
import { upload } from '@vercel/blob/client'
import { prepareCotizacionUpload, getCotizacionUploadStatus, discardCotizacionAttempt } from '../../app/actions/peticiones'

const [cotizacionId, setCotizacionId] = useState(quote?.id || null)

async function uploadQuote(file, values) {
  if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) throw new Error('Adjunta una cotización en PDF.')
  if (file.size < 1 || file.size > 10 * 1024 * 1024) throw new Error('El PDF debe pesar entre 1 byte y 10 MB.')
  const prepared = await prepareCotizacionUpload(centroId, {
    peticionId, cotizacionId, archivoNombre: file.name,
    proveedorRazonSocial: values.proveedorRazonSocial,
    proveedorPais: values.proveedorPais,
    proveedorIdFiscal: values.proveedorIdFiscal,
    empresaConstituida: values.empresaConstituida,
    emiteFacturaFiscal: values.emiteFacturaFiscal,
  })
  if (prepared?.error) throw new Error(prepared.error)
  setCotizacionId(prepared.cotizacionId)
  await upload(prepared.pathname, file, {
    access: 'private',
    handleUploadUrl: '/api/peticiones/cotizaciones/upload',
    contentType: 'application/pdf',
    clientPayload: JSON.stringify({
      peticionId, cotizacionId: prepared.cotizacionId,
      nonce: prepared.nonce,
    }),
    onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
  })
  for (let attempt = 0; attempt < 40; attempt++) {
    const state = await getCotizacionUploadStatus(centroId, peticionId, prepared.cotizacionId)
    if (state?.upload_status === 'valid') return state
    if (state?.upload_status === 'invalid') throw new Error(state.error || 'El PDF no pasó la validación.')
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error('El PDF sigue validándose. Recarga para consultar su estado.')
}
```

The JSX in `CotizacionCard` renders labeled controls for `proveedorRazonSocial`, `proveedorPais`, `proveedorIdFiscal`, `empresaConstituida`, `emiteFacturaFiscal`, `<input type="file" accept="application/pdf,.pdf">`, progress, success, retry and the specific error. `proveedorPais` is a required `<select name="proveedorPais">` populated only from `ISO_COUNTRY_CODES`; use `new Intl.DisplayNames(['es'], { type: 'region' })` for labels and keep `PA`/`VE` at the top. Never accept a free-text country. Disable upload until all supplier fields and both certifications are complete. Persist `prepared.cotizacionId` in component state before starting the network upload, so a failure retries that same row and consumes its next attempt instead of creating an orphan. A reloaded draft receives the same id through `quote.id` from the safe list projection. A `pending` or `invalid` row renders `Quitar intento`; it calls `discardCotizacionAttempt`, refreshes after `{ ok: true }`, and never appears on a valid row. A valid draft card may offer `Reemplazar antes de enviar`; a valid submitted card remains immutable.

- [x] **Step 5: Implement the draft form and final requirement gate**

`PeticionDraftForm` renders category codes through `PETICION_CATEGORIAS`, description, three initial `CotizacionCard` instances, `Agregar otra cotización` up to ten, `N de 3 cotizaciones válidas`, draft expiry and `Descartar borrador`. Before a draft exists, `createPeticionDraft` persists category/description. Existing active drafts show `Continuar`; a row returned with `expired: true` shows `Borrador vencido`, disables edit/upload/submit and leaves only `Descartar borrador`. The submit button calls `submitPeticion` and remains disabled until three distinct rows report `upload_status === 'valid'`. If `uploadsAvailable` is false, keep the Petición tab visible, show the operational message below, and disable the entire document form; the Comentario form and submitted list continue working.

Place every category, description, supplier-card and draft-action control inside one `<fieldset disabled={documentFormDisabled} aria-describedby="peticion-storage-status">`; keep the storage message outside that fieldset so assistive technology can announce it.

```jsx
const documentFormDisabled = !uploadsAvailable || busy

{!uploadsAvailable && (
  <p id="peticion-storage-status" className="form-error" role="alert">
    Carga de cotizaciones no disponible. Configura el almacenamiento privado antes de registrar una petición.
  </p>
)}

const validCount = quotes.filter((quote) => quote.upload_status === 'valid').length
const submitDisabled = !uploadsAvailable || busy || validCount < 3 || !description.trim() || !category
const requirementText = validCount < 3
  ? `Faltan ${3 - validCount} cotización${3 - validCount === 1 ? '' : 'es'} válida${3 - validCount === 1 ? '' : 's'}.`
  : 'Documentación mínima completa.'
```

Do not infer distinctness only in the browser: the server's `submitPeticion` remains authoritative and returns the duplicate-provider/PDF error if data changed concurrently.

- [x] **Step 6: Implement submitted list, permissions and downloads**

`PeticionesList` renders type, category label, status, date, provider count, and each valid filename as:

```jsx
<a className="btn" href={`/api/peticiones/cotizaciones/${quote.id}/download`}>
  Descargar {quote.archivo_nombre}
</a>
```

Rows with `tipo === 'legado'` display `Anterior · sin requisitos documentales` and a read-only description. Comments display editable text only when the row says `canEditText`. Status buttons render only when `permissions.canChangeStatus`; include `Anulada`. Submitted rows never render an `×` delete button. Open formal petitions render `Agregar cotización` only when the server returns `canAddQuote` and `uploadsAvailable` is true; when storage is unavailable, show the same operational warning without hiding downloads or history. Clicking it opens one blank `CotizacionCard` under that row, uploads through the same `prepareCotizacionUpload` flow with `cotizacionId: null`, and refreshes the row after validation. Valid cotizaciones already submitted never render replace/remove controls; pending or invalid post-submit attempts may retry the same `cotizacionId`.

- [x] **Step 7: Replace the monolithic FODA block and add responsive styles**

In `app/centro/[id]/foda/page.js`, remove peticiones state/CRUD functions and import/render:

```jsx
<PeticionesPanel
  centroId={params.id}
  anio={year}
  trimestre={quarter}
  onStatus={setStatus}
/>
```

Append focused classes to `app/globals.css`:

```css
.foda-requests { padding: 18px; margin-top: 16px; }
.foda-request-tabs { display: inline-flex; gap: 4px; padding: 4px; border: 1px solid var(--border); border-radius: var(--r-pill); background: var(--surface-2); }
.foda-request-tabs button[aria-selected="true"] { color: var(--text); background: var(--surface); border-color: var(--ts-green-line); }
.foda-quote-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.foda-quote-card { min-width: 0; padding: 14px; border: 1px solid var(--border); border-radius: var(--r-sm); background: var(--surface-2); }
.foda-quote-fields { display: grid; grid-template-columns: 1fr 110px; gap: 10px; }
.foda-request-row { padding: 14px; border: 1px solid var(--border); border-radius: var(--r-sm); background: var(--surface-2); }
@media (max-width: 960px) { .foda-quote-grid { grid-template-columns: 1fr; } }
@media (max-width: 620px) {
  .foda-requests { padding: 14px; }
  .foda-request-tabs { display: flex; width: 100%; }
  .foda-request-tabs button { flex: 1; min-height: 44px; }
  .foda-quote-fields { grid-template-columns: 1fr; }
}
```

- [x] **Step 8: Run UI contracts, complete suite and build**

Run: `node --test test/foda-peticiones-ui.test.mjs`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

Run: `npm run build`

Expected: PASS.

- [x] **Step 9: Commit**

```bash
git add components/foda 'app/centro/[id]/foda/page.js' app/globals.css test/foda-peticiones-ui.test.mjs
git commit -m "feat: agregar interfaz guiada de cotizaciones"
```

---

### Task 9: Documentación, verificación integral y gate de despliegue

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-08-21-peticiones-cotizaciones-foda-design.md`
- Modify: `docs/superpowers/plans/2026-08-21-peticiones-cotizaciones-foda.md`

**Interfaces:**
- Produces a documented rollout: test database → expand → env/store → deploy → smoke → contract.
- Does not execute migrations, create the Blob Store, change Vercel env or deploy production without Fernando's explicit approval.

- [x] **Step 1: Document local and preview setup**

Add to `README.md`:

```md
## Peticiones y cotizaciones privadas

Requisitos: Node 20+, Neon y un Vercel Blob Store privado conectado al proyecto.

Variables: `DATABASE_URL`, `SESSION_SECRET`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`; para probar callbacks locales mediante túnel, `VERCEL_BLOB_CALLBACK_URL`.

La migración de este módulo no usa `npm run db:migrate`. Primero corre el dry-run dedicado; solo una ventana de despliegue autorizada usa `--apply`:

    npm run db:migrate:peticiones -- --phase=expand
    npm run db:migrate:peticiones -- --phase=expand --apply
    npm run db:migrate:peticiones -- --phase=contract
    npm run db:migrate:peticiones -- --phase=contract --apply

Orden: respaldo de metadatos, dry-run, expansión, variables/Blob privado, despliegue, smoke de comentario/petición/descarga/estado/limpieza/legacy y, tras retirar instancias antiguas, contracción.
```

- [x] **Step 2: Run every deterministic local check**

Run: `node --version`

Expected: major version 20 or newer.

Run: `npm test`

Expected: every root `test/*.test.mjs` test PASS.

Run: `npm run build`

Expected: Next.js production build PASS without production secrets.

Run: `node --check scripts/migrate-peticiones-cotizaciones-2026-08-21.mjs`

Expected: exit 0.

Run: `git diff --check`

Expected: no output.

- [ ] **Step 3: Run the disposable-database integration gate when its explicit URL exists** — SKIPPED (sin PETICIONES_TEST_DATABASE_URL)

Run only with a disposable branch/database:

```bash
test -n "$PETICIONES_TEST_DATABASE_URL" && npm run test:peticiones:db
```

Expected: production-runner dry-run/rollback/expand/contract, FK, named constraints, two-submit serialization, callback-versus-terminal locking, cleanup claims and generation fencing all PASS on PostgreSQL real. Never substitute production `DATABASE_URL` into this command.

- [ ] **Step 4: Run browser smoke on a local/preview environment with test storage** — PENDIENTE (requiere preview con expand aplicado y Blob privado)

Start: `npm run dev`

Verify with the browser harness at desktop and 390px width, in light and dark themes:

1. A comment saves without category or files and preserves text on an error.
2. A petition cannot submit with zero, one or two valid PDFs.
3. Three different country+fiscal IDs with valid PDFs enable submit.
4. A repeated fiscal identity or repeated PDF is rejected without losing other valid cards.
5. A failed upload retries only its card.
6. Center administrator sees no status controls; supervisor/admin sees them and each transition persists after reload.
7. A PDF downloads through `/api/peticiones/cotizaciones/{id}/download`; direct private Blob URL is not displayed.
8. A legacy row remains visible and read-only with `Anterior · sin requisitos documentales`.
9. Discarded/expired drafts disappear and the cleanup route reports durable queue counters.
10. Inspect one test upload response only in the browser/network harness: its Blob hostname ends in `.private.blob.vercel-storage.com`; a direct GET from an incognito request without Blob credentials returns a non-2xx response, while the authenticated application download returns 200. Delete the test object through the durable cleanup flow.

Record screenshots or browser logs for each failed criterion. Treat criterion 10 as a production gate: a store with a public hostname or a successful anonymous direct GET blocks deploy/contract even if the application hides the URL. Do not mark the feature complete until every item passes.

- [x] **Step 5: Review spec coverage and static red flags**

Run:

```bash
rg -n "TB[D]|TO[D]O|implement lat[e]r|fill in deta[i]ls|similar to Tas[k]|Add appropriat[e]|add validatio[n]|handle edge case[s]" docs/superpowers/plans/2026-08-21-peticiones-cotizaciones-foda.md
```

Expected: no output.

Cross-check every spec acceptance criterion against Tasks 1–9: criteria 1–3 map to Tasks 2, 4, 5, 8; criterion 4 to Tasks 5–6; criteria 5–8 to Tasks 3–4 and 8; criteria 9–10 to Tasks 1, 5 and 7; criterion 11 to Tasks 3–4.

- [x] **Step 6: Commit documentation and verified plan state**

```bash
git add README.md package.json package-lock.json docs/superpowers/specs/2026-08-21-peticiones-cotizaciones-foda-design.md docs/superpowers/plans/2026-08-21-peticiones-cotizaciones-foda.md
git commit -m "docs: documentar rollout de cotizaciones privadas"
```

- [ ] **Step 7: Stop at the production gate**

Report local tests, build, disposable-database results and browser evidence. Request explicit approval before running the production dry-run/apply commands, creating or connecting the private Blob Store, changing Vercel environment variables, deploying, or executing the contract phase.
