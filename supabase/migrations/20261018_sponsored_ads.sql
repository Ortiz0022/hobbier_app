-- ==================================================
-- Anuncios patrocinados segmentados por gustos
-- ==================================================
-- Un negocio o actividad paga para aparecer en la app. El administrador crea
-- el anuncio desde el panel y elige a qué gustos va dirigido (ad_likes) y, si
-- quiere, en qué ciudad se muestra. La app solo enseña a cada persona los
-- anuncios que encajan con lo que ELLA marcó en sus preferencias.
--
-- Privacidad:
-- - El anunciante NUNCA recibe datos de los usuarios: solo cifras agregadas
--   (impresiones, clics) que el admin le pasa.
-- - La ubicación es aproximada: una ciudad que el usuario escribe si quiere
--   (profiles.ads_city). No se usa GPS.
-- - El usuario puede apagar los anuncios personalizados
--   (profiles.ads_personalized). Apagados, solo ve anuncios dirigidos a todos.
--
-- Los usuarios normales no pueden leer la tabla ads directamente: piden sus
-- anuncios con get_my_ads(), que hace el cruce en el servidor. Así nadie puede
-- bajarse la lista de anunciantes, precios o notas internas.
--
-- Es seguro ejecutarla más de una vez.

-- ---------- Preferencias del usuario ----------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ads_personalized BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ads_city TEXT;

-- ---------- Anuncios ----------
CREATE TABLE IF NOT EXISTS public.ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_name TEXT NOT NULL,
  advertiser_contact TEXT,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  body TEXT CHECK (body IS NULL OR char_length(body) <= 220),
  image_url TEXT,
  link_url TEXT CHECK (link_url IS NULL OR link_url ~* '^https?://'),
  cta_label TEXT CHECK (cta_label IS NULL OR char_length(cta_label) <= 24),
  -- NULL = se muestra en cualquier ciudad.
  city TEXT,
  starts_on DATE NOT NULL DEFAULT CURRENT_DATE,
  ends_on DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  price_paid NUMERIC(10, 2) CHECK (price_paid IS NULL OR price_paid >= 0),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_ad_dates CHECK (ends_on >= starts_on)
);

-- Gustos a los que va dirigido. Sin ninguno = anuncio para todos.
CREATE TABLE IF NOT EXISTS public.ad_likes (
  ad_id UUID REFERENCES public.ads(id) ON DELETE CASCADE,
  like_id UUID REFERENCES public.likes(id) ON DELETE CASCADE,
  PRIMARY KEY (ad_id, like_id)
);

-- Impresiones y clics. Es lo que justifica el precio ante el anunciante.
CREATE TABLE IF NOT EXISTS public.ad_events (
  id BIGSERIAL PRIMARY KEY,
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('IMPRESSION', 'CLICK')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ad_events_ad ON public.ad_events (ad_id, kind);

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gestionar anuncios" ON public.ads;
CREATE POLICY "Admin gestionar anuncios" ON public.ads FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

DROP POLICY IF EXISTS "Admin gestionar ad_likes" ON public.ad_likes;
CREATE POLICY "Admin gestionar ad_likes" ON public.ad_likes FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

DROP POLICY IF EXISTS "Admin ver ad_events" ON public.ad_events;
CREATE POLICY "Admin ver ad_events" ON public.ad_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- ---------- Anuncios para el usuario actual ----------
-- Vigentes hoy, de su ciudad (o sin ciudad) y:
-- - con anuncios personalizados: dirigidos a alguno de sus gustos, o a todos;
-- - sin ellos: solo los dirigidos a todos.
-- Los que coinciden con sus gustos van primero; dentro de cada grupo, al azar
-- para que ningún anunciante acapare siempre el primer hueco.
CREATE OR REPLACE FUNCTION public.get_my_ads(p_limit INT DEFAULT 3)
RETURNS TABLE (
  id UUID,
  advertiser_name TEXT,
  title TEXT,
  body TEXT,
  image_url TEXT,
  link_url TEXT,
  cta_label TEXT,
  matched BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_personalized BOOLEAN;
  v_city TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT p.ads_personalized, NULLIF(lower(trim(p.ads_city)), '')
  INTO v_personalized, v_city
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN QUERY
  WITH vigentes AS (
    SELECT a.*,
      EXISTS (SELECT 1 FROM public.ad_likes al WHERE al.ad_id = a.id) AS segmentado,
      EXISTS (
        SELECT 1 FROM public.ad_likes al
        JOIN public.user_likes ul ON ul.like_id = al.like_id
        WHERE al.ad_id = a.id AND ul.user_id = auth.uid()
      ) AS coincide
    FROM public.ads a
    WHERE a.is_active
      AND CURRENT_DATE BETWEEN a.starts_on AND a.ends_on
      AND (a.city IS NULL OR lower(trim(a.city)) = v_city)
  )
  SELECT v.id, v.advertiser_name, v.title, v.body, v.image_url, v.link_url, v.cta_label,
         (v.segmentado AND v.coincide) AS matched
  FROM vigentes v
  WHERE NOT v.segmentado OR (COALESCE(v_personalized, TRUE) AND v.coincide)
  ORDER BY (v.segmentado AND v.coincide) DESC, RANDOM()
  LIMIT GREATEST(1, LEAST(p_limit, 10));
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_ads(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_ads(INT) TO authenticated;

-- ---------- Registrar impresión o clic ----------
-- Solo sobre anuncios vigentes: así no se pueden inflar las cifras de uno
-- pausado o vencido llamando a la API a mano.
CREATE OR REPLACE FUNCTION public.log_ad_event(p_ad_id UUID, p_kind TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_kind NOT IN ('IMPRESSION', 'CLICK') THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.ads
    WHERE id = p_ad_id AND is_active AND CURRENT_DATE BETWEEN starts_on AND ends_on
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.ad_events (ad_id, user_id, kind) VALUES (p_ad_id, auth.uid(), p_kind);
END;
$$;

REVOKE ALL ON FUNCTION public.log_ad_event(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_ad_event(UUID, TEXT) TO authenticated;

-- ---------- Cifras por anuncio para el panel ----------
CREATE OR REPLACE FUNCTION public.get_ad_stats_admin()
RETURNS TABLE (ad_id UUID, impressions BIGINT, clicks BIGINT, people BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN') THEN
    RAISE EXCEPTION 'Solo un administrador puede ver las cifras de los anuncios.';
  END IF;

  RETURN QUERY
  SELECT e.ad_id,
         COUNT(*) FILTER (WHERE e.kind = 'IMPRESSION'),
         COUNT(*) FILTER (WHERE e.kind = 'CLICK'),
         COUNT(DISTINCT e.user_id) FILTER (WHERE e.kind = 'IMPRESSION')
  FROM public.ad_events e
  GROUP BY e.ad_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_ad_stats_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ad_stats_admin() TO authenticated;

-- ---------- Imágenes de los anuncios ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-images', 'ad-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Lectura publica imagenes anuncios" ON storage.objects;
CREATE POLICY "Lectura publica imagenes anuncios" ON storage.objects FOR SELECT
  USING (bucket_id = 'ad-images');

DROP POLICY IF EXISTS "Admin sube imagenes anuncios" ON storage.objects;
CREATE POLICY "Admin sube imagenes anuncios" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ad-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );
