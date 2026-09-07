# ALOHA Master y bloqueo — plan de ejecución

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task.

**Goal:** Bloqueo temporal efectivo y roles Master/General separados.
**Architecture:** Estado vigente en PostgreSQL, capacidades puras compartidas, acciones revalidadas y UI por capacidad.
**Tech Stack:** Next 15.5.19, React 18, Neon PostgreSQL, jose, node:test.
**Spec:** docs/superpowers/specs/2026-09-07-master-access-design.md

## Restricciones
La petición autoriza implementar y aplicar el cambio. Conservar todos los datos y no enviar correos. No tocar copias hermanas. Fecha exacta de expiración 2026-09-10T05:00:00Z. Master único fperez@teamsolutionss.com. Coordinador conserva alcance.

Definición de terminado: General y `supervisor` leen todos los datos operativos de todos los centros pero no pueden provocar ningún cambio, administrar cuentas ni entrar a Puestos de la gente; Master conserva lectura/escritura global. Las únicas excepciones generales son login, logout, perfil y cambio de contraseña propia. La autorización se decide con la fila vigente de PostgreSQL; el JWT solo identifica `uid`.

### 1. Servidor y permisos (implementador backend)
Responsabilidad: lib/current-user.mjs, lib/auth.js, middleware.js, lib/usuarios*, app/actions/**, app/api/**, db/schema.sql, db/migrations/*master*, pruebas correspondientes.
- [ ] Generar y versionar una matriz exhaustiva de exports de `app/actions/**` y handlers de `app/api/**`: pública/cron, lectura, escritura, contraseña propia, Master u oficio. El gate falla si aparece un export nuevo sin clasificar o si una escritura usa guarda de lectura. Incluir los casos engañosos: progreso/vistas, encuestas, tokens de coach, growth briefing, uploads/downloads y OAuth Zoho.
- [ ] Sustituir autorización por claims: `getSession`/`requireSession` solo extraen `uid`; cada entrada protegida carga usuario, rol, centros, password y `blocked_until` vivos. `requireCurrentReadCentro`, `requireCurrentWriteCentro`, `requireCurrentMaster` y `requireCurrentOficio` expresan capacidades separadas; los nombres legacy no pueden seguir concediendo acceso con el JWT.
- [ ] Escribir regresiones funcionales que fallen primero: General consulta dashboard y cada centro pero no cambia metas/KPI/grupos/estudiantes/eventos/FODA/cumplimiento/encuestas/reservas/peticiones/centros/Zoho/usuarios/progreso; Master sí. Probar invocación directa de Server Actions y APIs, no solo botones ocultos.
- [ ] Añadir migración expand idempotente: `blocked_until`, auditoría append-only, restricción admin_master implica correo Fernando e índice único parcial. El código tolera las columnas ya expandidas; ningún código que las requiera se publica antes de ejecutar la expansión.
- [ ] Implementar login y carga vigente con `blocked_until > CURRENT_TIMESTAMP`; probar antes, igualdad exacta y después. Cuenta borrada, sin password, DB caída o bloqueada falla cerrada. `/login` no redirige por JWT solo y nunca forma bucle con una cookie vieja; `setPassword` no inicia sesión si el bloqueo sigue activo.
- [ ] Bloqueo/gestión de usuarios transaccional con actor/objetivo vigentes, protección Master y auditoría. Probar concurrencia de cambios de acceso; el resto de mutaciones consulta estado vigente en la entrada, sin refactor general de transacciones del negocio.
- [ ] Proteger cada URL `public/entrenamiento/**` con middleware de consulta viva o Route Handler y private/no-store. General fuera de oficio y guías of-*, bloqueados fuera de todos los audios. Retirar contenido textual del catálogo/glosario de los bundles públicos y servirlo por autorización de servidor.
- [ ] Cubrir páginas con layouts/guardas vivas y cada action/API con su guarda propia. Middleware consulta usuario vigente, no solo JWT. Ejecutar matriz de roles/fechas y guards antes de SQL, suite completa, build y documentar comando/salida/cobertura de exports.

### 2. Pantallas (implementador UI, después del contrato backend)
Responsabilidad: components/**, app/**/page.js, app/**/layout.js, cliente de usuarios, tests UI; no app/actions ni API.
- [ ] Master correctamente etiquetado; botones bloqueo/fecha/motivo y desbloqueo, sin autogestión peligrosa.
- [ ] General conserva lectura global operativa; consulta Usuarios sin acciones y centros/metas sin edición; no entra a Puestos de la gente ni inicia OAuth Zoho. En pantallas compartidas controles, formularios y atajos de escritura salen de capacidades del servidor. Las rutas directas mantienen el mismo resultado.
- [ ] Probar escritorio y 390px, errores, estados y sin acciones engañosas. Build.

### 3. Operación y comprobación (coordinador)
Responsabilidad: scripts/aplicar-master-access.mjs, docs/verification/2026-09-07-master-access.md, entorno y datos ficticios; memoria Hermes.
- [ ] Validación plan por gpt-5.6-sol; implementación gpt-5.5 xhigh y revisión independiente según disponibilidad.
- [ ] Preparar entorno ficticio y script transaccional de asignación de tres correos con dry-run por defecto. El preflight exige exactamente una fila por correo y los ids esperados; apply conserva hashes, ids, centros y progreso, fija Fernando Master, mantiene los otros dos General, fija bloqueo con `CURRENT_TIMESTAMP < '2026-09-10T05:00:00Z'`, escribe auditoría y relee todo antes de commit.
- [ ] Orden de rollout obligatorio: (1) ejecutar migración expand con la versión anterior aún compatible; (2) publicar código sobre el `main` vigente y esperar Vercel READY/SHA exacto; (3) ejecutar dry-run y apply de las tres cuentas; (4) verificar invariantes de Master único y cuentas bloqueadas. Si falla cualquier paso, no avanzar al siguiente.
- [ ] Revisar diff y gates: cero URL de audio de oficio accesible a General o cuentas bloqueadas, cero export autenticado sin clasificar, cero autorización por rol/centros del JWT y cero mutación permitida a General.
- [ ] Tras apply, verificar con cookie vieja: Vanessa y Frederick pierden páginas/action/API/audio de inmediato y login informa bloqueo sin bucle; Fernando entra como Master. Verificar General no bloqueado con lectura global y denegación en escrituras/oficio y listado de usuarios sin acciones. En el instante de expiración, confirmar desbloqueo automático sin UPDATE ni cron y conservar ambos roles General.
- [ ] Registrar evidencia y memoria, devolver estado real y fecha de desbloqueo.
