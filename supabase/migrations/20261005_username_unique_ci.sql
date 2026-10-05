-- ==================================================
-- Nombres de usuario únicos SIN distinguir mayúsculas
-- ==================================================
-- La restricción UNIQUE de profiles.username distingue mayúsculas: "AngeOrtiz"
-- y "angeortiz" convivían como usuarios distintos. La app ya comprueba sin
-- distinguirlas, pero la garantía real tiene que estar en la base: dos registros
-- simultáneos, o una llamada directa a la API, se saltan cualquier chequeo del
-- cliente.

-- 1. Si ya hay nombres repetidos que solo difieren en mayúsculas, el índice no
--    se puede crear. Se detiene aquí con la lista para resolverlos a mano
--    (renombrar uno de cada par) y volver a ejecutar.
DO $$
DECLARE
  v_duplicados TEXT;
BEGIN
  SELECT string_agg(nombres, '; ')
  INTO v_duplicados
  FROM (
    SELECT string_agg(username, ', ') AS nombres
    FROM public.profiles
    GROUP BY lower(username)
    HAVING COUNT(*) > 1
  ) d;

  IF v_duplicados IS NOT NULL THEN
    RAISE EXCEPTION 'Hay nombres de usuario repetidos (solo cambian mayúsculas): %. Renombra uno de cada grupo y vuelve a ejecutar.', v_duplicados;
  END IF;
END $$;

-- 2. Índice único sobre el nombre en minúsculas.
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower
  ON public.profiles (lower(username));

-- 3. Guardar siempre en minúsculas, venga de donde venga el alta.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, birth_date, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    lower(trim(COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTRING(NEW.id::text, 1, 8)))),
    COALESCE((NEW.raw_user_meta_data->>'birth_date')::DATE, '2000-01-01'::DATE),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'role', 'USER')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
