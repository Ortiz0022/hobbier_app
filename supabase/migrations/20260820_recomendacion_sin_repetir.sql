-- Migración: "Sorpréndeme" deja de repetir lo que el usuario ya hizo
--
-- PARA APLICARLA: pegar este archivo completo en el SQL Editor de Supabase.
-- (Los despliegues de este proyecto son manuales, no hay CLI enlazada.)
--
-- Problema que arregla
-- --------------------
-- `get_recommended_activity` no miraba `user_activities`, así que sorteaba
-- entre TODO el catálogo apto, incluida la actividad que el usuario ya tenía
-- pendiente y las que ya había completado. De ahí la sensación de que
-- "Sorpréndeme" devolvía siempre lo mismo.
--
-- Qué cambia
-- ----------
-- 1. Lo que está PENDING queda FUERA del sorteo.
-- 2. Lo ya completado NO se excluye, se manda al final: primero salen las que
--    nunca hizo y, cuando se acaban, vuelve la que hace más tiempo que no hace.
--    Repetir sigue siendo posible porque es una función del producto.
--
-- El resto de filtros (edad, recursos, gustos, intereses, categoría) no cambia.

CREATE OR REPLACE FUNCTION public.get_recommended_activity(p_user_id UUID)
RETURNS SETOF public.activities AS $$
DECLARE
  v_age INT;
BEGIN
  SELECT EXTRACT(YEAR FROM age(CURRENT_DATE, birth_date)) INTO v_age
  FROM public.profiles WHERE id = p_user_id;

  RETURN QUERY
  WITH aptas AS (
    SELECT a.*
    FROM public.activities a
    WHERE a.is_active = TRUE
      AND (
        a.created_by IS NULL
        OR a.created_by = p_user_id
      )
      AND (a.min_age IS NULL OR v_age >= a.min_age)
      AND (a.max_age IS NULL OR v_age <= a.max_age)
      AND (
        -- Etiquetada con un gusto del usuario
        EXISTS (
          SELECT 1 FROM public.activity_likes al
          JOIN public.user_likes ul ON ul.like_id = al.like_id
          WHERE al.activity_id = a.id AND ul.user_id = p_user_id
        )
        -- Etiquetada con un interés del usuario
        OR EXISTS (
          SELECT 1 FROM public.activity_interests ai
          JOIN public.user_interests ui ON ui.interest_id = ai.interest_id
          WHERE ai.activity_id = a.id AND ui.user_id = p_user_id
        )
        -- Su categoría corresponde a un gusto del usuario
        OR EXISTS (
          SELECT 1
          FROM public.activity_categories c
          JOIN public.user_likes ul ON ul.user_id = p_user_id
          JOIN public.likes l ON l.id = ul.like_id
          WHERE c.id = a.category_id
            AND starts_with(lower(c.name), lower(l.name))
        )
        -- Sin categoría ("Libre"), disponible para cualquiera
        OR a.category_id IS NULL
        -- Sin ninguna etiqueta: comodín
        OR (
          NOT EXISTS (SELECT 1 FROM public.activity_likes al WHERE al.activity_id = a.id)
          AND NOT EXISTS (SELECT 1 FROM public.activity_interests ai WHERE ai.activity_id = a.id)
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.activity_resources ar
        WHERE ar.activity_id = a.id
          AND ar.resource_id NOT IN (
            SELECT ur.resource_id FROM public.user_resources ur WHERE ur.user_id = p_user_id
          )
      )
      -- Nunca sugerir algo que el usuario YA TIENE EN CURSO. Antes salía igual,
      -- y "Sorpréndeme" le devolvía la misma actividad que ya tenía pendiente
      -- en la pantalla de inicio.
      AND NOT EXISTS (
        SELECT 1 FROM public.user_activities ua
        WHERE ua.user_id = p_user_id
          AND ua.activity_id = a.id
          AND ua.status = 'PENDING'
      )
  ),
  historial AS (
    -- Última vez que el usuario empezó cada actividad. `assigned_at` se
    -- actualiza al reactivar una completada (ver log_activity_progress), así
    -- que refleja la última vez que la hizo, no la primera.
    SELECT ua.activity_id, MAX(ua.assigned_at) AS ultima
    FROM public.user_activities ua
    WHERE ua.user_id = p_user_id
    GROUP BY ua.activity_id
  )
  SELECT ap.*
  FROM aptas ap
  LEFT JOIN historial h ON h.activity_id = ap.id
  -- Las que nunca hizo van primero; las ya completadas solo aparecen cuando se
  -- acabaron las nuevas, y entre ellas gana la que hace más tiempo que no hace.
  -- No se excluyen del todo a propósito: repetir una actividad es una función
  -- del producto (log_activity_progress guarda el historial de fotos), y
  -- excluirlas dejaría "Sorpréndeme" sin nada que ofrecer al terminar el
  -- catálogo.
  ORDER BY (h.activity_id IS NOT NULL), h.ultima ASC, RANDOM()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
