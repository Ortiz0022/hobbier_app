-- ==========================================
-- MIGRACIÓN: SALAS GRUPALES
-- ==========================================

-- 1. TABLAS
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_path TEXT,
  challenge_activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED', 'DELETED')),
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.room_members (
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.room_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT idx_unique_room_invitation UNIQUE (room_id, receiver_id)
);

CREATE TABLE IF NOT EXISTS public.room_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID UNIQUE NOT NULL, -- Identificador único de operación para idempotencia
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  points_awarded INT NOT NULL DEFAULT 0 CHECK (points_awarded >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL DEFAULT 'TEXT' CHECK (message_type IN ('TEXT', 'EVIDENCE')),
  content TEXT,
  evidence_id UUID REFERENCES public.room_evidence(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_message_content CHECK (
    (message_type = 'TEXT' AND content IS NOT NULL AND trim(content) != '') OR 
    (message_type = 'EVIDENCE' AND evidence_id IS NOT NULL)
  )
);

-- ÍNDICES ADICIONALES
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON public.room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_room_invitations_receiver_id ON public.room_invitations(receiver_id);
CREATE INDEX IF NOT EXISTS idx_room_evidence_room_id ON public.room_evidence(room_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_room_id ON public.room_messages(room_id);

-- Configuración Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;

-- Habilitar RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;


-- 2. FUNCIONES DE AYUDA (HELPER)
CREATE OR REPLACE FUNCTION public.is_room_member(p_room_id UUID, p_user_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.room_members WHERE room_id = p_room_id AND user_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 3. POLÍTICAS (RLS)

-- ROOMS (Ocultar DELETED para no-owners)
CREATE POLICY "Usuarios pueden ver salas relevantes" ON public.rooms
  FOR SELECT USING (
    (public.is_room_member(id, auth.uid()) OR 
     EXISTS (SELECT 1 FROM public.room_invitations ri WHERE ri.room_id = id AND ri.receiver_id = auth.uid() AND ri.status = 'PENDING'))
    AND status != 'DELETED'
    OR owner_id = auth.uid()
  );

-- ROOM MEMBERS
CREATE POLICY "Miembros pueden ver a los miembros" ON public.room_members
  FOR SELECT USING (
    public.is_room_member(room_id, auth.uid())
  );

-- ROOM INVITATIONS
CREATE POLICY "Usuarios pueden ver sus invitaciones" ON public.room_invitations
  FOR SELECT USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

-- ROOM EVIDENCE
CREATE POLICY "Miembros pueden ver evidencias" ON public.room_evidence
  FOR SELECT USING (
    public.is_room_member(room_id, auth.uid())
  );
-- Bloqueamos INSERT en room_evidence desde el cliente (solo RPC).

-- ROOM MESSAGES
CREATE POLICY "Miembros pueden ver mensajes" ON public.room_messages
  FOR SELECT USING (
    public.is_room_member(room_id, auth.uid())
  );

CREATE POLICY "Miembros pueden insertar mensajes de texto si sala esta activa" ON public.room_messages
  FOR INSERT WITH CHECK (
    message_type = 'TEXT' 
    AND sender_id = auth.uid() 
    AND public.is_room_member(room_id, auth.uid())
    AND EXISTS (SELECT 1 FROM public.rooms WHERE id = room_id AND status = 'ACTIVE' AND (end_at IS NULL OR end_at > NOW()))
  );


-- 4. BUCKET DE STORAGE

-- BUCKET: room-evidence
INSERT INTO storage.buckets (id, name, public) VALUES ('room-evidence', 'room-evidence', false) ON CONFLICT DO NOTHING;

CREATE POLICY "Usuarios pueden subir evidencia" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'room-evidence' AND auth.uid() = owner);

CREATE POLICY "Autores pueden borrar su evidencia" ON storage.objects
  FOR DELETE USING (bucket_id = 'room-evidence' AND auth.uid() = owner);

CREATE POLICY "Miembros pueden ver imágenes de su sala" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'room-evidence' AND 
    public.is_room_member((string_to_array(name, '/'))[1]::UUID, auth.uid())
  );

-- BUCKET: room-images (para el cover/imagen de la sala)
INSERT INTO storage.buckets (id, name, public) VALUES ('room-images', 'room-images', false) ON CONFLICT DO NOTHING;

CREATE POLICY "Owners pueden subir imagen de sala" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'room-images' AND 
    EXISTS (SELECT 1 FROM public.rooms WHERE id = (string_to_array(name, '/'))[1]::UUID AND owner_id = auth.uid())
  );

CREATE POLICY "Owners pueden modificar imagen de sala" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'room-images' AND 
    EXISTS (SELECT 1 FROM public.rooms WHERE id = (string_to_array(name, '/'))[1]::UUID AND owner_id = auth.uid())
  );

CREATE POLICY "Owners pueden borrar imagen de sala" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'room-images' AND 
    EXISTS (SELECT 1 FROM public.rooms WHERE id = (string_to_array(name, '/'))[1]::UUID AND owner_id = auth.uid())
  );

