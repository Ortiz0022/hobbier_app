-- ==========================================
-- Responder a un mensaje específico del chat de sala
-- ==========================================

ALTER TABLE public.room_messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES public.room_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_room_messages_reply_to ON public.room_messages(reply_to_message_id);
