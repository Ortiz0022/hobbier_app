-- ==========================================
-- PATCH 2: HARDENING DE SALAS GRUPALES
-- ==========================================

-- 1. REVOKE PUBLIC EXECUTE de todas las funciones
REVOKE EXECUTE ON FUNCTION public.create_room_with_owner(TEXT, UUID, TIMESTAMPTZ, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.invite_friend_to_room(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accept_room_invitation(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_room_invitation(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.close_room(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_room(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_room_evidence(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_room_ranking(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_pending_room_invitations() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_room_image_path(UUID, TEXT) FROM PUBLIC;


-- 2. submit_room_evidence (Idempotencia y validación de storage)
CREATE OR REPLACE FUNCTION public.submit_room_evidence(
  p_room_id UUID,
  p_image_path TEXT,
  p_request_id UUID
) RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
  v_points INT;
  v_evidence_id UUID;
  v_message_id UUID;
  v_room RECORD;
  v_expected_path TEXT;
BEGIN
  -- Idempotencia real: buscar si ya existe la petición
  SELECT id INTO v_evidence_id FROM public.room_evidence WHERE request_id = p_request_id;
  
  IF FOUND THEN
    -- Validar que corresponda al mismo usuario y sala
    IF NOT EXISTS (SELECT 1 FROM public.room_evidence WHERE id = v_evidence_id AND room_id = p_room_id AND user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Idempotencia: El request_id existe pero no corresponde a este usuario o sala';
    END IF;
    
    -- Devolver el mensaje existente
    SELECT id INTO v_message_id FROM public.room_messages WHERE evidence_id = v_evidence_id;
    RETURN v_message_id;
  END IF;

  -- Validar ruta esperada
  v_expected_path := p_room_id::TEXT || '/' || auth.uid()::TEXT || '/' || p_request_id::TEXT || '.jpg';
  
  IF p_image_path != v_expected_path THEN
    RAISE EXCEPTION 'La ruta de la imagen no coincide con el formato esperado';
  END IF;

  -- Validar existencia en storage
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'room-evidence' AND name = v_expected_path) THEN
    RAISE EXCEPTION 'No se encontró la imagen subida en Storage';
  END IF;

  -- Validar si la sala está activa y en tiempo
  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id;
  
  IF v_room.id IS NULL OR v_room.status != 'ACTIVE' OR (v_room.end_at IS NOT NULL AND v_room.end_at <= NOW()) THEN
    RAISE EXCEPTION 'La sala está finalizada o inactiva';
  END IF;

  -- Validar membresía
  IF NOT public.is_room_member(p_room_id, auth.uid()) THEN
    RAISE EXCEPTION 'No eres miembro de esta sala';
  END IF;

  v_activity_id := v_room.challenge_activity_id;

  -- Obtener puntos de la actividad (points_awarded existe)
  SELECT points_awarded INTO v_points FROM public.activities WHERE id = v_activity_id;

  -- Insertar evidencia
  INSERT INTO public.room_evidence (request_id, room_id, user_id, activity_id, image_path, points_awarded)
  VALUES (p_request_id, p_room_id, auth.uid(), v_activity_id, p_image_path, v_points)
  RETURNING id INTO v_evidence_id;

  -- Insertar mensaje
  INSERT INTO public.room_messages (room_id, sender_id, message_type, evidence_id)
  VALUES (p_room_id, auth.uid(), 'EVIDENCE', v_evidence_id)
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 3. close_room (ACTIVE -> CLOSED)
CREATE OR REPLACE FUNCTION public.close_room(
  p_room_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.rooms
  SET status = 'CLOSED', updated_at = NOW()
  WHERE id = p_room_id AND owner_id = auth.uid() AND status = 'ACTIVE';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No tienes permiso, la sala no existe o ya no está activa';
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 4. delete_room (ACTIVE/CLOSED -> DELETED)
CREATE OR REPLACE FUNCTION public.delete_room(
  p_room_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.rooms
  SET status = 'DELETED', updated_at = NOW()
  WHERE id = p_room_id AND owner_id = auth.uid() AND status IN ('ACTIVE', 'CLOSED');
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No tienes permiso, la sala no existe o ya fue eliminada';
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 5. invite_friend_to_room (Comprobar ACTIVE y end_at)
CREATE OR REPLACE FUNCTION public.invite_friend_to_room(
  p_room_id UUID,
  p_receiver_id UUID
) RETURNS UUID AS $$
DECLARE
  v_invitation_id UUID;
  v_is_friend BOOLEAN;
  v_is_admin BOOLEAN;
  v_already_member BOOLEAN;
  v_room RECORD;
BEGIN
  -- Validar estado de la sala
  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id;
  IF v_room.id IS NULL OR v_room.status != 'ACTIVE' OR (v_room.end_at IS NOT NULL AND v_room.end_at <= NOW()) THEN
    RAISE EXCEPTION 'No se pueden enviar invitaciones: la sala está finalizada o inactiva';
  END IF;

  -- Verificar que el sender es ADMIN
  SELECT EXISTS (SELECT 1 FROM public.room_members WHERE room_id = p_room_id AND user_id = auth.uid() AND role = 'ADMIN') INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Solo los administradores pueden invitar usuarios a esta sala';
  END IF;

  -- Verificar si ya es miembro
  SELECT EXISTS (SELECT 1 FROM public.room_members WHERE room_id = p_room_id AND user_id = p_receiver_id) INTO v_already_member;
  IF v_already_member THEN
    RAISE EXCEPTION 'El usuario ya es miembro de la sala';
  END IF;

  -- Verificar amistad
  SELECT EXISTS (
    SELECT 1 FROM public.friendships 
    WHERE status = 'ACCEPTED' 
    AND ((requester_id = auth.uid() AND addressee_id = p_receiver_id) OR (requester_id = p_receiver_id AND addressee_id = auth.uid()))
  ) INTO v_is_friend;
  
  IF NOT v_is_friend THEN
    RAISE EXCEPTION 'Solo puedes invitar a tus amigos';
  END IF;

  INSERT INTO public.room_invitations (room_id, sender_id, receiver_id, status)
  VALUES (p_room_id, auth.uid(), p_receiver_id, 'PENDING')
  ON CONFLICT (room_id, receiver_id) DO UPDATE SET status = 'PENDING', sender_id = auth.uid(), updated_at = NOW()
  RETURNING id INTO v_invitation_id;

  RETURN v_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 6. get_pending_room_invitations (filtrar activas)
CREATE OR REPLACE FUNCTION public.get_pending_room_invitations()
RETURNS TABLE (
  invitation_id UUID,
  room_id UUID,
  room_name TEXT,
  room_image_path TEXT,
  room_end_at TIMESTAMPTZ,
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
    a.title AS challenge_title,
    p.username AS sender_username,
    p.avatar_url AS sender_avatar_url
  FROM public.room_invitations ri
  JOIN public.rooms r ON r.id = ri.room_id
  JOIN public.activities a ON a.id = r.challenge_activity_id
  JOIN public.profiles p ON p.id = ri.sender_id
  WHERE ri.receiver_id = auth.uid() 
    AND ri.status = 'PENDING'
    AND r.status = 'ACTIVE'
    AND (r.end_at IS NULL OR r.end_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 7. RE-GRANT EXECUTE TO authenticated
GRANT EXECUTE ON FUNCTION public.create_room_with_owner(TEXT, UUID, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_friend_to_room(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_room_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_room_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_room(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_room(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_room_evidence(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_room_ranking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_room_invitations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_room_image_path(UUID, TEXT) TO authenticated;
