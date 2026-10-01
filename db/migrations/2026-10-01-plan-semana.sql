BEGIN;
CREATE TABLE IF NOT EXISTS semana_planes (
  id                     BIGSERIAL PRIMARY KEY,
  centro_id              INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  semana_fin             DATE NOT NULL CHECK (EXTRACT(ISODOW FROM semana_fin) = 4),
  condicion              TEXT CHECK (condicion IN ('inexistencia','peligro','emergencia','normal','afluencia','poder','cambio_poder')),
  alcance_peligro        TEXT CHECK (alcance_peligro IN ('personal','superior')),
  variante_afluencia     TEXT CHECK (variante_afluencia IN ('financiera','accion')),
  asignada_por           INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  asignada_at            TIMESTAMPTZ,
  lectura_auto           TEXT,
  lectura_motivo         TEXT,
  pendientes_copiados_at TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (centro_id, semana_fin)
);
CREATE TABLE IF NOT EXISTS semana_objetivos (
  id                 BIGSERIAL PRIMARY KEY,
  plan_id            BIGINT NOT NULL REFERENCES semana_planes(id) ON DELETE CASCADE,
  seccion            TEXT NOT NULL CHECK (seccion IN ('formula','urgente','pendiente','orden','estrategico')),
  paso               INTEGER CHECK (paso >= 0),
  texto              TEXT NOT NULL CHECK (length(btrim(texto)) BETWEEN 1 AND 500),
  responsable        TEXT CHECK (responsable IS NULL OR length(responsable) <= 120),
  fecha              DATE,
  hecho              BOOLEAN NOT NULL DEFAULT false,
  hecho_at           TIMESTAMPTZ,
  origen_objetivo_id BIGINT REFERENCES semana_objetivos(id) ON DELETE SET NULL,
  orden              INTEGER NOT NULL DEFAULT 0,
  creado_por         INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((seccion = 'formula') = (paso IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS semana_objetivos_plan_idx ON semana_objetivos (plan_id);
COMMIT;
