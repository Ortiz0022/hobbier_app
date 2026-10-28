-- ==================================================
-- Solicitudes de anuncio: el anunciante elige los días
-- ==================================================
-- En vez de elegir "1 semana / 2 semanas / 1 mes", el anunciante elige la
-- fecha de inicio y la de fin, y la app le enseña el total (₡500 por día).
-- Las fechas siguen siendo una petición: el admin las confirma o cambia al
-- crear el anuncio.
--
-- - starts_on / ends_on: días pedidos, contando el primero y el último.
-- - Se quita duration, que ya no se usa.
--
-- Es seguro ejecutarla más de una vez.

ALTER TABLE public.ad_requests ADD COLUMN IF NOT EXISTS starts_on DATE;
ALTER TABLE public.ad_requests ADD COLUMN IF NOT EXISTS ends_on DATE;

ALTER TABLE public.ad_requests DROP CONSTRAINT IF EXISTS chk_ad_request_dates;
ALTER TABLE public.ad_requests ADD CONSTRAINT chk_ad_request_dates
  CHECK (starts_on IS NULL OR ends_on IS NULL OR ends_on >= starts_on);

ALTER TABLE public.ad_requests DROP CONSTRAINT IF EXISTS chk_ad_request_duration;
ALTER TABLE public.ad_requests DROP COLUMN IF EXISTS duration;

-- ---------- El trigger valida también las fechas ----------
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

  IF NEW.starts_on IS NULL OR NEW.ends_on IS NULL THEN
    RAISE EXCEPTION 'FECHAS_SOLICITUD' USING HINT = 'Elige la fecha de inicio y la de fin del anuncio.';
  END IF;
  IF NEW.starts_on < CURRENT_DATE THEN
    RAISE EXCEPTION 'FECHAS_SOLICITUD' USING HINT = 'El anuncio no puede empezar antes de hoy.';
  END IF;
  -- Un evento no se anuncia después de que ya pasó.
  IF NEW.event_date IS NOT NULL AND NEW.ends_on > NEW.event_date THEN
    RAISE EXCEPTION 'FECHAS_SOLICITUD' USING HINT = 'El anuncio no puede terminar después del evento.';
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
