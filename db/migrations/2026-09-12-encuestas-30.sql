BEGIN;
SET LOCAL lock_timeout = '10s';
SELECT pg_advisory_xact_lock(2026091202);

-- La regla viaja con cada campaña: los meses entregados no cambian de meta.
ALTER TABLE encuesta_campanas ADD COLUMN IF NOT EXISTS regla_participacion TEXT;
UPDATE encuesta_campanas SET regla_participacion='50-estricto' WHERE regla_participacion IS NULL;
ALTER TABLE encuesta_campanas ALTER COLUMN regla_participacion SET DEFAULT '30-inclusivo';
ALTER TABLE encuesta_campanas ALTER COLUMN regla_participacion SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='encuesta_campanas'::regclass AND conname='encuesta_regla_participacion_valida') THEN
    ALTER TABLE encuesta_campanas ADD CONSTRAINT encuesta_regla_participacion_valida
      CHECK (regla_participacion IN ('50-estricto','30-inclusivo'));
  END IF;
END $$;

-- El cierre KPI y esta activación comparten el candado mensual. La regla y
-- su checklist se convierten juntos; un cierre concurrente ocurre antes o
-- después de ambos. Incluye los meses sin fila y bloquea en orden estable.
INSERT INTO mes_kpi(centro_id,year,month,estado)
SELECT c.centro_id,c.anio,c.mes,'abierto' FROM encuesta_campanas c
WHERE c.anio*100+c.mes >= 202609
  AND c.anio=EXTRACT(YEAR FROM now() AT TIME ZONE 'America/Panama')::int
  AND c.mes=EXTRACT(MONTH FROM now() AT TIME ZONE 'America/Panama')::int
ON CONFLICT(centro_id,year,month) DO NOTHING;
SELECT m.centro_id FROM mes_kpi m JOIN encuesta_campanas c
  ON c.centro_id=m.centro_id AND c.anio=m.year AND c.mes=m.month
WHERE c.anio*100+c.mes >= 202609
  AND c.anio=EXTRACT(YEAR FROM now() AT TIME ZONE 'America/Panama')::int
  AND c.mes=EXTRACT(MONTH FROM now() AT TIME ZONE 'America/Panama')::int
ORDER BY m.centro_id,m.year,m.month FOR UPDATE OF m;

-- Solo se adapta el mes vigente de Panamá al activar. Ni periodos anteriores
-- ni un centro que ya cerró su KPI pierden su regla original.
UPDATE encuesta_campanas c SET regla_participacion='30-inclusivo'
WHERE c.anio*100+c.mes >= 202609
  AND c.anio=EXTRACT(YEAR FROM now() AT TIME ZONE 'America/Panama')::int
  AND c.mes=EXTRACT(MONTH FROM now() AT TIME ZONE 'America/Panama')::int
  AND NOT EXISTS (SELECT 1 FROM mes_kpi m WHERE m.centro_id=c.centro_id AND m.year=c.anio AND m.month=c.mes AND m.estado<>'abierto');

CREATE OR REPLACE FUNCTION encuesta_cumple(p_centro INTEGER, p_anio INTEGER, p_mes INTEGER)
RETURNS TEXT LANGUAGE SQL STABLE AS $$
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM encuesta_campanas c WHERE c.centro_id=p_centro AND c.anio=p_anio AND c.mes=p_mes
    AND c.compartida_at IS NOT NULL AND c.activos > 0
    AND (SELECT count(*) FROM encuesta_respuestas r WHERE r.campana_id=c.id) >=
      CASE WHEN c.regla_participacion='50-estricto' THEN c.activos / 2 + 1
           ELSE ceil(c.activos::numeric * 3 / 10)::int END
  ) THEN 'si' ELSE 'no' END
$$;

CREATE OR REPLACE FUNCTION encuesta_guardar_criterio() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE t RECORD; mes_cal INTEGER;
BEGIN
  IF TG_OP='UPDATE' AND NEW.encuestas_satisfaccion IS NOT DISTINCT FROM OLD.encuestas_satisfaccion
    AND NEW.trimestre_id=OLD.trimestre_id AND NEW.mes=OLD.mes THEN RETURN NEW; END IF;
  SELECT * INTO t FROM trimestres WHERE id=NEW.trimestre_id;
  mes_cal := (t.trimestre-1)*3+NEW.mes;
  -- Antes del lanzamiento el criterio es manual, también en meses cerrados.
  IF t.anio*100+mes_cal < 202609 THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM mes_kpi m WHERE m.centro_id=t.centro_id AND m.year=t.anio AND m.month=mes_cal AND m.estado<>'abierto') THEN
    IF TG_OP='UPDATE' THEN NEW.encuestas_satisfaccion := OLD.encuestas_satisfaccion;
    ELSE NEW.encuestas_satisfaccion := encuesta_cumple(t.centro_id,t.anio,mes_cal); END IF;
    RETURN NEW;
  END IF;
  NEW.encuestas_satisfaccion := encuesta_cumple(t.centro_id,t.anio,mes_cal);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION encuesta_sincronizar(p_id INTEGER) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE c RECORD; t_id INTEGER; valor TEXT;
BEGIN
  SELECT * INTO c FROM encuesta_campanas WHERE id=p_id;
  IF NOT FOUND OR EXISTS (SELECT 1 FROM mes_kpi m WHERE m.centro_id=c.centro_id AND m.year=c.anio AND m.month=c.mes AND m.estado<>'abierto') THEN RETURN; END IF;
  valor := encuesta_cumple(c.centro_id,c.anio,c.mes);
  INSERT INTO trimestres(centro_id,anio,trimestre) VALUES(c.centro_id,c.anio,((c.mes-1)/3)+1)
    ON CONFLICT(centro_id,anio,trimestre) DO NOTHING;
  SELECT id INTO t_id FROM trimestres WHERE centro_id=c.centro_id AND anio=c.anio AND trimestre=((c.mes-1)/3)+1;
  -- Abrir/copiar no inventa un mes registrado: el checklist nace al cumplir.
  UPDATE cumplimiento SET encuestas_satisfaccion=valor, updated_at=now() WHERE trimestre_id=t_id AND mes=((c.mes-1)%3)+1;
  IF valor='si' THEN
    INSERT INTO cumplimiento(trimestre_id,mes,encuestas_satisfaccion) VALUES(t_id,((c.mes-1)%3)+1,valor)
      ON CONFLICT(trimestre_id,mes) DO UPDATE SET encuestas_satisfaccion=EXCLUDED.encuestas_satisfaccion,updated_at=now();
  END IF;
END $$;

-- Reevalúa la evidencia ya recibida únicamente en campañas vigentes abiertas.
SELECT encuesta_sincronizar(c.id) FROM encuesta_campanas c
WHERE c.regla_participacion='30-inclusivo'
  AND c.anio=EXTRACT(YEAR FROM now() AT TIME ZONE 'America/Panama')::int
  AND c.mes=EXTRACT(MONTH FROM now() AT TIME ZONE 'America/Panama')::int
  AND NOT EXISTS (SELECT 1 FROM mes_kpi m WHERE m.centro_id=c.centro_id AND m.year=c.anio AND m.month=c.mes AND m.estado<>'abierto');
COMMIT;