CREATE POLICY "Miembros e invitados pueden ver imagen de sala" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'room-images' AND 
    (
      public.is_room_member((string_to_array(name, '/'))[1]::UUID, auth.uid()) OR
      EXISTS (SELECT 1 FROM public.room_invitations WHERE room_id = (string_to_array(name, '/'))[1]::UUID AND receiver_id = auth.uid() AND status = 'PENDING')
    )
  );


-- 5. FUNCIONES SEGURAS (RPC)

-- Crear sala
CREATE OR REPLACE FUNCTION public.create_room_with_owner(
  p_name TEXT,
  p_activity_id UUID,
  p_end_at TIMESTAMPTZ DEFAULT NULL,
  p_image_path TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_room_id UUID;
BEGIN
  IF p_end_at IS NOT NULL AND p_end_at <= NOW() THEN
    RAISE EXCEPTION 'end_at debe ser una fecha futura';
  END IF;

  INSERT INTO public.rooms (owner_id, name, challenge_activity_id, end_at, image_path, status)
  VALUES (auth.uid(), p_name, p_activity_id, p_end_at, p_image_path, 'ACTIVE')
  RETURNING id INTO v_room_id;

  INSERT INTO public.room_members (room_id, user_id, role)
  VALUES (v_room_id, auth.uid(), 'ADMIN');

  RETURN v_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Invitar amigo
CREATE OR REPLACE FUNCTION public.invite_friend_to_room(
  p_room_id UUID,
  p_receiver_id UUID
) RETURNS UUID AS $$
DECLARE
  v_invitation_id UUID;
  v_is_friend BOOLEAN;
  v_is_admin BOOLEAN;
  v_already_member BOOLEAN;
BEGIN
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


-- Aceptar invitación
CREATE OR REPLACE FUNCTION public.accept_room_invitation(
  p_invitation_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_room RECORD;
BEGIN
  -- Validar que la invitación existe, está PENDING y pertenece al auth.uid
  IF NOT EXISTS (SELECT 1 FROM public.room_invitations WHERE id = p_invitation_id AND receiver_id = auth.uid() AND status = 'PENDING') THEN
    RAISE EXCEPTION 'Invitación no encontrada o inválida';
  END IF;

  -- Obtener sala asociada
  SELECT r.* INTO v_room FROM public.rooms r
  JOIN public.room_invitations ri ON ri.room_id = r.id
  WHERE ri.id = p_invitation_id;

  -- Validar estado de la sala
  IF v_room.status != 'ACTIVE' OR (v_room.end_at IS NOT NULL AND v_room.end_at <= NOW()) THEN
    RAISE EXCEPTION 'No puedes aceptar la invitación. La sala ya ha finalizado o está inactiva.';
  END IF;

  UPDATE public.room_invitations
  SET status = 'ACCEPTED', updated_at = NOW()
  WHERE id = p_invitation_id;

  INSERT INTO public.room_members (room_id, user_id, role)
  VALUES (v_room.id, auth.uid(), 'MEMBER')
  ON CONFLICT DO NOTHING;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Rechazar invitación
CREATE OR REPLACE FUNCTION public.reject_room_invitation(
  p_invitation_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.room_invitations
  SET status = 'REJECTED', updated_at = NOW()
  WHERE id = p_invitation_id AND receiver_id = auth.uid() AND status = 'PENDING';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitación no encontrada o inválida';
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Cerrar sala (solo owner)
CREATE OR REPLACE FUNCTION public.close_room(
  p_room_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.rooms
  SET status = 'CLOSED', updated_at = NOW()
  WHERE id = p_room_id AND owner_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No tienes permiso o la sala no existe';
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Eliminar sala (solo owner, borrado lógico)
CREATE OR REPLACE FUNCTION public.delete_room(
  p_room_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.rooms
  SET status = 'DELETED', updated_at = NOW()
  WHERE id = p_room_id AND owner_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No tienes permiso o la sala no existe';
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Enviar evidencia (Idempotencia mediante request_id)
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
BEGIN
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

  -- Obtener puntos de la actividad
  SELECT points_awarded INTO v_points FROM public.activities WHERE id = v_activity_id;

  -- Insertar evidencia (Fallará si request_id ya existe, previniendo duplicados exactos)
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


-- Obtener ranking de la sala
CREATE OR REPLACE FUNCTION public.get_room_ranking(
  p_room_id UUID
) RETURNS TABLE (
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  total_points BIGINT
) AS $$
BEGIN
  IF NOT public.is_room_member(p_room_id, auth.uid()) THEN
    RAISE EXCEPTION 'No eres miembro de esta sala';
  END IF;

  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    COALESCE(SUM(re.points_awarded), 0)::BIGINT as total_points
  FROM public.room_members rm
  JOIN public.profiles p ON p.id = rm.user_id
  LEFT JOIN public.room_evidence re ON re.room_id = p_room_id AND re.user_id = rm.user_id
  WHERE rm.room_id = p_room_id
  GROUP BY p.id, p.username, p.full_name, p.avatar_url
  ORDER BY total_points DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 6. RPC PARA INVITACIONES PENDIENTES
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
    AND r.status != 'DELETED';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- PERMISOS
GRANT EXECUTE ON FUNCTION public.create_room_with_owner TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_friend_to_room TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_room_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_room_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_room TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_room TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_room_evidence TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_room_ranking TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_room_invitations TO authenticated;
