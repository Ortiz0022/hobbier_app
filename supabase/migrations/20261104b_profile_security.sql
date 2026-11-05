-- Seguridad de perfiles. Se puede ejecutar en cualquier momento: no afecta a la
-- versión publicada de la app. Ejecutar completa en el SQL Editor de Supabase.
BEGIN;

-- 1. El rol nunca sale de los metadatos del registro, que los escribe el cliente:
--    con ellos cualquiera podía registrarse directamente como administrador.
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
    'USER'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. "Editar perfil propio" no limita columnas, así que una llamada directa a la
--    API podía cambiar el rol, los puntos o quitarse una sanción.
--    Debe seguir siendo SECURITY INVOKER: dentro de una función SECURITY DEFINER
--    (dar puntos, sancionar) current_user es el dueño y la comprobación no aplica.
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  -- Ni siquiera un administrador los cambia con un UPDATE directo.
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.points IS DISTINCT FROM OLD.points
     OR NEW.birth_date IS DISTINCT FROM OLD.birth_date
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Esta columna del perfil solo se cambia desde el servidor'
      USING ERRCODE = '42501';
  END IF;

  -- Rol y sanciones: solo el panel de administración.
  IF (NEW.role IS DISTINCT FROM OLD.role
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.suspended_until IS DISTINCT FROM OLD.suspended_until
      OR NEW.ban_reason IS DISTINCT FROM OLD.ban_reason
      OR NEW.banned_at IS DISTINCT FROM OLD.banned_at)
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles
       WHERE id = auth.uid() AND role = 'ADMIN'
     ) THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar el rol o las sanciones'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_profile_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

-- 3. Sin sesión solo hace falta comprobar si un usuario está libre al registrarse.
--    `role` se mantiene porque las políticas de otras tablas lo consultan.
REVOKE ALL ON TABLE public.profiles FROM anon;
GRANT SELECT (id, username, role) ON TABLE public.profiles TO anon;

-- 4. Un reporte no puede dejar fuera a un administrador ni sancionar a quien
--    se reporta a sí mismo. La regla para el resto de cuentas no cambia.
CREATE OR REPLACE FUNCTION public.suspend_reported_profile()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET status = 'BANNED',
      suspended_until = NULL,
      ban_reason = 'Reporte de la comunidad: ' || COALESCE(NULLIF(btrim(NEW.reason), ''), 'sin detalle'),
      banned_at = NOW()
  WHERE id = NEW.reported_profile_id
    AND id IS DISTINCT FROM NEW.reporter_id
    AND role <> 'ADMIN';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;

NOTIFY pgrst, 'reload schema';
