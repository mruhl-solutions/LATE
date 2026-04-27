-- ============================================================
-- LATE App · Migration 0006
-- · visible_radar: opt-in para aparecer en el radar global
-- · total_figuritas: configurable por álbum
-- · mensajes DELETE policy
-- · buscar_matches_radar filtra por visible_radar = true
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS visible_radar   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_figuritas INTEGER NOT NULL DEFAULT 638
    CHECK (total_figuritas BETWEEN 10 AND 2000);

-- Política DELETE para mensajes: cualquier participante puede
-- borrar todos los mensajes de su propio intercambio.
CREATE POLICY "mensajes_delete" ON public.mensajes
  FOR DELETE TO authenticated
  USING (
    intercambio_id IN (
      SELECT id FROM public.intercambios
      WHERE iniciador_id = auth.uid() OR receptor_id = auth.uid()
    )
  );

-- Actualizar buscar_matches_radar para respetar visible_radar
CREATE OR REPLACE FUNCTION public.buscar_matches_radar(p_usuario_id UUID)
RETURNS TABLE (
  usuario_id             UUID,
  alias                  TEXT,
  distancia_km           NUMERIC,
  ellos_tienen_yo_busco  INTEGER[],
  yo_tengo_ellos_buscan  INTEGER[],
  total_coincidencias    INTEGER,
  es_bidireccional       BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_faltantes  INTEGER[];
  v_repetidas  INTEGER[];
  v_radio_km   INTEGER;
  v_ubicacion  GEOGRAPHY;
  v_res_ped    INTEGER[];
  v_res_ofr    INTEGER[];
BEGIN
  SELECT faltantes, repetidas, radio_km, ubicacion
  INTO   v_faltantes, v_repetidas, v_radio_km, v_ubicacion
  FROM   public.profiles WHERE id = p_usuario_id;

  SELECT
    COALESCE(ARRAY_AGG(DISTINCT np), '{}'),
    COALESCE(ARRAY_AGG(DISTINCT no), '{}')
  INTO v_res_ped, v_res_ofr
  FROM public.intercambios,
    LATERAL UNNEST(numeros_pedidos)   AS np,
    LATERAL UNNEST(numeros_ofrecidos) AS no
  WHERE iniciador_id = p_usuario_id AND estado = 'aceptado';

  v_faltantes := ARRAY(SELECT UNNEST(v_faltantes) EXCEPT SELECT UNNEST(v_res_ped));
  v_repetidas := ARRAY(SELECT UNNEST(v_repetidas) EXCEPT SELECT UNNEST(v_res_ofr));

  RETURN QUERY
  WITH calc AS (
    SELECT
      p.id,
      p.alias,
      p.ubicacion,
      public.array_intersect(p.repetidas, v_faltantes) AS ellos_tienen,
      public.array_intersect(v_repetidas, p.faltantes) AS yo_tengo
    FROM public.profiles p
    WHERE
      p.id != p_usuario_id
      AND p.visible_radar = true
      AND p.ubicacion IS NOT NULL
      AND v_ubicacion IS NOT NULL
      AND ST_DWithin(p.ubicacion, v_ubicacion, v_radio_km * 1000.0)
      AND (p.repetidas && v_faltantes OR v_repetidas && p.faltantes)
  )
  SELECT
    c.id,
    c.alias,
    ROUND((ST_Distance(c.ubicacion, v_ubicacion) / 1000)::NUMERIC, 1),
    c.ellos_tienen,
    c.yo_tengo,
    (COALESCE(ARRAY_LENGTH(c.ellos_tienen, 1), 0) +
     COALESCE(ARRAY_LENGTH(c.yo_tengo, 1), 0))::INTEGER,
    (ARRAY_LENGTH(c.ellos_tienen, 1) > 0 AND ARRAY_LENGTH(c.yo_tengo, 1) > 0)
  FROM calc c
  WHERE ARRAY_LENGTH(c.ellos_tienen, 1) > 0 OR ARRAY_LENGTH(c.yo_tengo, 1) > 0
  ORDER BY 6 DESC;
END;
$$;
