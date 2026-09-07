# Ayudas de Cumplimiento

Cada uno de los 33 criterios abre una ficha dentro de la pantalla: dos acciones, ejemplo práctico, dos errores que evitar, evidencia y audio. Solo hay una ficha abierta a la vez. Consultar o cerrar la ficha no cambia respuestas ni guarda el checklist.

## Fuentes y alcance

- `lib/cumplimiento-ayuda.mjs` contiene las 30 actividades y las 3 metas calculadas.
- Asistencia, calendario, portafolios, retroalimentación, clase de padres, comunicación y reuniones se apoyan en los cursos locales de Administradora y Coach (`docs/entrenamiento/fuente/`). Cada ficha identifica la sección. Los ejemplos ilustran su aplicación.
- Las otras actividades incluyen orientación operativa del checklist, identificada como tal. No se agregan metas numéricas ni frecuencias obligatorias que no estén en el manual.
- Ventas, deserción y cobranza remiten a la meta visible y a los datos de origen. Las ayudas no cambian los cálculos ni sus permisos.
- Encuesta de familias: desde septiembre de 2026 exige difusión registrada y participación estrictamente superior al 50% del corte. El ejemplo 148 → 75 no pretende representar el padrón real de ninguna sede.
- Encuesta del equipo: se explica el requisito indicado por Dirección (semestral, anónima, supervisor inmediato, 100% en un trimestre) y se advierte que aún no está implementada. El calendario continúa pendiente. No se incorporan respuestas, permisos ni automatización del equipo en este cambio.

## Entrenamiento y audio

Se agrega el módulo 11, **Cumplimiento: del criterio a la acción**, con cinco pasos y tres preguntas corregidas en el servidor. La única acción práctica abre la ayuda de asistencia. Recargar el cuarto paso o saltarse el paso práctico deja visible el ejemplo sin tocar las respuestas.

Los guiones nuevos son 33 fichas y 6 clips del módulo (introducción y pasos), con frases cortas y pausas de 0,3–0,5 segundos. El generador incremental usa la receta del clon disponible aprobado y conserva los ocho clips previos del mismo catálogo. El resto de grabaciones publicadas permanece intacto.

`npm run entrenamiento:audio:actualizaciones` muestra el inventario sin realizar solicitudes. `-- --generar` genera solamente archivos nuevos o desactualizados; requiere autorización para enviar esos guiones a ElevenLabs. Los MP3 se decodifican antes de incorporarlos al manifiesto. La prueba de cobertura debe pasar antes de publicar: no se omite para ocultar audios faltantes.

## Verificación

- La prueba de catálogo exige ayuda completa para cada clave vigente.
- Las pruebas de entrenamiento comprueban los destinos, la acción práctica permitida y las respuestas del servidor.
- La prueba de audio exige guion, hash, archivo, duración y clon coincidentes.
- Revisión en Chrome con centro ficticio: apertura de las 33 fichas, una sola visible, respuestas intactas; cierre devuelve el foco; lectura a 390 px; cinco pasos y quiz 3/3.
- No requiere migraciones de base de datos.
