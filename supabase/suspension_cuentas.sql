-- ============================================================
-- SUSPENSIÓN DE CUENTAS POR REPORTE (lote completo)
-- ============================================================
-- Esto es lo que la app espera encontrar y HOY NO ESTÁ en la base:
--
--   rpc/get_my_suspension          -> 404 "Could not find the function
--                                    public.get_my_suspension without parameters"
--   profiles.suspended_until       -> 400 "Could not find the 'suspended_until'
--                                    column of 'profiles' in the schema cache"
--
-- Sin la columna, suspender a alguien desde el panel falla; y sin la función,
-- la app no puede comprobar si una cuenta está suspendida, así que el bloqueo
-- al entrar y el cierre de sesión a mitad de uso no se activan nunca.
--
-- Reúne las dos migraciones de 2026-10-07 en un solo lote para pegarlo entero
-- en el SQL Editor. Es idempotente: se puede correr las veces que haga falta.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Columnas de estado en el perfil
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE'
  CHECK (status IN ('ACTIVE', 'BANNED'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;

-- ------------------------------------------------------------
-- 2. Tabla de reportes de perfil (por si tampoco está)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_unique_profile_report UNIQUE (reported_profile_id, reporter_id)
);

ALTER TABLE public.profile_reports ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede reportar un perfil que no sea el suyo
DROP POLICY IF EXISTS "Crear reportes de perfil" ON public.profile_reports;
CREATE POLICY "Crear reportes de perfil" ON public.profile_reports
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = reporter_id
    AND reported_profile_id <> auth.uid()
  );

-- Solo los administradores los leen y los resuelven
DROP POLICY IF EXISTS "Admin ver reportes de perfil" ON public.profile_reports;
CREATE POLICY "Admin ver reportes de perfil" ON public.profile_reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

DROP POLICY IF EXISTS "Admin gestionar reportes de perfil" ON public.profile_reports;
CREATE POLICY "Admin gestionar reportes de perfil" ON public.profile_reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Y pueden editar cualquier perfil, que es como se suspende y se reactiva
DROP POLICY IF EXISTS "Admin editar perfiles" ON public.profiles;
CREATE POLICY "Admin editar perfiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ------------------------------------------------------------
-- 3. Al reportar un perfil, queda suspendido 15 días
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.suspend_reported_profile()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET status = 'BANNED',
      suspended_until = NOW() + INTERVAL '15 days'
  WHERE id = NEW.reported_profile_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_profile_reported ON public.profile_reports;
CREATE TRIGGER on_profile_reported
  AFTER INSERT ON public.profile_reports
  FOR EACH ROW EXECUTE FUNCTION public.suspend_reported_profile();

-- ------------------------------------------------------------
-- 4. Lo que consulta la app al entrar y mientras la sesión está abierta
-- ------------------------------------------------------------
-- SECURITY DEFINER para que cada quien pueda ver SU estado aunque las
-- políticas de lectura de profiles no expongan suspended_until.
CREATE OR REPLACE FUNCTION public.get_my_suspension()
RETURNS TABLE (status TEXT, suspended_until TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p.status, p.suspended_until
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_suspension TO authenticated;

-- ------------------------------------------------------------
-- 5. Limpieza al vencer el plazo
-- ------------------------------------------------------------
-- No es imprescindible: la app considera suspendida una cuenta solo si la
-- fecha sigue en el futuro, así que al vencer ya puede entrar. Esto deja
-- además la columna limpia; se puede llamar a mano o con pg_cron.
CREATE OR REPLACE FUNCTION public.expire_profile_suspensions()
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles
  SET status = 'ACTIVE', suspended_until = NULL
  WHERE status = 'BANNED'
    AND suspended_until IS NOT NULL
    AND suspended_until <= NOW();
$$;

GRANT EXECUTE ON FUNCTION public.expire_profile_suspensions TO authenticated;

-- ------------------------------------------------------------
-- 6. Que la API vea la columna y la función sin esperar a la caché
-- ------------------------------------------------------------
-- Esto es justo lo que faltaba en la migración original: sin el NOTIFY,
-- PostgREST sigue respondiendo "column ... in the schema cache" un buen rato.
NOTIFY pgrst, 'reload schema';
