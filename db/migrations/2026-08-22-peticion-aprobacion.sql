ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS cotizacion_aprobada_id INTEGER;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'peticiones'::regclass AND conname = 'peticiones_cotizacion_aprobada_fkey') THEN
    ALTER TABLE peticiones
      ADD CONSTRAINT peticiones_cotizacion_aprobada_fkey
      FOREIGN KEY (cotizacion_aprobada_id) REFERENCES peticion_cotizaciones(id) ON DELETE SET NULL;
  END IF;
END $$;
