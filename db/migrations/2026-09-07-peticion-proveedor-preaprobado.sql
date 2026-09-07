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

-- La cotización del servicio usa el mismo almacenamiento privado, validación
-- y descarga. Los datos fiscales solo se omiten para proveedores ya aprobados;
-- nunca se inventan certificaciones ni identificaciones para llenar columnas.
ALTER TABLE peticion_cotizaciones ADD COLUMN IF NOT EXISTS proveedor_preaprobado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE peticion_cotizaciones
  ALTER COLUMN proveedor_pais DROP NOT NULL,
  ALTER COLUMN proveedor_id_fiscal DROP NOT NULL,
  ALTER COLUMN proveedor_id_fiscal_clave DROP NOT NULL,
  ALTER COLUMN empresa_constituida DROP NOT NULL,
  ALTER COLUMN emite_factura_fiscal DROP NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cotizacion_modalidad_fiscal_check' AND conrelid = 'peticion_cotizaciones'::regclass) THEN
    ALTER TABLE peticion_cotizaciones ADD CONSTRAINT cotizacion_modalidad_fiscal_check CHECK (
      (proveedor_preaprobado AND proveedor_pais IS NULL AND proveedor_id_fiscal IS NULL
        AND proveedor_id_fiscal_clave IS NULL AND empresa_constituida IS NULL AND emite_factura_fiscal IS NULL)
      OR (NOT proveedor_preaprobado AND proveedor_pais IS NOT NULL AND proveedor_id_fiscal IS NOT NULL
        AND proveedor_id_fiscal_clave IS NOT NULL AND empresa_constituida IS NOT NULL AND emite_factura_fiscal IS NOT NULL)
    );
  END IF;
END $$;

ALTER TABLE peticion_cotizaciones DROP CONSTRAINT IF EXISTS peticion_cotizaciones_valid_check;
ALTER TABLE peticion_cotizaciones ADD CONSTRAINT peticion_cotizaciones_valid_check CHECK (
  upload_status <> 'valid' OR (
    (proveedor_preaprobado OR (empresa_constituida AND emite_factura_fiscal))
    AND blob_pathname IS NOT NULL AND expected_pathname IS NOT NULL
    AND archivo_nombre IS NOT NULL AND archivo_mime IS NOT NULL AND archivo_mime = 'application/pdf'
    AND archivo_bytes IS NOT NULL AND archivo_bytes BETWEEN 1 AND 10485760 AND archivo_sha256 IS NOT NULL
    AND uploaded_by_snapshot IS NOT NULL AND validada_at IS NOT NULL
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_peticiones_modalidad ON peticiones(id, proveedor_preaprobado);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cotizacion_servicio_preaprobado ON peticion_cotizaciones(peticion_id) WHERE proveedor_preaprobado;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cotizacion_peticion_modalidad_fkey' AND conrelid = 'peticion_cotizaciones'::regclass) THEN
    ALTER TABLE peticion_cotizaciones ADD CONSTRAINT cotizacion_peticion_modalidad_fkey
      FOREIGN KEY (peticion_id, proveedor_preaprobado) REFERENCES peticiones(id, proveedor_preaprobado) ON DELETE RESTRICT;
  END IF;
END $$;
