# ALOHA KPI Dashboard

Panel de seguimiento de KPIs para los centros ALOHA Mental Arithmetic (Panamá).
Construido con **Next.js 14** (App Router) y **Neon** (PostgreSQL serverless).

## Arquitectura

- **Base de datos:** Neon (PostgreSQL). El acceso se hace desde el servidor con
  el driver `@neondatabase/serverless`.
- **Backend:** Server Actions en `app/actions/*` (no hay llamadas a la base de
  datos desde el navegador). Todas las consultas van parametrizadas.
- **Autenticación:** propia, con contraseñas hasheadas (`bcryptjs`) y sesión en
  una cookie HttpOnly firmada (JWT con `jose`). Ver `lib/auth.js`.
- **Protección de rutas:** `middleware.js` valida la sesión en el Edge antes de
  servir `/dashboard/*`, `/centro/*` y `/perfil`. El rol viaja firmado en el
  token (ya **no** se confía en `localStorage` para el control de acceso).

## Puesta en marcha (local)

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Crear la base de datos en Neon**
   - Crea un proyecto en https://neon.tech
   - Copia la cadena de conexión **Pooled** (Connection Details → "Pooled connection").

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env.local
   ```
   Edita `.env.local`:
   - `DATABASE_URL` → tu cadena pooled de Neon
   - `SESSION_SECRET` → genera uno con `openssl rand -base64 32`

4. **Crear las tablas** (una sola vez). En el SQL Editor de Neon pega el
   contenido de `db/schema.sql`, o desde tu terminal:
   ```bash
   psql "$DATABASE_URL" -f db/schema.sql
   ```

5. **Sembrar datos iniciales** (admin + 9 centros + metas Q1):
   ```bash
   npm run db:seed
   ```
   Crea un admin con las credenciales de `.env.local`
   (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, por defecto
   `admin@aloha.com` / `aloha2026`). **Cámbiala** desde *Mi perfil* tras entrar.

6. **Arrancar**
   ```bash
   npm run dev
   ```

## Despliegue en Vercel

Configura en el proyecto de Vercel (Settings → Environment Variables):

- `DATABASE_URL` — cadena pooled de Neon
- `SESSION_SECRET` — el mismo secreto largo y aleatorio

El esquema (`db/schema.sql`) y el seed se ejecutan una sola vez contra Neon;
no forman parte del build.

## Peticiones y cotizaciones privadas

Requisitos: Node 20+, Neon y un Vercel Blob Store privado conectado al proyecto.

Variables: `DATABASE_URL`, `SESSION_SECRET`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`; para probar callbacks locales mediante túnel, `VERCEL_BLOB_CALLBACK_URL`.

La migración de este módulo no usa `npm run db:migrate`. Primero corre el dry-run dedicado; solo una ventana de despliegue autorizada usa `--apply`:

    npm run db:migrate:peticiones -- --phase=expand
    npm run db:migrate:peticiones -- --phase=expand --apply
    npm run db:migrate:peticiones -- --phase=contract
    npm run db:migrate:peticiones -- --phase=contract --apply

Orden: respaldo de metadatos, dry-run, expansión, variables/Blob privado, despliegue, smoke de comentario/petición/descarga/estado/limpieza/legacy y, tras retirar instancias antiguas, contracción.

## Esquema de datos

| Tabla | Descripción |
|-------|-------------|
| `centros` | Sucursales |
| `usuarios` | Cuentas (email + `password_hash`, rol, centro) |
| `metas` | Metas globales por trimestre |
| `mes_kpi` | Estado del mes por centro (abierto/cerrado) |
| `resumen_mes` | Resumen mensual (niños, grupos, clase de prueba, motivos, origen) |
| `kpi_semanas` | KPI semanal (cobranza/deserción/ingresos por día) |
| `trimestres` | Agrupador para el checklist de cumplimiento |
| `cumplimiento` | Checklist mensual (sí/no) |
| `foda` | FODA trimestral por centro (oportunidades, amenazas, comentarios, estado) |
| `conciliacion_cuentas` | Mapeo centro ↔ organización y cuenta bancaria de Zoho |
| `conciliacion_reglas` | Reglas de auto-clasificación por descripción |
| `conciliacion_lotes` | Cada extracto bancario cargado |
| `conciliacion_movimientos` | Línea del extracto, su estado y su asiento en Zoho |

## Conciliación bancaria con Zoho Books

Permite adjuntar el CSV de movimientos que exporta la banca en línea y
registrarlos en la cuenta bancaria de Zoho Books del centro. Vive en
`/dashboard/conciliacion` (admin, todas las cuentas) y en
`/centro/{id}/conciliacion` (cada centro, solo la suya).

Variables: `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN` y
`ZOHO_DC` (ver `.env.example` para cómo generarlas). Sin ellas el módulo lee el
archivo pero no compara ni registra nada.

Migración (dry-run primero; `--apply` solo en una ventana autorizada):

    npm run db:migrate:conciliacion
    npm run db:migrate:conciliacion -- --apply

Puesta en marcha, una vez por cuenta bancaria:

1. **Conciliación → Cuentas y centros** (admin): elige la organización de Zoho,
   la cuenta bancaria y el centro al que pertenece. Una cuenta sin centro es
   corporativa y solo la ve un admin. Cada cuenta de Zoho se asigna una sola vez.
2. Define las **cuentas puente** de entradas y salidas: ahí cae lo que ninguna
   regla clasifique. Sin puente, esos movimientos quedan "sin cuenta" y no se
   pueden registrar hasta asignárselas a mano.
3. **Reglas de clasificación**: `ACH NOMINA` → *Sueldos*, `COLEGIATURA` →
   *Ingresos por colegiatura*… Gana la de mayor prioridad y, a igualdad, la más
   específica. Un usuario de centro crea reglas para su cuenta; solo un admin
   crea reglas para toda la organización.
4. **Conciliar**: se adjunta el CSV, se revisa la tabla y se pulsa *Registrar en
   Zoho*.

Cómo evita registrar dos veces lo mismo:

- Cada línea del extracto lleva una **huella** (fecha, monto, dirección,
  referencia y descripción, más el número de ocurrencia). Volver a subir el
  mismo archivo marca todo como *ya importado* — pero dos pagos idénticos del
  mismo día siguen siendo dos movimientos distintos.
- Antes de registrar se consulta **qué tiene ya Zoho** en esa cuenta y ese
  rango de fechas (± la tolerancia de la cuenta, 3 días por defecto). Lo que ya
  está se marca *Ya en Zoho* y no se vuelve a crear.
- Un índice único parcial impide que la misma línea quede publicada dos veces
  en la misma cuenta, y el candado se cierra **antes** de llamar a Zoho.

Si una tanda se corta (Zoho limita a ~100 llamadas por minuto, y la función
serverless tiene su propio tope), el botón informa cuántos quedaron pendientes
y se continúa pulsando de nuevo. *Volver a conciliar* es además la vía de
recuperación: vuelve a mirar Zoho y resuelve las filas que quedaron a medias.

## Notas

- `dashboard/ranking`, `dashboard/alertas` y `dashboard/reporte` se calculan
  desde los datos reales (Q1 2026) vía `getCentrosKpi()`.
- El FODA persiste oportunidades, amenazas, comentarios y estado. Las
  **fortalezas/debilidades** se muestran todavía como lista ilustrativa fija;
  derivarlas automáticamente del checklist de cumplimiento es el siguiente paso.
- Si ya habías ejecutado `db/schema.sql` antes de esta versión, vuelve a
  ejecutarlo (es idempotente) para crear la nueva tabla `foda`.
