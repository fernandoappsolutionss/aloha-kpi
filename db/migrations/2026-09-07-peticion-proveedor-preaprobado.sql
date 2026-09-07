-- Expand compatible: las peticiones existentes conservan sus cotizaciones.
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS proveedor_preaprobado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS proveedor_preaprobado_nombre TEXT;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'peticiones_proveedor_preaprobado_check' AND conrelid = 'peticiones'::regclass) THEN
    ALTER TABLE peticiones ADD CONSTRAINT peticiones_proveedor_preaprobado_check CHECK (
      (NOT proveedor_preaprobado AND proveedor_preaprobado_nombre IS NULL)
      OR (proveedor_preaprobado AND tipo IS NOT NULL AND tipo = 'peticion'
          AND proveedor_preaprobado_nombre IS NOT NULL
          AND length(proveedor_preaprobado_nombre) <= 200
          AND (submitted_at IS NULL OR length(btrim(proveedor_preaprobado_nombre)) > 0))
    );
  END IF;
END $$;
