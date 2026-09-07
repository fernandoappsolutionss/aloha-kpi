-- EXPAND únicamente: aplicar antes del código compatible. La promoción de
-- Fernando y los dos bloqueos se ejecutan después del despliegue con el script.
BEGIN;
SET LOCAL lock_timeout = '5s';
SELECT pg_advisory_xact_lock(2026090703);

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='usuarios'::regclass AND conname='usuarios_master_email') THEN
    ALTER TABLE usuarios ADD CONSTRAINT usuarios_master_email
      CHECK (rol <> 'admin_master' OR lower(email) = 'fperez@teamsolutionss.com');
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_unico_master ON usuarios (rol) WHERE rol='admin_master';

-- IDs históricos deliberadamente sin cascada/FK: eliminar una cuenta no debe
-- borrar ni desidentificar la auditoría de sus bloqueos previos.
CREATE TABLE IF NOT EXISTS usuario_acceso_historial (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  actor_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('block','unblock')),
  previous_blocked_until TIMESTAMPTZ,
  new_blocked_until TIMESTAMPTZ,
  motivo TEXT NOT NULL CHECK (length(trim(motivo)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS usuario_acceso_historial_usuario ON usuario_acceso_historial(user_id,created_at DESC);
COMMIT;
