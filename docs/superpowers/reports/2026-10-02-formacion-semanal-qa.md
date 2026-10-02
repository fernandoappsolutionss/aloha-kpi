# Formación semanal ALOHA — verificación del 2-oct-2026

## Estado de la entrega

Código de formación revisado hasta `f085f69`; contenidos, integración y dos recorridos completos. El 2-oct se generaron los 37 clips autorizados en `5b20e74`, conservando todas las entradas históricas de los manifests. Los 37 MP3 decodifican completos (15,8 minutos). La corrección de cohortes se integró en `477c869`, con revisión independiente aprobada. Publicación en curso. Los guiones finales están en `docs/entrenamiento/audios-formacion-semanal-2026-10-02.md`.

La corrección independiente del panel sí está publicada: PR164, main `43ee696f544ac59df49e14cc0d85453cc947613c`, Vercel `dpl_DZfDkaRKLMzEJR7Y8JD5UhiXu4gr` READY, alias `aloha-kpi.vercel.app`, verificación autenticada Master.

## Verificación técnica

- Build final PASS con base PostgreSQL desechable.
- Suite final con medios y cohortes: 1361 pruebas, 1361 PASS, 0 FAIL, 0 omitidas. Build PASS. Los tres fallos anteriores por medios faltantes quedaron resueltos al generar los clips; no se desactivaron pruebas.
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

## Audios y publicación

- Autorización de Fernando para completar y publicar recibida el 2-oct. Se usó ElevenLabs con las voces existentes, enviando solo guiones didácticos.
- 6 introducciones, 18 guías y 13 clips de recorridos generados; hashes y cobertura comprobados por la suite.
- Todos los MP3 decodifican y sus manifests históricos permanecen idénticos a `172fa8e`.
- Navegador local autenticado: audio de presentación de gráficas carga con duración39,8s, reproducción avanza por17,2s, readyState4, error nulo. Prueba pausada al terminar.
- No migraciones ni certificaciones de empleados reales. La práctica se valida y firma por el jefe entrenador.
- Los20audios de la entrega anterior permanecen publicados e intactos.

## Corrección de crecimiento

Matrículas de las clases del mes y ventas del mes son cohortes distintas. La fuente conserva la primera para conversión; las ventas directas se obtienen de clasificación comercial completa, nunca por resta entre cohortes. Sin cobertura, no se inventa cero ni una proyección de invitaciones. Los avisos de apertura de grupo distinguen inicio individual del alumno e itinerario.

PR165: pendiente de comprobación del despliegue final.
