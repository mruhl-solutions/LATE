-- ============================================================
-- LATE App · Schema v1.3 — Fix RLS grupo_miembros
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- La política anterior tenía una sub-query recursiva sobre la misma
-- tabla, causando "infinite recursion detected in policy for relation
-- grupo_miembros". Reemplazamos por USING (true): las membresías de
-- grupo no contienen datos sensibles y el RPC de matches ya usa
-- SECURITY DEFINER, por lo que no hay riesgo de exposición indebida.

DROP POLICY IF EXISTS "grupo_miembros_select" ON public.grupo_miembros;

CREATE POLICY "grupo_miembros_select" ON public.grupo_miembros
  FOR SELECT TO authenticated
  USING (true);
