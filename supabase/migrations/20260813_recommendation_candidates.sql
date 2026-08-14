-- ==================================================
-- HOBBIER - Candidatos para la recomendación con IA
-- Ejecutar en el SQL Editor. No modifica ninguna tabla ni policy existente:
-- solo añade una función de lectura.
-- ==================================================
--
-- El reparto es a propósito: SQL aplica los filtros DUROS (los que no son
-- opinables: edad, recursos que el usuario posee, actividades ya hechas) y
-- calcula cuánto encaja cada actividad con sus preferencias. La IA solo elige
-- entre lo que ya pasó ese filtro, así que nunca puede recomendar algo
-- imposible por muy convincente que suene.

CREATE OR REPLACE FUNCTION public.get_recommendation_candidates(
  p_limit INT DEFAULT 10,
  p_exclude UUID[] DEFAULT '{}'
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  category_name TEXT,
  min_age INT,
  max_age INT,
  points_awarded INT,
  matched_likes TEXT[],
  matched_interests TEXT[],
  match_score INT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT
      p.id,
      EXTRACT(YEAR FROM age(CURRENT_DATE, p.birth_date))::INT AS age
    FROM public.profiles p
    WHERE p.id = auth.uid()
  )
  SELECT
    a.id,
    a.title,
    a.description,
    c.name AS category_name,
    a.min_age,
    a.max_age,
    a.points_awarded,
    COALESCE(lk.names, ARRAY[]::TEXT[]) AS matched_likes,
    COALESCE(it.names, ARRAY[]::TEXT[]) AS matched_interests,
    (COALESCE(array_length(lk.names, 1), 0) + COALESCE(array_length(it.names, 1), 0))::INT AS match_score
  FROM public.activities a
  CROSS JOIN me
  LEFT JOIN public.activity_categories c ON c.id = a.category_id
  -- Gustos en común: se devuelven los NOMBRES, no solo cuántos, para que el
  -- prompt pueda decir "porque te gusta la música" en vez de un número suelto.
  LEFT JOIN LATERAL (
    SELECT array_agg(l.name ORDER BY l.name) AS names
    FROM public.activity_likes al
    JOIN public.user_likes ul ON ul.like_id = al.like_id AND ul.user_id = me.id
    JOIN public.likes l ON l.id = al.like_id
    WHERE al.activity_id = a.id
  ) lk ON TRUE
  -- Intereses en común
  LEFT JOIN LATERAL (
    SELECT array_agg(i.name ORDER BY i.name) AS names
    FROM public.activity_interests ai
    JOIN public.user_interests ui ON ui.interest_id = ai.interest_id AND ui.user_id = me.id
    JOIN public.interests i ON i.id = ai.interest_id
    WHERE ai.activity_id = a.id
  ) it ON TRUE
  WHERE a.is_active = TRUE
    AND NOT (a.id = ANY (COALESCE(p_exclude, '{}'::UUID[])))
    -- Rango de edad
    AND (a.min_age IS NULL OR me.age >= a.min_age)
    AND (a.max_age IS NULL OR me.age <= a.max_age)
    -- Debe poseer TODOS los recursos que la actividad requiere
    AND NOT EXISTS (
      SELECT 1 FROM public.activity_resources ar
      WHERE ar.activity_id = a.id
        AND ar.resource_id NOT IN (
          SELECT ur.resource_id FROM public.user_resources ur WHERE ur.user_id = me.id
        )
    )
    -- Ni lo que ya tiene pendiente, ni lo que completó hace menos de 30 días.
    -- Es cooldown y no exclusión permanente porque el catálogo es pequeño: si se
    -- descartara para siempre, el usuario se quedaría sin recomendaciones.
    AND NOT EXISTS (
      SELECT 1 FROM public.user_activities ua
      WHERE ua.activity_id = a.id
        AND ua.user_id = me.id
        AND (
          ua.status = 'PENDING'
          OR (ua.status = 'COMPLETED' AND ua.completed_at > NOW() - INTERVAL '30 days')
        )
    )
  -- Se ordena por la expresión y no por el alias: `match_score` también es una
  -- columna de salida de RETURNS TABLE y referenciarla desnuda es ambiguo.
  ORDER BY
    (COALESCE(array_length(lk.names, 1), 0) + COALESCE(array_length(it.names, 1), 0)) DESC,
    RANDOM()
  LIMIT GREATEST(COALESCE(p_limit, 10), 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_recommendation_candidates(INT, UUID[]) TO authenticated;
