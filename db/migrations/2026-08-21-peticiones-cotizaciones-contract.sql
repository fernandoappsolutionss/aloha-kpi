ALTER TABLE peticiones ALTER COLUMN tipo DROP DEFAULT;
ALTER TABLE peticiones ALTER COLUMN tipo SET NOT NULL;
ALTER TABLE peticiones VALIDATE CONSTRAINT peticiones_tipo_check;
ALTER TABLE peticiones VALIDATE CONSTRAINT peticiones_estado_check;
ALTER TABLE peticiones VALIDATE CONSTRAINT peticiones_tipo_categoria_check;
ALTER TABLE peticiones VALIDATE CONSTRAINT peticiones_anulada_at_check;
