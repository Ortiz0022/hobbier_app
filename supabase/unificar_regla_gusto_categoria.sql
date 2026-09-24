-- ==========================================
-- REGLA GUSTO -> CATEGORÍA: coincidencia exacta del primer segmento
-- ==========================================
-- PARA APLICARLA: pegar este archivo completo en el SQL Editor de Supabase.
-- (Los despliegues de este proyecto son manuales, no hay CLI enlazada.)
--
-- Qué cambia
-- ----------
-- Antes, una categoría correspondía a un gusto si su nombre EMPEZABA por él:
--
--     starts_with(lower(c.name), lower(l.name))
--
-- Con 7 categorías funcionaba, pero empareja de más en cuanto el catálogo crece:
-- el gusto "Arte" casaría también con "Artesanía", y el JOIN no garantiza cuál
-- gana. Ahora la comparación es EXACTA contra el primer segmento del nombre de
-- la categoría, lo anterior a " y ":
--
--     "Deportes"  ->  "Deportes y Salud"        (deportes = deportes)      OK
--     "Lectura"   ->  "Lectura y Aprendizaje"   (lectura  = lectura)       OK
--     "Arte"      ->  "Artesanía"               (arte    != artesania)     ya NO
--
-- Los 6 emparejamientos actuales se mantienen; solo desaparecen los accidentales.
--
-- El resto del cuerpo de get_recommended_activity se conserva TAL CUAL: se partió
-- de la definición que hay en producción (md5 de prosrc 8c30161e9d92e7e8f37d14d302cb6531).
--
-- Es seguro ejecutarlo más de una vez.

BEGIN;

-- 1. NORMALIZADOR COMPARTIDO
-- Minúsculas, sin espacios sobrantes y sin tildes. Se usa `translate` en vez de
-- la extensión `unaccent` para no depender de que esté instalada en el proyecto.
-- IMMUTABLE: así puede usarse en índices más adelante si hiciera falta.
CREATE OR REPLACE FUNCTION public.normalizar_nombre(p_texto TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $fn$
  SELECT translate(
    lower(btrim(coalesce(p_texto, ''))),
    'áéíóúüñÁÉÍÓÚÜÑ',
    'aeiouunaeiouun'
  );
$fn$;

REVOKE ALL ON FUNCTION public.normalizar_nombre(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalizar_nombre(TEXT) TO authenticated;

-- 2. LA FUNCIÓN DE RECOMENDACIÓN, CON LA REGLA NUEVA
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
        -- Su categoría corresponde a un gusto del usuario (primer segmento exacto)
        OR EXISTS (
          SELECT 1
          FROM public.activity_categories c
          JOIN public.user_likes ul ON ul.user_id = p_user_id
          JOIN public.likes l ON l.id = ul.like_id
          WHERE c.id = a.category_id
            AND split_part(public.normalizar_nombre(c.name), ' y ', 1)
                = public.normalizar_nombre(l.name)
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

COMMIT;

-- 3. COMPROBACIÓN
-- Qué categoría le corresponde a cada gusto con la regla NUEVA frente a la VIEJA.
-- Las filas donde ambas columnas difieren son los emparejamientos que cambian.
SELECT
  l.name  AS gusto,
  (SELECT string_agg(c.name, ', ' ORDER BY c.name)
     FROM public.activity_categories c
    WHERE starts_with(lower(c.name), lower(l.name)))                AS regla_vieja,
  (SELECT string_agg(c.name, ', ' ORDER BY c.name)
     FROM public.activity_categories c
    WHERE split_part(public.normalizar_nombre(c.name), ' y ', 1)
          = public.normalizar_nombre(l.name))                       AS regla_nueva
FROM public.likes l
ORDER BY l.name;

-- Categorías que NO corresponden a ningún gusto: sus actividades solo se
-- recomiendan por etiquetas de gusto/interés o como comodín, nunca por categoría.
SELECT c.name AS categoria_sin_gusto
FROM public.activity_categories c
WHERE NOT EXISTS (
  SELECT 1 FROM public.likes l
  WHERE split_part(public.normalizar_nombre(c.name), ' y ', 1) = public.normalizar_nombre(l.name)
)
ORDER BY 1;
