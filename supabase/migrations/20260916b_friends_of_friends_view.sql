-- ==========================================
-- MIGRACIÓN: VER AMISTADES DE MIS AMIGOS (v2 — corrige recursión infinita)
-- ==========================================
-- La v1 de esta política consultaba `friendships` dentro de su propia política
-- de SELECT sobre `friendships`. Postgres detecta eso como recursión infinita
-- (ERROR: infinite recursion detected in policy for relation "friendships")
-- y el error se propaga a CUALQUIER consulta que toque friendships, incluidas
-- las políticas de posts y user_activities que también chequean amistad con un
-- EXISTS(... friendships ...). Por eso el perfil propio también se quedó en
-- blanco (0 retos, 0 amigos, sin fotos) al aplicar la v1.
--
-- Arreglo: una función SECURITY DEFINER que consulta friendships por fuera de
-- RLS (mismo patrón que is_direct_participant en 20260914_direct_messages.sql),
-- así la política ya no se referencia a sí misma.
--
-- Es seguro ejecutarla más de una vez.

-- 1. Deshacer la política recursiva de la v1 (si quedó aplicada)
DROP POLICY IF EXISTS "Ver amistades de mis amigos" ON public.friendships;

-- 2. Función de ayuda: ¿son a y b amigos aceptados? (bypassa RLS internamente)
CREATE OR REPLACE FUNCTION public.is_accepted_friend(a UUID, b UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'ACCEPTED'
      AND ((requester_id = a AND addressee_id = b) OR (addressee_id = a AND requester_id = b))
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.is_accepted_friend(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_accepted_friend(UUID, UUID) TO authenticated;

-- 3. Política corregida: puedo ver una amistad ACCEPTED si uno de los dos lados
-- ya es mi amigo aceptado (amigos de mis amigos), sin volver a pasar por RLS.
CREATE POLICY "Ver amistades de mis amigos" ON public.friendships FOR SELECT USING (
  status = 'ACCEPTED' AND (
    public.is_accepted_friend(auth.uid(), requester_id) OR
    public.is_accepted_friend(auth.uid(), addressee_id)
  )
);
