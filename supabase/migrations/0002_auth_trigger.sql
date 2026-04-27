-- ============================================================
-- LATE App · Migration 0002
-- Trigger para crear el perfil automáticamente al registrarse.
-- Esto evita el race condition con email confirmation y RLS.
-- EJECUTAR en el SQL Editor de Supabase.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_alias TEXT;
BEGIN
  v_alias := COALESCE(
    NULLIF(TRIM((NEW.raw_user_meta_data->>'alias')::text), ''),
    'usuario_' || LEFT(REPLACE(NEW.id::text, '-', ''), 8)
  );

  -- Garantizar unicidad del alias
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE alias = v_alias) LOOP
    v_alias := v_alias || '_' || LEFT(REPLACE(gen_random_uuid()::text, '-', ''), 4);
  END LOOP;

  INSERT INTO public.profiles (id, alias)
  VALUES (NEW.id, v_alias);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- No bloquear la creación del usuario si algo falla
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
