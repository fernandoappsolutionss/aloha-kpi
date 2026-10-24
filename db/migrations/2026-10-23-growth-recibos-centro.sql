BEGIN;
ALTER TABLE growth_notification_receipts ADD COLUMN IF NOT EXISTS centro_id INTEGER REFERENCES centros(id) ON DELETE CASCADE;
UPDATE growth_notification_receipts r SET centro_id=s.centro_id FROM growth_snapshots s WHERE r.snapshot_id=s.id AND r.centro_id IS NULL;
ALTER TABLE growth_notification_receipts ALTER COLUMN centro_id SET NOT NULL;
ALTER TABLE growth_notification_receipts DROP CONSTRAINT IF EXISTS growth_notification_receipts_usuario_id_week_start_key;
CREATE UNIQUE INDEX IF NOT EXISTS growth_receipts_usuario_centro_semana ON growth_notification_receipts(usuario_id,centro_id,week_start);
COMMIT;
