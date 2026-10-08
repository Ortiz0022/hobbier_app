-- profile_reports: habilitar RLS y añadir políticas que faltaban.
-- Sin estas políticas, cualquier INSERT con el cliente anon autenticado
-- fallaba con 403: "new row violates row-level security policy for table profile_reports"
-- y los admins no podían leer/actualizar los reportes ni suspender perfiles.

ALTER TABLE public.profile_reports ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede reportar un perfil
DROP POLICY IF EXISTS "Crear reportes de perfil" ON public.profile_reports;
CREATE POLICY "Crear reportes de perfil" ON public.profile_reports
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = reporter_id
    AND reported_profile_id <> auth.uid()
  );

-- Solo admins leen los reportes de perfiles
DROP POLICY IF EXISTS "Admin ver reportes de perfil" ON public.profile_reports;
CREATE POLICY "Admin ver reportes de perfil" ON public.profile_reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Solo admins resuelven los reportes
DROP POLICY IF EXISTS "Admin gestionar reportes de perfil" ON public.profile_reports;
CREATE POLICY "Admin gestionar reportes de perfil" ON public.profile_reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Permitir a admins actualizar cualquier perfil (suspender/reactivar).
-- Sin esto, el UPDATE del admin devuelve 0 filas y PostgREST responde 406
-- ("Cannot coerce the result to a single JSON object" al usar .single()).
DROP POLICY IF EXISTS "Admin editar perfiles" ON public.profiles;
CREATE POLICY "Admin editar perfiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );
