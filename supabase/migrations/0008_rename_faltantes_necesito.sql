-- ============================================================
-- LATE App · Migration 0008
-- · Rename faltantes → necesito in profiles and user_albumes
-- · Remove total_figuritas from profile (tracking per-album only)
-- · Update all RPC functions to use nuevos field names
-- ============================================================

-- 1. Rename column in profiles
ALTER TABLE public.profiles RENAME COLUMN faltantes TO necesito;

-- 2. Rename column in user_albumes
ALTER TABLE public.user_albumes RENAME COLUMN faltantes TO necesito;

-- 3. Rename column in intercambios: numeros_pedidos stays (it's exchange context, not profile)
-- No rename needed for intercambios

-- 4. Recreate indexes for profiles.necesito
DROP INDEX IF EXISTS idx_profiles_faltantes;
CREATE INDEX IF NOT EXISTS idx_profiles_necesito ON public.profiles USING GIN (necesito);

-- 5. Update buscar_matches_radar to use necesito
CREATE OR REPLACE FUNCTION public.buscar_matches_radar(p_usuario_id UUID)
RETURNS TABLE (
  usuario_id             UUID,
  alias                  TEXT,
  distancia_km           NUMERIC,
  ellos_tienen_yo_busco  TEXT[],
  yo_tengo_ellos_buscan  TEXT[],
  total_coincidencias    INTEGER,
  es_bidireccional       BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_necesito   TEXT[];
  v_repetidas  TEXT[];
  v_radio_km   INTEGER;
  v_ubicacion  GEOGRAPHY;
  v_res_ped    TEXT[];
  v_res_ofr    TEXT[];
BEGIN
  SELECT necesito, repetidas, radio_km, ubicacion
  INTO   v_necesito, v_repetidas, v_radio_km, v_ubicacion
  FROM   public.profiles WHERE id = p_usuario_id;

  SELECT
    COALESCE(ARRAY_AGG(DISTINCT np), '{}'),
    COALESCE(ARRAY_AGG(DISTINCT no), '{}')
  INTO v_res_ped, v_res_ofr
  FROM public.intercambios,
    LATERAL UNNEST(numeros_pedidos)   AS np,
    LATERAL UNNEST(numeros_ofrecidos) AS no
  WHERE iniciador_id = p_usuario_id AND estado = 'aceptado';

  v_necesito  := ARRAY(SELECT UNNEST(v_necesito) EXCEPT SELECT UNNEST(v_res_ped));
  v_repetidas := ARRAY(SELECT UNNEST(v_repetidas) EXCEPT SELECT UNNEST(v_res_ofr));

  RETURN QUERY
  WITH calc AS (
    SELECT
      p.id,
      p.alias,
      p.ubicacion,
      public.array_intersect(p.repetidas, v_necesito) AS ellos_tienen,
      public.array_intersect(v_repetidas, p.necesito)  AS yo_tengo
    FROM public.profiles p
    WHERE
      p.id != p_usuario_id
      AND p.visible_radar = true
      AND p.ubicacion IS NOT NULL
      AND v_ubicacion IS NOT NULL
      AND ST_DWithin(p.ubicacion, v_ubicacion, v_radio_km * 1000.0)
      AND (p.repetidas && v_necesito OR v_repetidas && p.necesito)
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

-- 6. Update buscar_matches_grupo to use necesito
CREATE OR REPLACE FUNCTION public.buscar_matches_grupo(
  p_grupo_id   UUID,
  p_usuario_id UUID
)
RETURNS TABLE (
  usuario_id             UUID,
  alias                  TEXT,
  ellos_tienen_yo_busco  TEXT[],
  yo_tengo_ellos_buscan  TEXT[],
  total_coincidencias    INTEGER,
  es_bidireccional       BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_necesito  TEXT[];
  v_repetidas TEXT[];
BEGIN
  SELECT necesito, repetidas INTO v_necesito, v_repetidas
  FROM public.profiles WHERE id = p_usuario_id;

  RETURN QUERY
  WITH calc AS (
    SELECT
      p.id,
      p.alias,
      public.array_intersect(p.repetidas, v_necesito) AS ellos_tienen,
      public.array_intersect(v_repetidas, p.necesito)  AS yo_tengo
    FROM public.profiles p
    INNER JOIN public.grupo_miembros gm ON gm.usuario_id = p.id
    WHERE
      gm.grupo_id = p_grupo_id
      AND p.id != p_usuario_id
      AND (p.repetidas && v_necesito OR v_repetidas && p.necesito)
  )
  SELECT
    c.id, c.alias, c.ellos_tienen, c.yo_tengo,
    (COALESCE(ARRAY_LENGTH(c.ellos_tienen, 1), 0) +
     COALESCE(ARRAY_LENGTH(c.yo_tengo, 1), 0))::INTEGER,
    (ARRAY_LENGTH(c.ellos_tienen, 1) > 0 AND ARRAY_LENGTH(c.yo_tengo, 1) > 0)
  FROM calc c
  WHERE ARRAY_LENGTH(c.ellos_tienen, 1) > 0 OR ARRAY_LENGTH(c.yo_tengo, 1) > 0
  ORDER BY 5 DESC;
END;
$$;

-- 7. Update finalizar_intercambio to use necesito
CREATE OR REPLACE FUNCTION public.finalizar_intercambio(p_intercambio_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v public.intercambios%ROWTYPE;
BEGIN
  SELECT * INTO v FROM public.intercambios
  WHERE id = p_intercambio_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Intercambio no encontrado';
  END IF;
  IF v.estado != 'aceptado' THEN
    RAISE EXCEPTION 'Estado inválido: %. Se requiere aceptado.', v.estado;
  END IF;
  IF v.iniciador_id != auth.uid() AND v.receptor_id != auth.uid() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Iniciador: dio sus repetidas (ofrecidos), recibió sus necesito (pedidos)
  UPDATE public.profiles SET
    repetidas = ARRAY(SELECT UNNEST(repetidas) EXCEPT SELECT UNNEST(v.numeros_ofrecidos)),
    necesito  = ARRAY(SELECT UNNEST(necesito)  EXCEPT SELECT UNNEST(v.numeros_pedidos))
  WHERE id = v.iniciador_id;

  -- Receptor: dio sus repetidas (pedidos del otro), recibió los ofrecidos
  UPDATE public.profiles SET
    repetidas = ARRAY(SELECT UNNEST(repetidas) EXCEPT SELECT UNNEST(v.numeros_pedidos)),
    necesito  = ARRAY(SELECT UNNEST(necesito)  EXCEPT SELECT UNNEST(v.numeros_ofrecidos))
  WHERE id = v.receptor_id;

  UPDATE public.intercambios SET estado = 'terminado' WHERE id = p_intercambio_id;
END;
$$;
