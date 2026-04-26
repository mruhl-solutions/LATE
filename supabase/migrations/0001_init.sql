-- ============================================================
-- LATE App · Schema v1.0
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- TIPOS
-- ============================================================

CREATE TYPE estado_intercambio AS ENUM (
  'iniciado',
  'en_curso',
  'aceptado',
  'terminado',
  'cancelado'
);

-- ============================================================
-- TABLAS
-- ============================================================

CREATE TABLE public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  alias       TEXT        NOT NULL UNIQUE CHECK (length(alias) BETWEEN 3 AND 24),
  ubicacion   GEOGRAPHY(POINT, 4326),
  radio_km    INTEGER     NOT NULL DEFAULT 10 CHECK (radio_km BETWEEN 1 AND 200),
  faltantes   INTEGER[]   NOT NULL DEFAULT '{}',
  repetidas   INTEGER[]   NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.grupos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT        NOT NULL CHECK (length(nombre) BETWEEN 3 AND 60),
  creador_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  codigo      TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.grupo_miembros (
  grupo_id    UUID        NOT NULL REFERENCES public.grupos(id)   ON DELETE CASCADE,
  usuario_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (grupo_id, usuario_id)
);

CREATE TABLE public.intercambios (
  id                UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  iniciador_id      UUID               NOT NULL REFERENCES public.profiles(id),
  receptor_id       UUID               NOT NULL REFERENCES public.profiles(id),
  numeros_pedidos   INTEGER[]          NOT NULL DEFAULT '{}',
  numeros_ofrecidos INTEGER[]          NOT NULL DEFAULT '{}',
  estado            estado_intercambio NOT NULL DEFAULT 'iniciado',
  grupo_id          UUID               REFERENCES public.grupos(id),
  created_at        TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  CONSTRAINT sin_autoswap CHECK (iniciador_id != receptor_id)
);

CREATE TABLE public.mensajes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  intercambio_id  UUID        NOT NULL REFERENCES public.intercambios(id) ON DELETE CASCADE,
  autor_id        UUID        NOT NULL REFERENCES public.profiles(id),
  contenido       TEXT        NOT NULL CHECK (length(contenido) BETWEEN 1 AND 1000),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_profiles_ubicacion  ON public.profiles USING GIST (ubicacion);
CREATE INDEX idx_profiles_faltantes  ON public.profiles USING GIN  (faltantes);
CREATE INDEX idx_profiles_repetidas  ON public.profiles USING GIN  (repetidas);
CREATE INDEX idx_intercambios_estado    ON public.intercambios (estado);
CREATE INDEX idx_intercambios_iniciador ON public.intercambios (iniciador_id);
CREATE INDEX idx_intercambios_receptor  ON public.intercambios (receptor_id);
CREATE INDEX idx_mensajes_intercambio   ON public.mensajes (intercambio_id, created_at);

-- ============================================================
-- TRIGGER: updated_at automático
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_intercambios_updated_at
  BEFORE UPDATE ON public.intercambios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_miembros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intercambios   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes       ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- GRUPOS
CREATE POLICY "grupos_select" ON public.grupos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "grupos_insert" ON public.grupos
  FOR INSERT TO authenticated WITH CHECK (creador_id = auth.uid());
CREATE POLICY "grupos_update" ON public.grupos
  FOR UPDATE TO authenticated USING (creador_id = auth.uid());
CREATE POLICY "grupos_delete" ON public.grupos
  FOR DELETE TO authenticated USING (creador_id = auth.uid());

-- GRUPO_MIEMBROS
CREATE POLICY "grupo_miembros_select" ON public.grupo_miembros
  FOR SELECT TO authenticated USING (
    usuario_id = auth.uid()
    OR grupo_id IN (
      SELECT grupo_id FROM public.grupo_miembros WHERE usuario_id = auth.uid()
    )
  );
CREATE POLICY "grupo_miembros_insert" ON public.grupo_miembros
  FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "grupo_miembros_delete" ON public.grupo_miembros
  FOR DELETE TO authenticated USING (usuario_id = auth.uid());

-- INTERCAMBIOS
CREATE POLICY "intercambios_select" ON public.intercambios
  FOR SELECT TO authenticated
  USING (iniciador_id = auth.uid() OR receptor_id = auth.uid());
CREATE POLICY "intercambios_insert" ON public.intercambios
  FOR INSERT TO authenticated WITH CHECK (iniciador_id = auth.uid());
CREATE POLICY "intercambios_update" ON public.intercambios
  FOR UPDATE TO authenticated
  USING (iniciador_id = auth.uid() OR receptor_id = auth.uid());

-- MENSAJES
CREATE POLICY "mensajes_select" ON public.mensajes
  FOR SELECT TO authenticated USING (
    intercambio_id IN (
      SELECT id FROM public.intercambios
      WHERE iniciador_id = auth.uid() OR receptor_id = auth.uid()
    )
  );
CREATE POLICY "mensajes_insert" ON public.mensajes
  FOR INSERT TO authenticated WITH CHECK (
    autor_id = auth.uid()
    AND intercambio_id IN (
      SELECT id FROM public.intercambios
      WHERE iniciador_id = auth.uid() OR receptor_id = auth.uid()
    )
  );

-- ============================================================
-- FUNCIÓN AUXILIAR: intersección de arrays
-- ============================================================

CREATE OR REPLACE FUNCTION public.array_intersect(a INTEGER[], b INTEGER[])
RETURNS INTEGER[]
LANGUAGE SQL IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT ARRAY(SELECT UNNEST(a) INTERSECT SELECT UNNEST(b))
$$;

-- ============================================================
-- RPC: actualizar_ubicacion
-- ============================================================

CREATE OR REPLACE FUNCTION public.actualizar_ubicacion(
  p_usuario_id UUID,
  p_lat        FLOAT,
  p_lng        FLOAT
)
RETURNS VOID
LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE public.profiles
  SET ubicacion = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  WHERE id = p_usuario_id;
$$;

-- ============================================================
-- RPC: buscar_matches_radar
-- ============================================================

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
-- RPC: buscar_matches_grupo
-- ============================================================

CREATE OR REPLACE FUNCTION public.buscar_matches_grupo(
  p_grupo_id   UUID,
  p_usuario_id UUID
)
RETURNS TABLE (
  usuario_id             UUID,
  alias                  TEXT,
  ellos_tienen_yo_busco  INTEGER[],
  yo_tengo_ellos_buscan  INTEGER[],
  total_coincidencias    INTEGER,
  es_bidireccional       BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_faltantes INTEGER[];
  v_repetidas INTEGER[];
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
-- RPC: finalizar_intercambio (transacción atómica)
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
