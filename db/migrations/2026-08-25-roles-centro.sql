-- ── Roles de centro + coordinador operativo (2026-08-25) ──────────────────
-- 1. usuarios.rol admite dos valores nuevos:
--      'coordinador' → administrador SOLO de los centros que se le asignen
--      'asistente'   → opera su centro, sin cerrar/reabrir mes ni eliminar
-- 2. usuario_centros: los centros de un coordinador (N:N). Las FK con CASCADE
--    limpian solas cuando se borra el usuario o el centro; por eso es tabla y
--    no un arreglo de ids en usuarios.
-- Es una migración aditiva: no toca ni una fila existente.

CREATE TABLE IF NOT EXISTS usuario_centros (
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  centro_id   INTEGER NOT NULL REFERENCES centros(id)  ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (usuario_id, centro_id)
);
CREATE INDEX IF NOT EXISTS idx_usuario_centros_centro ON usuario_centros (centro_id);
