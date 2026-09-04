-- Entrenamiento de OFICIO (administradora y asistente) sobre la tabla que ya
-- existe. `modulo` es TEXT libre: los 40 módulos nuevos (ids con prefijo `of-`)
-- entran sin migración. Lo único que falta es la firma del drill.
--
-- En una fila de oficio `tour_visto_at` significa "lo estudió con la masa
-- delante" (no hay tour que ver). Se reusa a propósito para no migrar una
-- tercera columna.
--
-- ON DELETE SET NULL, no CASCADE: borrar al supervisor que firmó no puede
-- borrar el progreso del alumno.
--
-- Idempotente. Copia de lo que ya está en db/schema.sql (npm run db:migrate
-- aplica el schema entero); esto sirve para aplicarlo suelto a producción.

ALTER TABLE entrenamiento_progreso ADD COLUMN IF NOT EXISTS drill_firmado_at  TIMESTAMPTZ;
ALTER TABLE entrenamiento_progreso ADD COLUMN IF NOT EXISTS drill_firmado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
