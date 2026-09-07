# Verificación Master / acceso temporal

- Base: `3157af4`, 1.079 pruebas aprobadas.
- Entorno: PostgreSQL17 local desechable, ocho cuentas ficticias, dos centros, transportes Neon HTTP/WebSocket locales. Sin correos reales ni datos productivos de prueba.
- Fecha autorizada: bloqueo hasta 2026-09-10T05:00:00Z, equivalente jueves10-sep00:00 Panamá.

## Gates
- Bootstrap transaccional: 7/7 GREEN, con RED previo de operación ausente, invalidación de tokens y reloj de BD. Dry-run intacto; solo tres identidades; hashes conservados; idempotencia; rechazo de identidad cambiada/fecha vencida; invalidación de enlaces pendientes de las dos cuentas; reloj PostgreSQL prevalece; fallo intermedio revierte promoción, bloqueo, tokens y auditoría. Comando `node --env-file=.env.local --test test/integration/master-bootstrap.integration.mjs`.
- HTTP real: 53/53 aprobadas en build productivo local mediante `scripts/verify-master-access-http.mjs`. Lectura global, denegación de escrituras sin cambios en diez tablas, catálogo y audios protegidos (incluidas rutas codificadas), bloqueo de sesiones existentes, desbloqueo por vencimiento y facultades exclusivas de Master.
- Revisión independiente de núcleo auth: P1 de compatibilidad `id` sin `uid` corregido y confirmado por revisor; sesión viva conserva ambos. P2 de reloj local del bootstrap corregido: preflight con `clock_timestamp()` y verificación de bloqueo efectivo antes del commit.
- Suite final tras integrar PR136 de proveedores: 1.112/1.112 aprobadas; build Next productivo aprobado. Integración de base de datos: 8/8 (bootstrap y expansión).
- Revisión independiente final: sin hallazgos pendientes. Se conserva el proveedor preaprobado y el cambio de estado de peticiones para Master y coordinador del centro; General permanece en lectura y solo Master elimina.
- Producción: expansión aplicada sin cambiar roles; promoción y bloqueo pendientes hasta que Vercel publique esta versión. Verificación posterior de solo lectura mediante `scripts/verify-master-access-production.mjs`.

## Decisiones de alcance
- General conserva listado de usuarios para lectura; sin crear, editar, borrar, reset ni bloqueo. Responde al pedido de lectura global y evita retirar información no solicitada.
- MP3 pueden conservarse en ubicación actual si todas sus URLs pasan por autorización viva PostgreSQL y private/no-store. El controlador HTTP de Neon funciona en Edge según [documentación oficial](https://neon.com/docs/serverless/serverless-driver). El catálogo textual se entrega autorizado desde servidor, sin prosa en chunks públicos.
- El bloqueo corta peticiones posteriores. Operaciones de negocio ya autorizadas pueden finalizar; gestión/bloqueos de usuarios sí mantienen revalidación y locks transaccionales.
- La expansión permite Fernando todavía General; restricción unidireccional Master implica su correo y unicidad. Evitar equivalencia bidireccional antes de promover la cuenta.
- El primer validador adicional gpt-5.6-sol quedó sin cuota y no entregó informe. Tras la instrucción de Fernando «termina», la revisión independiente disponible validó el contrato; la implementación continúa sin detenerse por esa cuota.
