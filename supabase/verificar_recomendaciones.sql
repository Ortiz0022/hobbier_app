-- ==================================================
-- HOBBIER - ¿Funcionan ya las recomendaciones por gustos?
-- ==================================================
-- EJECUTA EL ARCHIVO COMPLETO (botón Run), no bloque por bloque: el primer
-- bloque crea una vista temporal con tu usuario que el resto reutiliza.
-- Solo LEE, no modifica nada.
--
--  >>> ÚNICO SITIO DONDE HAY QUE PONER TU CORREO: la línea marcada abajo <<<


-- ==================================================
-- 0 · Tu usuario (sustituye el correo AQUÍ y solo aquí)
-- ==================================================
CREATE OR REPLACE TEMP VIEW yo AS
SELECT
  p.id,
  p.username,
  p.birth_date,
  EXTRACT(YEAR FROM age(CURRENT_DATE, p.birth_date))::int AS edad
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'tu@correo.com';   -- <<<<<< AQUÍ

SELECT * FROM yo;


-- ==================================================
-- 1 · ¿Están aplicados los cambios en la función?
-- ==================================================
SELECT
  CASE WHEN prosrc LIKE '%starts_with(lower(c.name)%'
       THEN 'SÍ · ya recomienda usando la categoría'
       ELSE 'NO · falta aplicar el cambio de categoría' END AS cruce_por_categoria,
  CASE WHEN prosrc LIKE '%a.category_id IS NULL%'
       THEN 'SÍ · las "Libre" entran para cualquiera'
       ELSE 'NO' END AS libres_incluidas
FROM pg_proc WHERE proname = 'get_recommended_activity';


-- ==================================================
-- 2 · Qué marcaste en tu perfil
-- ==================================================
SELECT 'gusto' AS tipo, l.name
FROM public.user_likes ul JOIN yo ON yo.id = ul.user_id
JOIN public.likes l ON l.id = ul.like_id
UNION ALL
SELECT 'interés', i.name
FROM public.user_interests ui JOIN yo ON yo.id = ui.user_id
JOIN public.interests i ON i.id = ui.interest_id
UNION ALL
SELECT 'recurso', r.name
FROM public.user_resources ur JOIN yo ON yo.id = ur.user_id
JOIN public.resources r ON r.id = ur.resource_id
ORDER BY 1, 2;


-- ==================================================
-- 3 · POR QUÉ te llega cada actividad
-- ==================================================
-- Si `por_gusto` o `por_categoria_de_gusto` traen números, las recomendaciones
-- por gustos SÍ funcionan. Si casi todo viene de `comodines`, no.
SELECT
  count(*) AS total_que_me_pueden_salir,
  count(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM public.activity_likes al
    JOIN public.user_likes ul ON ul.like_id = al.like_id AND ul.user_id = yo.id
    WHERE al.activity_id = a.id)) AS por_gusto,
  count(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM public.activity_interests ai
    JOIN public.user_interests ui ON ui.interest_id = ai.interest_id AND ui.user_id = yo.id
    WHERE ai.activity_id = a.id)) AS por_interes,
  count(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM public.activity_categories c
    JOIN public.user_likes ul ON ul.user_id = yo.id
    JOIN public.likes l ON l.id = ul.like_id
    WHERE c.id = a.category_id AND starts_with(lower(c.name), lower(l.name)))) AS por_categoria_de_gusto,
  count(*) FILTER (WHERE a.category_id IS NULL) AS libres,
  count(*) FILTER (WHERE
    NOT EXISTS (SELECT 1 FROM public.activity_likes al WHERE al.activity_id = a.id)
    AND NOT EXISTS (SELECT 1 FROM public.activity_interests ai WHERE ai.activity_id = a.id)
  ) AS comodines
FROM yo, public.activities a
WHERE a.is_active
  AND (a.created_by IS NULL OR a.created_by = yo.id)
  AND (a.min_age IS NULL OR yo.edad >= a.min_age)
  AND (a.max_age IS NULL OR yo.edad <= a.max_age)
  AND NOT EXISTS (
    SELECT 1 FROM public.activity_resources ar
    WHERE ar.activity_id = a.id
      AND ar.resource_id NOT IN (
        SELECT ur.resource_id FROM public.user_resources ur WHERE ur.user_id = yo.id));


-- ==================================================
-- 4 · LA PRUEBA DE FUEGO: 10 recomendaciones reales
-- ==================================================
-- Títulos variados = funciona. La misma repetida = el catálogo que te alcanza
-- sigue siendo demasiado estrecho.
SELECT g.n, r.title, r.category_id IS NULL AS es_libre
FROM generate_series(1, 10) AS g(n),
LATERAL (SELECT * FROM public.get_recommended_activity((SELECT id FROM yo))) AS r
ORDER BY g.n;


-- ==================================================
-- 5 · Si el bloque 4 repite: en qué filtro se cae el catálogo
-- ==================================================
SELECT
  (SELECT count(*) FROM public.activities WHERE is_active) AS "1_activas",
  (SELECT count(*) FROM public.activities a, yo
    WHERE a.is_active AND (a.created_by IS NULL OR a.created_by = yo.id)) AS "2_created_by",
  (SELECT count(*) FROM public.activities a, yo
    WHERE a.is_active AND (a.created_by IS NULL OR a.created_by = yo.id)
      AND (a.min_age IS NULL OR yo.edad >= a.min_age)
      AND (a.max_age IS NULL OR yo.edad <= a.max_age)) AS "3_edad",
  (SELECT count(*) FROM public.activities a, yo
    WHERE a.is_active AND (a.created_by IS NULL OR a.created_by = yo.id)
      AND (a.min_age IS NULL OR yo.edad >= a.min_age)
      AND (a.max_age IS NULL OR yo.edad <= a.max_age)
      AND NOT EXISTS (
        SELECT 1 FROM public.activity_resources ar
        WHERE ar.activity_id = a.id
          AND ar.resource_id NOT IN (
            SELECT ur.resource_id FROM public.user_resources ur WHERE ur.user_id = yo.id))
  ) AS "4_recursos";

-- Y quién es el dueño de las actividades (si el paso 2 derrumba el catálogo):
SELECT created_by IS NULL AS sin_dueno, source, count(*) AS cuantas
FROM public.activities WHERE is_active
GROUP BY 1, 2 ORDER BY 1 DESC, 2;
