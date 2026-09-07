BEGIN;
SET LOCAL lock_timeout = '10s';
SELECT pg_advisory_xact_lock(2026090701);
CREATE TABLE IF NOT EXISTS encuesta_campanas (
  id SERIAL PRIMARY KEY,
  centro_id INTEGER NOT NULL REFERENCES centros(id),
  anio INTEGER NOT NULL CHECK (anio BETWEEN 2020 AND 2100),
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  token TEXT NOT NULL UNIQUE,
  identity_salt TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT 'satisfaccion-v1',
  activos INTEGER NOT NULL CHECK (activos > 0),
  corte DATE NOT NULL,
  compartida_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(centro_id, anio, mes)
);
CREATE TABLE IF NOT EXISTS encuesta_participantes (
  id SERIAL PRIMARY KEY,
  campana_id INTEGER NOT NULL REFERENCES encuesta_campanas(id),
  estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id),
  nombre TEXT NOT NULL,
  grupo TEXT,
  identity_hash TEXT,
  token TEXT NOT NULL UNIQUE,
  UNIQUE(campana_id, estudiante_id),
  UNIQUE(id, campana_id)
);
CREATE INDEX IF NOT EXISTS encuesta_identidad ON encuesta_participantes(campana_id, identity_hash);
CREATE TABLE IF NOT EXISTS encuesta_respuestas (
  id SERIAL PRIMARY KEY,
  campana_id INTEGER NOT NULL REFERENCES encuesta_campanas(id),
  participante_id INTEGER NOT NULL UNIQUE,
  general INTEGER NOT NULL CHECK (general BETWEEN 1 AND 5),
  avance INTEGER NOT NULL CHECK (avance BETWEEN 1 AND 5),
  coach INTEGER NOT NULL CHECK (coach BETWEEN 1 AND 5),
  atencion INTEGER NOT NULL CHECK (atencion BETWEEN 1 AND 5),
  mejorar TEXT NOT NULL DEFAULT '' CHECK (length(mejorar) <= 1000),
  destacar TEXT NOT NULL DEFAULT '' CHECK (length(destacar) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY(participante_id, campana_id) REFERENCES encuesta_participantes(id, campana_id)
);
CREATE TABLE IF NOT EXISTS encuesta_difusiones (
  id SERIAL PRIMARY KEY,
  campana_id INTEGER NOT NULL REFERENCES encuesta_campanas(id),
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('copiar', 'qr', 'individual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS encuesta_intentos (
  campana_id INTEGER NOT NULL REFERENCES encuesta_campanas(id),
  clave TEXT NOT NULL,
  ventana BIGINT NOT NULL,
  intentos INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(campana_id, clave, ventana)
);

-- La casilla automática tiene una única fuente, incluso al guardar un formulario antiguo.
CREATE OR REPLACE FUNCTION encuesta_cumple(p_centro INTEGER, p_anio INTEGER, p_mes INTEGER)
RETURNS TEXT LANGUAGE SQL STABLE AS $$
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM encuesta_campanas c WHERE c.centro_id=p_centro AND c.anio=p_anio AND c.mes=p_mes
    AND c.compartida_at IS NOT NULL AND c.activos > 0
    AND (SELECT count(*) FROM encuesta_respuestas r WHERE r.campana_id=c.id) > c.activos / 2
  ) THEN 'si' ELSE 'no' END
$$;
CREATE OR REPLACE FUNCTION encuesta_guardar_criterio() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE t RECORD; mes_cal INTEGER;
BEGIN
  IF TG_OP='UPDATE' AND NEW.encuestas_satisfaccion IS NOT DISTINCT FROM OLD.encuestas_satisfaccion
    AND NEW.trimestre_id=OLD.trimestre_id AND NEW.mes=OLD.mes THEN RETURN NEW; END IF;
  SELECT * INTO t FROM trimestres WHERE id=NEW.trimestre_id;
  mes_cal := (t.trimestre-1)*3+NEW.mes;
  IF t.anio*100+mes_cal >= 202609 THEN
    NEW.encuestas_satisfaccion := encuesta_cumple(t.centro_id,t.anio,mes_cal);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS encuesta_criterio_calculado ON cumplimiento;
CREATE TRIGGER encuesta_criterio_calculado BEFORE INSERT OR UPDATE ON cumplimiento
FOR EACH ROW EXECUTE FUNCTION encuesta_guardar_criterio();

CREATE OR REPLACE FUNCTION encuesta_sincronizar(p_id INTEGER) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE c RECORD; t_id INTEGER; valor TEXT;
BEGIN
  SELECT * INTO c FROM encuesta_campanas WHERE id=p_id;
  valor := encuesta_cumple(c.centro_id,c.anio,c.mes);
  INSERT INTO trimestres(centro_id,anio,trimestre) VALUES(c.centro_id,c.anio,((c.mes-1)/3)+1)
    ON CONFLICT(centro_id,anio,trimestre) DO NOTHING;
  SELECT id INTO t_id FROM trimestres WHERE centro_id=c.centro_id AND anio=c.anio AND trimestre=((c.mes-1)/3)+1;
  -- No inventar meses registrados por abrir/copiar: solo crea el checklist al cumplir.
  UPDATE cumplimiento SET encuestas_satisfaccion=valor, updated_at=now() WHERE trimestre_id=t_id AND mes=((c.mes-1)%3)+1;
  IF valor='si' THEN
    INSERT INTO cumplimiento(trimestre_id,mes,encuestas_satisfaccion) VALUES(t_id,((c.mes-1)%3)+1,valor)
      ON CONFLICT(trimestre_id,mes) DO UPDATE SET encuestas_satisfaccion=EXCLUDED.encuestas_satisfaccion,updated_at=now();
  END IF;
END $$;
-- El histórico anterior al lanzamiento conserva su criterio manual.
UPDATE cumplimiento cu SET encuestas_satisfaccion='no' FROM trimestres t
  WHERE t.id=cu.trimestre_id AND t.anio*100+(t.trimestre-1)*3+cu.mes >= 202609;
COMMIT;
