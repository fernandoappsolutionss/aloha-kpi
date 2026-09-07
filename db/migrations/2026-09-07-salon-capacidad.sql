-- Capacidad declarada. NULL significa que el centro aún no la ha registrado.
-- No se deduce de la matrícula ni se asigna un valor por defecto.
ALTER TABLE salones ADD COLUMN IF NOT EXISTS capacidad_ninos INTEGER CHECK (capacidad_ninos > 0);
