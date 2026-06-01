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

## Pendientes conocidos

Estas pantallas todavía usan **datos de demostración** (no leen de la base):
`dashboard/ranking`, `dashboard/alertas`, `dashboard/reporte`. La página
`centro/[id]/foda` aún no persiste (guardado simulado). Conectarlas a Neon es el
siguiente paso natural.
