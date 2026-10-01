BEGIN;
CREATE TABLE IF NOT EXISTS semana_cuotas (
  centro_id     INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  semana_fin    DATE NOT NULL CHECK (EXTRACT(ISODOW FROM semana_fin) = 4),
  codigo        TEXT NOT NULL CHECK (codigo IN ('ninos_activos','nuevos_inscritos','retiros','facturas_vencidas','cp_asistidas')),
  cuota         NUMERIC NOT NULL CHECK (cuota >= 0),
  propuesta     NUMERIC,
  estado        TEXT NOT NULL DEFAULT 'propuesta' CHECK (estado IN ('propuesta','aprobada')),
  propuesta_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  aprobada_por  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  aprobada_at   TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (centro_id, semana_fin, codigo)
);
COMMIT;
