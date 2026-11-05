-- Oculta la fecha de nacimiento a las demás cuentas.
--
-- ORDEN: ejecutar DESPUÉS de publicar la app con este cambio. Las versiones
-- anteriores piden select('*') al cargar el perfil y esa consulta fallaría.
--
-- Postgres no tiene RLS por columna, por eso se hace con permisos de columna.
-- Una columna nueva en `profiles` hay que añadirla también a esta lista.
-- Las funciones SECURITY DEFINER (edad para recomendar) siguen leyéndola.
BEGIN;

REVOKE SELECT ON TABLE public.profiles FROM authenticated;
GRANT SELECT (
  id, full_name, username, avatar_url, points, role, status,
  created_at, updated_at, suspended_until, ban_reason, banned_at,
  ads_personalized, ads_city
) ON TABLE public.profiles TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
