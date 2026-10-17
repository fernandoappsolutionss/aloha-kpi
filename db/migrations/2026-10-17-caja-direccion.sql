BEGIN;
CREATE TABLE IF NOT EXISTS caja_direccion_ciclos (
  empresa TEXT NOT NULL CHECK (empresa IN ('altavia','ff')),
  ciclo DATE NOT NULL CHECK (EXTRACT(ISODOW FROM ciclo) = 5),
  version INT NOT NULL DEFAULT 1 CHECK (version > 0),
  documento JSONB NOT NULL,
  cierre_at TIMESTAMPTZ,
  lunes_at TIMESTAMPTZ,
  actualizado_por INT REFERENCES usuarios(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa,ciclo)
);
CREATE TABLE IF NOT EXISTS caja_direccion_eventos (
  id BIGSERIAL PRIMARY KEY,
  empresa TEXT NOT NULL,
  ciclo DATE NOT NULL,
  version INT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('guardar','cerrar_viernes','revisar_lunes')),
  documento JSONB NOT NULL,
  foto JSONB NOT NULL,
  usuario_id INT REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa,ciclo,version),
  FOREIGN KEY (empresa,ciclo) REFERENCES caja_direccion_ciclos(empresa,ciclo)
);
COMMIT;
