# Master y acceso temporal de ALOHA

Pedido autorizado por Fernando el 7-sep-2026 sobre aloha-kpi.vercel.app.

## Contrato
- fperez@teamsolutionss.com es el único Administrador Master (`admin_master`). Conservar identidad, contraseña, progreso y centros; acceso global y exclusivo a bloquear/desbloquear. Ningún formulario permite otorgar Master ni modificar/eliminar/bloquear a Fernando.
- `admin_general` (incluido alias legacy `supervisor`) conserva lectura global de datos operativos, sin mutaciones operativas, gestión de usuarios ni catálogo/contenido/audio de Puestos de la gente. Puede cambiar su propia contraseña y consultar datos/indicadores; ningún reset ajeno. El listado de usuarios sigue visible solo para consulta; ninguna action permite modificar cuentas, crear enlaces o enviar resets ajenos. Mantener permisos operativos de coordinadoras/administradoras/asistentes/coach.
- Bloquear vcampos@alohapanama.com y froberts@alohapanama.com desde la aplicación del cambio hasta 2026-09-10T00:00:00-05:00 (jueves, después del miércoles, Panamá). Siguen siendo General. Vencimiento automático por comparación de fecha en servidor, sin depender de automatización externa.
- Corte efectivo también con cookies viejas: el JWT firmado aporta solo `uid`; rol, centros, existencia de contraseña y bloqueo se leen de PostgreSQL en cada entrada protegida. Proteger rutas, APIs, acciones y archivos de entrenamiento. Evitar bucles login y fallar cerrado si DB falla. Sesiones válidas pueden exigir nuevo login tras bloqueo; no rotar contraseñas.
- UI Usuarios: Master ve estado/fecha y acción bloquear/desbloquear, elige fecha/hora Panamá y motivo. Rechazar pasado, valores inválidos y auto-bloqueo. General puede consultar listado si se conserva menú, sin botones de gestión. Master no asignable y protegido contra elevación por correo/rol.
- Auditoría persistente de actor, objetivo, fecha anterior/nueva y motivo. Migración expand idempotente; asignación productiva de las tres cuentas en transacción con verificación exacta; no eliminar datos, enviar correos ni avisos.
- Verificación: pruebas de fechas antes/exacto/después, revocación con cookie antigua, matriz roles, acciones reales antes de SQL, todos los accesos oficio (SOP, glosario, audio, centro/dashboard), UI escritorio/móvil, build, revisión independiente, deployment y aplicación productiva de cuentas con comprobación.

## Semántica cerrada de autorización

| Capacidad | Master | General / `supervisor` | Coordinador y puestos de centro |
|---|---:|---:|---:|
| Leer datos operativos de todos los centros | Sí | Sí | Solo alcance vigente |
| Escribir metas, KPI, grupos, estudiantes, eventos, FODA, cumplimiento, encuestas, reservas, peticiones o configuración | Sí | No | Conserva reglas actuales por rol/centro |
| Gestionar centros, usuarios, resets ajenos y conexión Zoho | Sí | No | Coordinador conserva solo usuarios operativos de sus centros; lo demás no |
| Ver o actuar en Puestos de la gente: planes, progreso, firmas, SOP, glosario y sus MP3 | Sí | No | Conserva reglas actuales |
| Cambiar la contraseña propia | Sí | Sí | Sí |

Una operación se clasifica por su efecto, no por su nombre ni por el botón que la llama. Contar una vista, marcar recorrido/progreso, preparar o registrar una encuesta, generar un token/link, subir/descartar un archivo, cambiar estado y conectar OAuth son escrituras. Ocultar controles es solo presentación: la guarda vive en servidor.

`blocked_until > CURRENT_TIMESTAMP` significa bloqueado; en el instante exacto y después está desbloqueado. Una cuenta bloqueada no puede iniciar sesión ni usar una cookie anterior en páginas, actions, APIs o audio. `logout` permanece disponible y `/login` no puede redirigir basándose solo en la cookie: una sesión bloqueada o borrada debe terminar en login sin rebote. Restablecer contraseña nunca puede crear una sesión de una cuenta todavía bloqueada.

## Persistencia e invariantes

- `usuarios.blocked_until TIMESTAMPTZ NULL` y una tabla append-only de auditoría guardan actor, objetivo, `blocked_until` anterior/nuevo, motivo obligatorio y fecha de BD.
- La base impone que `rol='admin_master'` solo pueda pertenecer al correo normalizado `fperez@teamsolutionss.com`, además de un índice único parcial para un solo Master. La expansión admite temporalmente el rol anterior de Fernando hasta que el bootstrap lo promueva; no agregar una equivalencia bidireccional antes de esa asignación. Las guardas de aplicación repiten la protección. `admin_master` nunca aparece entre roles asignables.
- Bloquear, desbloquear, editar o eliminar usuario bloquea actor y objetivo dentro de una transacción con control de concurrencia. Las otras acciones comprueban el actor vigente antes de autorizar cada operación. El bloqueo corta las peticiones siguientes; una operación ya autorizada/en curso puede finalizar. No se reestructura toda la transaccionalidad del negocio en este cambio.
- La lectura global de General usa el usuario y alcance frescos, no `rol`/`centros` del JWT. El alias `supervisor` tiene exactamente las capacidades de General y nunca las de Master.

## Audio y contenido de oficio

Los MP3 se autorizan con usuario vigente y `Cache-Control: private, no-store` antes de servirlos. Es válido conservar archivos en `public/entrenamiento` si un middleware con consulta HTTP viva a PostgreSQL intercepta todas las URLs, rechaza sesión bloqueada y no deja rutas alternativas sin protección. General queda fuera de `oficio/**` y `guia/of-*/**`; las páginas, SOP, glosario y acciones aplican la misma regla. El contenido textual de los cursos se entrega desde servidor autorizado y no puede quedar empaquetado en chunks JavaScript públicos. No se regeneran audios existentes.

## Implementación
1. Ampliar usuarios con `blocked_until` y auditoría; agregar únicamente restricciones compatibles con Fernando todavía General y promoverlo tras desplegar código compatible. Fuente permisos lib/current-user.mjs; auth.js relee rol/estado, uid compatible.
2. Separar guardas vivas de lectura global, escritura por centro y Master. Migrar cada export autenticado de `app/actions/**` y cada handler de `app/api/**` según una matriz versionada; no dejar `requireSession`, `requireCentroAccess`, `requireAdmin`, `getSession` o `isAdminRole` como autorización basada en claims viejos.
3. Las páginas y archivos privados pasan por middleware/guardas con usuario vigente de PostgreSQL. Actions y APIs validan otra vez; el JWT solo sirve para identificar la cuenta.
4. El servicio de usuarios conserva revalidación y locks, añade bloqueo exclusivo, auditoría y protección Master. Cada mutación de dominio valida el actor vigente al entrar.
5. UI usa capacidades del servidor, retira acciones de escritura para General, muestra rol Master y exclusión oficio en todos los menús. Mantener lectura global sin errores de permiso al cargar.

Decisión comunicada: se excluye a General del árbol completo de Puestos de la gente, no se inventa un puesto formativo propio. Hora de desbloqueo comunicada como Panamá.
