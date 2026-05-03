-- ============================================================
-- LATE App · Migration 0007
-- · Cambio de INTEGER[] a TEXT[] para soportar códigos alfanuméricos
-- · Introducción de tabla user_albumes para múltiples álbumes
-- · Mensajes: cambio de intercambio_id a per-person chat
-- ============================================================

-- ============================================================
-- 1. Create user_albumes table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_albumes (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre            TEXT        NOT NULL CHECK (length(nombre) BETWEEN 1 AND 100),
  faltantes         TEXT[]      NOT NULL DEFAULT '{}',
  repetidas         TEXT[]      NOT NULL DEFAULT '{}',
  total_figuritas   INTEGER     NOT NULL DEFAULT 638 CHECK (total_figuritas BETWEEN 10 AND 2000),
  is_active         BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_active_album_per_user UNIQUE (user_id, is_active) WHERE is_active = true
);

CREATE INDEX idx_user_albumes_user_id ON public.user_albumes(user_id);
CREATE INDEX idx_user_albumes_active ON public.user_albumes(user_id, is_active);

-- Trigger para updated_at automático en user_albumes
CREATE TRIGGER trg_user_albumes_updated_at
  BEFORE UPDATE ON public.user_albumes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. Alter profiles table: convert arrays to TEXT[]
-- ============================================================

ALTER TABLE public.profiles
  ALTER COLUMN faltantes SET DATA TYPE TEXT[],
  ALTER COLUMN repetidas SET DATA TYPE TEXT[];

-- ============================================================
-- 3. Update intercambios table: convert arrays to TEXT[]
-- ============================================================

ALTER TABLE public.intercambios
  ALTER COLUMN numeros_pedidos SET DATA TYPE TEXT[],
  ALTER COLUMN numeros_ofrecidos SET DATA TYPE TEXT[];

-- ============================================================
-- 4. Update array_intersect function for TEXT[]
-- ============================================================

DROP FUNCTION IF EXISTS public.array_intersect(INTEGER[], INTEGER[]);

CREATE OR REPLACE FUNCTION public.array_intersect(a TEXT[], b TEXT[])
RETURNS TEXT[]
LANGUAGE SQL IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT ARRAY(SELECT UNNEST(a) INTERSECT SELECT UNNEST(b))
$$;

-- ============================================================
-- 5. Modify mensajes table: support per-person chats
-- ============================================================

-- Agregar columnas para per-person chat
ALTER TABLE public.mensajes
  ADD COLUMN IF NOT EXISTS sender_id UUID NOT NULL DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS recipient_id UUID,
  ADD COLUMN IF NOT EXISTS intercambio_id UUID;

-- Actualizar constraint de foreign key para que sea NULL si no hay intercambio asociado
ALTER TABLE public.mensajes
  ALTER COLUMN intercambio_id DROP NOT NULL;

-- Crear índices para per-person queries
CREATE INDEX IF NOT EXISTS idx_mensajes_conversation ON public.mensajes(
  LEAST(sender_id, recipient_id),
  GREATEST(sender_id, recipient_id),
  created_at
);

-- ============================================================
-- 6. Update RLS policies for mensajes
-- ============================================================

DROP POLICY IF EXISTS "mensajes_select" ON public.mensajes;
DROP POLICY IF EXISTS "mensajes_insert" ON public.mensajes;
DROP POLICY IF EXISTS "mensajes_delete" ON public.mensajes;

CREATE POLICY "mensajes_select" ON public.mensajes
  FOR SELECT TO authenticated USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
  );

CREATE POLICY "mensajes_insert" ON public.mensajes
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid()
  );

CREATE POLICY "mensajes_delete" ON public.mensajes
  FOR DELETE TO authenticated
  USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
  );

-- ============================================================
-- 7. Add RLS policy for user_albumes
-- ============================================================

ALTER TABLE public.user_albumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_albumes_select" ON public.user_albumes
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
  );

CREATE POLICY "user_albumes_insert" ON public.user_albumes
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "user_albumes_update" ON public.user_albumes
  FOR UPDATE TO authenticated USING (
    user_id = auth.uid()
  ) WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "user_albumes_delete" ON public.user_albumes
  FOR DELETE TO authenticated USING (
    user_id = auth.uid()
  );

-- ============================================================
-- 8. Update RPC: buscar_matches_radar para TEXT[]
-- ============================================================

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
  v_faltantes  TEXT[];
  v_repetidas  TEXT[];
  v_radio_km   INTEGER;
  v_ubicacion  GEOGRAPHY;
  v_res_ped    TEXT[];
  v_res_ofr    TEXT[];
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

-- ============================================================
-- 9. Update RPC: buscar_matches_grupo para TEXT[]
-- ============================================================

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
  v_faltantes TEXT[];
  v_repetidas TEXT[];
BEGIN
  SELECT faltantes, repetidas INTO v_faltantes, v_repetidas
  FROM public.profiles WHERE id = p_usuario_id;

  RETURN QUERY
  WITH calc AS (
    SELECT
      p.id,
      p.alias,
      public.array_intersect(p.repetidas, v_faltantes) AS ellos_tienen,
      public.array_intersect(v_repetidas, p.faltantes) AS yo_tengo
    FROM public.profiles p
    INNER JOIN public.grupo_miembros gm ON gm.usuario_id = p.id
    WHERE
      gm.grupo_id = p_grupo_id
      AND p.id != p_usuario_id
      AND (p.repetidas && v_faltantes OR v_repetidas && p.faltantes)
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

-- ============================================================
-- 10. Update RPC: finalizar_intercambio para TEXT[]
-- ============================================================

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

  -- Iniciador: dio sus repetidas (ofrecidos), recibió sus faltantes (pedidos)
  UPDATE public.profiles SET
    repetidas  = ARRAY(SELECT UNNEST(repetidas) EXCEPT SELECT UNNEST(v.numeros_ofrecidos)),
    faltantes  = ARRAY(SELECT UNNEST(faltantes) EXCEPT SELECT UNNEST(v.numeros_pedidos))
  WHERE id = v.iniciador_id;

  -- Receptor: dio sus repetidas (pedidos del otro), recibió los ofrecidos
  UPDATE public.profiles SET
    repetidas  = ARRAY(SELECT UNNEST(repetidas) EXCEPT SELECT UNNEST(v.numeros_pedidos)),
    faltantes  = ARRAY(SELECT UNNEST(faltantes) EXCEPT SELECT UNNEST(v.numeros_ofrecidos))
  WHERE id = v.receptor_id;

  UPDATE public.intercambios SET estado = 'terminado' WHERE id = p_intercambio_id;
END;
$$;

-- ============================================================
-- 11. RPC: activate_album (deactivate others, activate target)
-- ============================================================

CREATE OR REPLACE FUNCTION public.activate_album(p_user_id UUID, p_album_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.user_albumes SET is_active = false WHERE user_id = p_user_id AND is_active = true;
  UPDATE public.user_albumes SET is_active = true WHERE id = p_album_id AND user_id = p_user_id;
END;
$$;
