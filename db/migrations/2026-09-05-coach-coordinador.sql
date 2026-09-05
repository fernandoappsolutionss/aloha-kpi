-- COACH Y COORDINADOR EN EL ENTRENAMIENTO DE OFICIO.
--
-- Dos cosas, y ninguna toca entrenamiento_progreso: `modulo` es TEXT libre y
-- los ids nuevos (of-hat-coa, of-coa-*, of-hat-cop, of-cop-*, of-ase-*) entran
-- sin migración, igual que entraron los 40 de la primera tanda.
--
-- 1. El rol `coach` en usuarios.rol. La columna es TEXT sin CHECK (así estaba
--    antes de esto), de modo que el rol nuevo no necesita ALTER: lo que sí hace
--    falta es que el comentario del esquema lo nombre, porque esa lista es la
--    única documentación del dominio. Ver db/schema.sql.
--    El PERSONAL DE ASEO no entra aquí: no recibe cuenta. Su entrenamiento son
--    seis hojas imprimibles que firma en tinta la Asistente Administrativa y
--    que reposan en el file del colaborador.
--
-- 2. coaches.usuario_id: el puente entre la ficha operativa del Coach (la que
--    cuelga de grupos.coach_id y alimenta lib/desercion-coach.mjs) y la cuenta
--    con la que entra al sistema y acumula su hat. Sin él, el entrenamiento del
--    Coach y su alerta de deserción son dos personas distintas para el sistema.
--
-- NO es UNIQUE: un Coach que da clases en dos centros tiene dos fichas (una por
-- centro) y una sola cuenta, cuyo usuarios.centro_id es su CENTRO BASE — el de
-- la Administradora que le firma.
--
-- Idempotente. Copia de lo que ya está en db/schema.sql (npm run db:migrate
-- aplica el schema entero); esto sirve para aplicarlo suelto a producción.

ALTER TABLE coaches ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_coaches_usuario ON coaches(usuario_id);
