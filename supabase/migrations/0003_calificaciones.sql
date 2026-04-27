-- ============================================================
-- LATE App · Schema v1.2 — Calificaciones
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.calificaciones (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  intercambio_id  UUID        NOT NULL REFERENCES public.intercambios(id) ON DELETE CASCADE,
  calificador_id  UUID        NOT NULL REFERENCES public.profiles(id)     ON DELETE CASCADE,
  calificado_id   UUID        NOT NULL REFERENCES public.profiles(id)     ON DELETE CASCADE,
  estrellas       SMALLINT    NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(intercambio_id, calificador_id)
);

ALTER TABLE public.calificaciones ENABLE ROW LEVEL SECURITY;

-- Solo el calificador puede insertar su propia calificación
CREATE POLICY "calificaciones_insert" ON public.calificaciones
  FOR INSERT TO authenticated
  WITH CHECK (calificador_id = auth.uid());

-- Todos los usuarios autenticados pueden leer calificaciones
CREATE POLICY "calificaciones_select" ON public.calificaciones
  FOR SELECT TO authenticated
  USING (true);
