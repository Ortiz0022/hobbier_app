-- ==================================================
-- Solicitudes de anuncio: toda la conversación dentro de la app
-- ==================================================
-- Ya no se pide correo ni teléfono al anunciante. El equipo y el anunciante se
-- escriben en un chat propio de cada solicitud (ad_request_messages), que el
-- anunciante ve en Perfil → Mis solicitudes de anuncio y el admin en el panel.
--
-- Los mensajes directos de la app no sirven para esto: solo funcionan entre
-- amigos, y el admin no tiene por qué serlo del anunciante.
--
-- Reglas:
-- - Leen y escriben el chat solo quien envió la solicitud y los admins.
-- - Nadie edita ni borra mensajes (quedan como registro de lo acordado).
--
-- Es seguro ejecutarla más de una vez.

-- ---------- El contacto pasa a ser opcional ----------
-- Se conserva la columna para las solicitudes antiguas que ya lo tienen.
ALTER TABLE public.ad_requests ALTER COLUMN contact DROP NOT NULL;
ALTER TABLE public.ad_requests DROP CONSTRAINT IF EXISTS ad_requests_contact_check;
ALTER TABLE public.ad_requests DROP CONSTRAINT IF EXISTS chk_ad_request_contact;
ALTER TABLE public.ad_requests ADD CONSTRAINT chk_ad_request_contact
  CHECK (contact IS NULL OR char_length(contact) BETWEEN 3 AND 80);

-- ---------- Mensajes ----------
CREATE TABLE IF NOT EXISTS public.ad_request_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.ad_requests(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- true si lo escribió el equipo: así el anunciante ve "Equipo Hobbier"
  -- aunque no sepa qué admin le respondió.
  from_team BOOLEAN NOT NULL DEFAULT FALSE,
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ad_request_messages_request
  ON public.ad_request_messages (request_id, created_at);

ALTER TABLE public.ad_request_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver mensajes de solicitud de anuncio" ON public.ad_request_messages;
CREATE POLICY "Ver mensajes de solicitud de anuncio" ON public.ad_request_messages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.ad_requests r WHERE r.id = request_id AND r.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

DROP POLICY IF EXISTS "Escribir mensajes de solicitud de anuncio" ON public.ad_request_messages;
CREATE POLICY "Escribir mensajes de solicitud de anuncio" ON public.ad_request_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.ad_requests r WHERE r.id = request_id AND r.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
    )
  );

-- from_team lo decide el servidor, no quien escribe: un anunciante no puede
-- hacerse pasar por el equipo.
CREATE OR REPLACE FUNCTION public.ad_request_message_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.sender_id := auth.uid();
  NEW.from_team := EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN');
  NEW.body := btrim(NEW.body);
  NEW.created_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ad_request_message_before_insert ON public.ad_request_messages;
CREATE TRIGGER trg_ad_request_message_before_insert
  BEFORE INSERT ON public.ad_request_messages
  FOR EACH ROW EXECUTE FUNCTION public.ad_request_message_before_insert();
