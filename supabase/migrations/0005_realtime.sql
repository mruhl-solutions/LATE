-- ============================================================
-- LATE App · Schema v1.4 — Habilitar Realtime
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Habilitar Realtime en las tablas que necesitan actualizaciones
-- en vivo: mensajes (chat) e intercambios (cambios de estado).
-- Sin esto, las suscripciones con postgres_changes no reciben eventos.

ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.intercambios;
