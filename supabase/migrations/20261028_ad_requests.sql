-- ==================================================
-- Solicitudes de anuncio: un negocio pide anunciarse desde Descubre
-- ==================================================
-- Cualquier persona con sesión puede pedir un anuncio con el formulario de
-- Descubre. La solicitud queda PENDIENTE y NO sale en el feed: el feed solo lee
-- la tabla ads (por get_my_ads), que únicamente puede escribir el admin.
--
-- El admin revisa la solicitud, contacta al negocio para acordar precio y pago
-- y entonces:
-- - la APRUEBA: crea el anuncio con su formulario de siempre (fechas, precio,
--   gustos) y la solicitud queda enlazada a ese anuncio (ad_id);
-- - o la RECHAZA, con un motivo.
--
-- Reglas:
-- - El usuario solo crea solicitudes suyas, y el trigger las fuerza a nacer
--   PENDIENTES aunque alguien llame a la API a mano con otro estado.
-- - El usuario no puede editarlas ni borrarlas; solo verlas.
-- - Solo el admin cambia el estado.
-- - Como mucho 3 solicitudes pendientes por persona, para frenar el spam.
--
-- Es seguro ejecutarla más de una vez.

CREATE TABLE IF NOT EXISTS public.ad_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  advertiser_name TEXT NOT NULL CHECK (char_length(advertiser_name) BETWEEN 1 AND 60),
  contact TEXT NOT NULL CHECK (char_length(contact) BETWEEN 3 AND 80),
  kind TEXT NOT NULL CHECK (kind IN ('EVENTO', 'SERVICIO')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  body TEXT CHECK (body IS NULL OR char_length(body) <= 220),
  link_url TEXT CHECK (link_url IS NULL OR link_url ~* '^https?://'),
  -- Solo para eventos.
  event_date DATE,
  event_place TEXT CHECK (event_place IS NULL OR char_length(event_place) <= 80),
  status TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')),
  reject_reason TEXT CHECK (reject_reason IS NULL OR char_length(reject_reason) <= 300),
  -- Anuncio creado al aprobarla.
  ad_id UUID REFERENCES public.ads(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ad_requests_status ON public.ad_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_requests_user ON public.ad_requests (user_id, status);

ALTER TABLE public.ad_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuario crea su solicitud de anuncio" ON public.ad_requests;
CREATE POLICY "Usuario crea su solicitud de anuncio" ON public.ad_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'PENDIENTE');

DROP POLICY IF EXISTS "Usuario ve sus solicitudes de anuncio" ON public.ad_requests;
CREATE POLICY "Usuario ve sus solicitudes de anuncio" ON public.ad_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin gestionar solicitudes de anuncio" ON public.ad_requests;
CREATE POLICY "Admin gestionar solicitudes de anuncio" ON public.ad_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- ---------- Toda solicitud nace pendiente ----------
-- La política ya exige PENDIENTE, pero el trigger limpia también los campos de
-- revisión y aplica el límite de pendientes por persona.
CREATE OR REPLACE FUNCTION public.ad_request_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- El admin insertando a mano desde el panel de Supabase no pasa por aquí.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.user_id := auth.uid();
  NEW.status := 'PENDIENTE';
  NEW.reject_reason := NULL;
  NEW.ad_id := NULL;
  NEW.reviewed_by := NULL;
  NEW.reviewed_at := NULL;
  NEW.created_at := NOW();
  IF NEW.kind <> 'EVENTO' THEN
    NEW.event_date := NULL;
    NEW.event_place := NULL;
  END IF;

  IF (
    SELECT COUNT(*) FROM public.ad_requests
    WHERE user_id = auth.uid() AND status = 'PENDIENTE'
  ) >= 3 THEN
    RAISE EXCEPTION 'LIMITE_SOLICITUDES' USING HINT = 'Ya tienes 3 solicitudes pendientes de revisión.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ad_request_before_insert ON public.ad_requests;
CREATE TRIGGER trg_ad_request_before_insert
  BEFORE INSERT ON public.ad_requests
  FOR EACH ROW EXECUTE FUNCTION public.ad_request_before_insert();
