-- ============================================================
-- SALIR DE UNA SALA
-- ============================================================
-- Problema: quien no es el anfitrión se quedaba la sala en su lista para
-- siempre, incluso con el reto ya terminado. El anfitrión puede eliminarla
-- (delete_room), pero el resto de miembros no tenía ninguna salida:
-- room_members solo tiene política de SELECT, así que un DELETE desde la app
-- no borra nada (la RLS lo descarta en silencio y la app creería que funcionó).
--
-- Arreglo: una RPC que quita la membresía de quien la llama. Al dejar de ser
-- miembro, getMyRooms ya no devuelve la sala y desaparece de su lista; el resto
-- de la sala (ranking, evidencias, mensajes) se queda igual para los demás.
--
-- Regla: el anfitrión no puede salirse de su propia sala, que se quedaría sin
-- dueño; para eso está "Eliminar sala". Cualquier otro miembro puede salirse
-- cuando quiera, con el reto terminado o en marcha, igual que lo ofrece la app.
-- Si se va a mitad de un reto, desaparece del ranking y pierde el acceso al
-- chat y a las evidencias de esa sala: es lo que se le avisa antes de salir.
--
-- La invitación aceptada se queda en room_invitations: invite_friend_to_room
-- hace ON CONFLICT DO UPDATE, así que a esta persona se la puede volver a
-- invitar sin problema.
--
-- Se puede volver a ejecutar las veces que haga falta.
-- ============================================================
CREATE OR REPLACE FUNCTION public.leave_room(p_room_id UUID) RETURNS BOOLEAN AS $$
DECLARE v_room RECORD;
BEGIN
SELECT * INTO v_room
FROM public.rooms
WHERE id = p_room_id;
IF NOT FOUND THEN RAISE EXCEPTION 'La sala no existe';
END IF;
IF v_room.owner_id = auth.uid() THEN RAISE EXCEPTION 'El anfitrión no puede salirse de su propia sala. Elimínala en su lugar.';
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM public.room_members
  WHERE room_id = p_room_id
    AND user_id = auth.uid()
) THEN RAISE EXCEPTION 'No eres miembro de esta sala';
END IF;
DELETE FROM public.room_members
WHERE room_id = p_room_id
  AND user_id = auth.uid();
RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
GRANT EXECUTE ON FUNCTION public.leave_room TO authenticated;
-- Para que la API vea la función nueva sin esperar a que caduque la caché.
NOTIFY pgrst,
'reload schema';