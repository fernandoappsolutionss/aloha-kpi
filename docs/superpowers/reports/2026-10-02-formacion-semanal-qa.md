# Formación semanal ALOHA — verificación del 2-oct-2026

## Estado de la entrega

Código revisado hasta `f085f69`; contenidos, integración y dos recorridos completos. La ampliación formativa aún no se publica: faltan 37 clips y su validación. Los guiones finales están en `docs/entrenamiento/audios-formacion-semanal-2026-10-02.md`.

La corrección independiente del panel sí está publicada: PR164, main `43ee696f544ac59df49e14cc0d85453cc947613c`, Vercel `dpl_DZfDkaRKLMzEJR7Y8JD5UhiXu4gr` READY, alias `aloha-kpi.vercel.app`, verificación autenticada Master.

## Verificación técnica

- Build final PASS con base PostgreSQL desechable.
- Suite completa: 1357 pruebas, 1354 PASS, 3 FAIL, 0 omitidas. Los tres fallos son inventarios de medios: faltan los nuevos clips de oficio, guía y recorridos. No se desactivaron pruebas para ocultarlos.
- Última corrección: 50/50 focalizadas PASS; revisión independiente final y re-revisión acotada Approved.
- Se preservaron IDs, firmas y audios históricos; no hay migraciones ni dependencias nuevas.
- Administradora guarda condición y plan y propone cuotas; coordinación aprueba cuotas. La lectura automática sigue fuera del alcance de administradora/asistente.
- La exigencia de visitar todos los pasos aplica solo a los dos recorridos nuevos; los recorridos históricos conservan sus omisiones legítimas.

## Navegador local con datos ficticios

- Panel Master: períodos por centro, estado de cálculo, cobertura y fuente mensual visibles. A 390 px no desborda el viewport.
- Administradora: 14 recorridos, 26 módulos históricos estudiados y 3 nuevos pendientes. Lectura visual de nueve gráficas de ejemplo y tablas de valores, con casos de dato faltante, semana provisional y cuota propuesta/aprobada.
- Recorrido de gráficas: cinco pasos encontrados, finalización guardada y cuestionario 3/3 registrado; interfaz muestra completado.
- Recorrido de condición/plan/cuotas: seis pasos encontrados y finalización guardada. Ningún paso escribe condiciones, objetivos o cuotas de ensayo.
- Asistente: 13 recorridos, actualización de tres módulos pendiente; acceso directo a `semana-plan` muestra que no está disponible para su puesto.
- Coach: navegación propia de Mis grupos y Entrenamiento, dos lecciones comunes y práctica de coach; 27 módulos históricos preservados, tres nuevos pendientes. No recibe enlaces administrativos de Semana.
- Coordinador: dos lecciones comunes y práctica de revisión/aprobación/reconocimiento; 25 módulos históricos preservados, tres nuevos pendientes.
- Las pruebas de progreso y firma se hicieron solo en `aloha_audit`, con usuarios ficticios. No se certificó ni modificó formación de empleados reales.

## Pendiente antes de publicar formación

1. Autorización específica para enviar los guiones didácticos a ElevenLabs. La revisión automática rechazó el intento antes de ejecutarlo; no se reintentó por otra vía.
2. Generar 6 introducciones, 18 guías y 13 clips de recorridos con las voces existentes.
3. Decodificar los 37 MP3, verificar hashes/duración, servicio autenticado y reproducción de muestra; conservar medios anteriores.
4. Repetir suite y build con los medios, cerrar PR y comprobar despliegue autenticado. Los audios históricos se conservan; la actualización se señala por separado aunque una voz anterior describa el final del plan previo.

No confundir este pendiente con los 20 audios de la entrega anterior: esos ya están publicados y no requieren regeneración.
