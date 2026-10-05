-- ==================================================
-- HOBBIER - Gustos para las categorías de Wikidata
-- ==================================================
-- PARA APLICARLO: pegar este archivo completo en el SQL Editor de Supabase.
-- (Los despliegues de este proyecto son manuales, no hay CLI enlazada.)
--
-- Qué hace
-- --------
-- Añade 4 gustos a `likes` con los MISMOS NOMBRES que las categorías importadas
-- en import_categorias_wikidata.sql. Así la regla de recomendación por categoría
-- (split_part(normalizar_nombre(c.name), ' y ', 1) = normalizar_nombre(l.name))
-- puede emparejarlas, y las actividades de esas categorías se recomiendan a
-- quienes elijan estos gustos.
--
-- Sin estos gustos, las 4 categorías de Wikidata quedaban huérfanas: la
-- verificación D del import las listaba como "categoría sin gusto".
--
-- Iconos
-- ------
-- Se usan los mismos emojis que las categorías, para mantener coherencia visual.
--
-- Idempotencia
-- ------------
-- ON CONFLICT (name) DO NOTHING: si el gusto ya existe, no se toca.
-- Es seguro ejecutarlo más de una vez.

BEGIN;

INSERT INTO public.likes (name, icon) VALUES
  ('Coleccionismo', '🗃️'),
  ('Modelismo',     '🛩️'),
  ('Manualidades',  '✂️'),
  ('Programación',  '💻')
ON CONFLICT (name) DO NOTHING;

COMMIT;

-- RECARGAR LA API
NOTIFY pgrst, 'reload schema';


-- ==================================================
-- COMPROBACIÓN
-- ==================================================

-- A. Catálogo de gustos completo.
SELECT id, name, icon
FROM public.likes
ORDER BY name;

-- B. Verificar que las 4 categorías de Wikidata ahora SÍ tienen gusto asociado.
--    Si todo está bien, esta consulta NO debe devolver filas para las 4 de Wikidata.
SELECT c.name AS categoria_sin_gusto, c.source
FROM public.activity_categories c
WHERE NOT EXISTS (
  SELECT 1 FROM public.likes l
  WHERE split_part(public.normalizar_nombre(c.name), ' y ', 1) = public.normalizar_nombre(l.name)
)
ORDER BY c.source, c.name;
