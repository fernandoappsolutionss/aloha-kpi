# Ayudas de Cumplimiento

Cada uno de los 33 criterios abre una ficha dentro de la pantalla: dos acciones, ejemplo práctico, dos errores que evitar, evidencia y audio. Solo hay una ficha abierta a la vez. Consultar o cerrar la ficha no cambia respuestas ni guarda el checklist.

## Fuentes y alcance

- `lib/cumplimiento-ayuda.mjs` contiene las 30 actividades y las 3 metas calculadas.
- Asistencia, calendario, portafolios, retroalimentación, clase de padres, comunicación y reuniones se apoyan en los cursos locales de Administradora y Coach (`docs/entrenamiento/fuente/`). Cada ficha identifica la sección. Los ejemplos ilustran su aplicación.
- Las otras actividades incluyen orientación operativa del checklist, identificada como tal. No se agregan metas numéricas ni frecuencias obligatorias que no estén en el manual.
- Ventas, deserción y cobranza remiten a la meta visible y a los datos de origen. Las ayudas no cambian los cálculos ni sus permisos.
- Encuesta de familias: desde septiembre de 2026 exige difusión registrada y participación de 30% o más del corte, por decisión del 12 de septiembre de 2026. El ejemplo 148 → 45 no pretende representar el padrón real de ninguna sede.
- Encuesta del equipo: se explica el requisito indicado por Dirección (semestral, anónima, supervisor inmediato, 100% en un trimestre) y se advierte que aún no está implementada. El calendario continúa pendiente. No se incorporan respuestas, permisos ni automatización del equipo en este cambio.

## Entrenamiento y audio

Se agrega el módulo 11, **Cumplimiento: del criterio a la acción**, con cinco pasos y tres preguntas corregidas en el servidor. La única acción práctica abre la ayuda de asistencia. Recargar el cuarto paso o saltarse el paso práctico deja visible el ejemplo sin tocar las respuestas.

Los guiones nuevos son 33 fichas y 6 clips del módulo (introducción y pasos), con frases cortas y pausas de 0,3–0,5 segundos. El generador incremental usa la receta del clon disponible aprobado y conserva los ocho clips previos del mismo catálogo. El resto de grabaciones publicadas permanece intacto.

Las 39 grabaciones están incorporadas y verificadas: 921 segundos en total, entre 15 y 34 segundos por clip. El reproductor carga al pulsar reproducir y se pausa al cerrar la ficha o cambiar a otra. Ese fue el inventario inicial. El cambio del 12 de septiembre retira temporalmente la locución cu-5 y la ayuda encuestas_satisfaccion: enseñaban la meta anterior. Sus guiones escritos ya indican 30% o más y sus MP3 conservan hashes reales, con reproducción deshabilitada hasta regenerarlos junto con tres clips de Encuestas.

`npm run entrenamiento:audio:actualizaciones` muestra el inventario sin realizar solicitudes. `-- --generar` genera solamente archivos nuevos o desactualizados; requiere autorización para enviar esos guiones a ElevenLabs. Los MP3 se decodifican antes de incorporarlos al manifiesto. La prueba de cobertura exige hashes y archivos vigentes para todas las locuciones disponibles. Para las cinco retiradas por el cambio de meta, exige su identificación explícita, conserva el hash real anterior y comprueba que no puedan reproducirse. No se omiten las pruebas ni se hace pasar el MP3 anterior por el guion nuevo.

## Verificación

- La prueba de catálogo exige ayuda completa para cada clave vigente.
- Las pruebas de entrenamiento comprueban los destinos, la acción práctica permitida y las respuestas del servidor.
- La prueba de audio exige guion, hash, archivo, duración y clon coincidentes.
- Revisión en Chrome con centro ficticio: apertura de las 33 fichas, una sola visible, respuestas intactas; cierre devuelve el foco; lectura a 390 px; cinco pasos y quiz 3/3.
- Las ayudas originales no requirieron migración. El cambio de umbral a 30% usa `db/migrations/2026-09-12-encuestas-30.sql`, descrita en `docs/encuestas-satisfaccion.md`.
- Suite completa: 1.056 pruebas correctas; compilación de producción correcta.
