-- Añadir columna is_toxic a los mensajes
ALTER TABLE public.room_messages ADD COLUMN IF NOT EXISTS is_toxic BOOLEAN DEFAULT false;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS is_toxic BOOLEAN DEFAULT false;
