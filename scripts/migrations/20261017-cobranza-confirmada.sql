-- Migración aditiva. Los ceros heredados permanecen intactos para auditoría;
-- cob_nullable=false impide confundir esos blancos con conteos confirmados.
ALTER TABLE kpi_semanas ADD COLUMN IF NOT EXISTS cob_nullable boolean NOT NULL DEFAULT false;
ALTER TABLE kpi_semanas ALTER COLUMN cob_nullable SET DEFAULT true;
ALTER TABLE kpi_semanas ALTER COLUMN cob_d1 DROP DEFAULT;
ALTER TABLE kpi_semanas ALTER COLUMN cob_d2 DROP DEFAULT;
ALTER TABLE kpi_semanas ALTER COLUMN cob_d3 DROP DEFAULT;
ALTER TABLE kpi_semanas ALTER COLUMN cob_d4 DROP DEFAULT;
ALTER TABLE kpi_semanas ALTER COLUMN cob_d5 DROP DEFAULT;
CREATE TABLE IF NOT EXISTS cobranza_conciliaciones (
  id bigserial PRIMARY KEY,
  iniciado_at timestamptz NOT NULL,
  terminado_at timestamptz NOT NULL,
  fecha date NOT NULL,
  guardado boolean NOT NULL,
  informe jsonb NOT NULL
);
-- Decisión explícita de Fernando, 17-oct-2026. Los otros valores conservan
-- los objetivos efectivos vigentes (20 ingresos, 8% deserción, etc.).
INSERT INTO metas (anio, trimestre, meta_nuevos_ingresos_mes, meta_desercion_mes,
  meta_cobranza_max, gpn_min, cp_conversion, royalty_por_nino, cupo_max_grupo)
VALUES (2026, 4, 20, 8, 3, 8, 50, 12, 15)
ON CONFLICT (anio, trimestre) DO UPDATE SET meta_cobranza_max = 3;
