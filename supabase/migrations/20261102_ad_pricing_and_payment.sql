-- ==================================================
-- Modelo de cobro estilo Meta Ads (CPM / CPC) y pasarela de pago
-- ==================================================
-- Reemplaza el esquema simple de cobro por día por objetivos publicitarios:
-- 1. Reconocimiento (CPM): cobro por cada 1.000 visualizaciones (impresiones).
-- 2. Tráfico (CPC): cobro por cada clic real al enlace/botón.
--
-- Tanto las solicitudes (ad_requests) como los anuncios finales (ads) guardan:
-- - billing_model: 'CPM' o 'CPC'
-- - target_quota: meta de visualizaciones o clics contratados
-- - payment_status: 'PENDIENTE' o 'PAGADO' (desde la pasarela simulada)
-- - transaction_id: ID del comprobante emitido por la pasarela simulada
--
-- Es seguro ejecutarla más de una vez.

-- ---------- Columnas en ad_requests ----------
ALTER TABLE public.ad_requests ADD COLUMN IF NOT EXISTS billing_model TEXT DEFAULT 'CPM';
ALTER TABLE public.ad_requests DROP CONSTRAINT IF EXISTS chk_ad_request_billing_model;
ALTER TABLE public.ad_requests ADD CONSTRAINT chk_ad_request_billing_model
  CHECK (billing_model IS NULL OR billing_model IN ('CPC', 'CPM'));

ALTER TABLE public.ad_requests ADD COLUMN IF NOT EXISTS target_quota INTEGER;
ALTER TABLE public.ad_requests DROP CONSTRAINT IF EXISTS chk_ad_request_target_quota;
ALTER TABLE public.ad_requests ADD CONSTRAINT chk_ad_request_target_quota
  CHECK (target_quota IS NULL OR target_quota > 0);

ALTER TABLE public.ad_requests ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'PENDIENTE';
ALTER TABLE public.ad_requests DROP CONSTRAINT IF EXISTS chk_ad_request_payment_status;
ALTER TABLE public.ad_requests ADD CONSTRAINT chk_ad_request_payment_status
  CHECK (payment_status IN ('PENDIENTE', 'PAGADO'));

ALTER TABLE public.ad_requests ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- ---------- Columnas en ads ----------
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS billing_model TEXT DEFAULT 'CPM';
ALTER TABLE public.ads DROP CONSTRAINT IF EXISTS chk_ad_billing_model;
ALTER TABLE public.ads ADD CONSTRAINT chk_ad_billing_model
  CHECK (billing_model IS NULL OR billing_model IN ('CPC', 'CPM'));

ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS target_quota INTEGER;
ALTER TABLE public.ads DROP CONSTRAINT IF EXISTS chk_ad_target_quota;
ALTER TABLE public.ads ADD CONSTRAINT chk_ad_target_quota
  CHECK (target_quota IS NULL OR target_quota > 0);

ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'PAGADO';
ALTER TABLE public.ads DROP CONSTRAINT IF EXISTS chk_ad_payment_status;
ALTER TABLE public.ads ADD CONSTRAINT chk_ad_payment_status
  CHECK (payment_status IN ('PENDIENTE', 'PAGADO'));

ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- Actualizar filas existentes si hubiera alguna vacía
UPDATE public.ad_requests
SET billing_model = 'CPM', payment_status = COALESCE(payment_status, 'PENDIENTE')
WHERE billing_model IS NULL;

UPDATE public.ads
SET billing_model = 'CPM', payment_status = COALESCE(payment_status, 'PAGADO')
WHERE billing_model IS NULL;

-- ---------- Actualizar trigger de inserción para ad_requests ----------
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

  -- Asegurar modelo de cobro válido (por defecto CPM)
  IF NEW.billing_model IS NULL OR NEW.billing_model NOT IN ('CPC', 'CPM') THEN
    NEW.billing_model := 'CPM';
  END IF;

  -- Asegurar estado de pago válido
  IF NEW.payment_status IS NULL OR NEW.payment_status NOT IN ('PENDIENTE', 'PAGADO') THEN
    NEW.payment_status := 'PENDIENTE';
  END IF;

  IF NEW.starts_on IS NULL OR NEW.ends_on IS NULL THEN
    RAISE EXCEPTION 'FECHAS_SOLICITUD' USING HINT = 'Elige la fecha de inicio y la de fin del anuncio.';
  END IF;
  IF NEW.starts_on < CURRENT_DATE THEN
    RAISE EXCEPTION 'FECHAS_SOLICITUD' USING HINT = 'El anuncio no puede empezar antes de hoy.';
  END IF;
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

-- ---------- Actualizar get_my_ads con regla de corte automático (Delivery Cap) ----------
-- Si el anuncio alcanza su cuota contratada (target_quota) de clics (CPC)
-- o de visualizaciones (CPM), deja de entregarse automáticamente a los usuarios.
CREATE OR REPLACE FUNCTION public.get_my_ads(p_limit INT DEFAULT 3)
RETURNS TABLE (
  id UUID,
  advertiser_name TEXT,
  title TEXT,
  body TEXT,
  image_url TEXT,
  link_url TEXT,
  cta_label TEXT,
  matched BOOLEAN,
  nearby BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_city TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT public.normalizar_ciudad(p.ads_city)
  INTO v_city
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN QUERY
  WITH vigentes AS (
    SELECT a.*,
      (a.city IS NOT NULL) AS local,
      EXISTS (SELECT 1 FROM public.ad_likes al WHERE al.ad_id = a.id) AS segmentado,
      EXISTS (
        SELECT 1 FROM public.ad_likes al
        JOIN public.user_likes ul ON ul.like_id = al.like_id
        WHERE al.ad_id = a.id AND ul.user_id = auth.uid()
      ) AS coincide
    FROM public.ads a
    WHERE a.is_active
      AND CURRENT_DATE BETWEEN a.starts_on AND a.ends_on
      -- Regla de parada automática (Delivery Cap):
      AND (
        a.target_quota IS NULL
        OR (
          COALESCE(a.billing_model, 'CPM') = 'CPC'
          AND (SELECT COUNT(*) FROM public.ad_events e WHERE e.ad_id = a.id AND e.kind = 'CLICK') < a.target_quota
        )
        OR (
          COALESCE(a.billing_model, 'CPM') = 'CPM'
          AND (SELECT COUNT(*) FROM public.ad_events e WHERE e.ad_id = a.id AND e.kind = 'IMPRESSION') < a.target_quota
        )
      )
      AND (
        a.city IS NULL
        OR EXISTS (
          SELECT 1 FROM unnest(string_to_array(a.city, ',')) AS parte
          WHERE public.normalizar_ciudad(parte) = v_city
        )
      )
  )
  SELECT v.id, v.advertiser_name, v.title, v.body, v.image_url, v.link_url, v.cta_label,
         (v.segmentado AND v.coincide) AS matched,
         v.local AS nearby
  FROM vigentes v
  WHERE NOT v.segmentado OR v.coincide
  ORDER BY (v.segmentado AND v.coincide) DESC, v.local DESC, RANDOM()
  LIMIT GREATEST(1, LEAST(p_limit, 10));
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_ads(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_ads(INT) TO authenticated;


