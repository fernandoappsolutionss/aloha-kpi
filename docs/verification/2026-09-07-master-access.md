# Verificación Master / acceso temporal

- Base: `3157af4`, 1.079 pruebas aprobadas.
- Entorno: PostgreSQL17 local desechable, ocho cuentas ficticias, dos centros, transportes Neon HTTP/WebSocket locales. Sin correos reales ni datos productivos de prueba.
- Fecha autorizada: bloqueo hasta 2026-09-10T05:00:00Z, equivalente jueves10-sep00:00 Panamá.

## Gates
- Bootstrap transaccional: 7/7 GREEN, con RED previo de operación ausente, invalidación de tokens y reloj de BD. Dry-run intacto; solo tres identidades; hashes conservados; idempotencia; rechazo de identidad cambiada/fecha vencida; invalidación de enlaces pendientes de las dos cuentas; reloj PostgreSQL prevalece; fallo intermedio revierte promoción, bloqueo, tokens y auditoría. Comando `node --env-file=.env.local --test test/integration/master-bootstrap.integration.mjs`.
- HTTP real: script `scripts/verify-master-access-http.mjs`. RED inicial confirmado: General aún recibía `capabilities.createUser=true`. Lectura de7rutas y listado global funcionó en baseline. Gate final pendiente.
- Revisión independiente de núcleo auth: P1 de compatibilidad `id` sin `uid` corregido y confirmado por revisor; sesión viva conserva ambos. P2 de reloj local del bootstrap corregido: preflight con `clock_timestamp()` y verificación de bloqueo efectivo antes del commit.
- Revisión final, build, Chrome y producción: pendientes.

## Decisiones de alcance
- General conserva listado de usuarios para lectura; sin crear, editar, borrar, reset ni bloqueo. Responde al pedido de lectura global y evita retirar información no solicitada.
- MP3 pueden conservarse en ubicación actual si todas sus URLs pasan por autorización viva PostgreSQL y private/no-store. El controlador HTTP de Neon funciona en Edge según [documentación oficial](https://neon.com/docs/serverless/serverless-driver). El catálogo textual se entrega autorizado desde servidor, sin prosa en chunks públicos.
- El bloqueo corta peticiones posteriores. Operaciones de negocio ya autorizadas pueden finalizar; gestión/bloqueos de usuarios sí mantienen revalidación y locks transaccionales.
- La expansión permite Fernando todavía General; restricción unidireccional Master implica su correo y unicidad. Evitar equivalencia bidireccional antes de promover la cuenta.
- El primer validador adicional gpt-5.6-sol quedó sin cuota y no entregó informe. Tras la instrucción de Fernando «termina», la revisión independiente disponible validó el contrato; la implementación continúa sin detenerse por esa cuota.
