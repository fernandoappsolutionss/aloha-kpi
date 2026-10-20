-- Un reto del equipo por centro y semana. Editar exige nueva aprobación.
CREATE TABLE IF NOT EXISTS semana_juegos (
  centro_id INTEGER NOT NULL REFERENCES centros(id),
  semana_fin DATE NOT NULL CHECK (EXTRACT(ISODOW FROM semana_fin) = 4),
  titulo TEXT NOT NULL CHECK (length(trim(titulo)) BETWEEN 1 AND 120),
  codigo TEXT NOT NULL CHECK (codigo IN ('ninos_activos','nuevos_inscritos','retiros','facturas_vencidas','cp_asistidas')),
  meta INTEGER NOT NULL CHECK (meta BETWEEN 0 AND 1000000),
  participantes TEXT NOT NULL CHECK (length(trim(participantes)) BETWEEN 1 AND 300),
  reglas TEXT NOT NULL CHECK (length(trim(reglas)) BETWEEN 1 AND 1500),
  premio TEXT NOT NULL CHECK (length(trim(premio)) BETWEEN 1 AND 300),
  estado TEXT NOT NULL DEFAULT 'propuesto' CHECK (estado IN ('propuesto','aprobado')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  propuesta_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  aprobada_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  aprobada_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (centro_id, semana_fin)
);
