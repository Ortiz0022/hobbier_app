-- ==================================================
-- Eliminar una conversación individual (solo para mí)
-- ==================================================
-- Igual que "Vaciar chat" en WhatsApp: quien la elimina deja de ver todos los
-- mensajes hasta ese momento, pero la otra persona conserva su copia. Por eso
-- NO se borran filas: se guarda, por participante, desde cuándo la vació
-- (user_low_cleared_at / user_high_cleared_at, mismo patrón que last_read_at).
--
-- El filtro vive en la política de SELECT de direct_messages, no en la app: así
-- tampoco llegan los mensajes viejos por la API ni por Realtime. Si después
-- llega un mensaje nuevo, la conversación vuelve a aparecer solo con lo nuevo.
--
-- De paso, get_direct_inbox devuelve last_message_is_toxic: la bandeja ya lo
-- leía para ocultar la vista previa de un mensaje moderado, pero la función no
-- lo mandaba y la vista previa salía tal cual.
--
-- Es seguro ejecutarla más de una vez.

ALTER TABLE public.direct_conversations ADD COLUMN IF NOT EXISTS user_low_cleared_at TIMESTAMPTZ;
ALTER TABLE public.direct_conversations ADD COLUMN IF NOT EXISTS user_high_cleared_at TIMESTAMPTZ;

-- Desde cuándo veo esta conversación. -infinity si nunca la vacié.
CREATE OR REPLACE FUNCTION public.direct_visible_since(p_conversation_id UUID)
RETURNS TIMESTAMPTZ AS $$
  SELECT COALESCE(
    (SELECT CASE WHEN c.user_low = auth.uid() THEN c.user_low_cleared_at ELSE c.user_high_cleared_at END
     FROM public.direct_conversations c
     WHERE c.id = p_conversation_id),
    '-infinity'::TIMESTAMPTZ
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Participantes pueden ver mensajes directos" ON public.direct_messages;
CREATE POLICY "Participantes pueden ver mensajes directos" ON public.direct_messages
  FOR SELECT USING (
    public.is_direct_participant(conversation_id)
    AND created_at > public.direct_visible_since(conversation_id)
  );

-- Vaciar la conversación para el usuario actual. También la marca como leída:
-- lo eliminado no debe seguir contando como no leído en el globo del feed.
CREATE OR REPLACE FUNCTION public.clear_direct_conversation(p_conversation_id UUID)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  UPDATE public.direct_conversations
  SET user_low_cleared_at = CASE WHEN user_low = auth.uid() THEN NOW() ELSE user_low_cleared_at END,
      user_high_cleared_at = CASE WHEN user_high = auth.uid() THEN NOW() ELSE user_high_cleared_at END,
      user_low_last_read_at = CASE WHEN user_low = auth.uid() THEN NOW() ELSE user_low_last_read_at END,
      user_high_last_read_at = CASE WHEN user_high = auth.uid() THEN NOW() ELSE user_high_last_read_at END
  WHERE id = p_conversation_id AND auth.uid() IN (user_low, user_high);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La conversación no existe o no participas en ella';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- La bandeja: igual que antes, pero el último mensaje y los no leídos solo
-- cuentan lo posterior a mi vaciado. Cambia lo que devuelve, así que hay que
-- borrarla antes de crearla (CREATE OR REPLACE no admite otro RETURNS TABLE).
DROP FUNCTION IF EXISTS public.get_direct_inbox();
CREATE FUNCTION public.get_direct_inbox()
RETURNS TABLE (
  friend_id UUID,
  friend_username TEXT,
  friend_full_name TEXT,
  friend_avatar_url TEXT,
  conversation_id UUID,
  last_message TEXT,
  last_message_sender_id UUID,
  last_message_at TIMESTAMPTZ,
  last_message_is_toxic BOOLEAN,
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
    COALESCE(lm.is_toxic, FALSE),
    COALESCE((
      SELECT count(*)::INT
      FROM public.direct_messages dm
      WHERE dm.conversation_id = c.id
        AND dm.sender_id <> auth.uid()
        AND dm.created_at > GREATEST(
          COALESCE(CASE WHEN c.user_low = auth.uid() THEN c.user_low_last_read_at ELSE c.user_high_last_read_at END, '-infinity'::TIMESTAMPTZ),
          COALESCE(CASE WHEN c.user_low = auth.uid() THEN c.user_low_cleared_at ELSE c.user_high_cleared_at END, '-infinity'::TIMESTAMPTZ)
        )
    ), 0)
  FROM friend_ids fi
  JOIN public.profiles p ON p.id = fi.id
  LEFT JOIN public.direct_conversations c
    ON c.user_low = LEAST(auth.uid(), fi.id) AND c.user_high = GREATEST(auth.uid(), fi.id)
  LEFT JOIN LATERAL (
    SELECT dm.content, dm.sender_id, dm.created_at, dm.is_toxic
    FROM public.direct_messages dm
    WHERE dm.conversation_id = c.id
      AND dm.created_at > COALESCE(
        CASE WHEN c.user_low = auth.uid() THEN c.user_low_cleared_at ELSE c.user_high_cleared_at END,
        '-infinity'::TIMESTAMPTZ
      )
    ORDER BY dm.created_at DESC
    LIMIT 1
  ) lm ON TRUE
  ORDER BY lm.created_at DESC NULLS LAST, p.username;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_direct_unread_count()
RETURNS INT AS $$
  SELECT count(*)::INT
  FROM public.direct_conversations c
  JOIN public.direct_messages dm ON dm.conversation_id = c.id
  WHERE auth.uid() IN (c.user_low, c.user_high)
    AND dm.sender_id <> auth.uid()
    AND dm.created_at > GREATEST(
      COALESCE(CASE WHEN c.user_low = auth.uid() THEN c.user_low_last_read_at ELSE c.user_high_last_read_at END, '-infinity'::TIMESTAMPTZ),
      COALESCE(CASE WHEN c.user_low = auth.uid() THEN c.user_low_cleared_at ELSE c.user_high_cleared_at END, '-infinity'::TIMESTAMPTZ)
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.direct_visible_since(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clear_direct_conversation(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_direct_inbox() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_direct_unread_count() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.direct_visible_since(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_direct_conversation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_direct_inbox() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_direct_unread_count() TO authenticated;

NOTIFY pgrst, 'reload schema';
