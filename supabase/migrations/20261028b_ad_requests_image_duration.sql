-- ==================================================
-- Solicitudes de anuncio: foto y duración deseada
-- ==================================================
-- - image_url: foto que adjunta el anunciante. Se sube al bucket ad-images,
--   pero solo dentro de su carpeta solicitudes/<su id>/, así nadie puede tocar
--   las imágenes de los anuncios ni las de otras personas.
-- - duration: cuánto tiempo PIDE el anunciante. Es solo una petición: las
--   fechas reales las pone el admin al crear el anuncio.
--
-- Es seguro ejecutarla más de una vez.

ALTER TABLE public.ad_requests ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.ad_requests ADD COLUMN IF NOT EXISTS duration TEXT;

ALTER TABLE public.ad_requests DROP CONSTRAINT IF EXISTS chk_ad_request_image;
ALTER TABLE public.ad_requests ADD CONSTRAINT chk_ad_request_image
  CHECK (image_url IS NULL OR image_url ~* '^https?://');

ALTER TABLE public.ad_requests DROP CONSTRAINT IF EXISTS chk_ad_request_duration;
ALTER TABLE public.ad_requests ADD CONSTRAINT chk_ad_request_duration
  CHECK (duration IS NULL OR duration IN ('1_SEMANA', '2_SEMANAS', '1_MES', 'HASTA_EVENTO'));

-- ---------- El trigger ahora también limpia la duración ----------
-- "Hasta el día del evento" solo tiene sentido en un evento con fecha.
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
  IF NEW.duration = 'HASTA_EVENTO' AND NEW.event_date IS NULL THEN
    NEW.duration := NULL;
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

-- ---------- Subida de la foto ----------
DROP POLICY IF EXISTS "Usuario sube imagen de su solicitud" ON storage.objects;
CREATE POLICY "Usuario sube imagen de su solicitud" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ad-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'solicitudes'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
