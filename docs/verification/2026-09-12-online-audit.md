# Auditoría previa — ALOHA Online en entrenamiento Coach

Fecha: 2026-09-12

Alcance autorizado: integrar Online como tres módulos nuevos del curso `coach`, sin renumerar módulos existentes, sin tocar progreso, permisos, base de datos ni manifiestos de audio.

## Fuentes leídas

- Manual auditado: `outputs/aloha-manual-20260912/manual-texto-auditado.md`, líneas 2500-2605. No se leyó ni copió el bloque base64 posterior.
- Fuente Moodle anterior: `plataformas/aloha/training-moodle/curso-5-aloha-online.html`.
- Banco GIFT anterior: `plataformas/aloha/training-moodle/curso-5-aloha-online.gift`.
- Catálogo vivo actual: `lib/entrenamiento/oficio/cursos/coach.js`, `lib/entrenamiento/respuestas-oficio/coach.js`, `lib/entrenamiento/oficio/guia.js`.

## Decisiones de integración

- Online no estaba integrado en el catálogo vivo: el curso Coach terminaba en `of-coa-11`, orden 24.
- Se agregan tres módulos nuevos, todos `curso: 'coach'` y `roles: ['coach']`:
  - `of-coa-12`, orden 25: entorno, requerimientos del alumno y presentaciones.
  - `of-coa-13`, orden 26: estructura de clase, ALOHA Challenge y Cierre de Nivel online.
  - `of-coa-14`, orden 27: Class Dojo, Historia de Clase, retroalimentación y portafolio.
- La cadena de prerrequisitos queda `of-coa-11 -> of-coa-12 -> of-coa-13 -> of-coa-14`.
- Se conserva el denominador natural del plan Coach: el plan crece, no se crea segmentación `coachOnline`.
- Las referencias Drive del manual se tratan como anexos no auditados. Se nombran como material de referencia cuando el texto auditado los menciona, pero no se inventa contenido de esos enlaces.
- La sección NEE, líneas 2603-2605, queda fuera de Online. Solo se conserva como referencia documental independiente, sin protocolo nuevo.

## Reglas exactas incorporadas

- El alumno mantiene la cámara encendida durante toda la clase.
- Bocinas o audífonos y micrófono deben funcionar; el Coach puede activar o desactivar el micrófono según el momento.
- Los requerimientos del alumno se publican en la Historia de Clase de Class Dojo antes de la primera clase del grupo.
- El anexo 7.1 nombra como referencias: Requerimientos para el coach, Requerimientos para el alumno, Tips para coaches: generales y Tips para coaches: kinder.
- Cada segunda clase del grupo cierra con ALOHA Challenge.
- El Challenge dura quince minutos incluyendo la conexión a `www.kahoot.it` y el inicio de la actividad.
- El anexo 7.3 nombra como referencias: Dossier de juegos online; Brain Gym y guía; Brain Breaks, flashcards e instrucciones; Actividades Cognitivas Kids y guía; Actividades Cognitivas Tiny Tots y guía.
- Si se modifica una presentación ajena, primero se crea una copia; si ya está lista, se revisa con antelación y se ajustan fecha y plantilla si hace falta.
- Al iniciar la clase, la diapositiva azul de ALOHA ya debe estar compartida para que sea lo primero que vean los niños al entrar.
- La Búsqueda del Tesoro se realiza una sola vez por grupo; cierres posteriores usan la misma estructura de presentación con repaso y juegos.
- El anexo 7.5 nombra como referencias: Preguntas frecuentes de los Coaches y Preguntas frecuentes de los Padres.
- En Online la asistencia se coloca en el formato de Drive y en Class Dojo.
- Al finalizar la clase se asignan los puntos correspondientes a cada niño.
- Dos faltas, tardanzas o salidas tempranas consecutivas activan protocolo: marcar según leyenda, informar al Administrador de Centro y contactar al representante por Class Dojo con transparencia y búsqueda de solución.
- Al finalizar la clase se publica Historia de Clase con saludo motivador, contenido dado y práctica en casa. La imagen de actividad es opcional, no obligatoria.
- La retroalimentación se realiza semanalmente para cada niño, con fortalezas y puntos a mejorar, y se sube a la plataforma de cada niño.
- Práctica en Casa: primera clase se asigna, segunda clase se recuerda como seguimiento, primer día de la semana siguiente se corrige y luego se pide subirla al portafolio.
- El portafolio vive únicamente en la cuenta de estudiante; también recibe videos de práctica en casa, fichas de campeonato y actividades pedidas.
- El contenido del portafolio se corrige semanalmente y sirve como base de la retroalimentación.

## Exclusiones deliberadas

- No se incorporan reglas generales ambiguas de Mental Day, Tiendita ni reforzamiento desde el curso Moodle anterior cuando no forman parte del bloque Online auditado.
- La generación incremental de audio se completa en la integración de la rama, con autorización expresa de Fernando; se conserva la receta de voz aprobada.
- No se renumeran módulos existentes. El curso Coach incorpora tres módulos nuevos conservando los avances anteriores.
