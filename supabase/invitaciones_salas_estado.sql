-- ============================================================
-- INVITACIONES A SALAS: SABER SI LA SALA YA TERMINÓ
-- ============================================================
-- Problema: get_pending_room_invitations solo descarta las salas DELETED, así
-- que una sala CLOSED o con la fecha ya pasada sigue llegando a la app como
-- invitación normal. Al aceptarla, accept_room_invitation la rechaza ("La sala
-- no está activa"), o sea que era una invitación imposible de aceptar.
--
-- Arreglo: devolver también r.status. Con eso la app distingue la invitación
-- que todavía se puede aceptar de la que solo merece un aviso de "esta sala ya
-- finalizó". Las DELETED se siguen ocultando por completo.
--
-- No se filtran aquí las salas terminadas a propósito: la invitación tiene que
-- llegar para poder avisar al usuario y que él la descarte (reject_room_invitation).
--
-- OPCIONAL: la app ya se apaña sin esto. roomsService.getPendingInvitations
-- consulta el estado de las salas por su cuenta (la RLS de rooms deja verlas a
-- quien tiene una invitación pendiente). Aplicar este script ahorra esa segunda
-- consulta y deja la RPC completa.
--
-- Cambia el tipo de retorno, así que hay que borrar la función antes de crearla.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_pending_room_invitations();

CREATE FUNCTION public.get_pending_room_invitations()
RETURNS TABLE (
  invitation_id UUID,
  room_id UUID,
  room_name TEXT,
  room_image_path TEXT,
  room_end_at TIMESTAMPTZ,
  room_status TEXT,
  challenge_title TEXT,
  sender_username TEXT,
  sender_avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ri.id AS invitation_id,
    r.id AS room_id,
    r.name AS room_name,
    r.image_path AS room_image_path,
    r.end_at AS room_end_at,
    r.status AS room_status,
    a.title AS challenge_title,
    p.username AS sender_username,
    p.avatar_url AS sender_avatar_url
  FROM public.room_invitations ri
  JOIN public.rooms r ON r.id = ri.room_id
  JOIN public.activities a ON a.id = r.challenge_activity_id
  JOIN public.profiles p ON p.id = ri.sender_id
  WHERE ri.receiver_id = auth.uid()
    AND ri.status = 'PENDING'
    AND r.status != 'DELETED';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_pending_room_invitations TO authenticated;

-- Para que la API vea el nuevo campo sin esperar a que caduque la caché.
NOTIFY pgrst, 'reload schema';
