-- Suspensión automática de 15 días al ser reportado un perfil.
-- Al insertar un reporte en profile_reports, el perfil reportado queda
-- bloqueado: status = 'BANNED' y suspended_until = ahora + 15 días.
-- La app comprueba suspended_until al iniciar sesión y bloquea el acceso
-- mientras la fecha esté en el futuro.
-- 1. Columna de fin de suspensión (idempotente)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;
-- 2. Trigger: al reportar un perfil, suspenderlo 15 días
CREATE OR REPLACE FUNCTION public.suspend_reported_profile() RETURNS TRIGGER AS $$ BEGIN
UPDATE public.profiles
SET status = 'BANNED',
  suspended_until = NOW() + INTERVAL '15 days'
WHERE id = NEW.reported_profile_id;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_profile_reported ON public.profile_reports;
CREATE TRIGGER on_profile_reported
AFTER
INSERT ON public.profile_reports FOR EACH ROW EXECUTE FUNCTION public.suspend_reported_profile();
-- 3. Función para el login: devuelve los datos de suspensión del usuario actual.
-- SECURITY DEFINER para que el propio usuario pueda consultar su estado aunque
-- las políticas de profiles no expongan suspended_until.
CREATE OR REPLACE FUNCTION public.get_my_suspension() RETURNS TABLE (status TEXT, suspended_until TIMESTAMPTZ) LANGUAGE sql SECURITY DEFINER
SET search_path = public AS $$
SELECT p.status,
  p.suspended_until
FROM public.profiles p
WHERE p.id = auth.uid();
$$;
-- 4. Limpieza: cuando la suspensión expira, el perfil vuelve a ACTIVE.
-- Se puede invocar desde la app tras el login o con pg_cron si está disponible.
CREATE OR REPLACE FUNCTION public.expire_profile_suspensions() RETURNS void LANGUAGE sql SECURITY DEFINER
SET search_path = public AS $$
UPDATE public.profiles
SET status = 'ACTIVE',
  suspended_until = NULL
WHERE status = 'BANNED'
  AND suspended_until IS NOT NULL
  AND suspended_until <= NOW();
$$;