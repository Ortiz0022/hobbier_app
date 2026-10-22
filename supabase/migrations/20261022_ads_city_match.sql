-- ==================================================
-- Anuncios: comparar la ciudad sin importar tildes, mayúsculas ni el país
-- ==================================================
-- Antes get_my_ads exigía que ads.city fuera idéntica a profiles.ads_city
-- (solo pasando a minúsculas). Un anuncio con ciudad "Costa Rica, San Jose"
-- no le salía a nadie: el teléfono guarda "San José".
--
-- Ahora las dos ciudades se normalizan (minúsculas, sin tildes, espacios
-- simples, sin "Cantón de"/"Ciudad de" delante) y la ciudad del anuncio se
-- parte por comas: basta con que una de las partes coincida. Así valen
-- "San Jose", "Costa Rica, San José" o "San José, Costa Rica".
--
-- Es seguro ejecutarla más de una vez.

CREATE OR REPLACE FUNCTION public.normalizar_ciudad(p TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    regexp_replace(
      btrim(regexp_replace(
        translate(lower(p), 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc'),
        '\s+', ' ', 'g')),
      '^(canton|ciudad) (de )?', ''),
    '');
$$;

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
  -- Primero los de sus gustos (los de su zona antes que los del país), luego
  -- el resto (también los de su zona primero). Dentro de cada grupo al azar.
  ORDER BY (v.segmentado AND v.coincide) DESC, v.local DESC, RANDOM()
  LIMIT GREATEST(1, LEAST(p_limit, 10));
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_ads(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_ads(INT) TO authenticated;
