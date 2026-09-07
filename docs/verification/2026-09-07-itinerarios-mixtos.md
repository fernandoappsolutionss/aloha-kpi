# Itinerarios de grupos mixtos · verificación local

Base: main 14109a3. Rama: codex/aloha-itinerarios-mixtos.

## Corrección preparada

La pestaña Itinerario ya no corta el render cuando falta la referencia del aula. Presenta los planes individuales y la captura de inicios antes de la referencia general. Los niños del mismo nivel con inicios desconocidos se pueden completar por separado; el lote se elige expresamente con «Todos empezaron el mismo día». Los que ya tienen fecha pero carecen de horario la conservan y ven qué falta.

La referencia general no inventa la fecha de hoy; el botón de guardar requiere una fecha. El formulario informa qué niños siguen la referencia y pueden cambiar al ajustar nivel/inicio. Envía el fingerprint exigido por la acción existente: su ausencia bloqueaba todo guardado. Los resúmenes muestran la etiqueta real del libro/actividad, sin confundir la sexta posición del calendario con la sexta semana del libro.

No cambia el motor académico, fusiones, base de datos, meses, matrículas ni el estado real de ningún niño. No implementa captura a partir de una semana conocida: ese caso sigue necesitando confirmar la fecha con la coach.

## Evidencia

- Base: 1067/1067 pruebas.
- Reproducción: cuatro de cinco pruebas de vista fallaron antes de la corrección.
- Regresión focal posterior: seis de seis correctas, incluyendo semana del libro frente a posición del calendario.
- Chrome con componentes reales y acciones simuladas, datos ficticios: planes distintos sin referencia; guardar solo Diego conserva las otras cuatro fechas; error y reintento conservan el campo y no escriben; lote explícito envía solo sus dos IDs; crear referencia requiere fecha, envía fingerprint sin_plan y conserva el niño sin inicio; formulario de referencia existente muestra los dos niños afectados.
- Chrome 390/768/1440: sin overflow del documento ni errores JavaScript. Capturas en `.scratch/mixtos/desktop.png`, `mobile.png` y `mobile-form.png`; arnés y comprobación en `.scratch/mixtos/server.mjs` y `check.mjs`.
- Build Next.js correcto. Se repetirá tras cualquier cambio posterior.

## Bloqueo antes de publicación

Los textos y preguntas del módulo de Entrenamiento están actualizados. Faltan siete audios (1424 caracteres de texto saneado) con la voz configurada de Fernando. La revisión automática rechazó enviar guiones a ElevenLabs y usar esa voz por falta de autorización explícita en esta tarea. No se intentó eludir la decisión. Guiones exactos en `2026-09-07-itinerarios-mixtos-guiones.md`.

La suite final tiene 1073/1074 pruebas correctas. La única falla exige los siete MP3 actualizados todavía pendientes de autorización. La comprobación de tours distingue las grabaciones originales activas de las sustituidas y exige que cada audio vigente exista y corresponda al guion nuevo. Al autorizar audio: generar solo estos siete, conservar MP3 originales, repetir suite/build y revisar texto/voz. No publicar con audios viejos asociados a texto nuevo.

No se ha publicado, abierto PR ni modificado producción.
