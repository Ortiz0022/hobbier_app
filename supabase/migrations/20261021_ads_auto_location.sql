-- ==================================================
-- Anuncios: gustos siempre activos y ciudad automática
-- ==================================================
-- Cambia lo de 20261018_sponsored_ads.sql:
-- - Ya no se pueden apagar los anuncios según gustos: get_my_ads ignora
--   profiles.ads_personalized (la columna se queda para no romper nada).
-- - profiles.ads_city ya no la escribe el usuario a mano: la app la rellena
--   con el cantón/ciudad que da el permiso de ubicación del teléfono (nunca
--   se guardan coordenadas). Sin permiso queda vacía.
-- - Los anuncios para todo el país (city NULL) salen SIEMPRE, tenga o no
--   ubicación. Los de una ciudad solo salen a quien está en ella.
-- - Orden: gustos + cerca, gustos + país, cerca, país.
--   Así negar la ubicación (o falsearla) no sirve para dejar de ver anuncios.
--
-- Es seguro ejecutarla más de una vez.

UPDATE public.profiles SET ads_personalized = TRUE WHERE ads_personalized IS DISTINCT FROM TRUE;

-- Cambia la forma del resultado (columna nearby), así que hay que recrearla.
DROP FUNCTION IF EXISTS public.get_my_ads(INT);

CREATE FUNCTION public.get_my_ads(p_limit INT DEFAULT 3)
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

  SELECT NULLIF(lower(trim(p.ads_city)), '')
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
      AND (a.city IS NULL OR lower(trim(a.city)) = v_city)
  )
  SELECT v.id, v.advertiser_name, v.title, v.body, v.image_url, v.link_url, v.cta_label,
         (v.segmentado AND v.coincide) AS matched,
         v.local AS nearby
  FROM vigentes v
  WHERE NOT v.segmentado OR v.coincide
  -- Primero los de sus gustos (los de su zona antes que los del país), luego
  -- el resto (también los de su zona primero). Sin ubicación no hay locales,
  -- así que van primero los del país según sus gustos. Dentro de cada grupo al
  -- azar para que ningún anunciante acapare siempre el primer hueco.
  ORDER BY (v.segmentado AND v.coincide) DESC, v.local DESC, RANDOM()
  LIMIT GREATEST(1, LEAST(p_limit, 10));
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_ads(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_ads(INT) TO authenticated;
