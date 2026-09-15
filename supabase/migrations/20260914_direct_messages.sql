-- ==========================================
-- MIGRACIÓN: MENSAJES DIRECTOS ENTRE AMIGOS
-- ==========================================
-- Chat uno a uno desde el feed. Reutiliza el modelo del chat de sala
-- (room_messages + reply_to_message_id), pero en tablas propias: una sala exige
-- un reto, un dueño y una fecha de cierre, y una conversación entre dos amigos
-- no tiene nada de eso.
--
-- Es seguro ejecutarla más de una vez.

-- 1. TABLAS

-- Una fila por pareja de amigos. El par se guarda ORDENADO (user_low < user_high)
-- para que A->B y B->A sean la misma conversación y el UNIQUE lo garantice.
CREATE TABLE IF NOT EXISTS public.direct_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_low UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_high UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_low_last_read_at TIMESTAMPTZ,
  user_high_last_read_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_direct_conversation_order CHECK (user_low < user_high),
  CONSTRAINT uq_direct_conversation_pair UNIQUE (user_low, user_high)
);

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (trim(content) <> ''),
  reply_to_message_id UUID REFERENCES public.direct_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_direct_conversations_user_high ON public.direct_conversations(user_high);
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation_created ON public.direct_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_reply_to ON public.direct_messages(reply_to_message_id);

-- Realtime. ADD TABLE falla si la tabla ya está en la publicación, así que se
-- comprueba antes para que la migración pueda repetirse.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'direct_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
  END IF;
END $$;

ALTER TABLE public.direct_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;


-- 2. FUNCIONES DE AYUDA
-- Todas razonan sobre auth.uid() en vez de recibir el usuario por parámetro: así
-- nadie puede preguntar por conversaciones o amistades ajenas.

CREATE OR REPLACE FUNCTION public.is_direct_participant(p_conversation_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.direct_conversations
    WHERE id = p_conversation_id AND auth.uid() IN (user_low, user_high)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Solo se puede escribir mientras la amistad siga aceptada: si se eliminan como
-- amigos, el historial se sigue viendo pero ya no entran mensajes nuevos.
CREATE OR REPLACE FUNCTION public.can_send_direct_message(p_conversation_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.direct_conversations c
    JOIN public.friendships f
      ON f.status = 'ACCEPTED'
     AND LEAST(f.requester_id, f.addressee_id) = c.user_low
     AND GREATEST(f.requester_id, f.addressee_id) = c.user_high
    WHERE c.id = p_conversation_id AND auth.uid() IN (c.user_low, c.user_high)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;


-- 3. POLÍTICAS (RLS)
-- Las conversaciones no tienen INSERT/UPDATE desde el cliente: se crean y se marcan
-- como leídas solo por RPC.

DROP POLICY IF EXISTS "Participantes pueden ver su conversación" ON public.direct_conversations;
CREATE POLICY "Participantes pueden ver su conversación" ON public.direct_conversations
  FOR SELECT USING (auth.uid() IN (user_low, user_high));

DROP POLICY IF EXISTS "Participantes pueden ver mensajes directos" ON public.direct_messages;
CREATE POLICY "Participantes pueden ver mensajes directos" ON public.direct_messages
  FOR SELECT USING (public.is_direct_participant(conversation_id));

DROP POLICY IF EXISTS "Amigos pueden enviar mensajes directos" ON public.direct_messages;
CREATE POLICY "Amigos pueden enviar mensajes directos" ON public.direct_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND public.can_send_direct_message(conversation_id)
  );


-- 4. TRIGGERS

-- La respuesta debe citar un mensaje de ESTA conversación. Sin esto, alguien que
-- conozca el id de un mensaje de otro chat podría citarlo y filtrar su contenido.
CREATE OR REPLACE FUNCTION public.check_direct_message_reply()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reply_to_message_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.direct_messages
    WHERE id = NEW.reply_to_message_id AND conversation_id = NEW.conversation_id
  ) THEN
    RAISE EXCEPTION 'El mensaje citado no pertenece a esta conversación';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_check_direct_message_reply ON public.direct_messages;
CREATE TRIGGER trg_check_direct_message_reply
  BEFORE INSERT ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.check_direct_message_reply();

-- Al enviar, la conversación sube en la bandeja y el remitente la tiene leída
-- (su propio mensaje nunca debe contarle como no leído).
CREATE OR REPLACE FUNCTION public.touch_direct_conversation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.direct_conversations
  SET last_message_at = NEW.created_at,
      user_low_last_read_at = CASE WHEN user_low = NEW.sender_id THEN NEW.created_at ELSE user_low_last_read_at END,
      user_high_last_read_at = CASE WHEN user_high = NEW.sender_id THEN NEW.created_at ELSE user_high_last_read_at END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_touch_direct_conversation ON public.direct_messages;
CREATE TRIGGER trg_touch_direct_conversation
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_direct_conversation();


-- 5. RPCs

-- Devuelve la conversación con un amigo, creándola la primera vez.
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(p_friend_id UUID)
RETURNS UUID AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_conversation_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF p_friend_id IS NULL OR p_friend_id = v_uid THEN
    RAISE EXCEPTION 'Conversación no válida';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'ACCEPTED'
      AND ((requester_id = v_uid AND addressee_id = p_friend_id)
        OR (requester_id = p_friend_id AND addressee_id = v_uid))
  ) THEN
    RAISE EXCEPTION 'Solo puedes chatear con tus amigos';
  END IF;

  INSERT INTO public.direct_conversations (user_low, user_high)
  VALUES (LEAST(v_uid, p_friend_id), GREATEST(v_uid, p_friend_id))
  ON CONFLICT (user_low, user_high) DO NOTHING;

  SELECT id INTO v_conversation_id
  FROM public.direct_conversations
  WHERE user_low = LEAST(v_uid, p_friend_id) AND user_high = GREATEST(v_uid, p_friend_id);

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.mark_direct_conversation_read(p_conversation_id UUID)
RETURNS VOID AS $$
  UPDATE public.direct_conversations
  SET user_low_last_read_at = CASE WHEN user_low = auth.uid() THEN NOW() ELSE user_low_last_read_at END,
      user_high_last_read_at = CASE WHEN user_high = auth.uid() THEN NOW() ELSE user_high_last_read_at END
  WHERE id = p_conversation_id AND auth.uid() IN (user_low, user_high);
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Bandeja: TODOS los amigos aceptados, con su último mensaje si ya hablaron.
-- Primero los que tienen conversación (la más reciente arriba), después el resto
-- por nombre, para que también se pueda empezar un chat nuevo desde aquí.
CREATE OR REPLACE FUNCTION public.get_direct_inbox()
RETURNS TABLE (
  friend_id UUID,
  friend_username TEXT,
  friend_full_name TEXT,
  friend_avatar_url TEXT,
  conversation_id UUID,
  last_message TEXT,
  last_message_sender_id UUID,
  last_message_at TIMESTAMPTZ,
  unread_count INT
) AS $$
  WITH friend_ids AS (
    SELECT CASE WHEN f.requester_id = auth.uid() THEN f.addressee_id ELSE f.requester_id END AS id
    FROM public.friendships f
    WHERE f.status = 'ACCEPTED' AND auth.uid() IN (f.requester_id, f.addressee_id)
  )
  SELECT
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    c.id,
    lm.content,
    lm.sender_id,
    lm.created_at,
    COALESCE((
      SELECT count(*)::INT
      FROM public.direct_messages dm
      WHERE dm.conversation_id = c.id
        AND dm.sender_id <> auth.uid()
        AND dm.created_at > COALESCE(
          CASE WHEN c.user_low = auth.uid() THEN c.user_low_last_read_at ELSE c.user_high_last_read_at END,
          '-infinity'::TIMESTAMPTZ
        )
    ), 0)
  FROM friend_ids fi
  JOIN public.profiles p ON p.id = fi.id
  LEFT JOIN public.direct_conversations c
    ON c.user_low = LEAST(auth.uid(), fi.id) AND c.user_high = GREATEST(auth.uid(), fi.id)
  LEFT JOIN LATERAL (
    SELECT dm.content, dm.sender_id, dm.created_at
    FROM public.direct_messages dm
    WHERE dm.conversation_id = c.id
    ORDER BY dm.created_at DESC
    LIMIT 1
  ) lm ON TRUE
  ORDER BY lm.created_at DESC NULLS LAST, p.username;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Total de mensajes sin leer, para el globo del icono en el feed.
CREATE OR REPLACE FUNCTION public.get_direct_unread_count()
RETURNS INT AS $$
  SELECT count(*)::INT
  FROM public.direct_conversations c
  JOIN public.direct_messages dm ON dm.conversation_id = c.id
  WHERE auth.uid() IN (c.user_low, c.user_high)
    AND dm.sender_id <> auth.uid()
    AND dm.created_at > COALESCE(
      CASE WHEN c.user_low = auth.uid() THEN c.user_low_last_read_at ELSE c.user_high_last_read_at END,
      '-infinity'::TIMESTAMPTZ
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;


-- 6. PERMISOS
REVOKE ALL ON FUNCTION public.is_direct_participant(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_send_direct_message(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_or_create_direct_conversation(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_direct_conversation_read(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_direct_inbox() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_direct_unread_count() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_direct_participant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_send_direct_message(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_direct_conversation_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_direct_inbox() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_direct_unread_count() TO authenticated;

-- 7. RECARGAR LA API
-- Sin esto la API de Supabase puede seguir respondiendo 404 ("Could not find the
-- function ... in the schema cache") hasta que refresque sola su lista de funciones.
NOTIFY pgrst, 'reload schema';
