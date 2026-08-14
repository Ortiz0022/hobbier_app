-- ==================================================
-- HOBBIER - Actividades generadas por IA
-- Ejecutar DESPUÉS de 20260813_recommendation_candidates.sql
-- ==================================================
--
-- Permite que, cuando no queden actividades compatibles, la IA cree una nueva a
-- partir de las preferencias del usuario. Esa actividad entra al catálogo como
-- cualquier otra: se puede aceptar, completar, da puntos y genera publicación.

-- --------------------------------------------------
-- 1. Marcar el origen de cada actividad
-- --------------------------------------------------
-- `source` sirve para distinguirlas en el panel de admin y para poder medir
-- cuántas se generan. Las creadas por IA quedan visibles para todos, igual que
-- las del catálogo: así el catálogo crece de verdad con el uso.
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'catalog',
  ADD COLUMN IF NOT EXISTS generated_for_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_activities_source') THEN
    ALTER TABLE public.activities
      ADD CONSTRAINT chk_activities_source CHECK (source IN ('catalog', 'ai_generated'));
  END IF;
END $$;

-- Soporta el conteo del tope diario por usuario
CREATE INDEX IF NOT EXISTS idx_activities_ai_generated
  ON public.activities (generated_for_user_id, created_at)
  WHERE source = 'ai_generated';

-- --------------------------------------------------
-- 2. Candidatos: ahora se puede pedir que incluya lo ya hecho
-- --------------------------------------------------
-- Se BORRA la versión anterior antes de crear la nueva. Con CREATE OR REPLACE se
-- crearía una sobrecarga de 3 parámetros conviviendo con la de 2, y al llamarla
-- por nombre desde PostgREST la elección sería ambigua.
DROP FUNCTION IF EXISTS public.get_recommendation_candidates(INT, UUID[]);

CREATE OR REPLACE FUNCTION public.get_recommendation_candidates(
  p_limit INT DEFAULT 10,
  p_exclude UUID[] DEFAULT '{}',
  -- Última bala: cuando no queda nada por hacer, se permite repetir en vez de
  -- dejar al usuario con las manos vacías.
  p_include_done BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  category_name TEXT,
  min_age INT,
  max_age INT,
  points_awarded INT,
  source TEXT,
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
    a.source,
    COALESCE(lk.names, ARRAY[]::TEXT[]) AS matched_likes,
    COALESCE(it.names, ARRAY[]::TEXT[]) AS matched_interests,
    (COALESCE(array_length(lk.names, 1), 0) + COALESCE(array_length(it.names, 1), 0))::INT AS match_score
  FROM public.activities a
  CROSS JOIN me
  LEFT JOIN public.activity_categories c ON c.id = a.category_id
  LEFT JOIN LATERAL (
    SELECT array_agg(l.name ORDER BY l.name) AS names
    FROM public.activity_likes al
    JOIN public.user_likes ul ON ul.like_id = al.like_id AND ul.user_id = me.id
    JOIN public.likes l ON l.id = al.like_id
    WHERE al.activity_id = a.id
  ) lk ON TRUE
  LEFT JOIN LATERAL (
    SELECT array_agg(i.name ORDER BY i.name) AS names
    FROM public.activity_interests ai
    JOIN public.user_interests ui ON ui.interest_id = ai.interest_id AND ui.user_id = me.id
    JOIN public.interests i ON i.id = ai.interest_id
    WHERE ai.activity_id = a.id
  ) it ON TRUE
  WHERE a.is_active = TRUE
    AND NOT (a.id = ANY (COALESCE(p_exclude, '{}'::UUID[])))
    AND (a.min_age IS NULL OR me.age >= a.min_age)
    AND (a.max_age IS NULL OR me.age <= a.max_age)
    AND NOT EXISTS (
      SELECT 1 FROM public.activity_resources ar
      WHERE ar.activity_id = a.id
        AND ar.resource_id NOT IN (
          SELECT ur.resource_id FROM public.user_resources ur WHERE ur.user_id = me.id
        )
    )
    -- Lo pendiente nunca se reofrece, ni siquiera repitiendo: ya lo tiene en curso.
    AND NOT EXISTS (
      SELECT 1 FROM public.user_activities ua
      WHERE ua.activity_id = a.id AND ua.user_id = me.id AND ua.status = 'PENDING'
    )
    AND (
      p_include_done
      OR NOT EXISTS (
        SELECT 1 FROM public.user_activities ua
        WHERE ua.activity_id = a.id
          AND ua.user_id = me.id
          AND ua.status = 'COMPLETED'
          AND ua.completed_at > NOW() - INTERVAL '30 days'
      )
    )
  ORDER BY
    (COALESCE(array_length(lk.names, 1), 0) + COALESCE(array_length(it.names, 1), 0)) DESC,
    RANDOM()
  LIMIT GREATEST(COALESCE(p_limit, 10), 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_recommendation_candidates(INT, UUID[], BOOLEAN) TO authenticated;
