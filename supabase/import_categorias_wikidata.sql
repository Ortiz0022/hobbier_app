-- ==================================================
-- HOBBIER - Importación de categorías desde Wikidata
-- ==================================================
-- PARA APLICARLO: pegar este archivo completo en el SQL Editor de Supabase.
-- (Los despliegues de este proyecto son manuales, no hay CLI enlazada.)
--
-- Qué hace
-- --------
-- 1. Añade `source` y `external_id` a `activity_categories`.
-- 2. Crea un índice único PARCIAL sobre `external_id` (solo donde no es NULL),
--    para que las categorías hechas a mano puedan seguir teniéndolo vacío.
-- 3. Inserta 4 categorías obtenidas del endpoint SPARQL de Wikidata
--    (subclases de Q47728, "afición"), con el QID como `external_id`.
--
-- De dónde salen las 4
-- --------------------
-- Consulta usada (una sola vez, no hay integración en vivo):
--
--     SELECT ?item ?label_es WHERE {
--       ?item wdt:P279 wd:Q47728 .
--       ?item rdfs:label ?label_es .
--       FILTER(LANG(?label_es) = "es")
--     } ORDER BY ?label_es
--
-- De las 30 subclases devueltas, la mayoría son aficiones CONCRETAS (esnórquel,
-- postcrossing, busología) o duplican categorías existentes (lectura, ciclismo).
-- Estas 4 son las que funcionan como categoría amplia y no duplican nada:
--
--     Coleccionismo  Q208165   subclase directa de Q47728
--     Modelismo      Q917912   subclase directa de Q47728
--     Manualidades   Q810592   "trabajos efectuados con las manos"
--     Programación   Q80006    "diseñar, codificar, depurar y mantener código"
--
-- Las dos últimas NO son subclases directas: se buscaron aparte porque las
-- subclases directas del grafo eran demasiado estrechas para una categoría
-- (por ejemplo "Desarrollo de software de código abierto" o "acolchado").
--
-- Idempotencia
-- ------------
-- Es seguro ejecutarlo más de una vez, y contempla las DOS restricciones UNIQUE
-- de la tabla:
--   - `external_id`: si la categoría ya se importó, se actualizan sus datos.
--   - `name`: si YA EXISTE una categoría con ese nombre y otro external_id (o
--     ninguno), NO se inserta ni se pisa; se salta y se reporta al final.
--
-- Requisito: la función public.normalizar_nombre(TEXT), que crea
-- supabase/unificar_regla_gusto_categoria.sql.

BEGIN;

-- 0. DEPENDENCIA
DO $$
BEGIN
  IF to_regprocedure('public.normalizar_nombre(text)') IS NULL THEN
    RAISE EXCEPTION
      'Falta public.normalizar_nombre(text). Ejecuta antes supabase/unificar_regla_gusto_categoria.sql';
  END IF;
END $$;

-- 1. COLUMNAS NUEVAS
-- `source` con DEFAULT 'manual': las 7 categorías que ya existen quedan marcadas
-- como propias, y solo lo importado lleva 'wikidata'.
ALTER TABLE public.activity_categories
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_id TEXT;

COMMENT ON COLUMN public.activity_categories.source IS
  'Origen de la fila: manual (catálogo propio) o wikidata (importada).';
COMMENT ON COLUMN public.activity_categories.external_id IS
  'Identificador en el origen externo. Para Wikidata, el QID (por ejemplo Q208165).';

-- 2. ÍNDICE ÚNICO PARCIAL
-- Parcial y no una constraint UNIQUE normal: así muchas categorías manuales
-- pueden convivir con external_id NULL sin chocar entre ellas.
CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_categories_external_id
  ON public.activity_categories (external_id)
  WHERE external_id IS NOT NULL;

-- 3. LAS CATEGORÍAS APROBADAS
WITH candidatas(name, icon, description, external_id) AS (
  VALUES
    ('Coleccionismo', '🗃️', 'Reunir, ordenar y cuidar colecciones',            'Q208165'),
    ('Modelismo',     '🛩️', 'Armar y pintar maquetas y modelos a escala',      'Q917912'),
    ('Manualidades',  '✂️', 'Crear objetos con las manos y materiales simples', 'Q810592'),
    ('Programación',  '💻', 'Escribir, entender y depurar código',              'Q80006')
)
INSERT INTO public.activity_categories (name, icon, description, source, external_id)
SELECT c.name, c.icon, c.description, 'wikidata', c.external_id
FROM candidatas c
-- Guardia del UNIQUE de `name`: si alguien ya creó a mano una categoría con ese
-- nombre, se respeta la suya. Sin esto el INSERT reventaría, porque ON CONFLICT
-- solo puede inferir UN índice y aquí se está infiriendo el de external_id.
WHERE NOT EXISTS (
  SELECT 1
  FROM public.activity_categories existente
  WHERE public.normalizar_nombre(existente.name) = public.normalizar_nombre(c.name)
    AND existente.external_id IS DISTINCT FROM c.external_id
)
ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO UPDATE
  SET name        = EXCLUDED.name,
      icon        = EXCLUDED.icon,
      description = EXCLUDED.description,
      source      = EXCLUDED.source;

COMMIT;

-- ==================================================
-- COMPROBACIONES (cada consulta se ejecuta por separado en el editor:
-- solo se muestra el resultado de la última)
-- ==================================================

-- A. Cómo quedó el catálogo completo.
SELECT name, source, external_id, icon
FROM public.activity_categories
ORDER BY source, name;

-- B. Candidatas que NO se insertaron por chocar con un nombre ya existente.
--    Si devuelve filas, hay que decidir a mano qué hacer con cada una.
WITH candidatas(name, external_id) AS (
  VALUES ('Coleccionismo','Q208165'), ('Modelismo','Q917912'),
         ('Manualidades','Q810592'),  ('Programación','Q80006')
)
SELECT c.name AS candidata_saltada,
       c.external_id AS qid,
       existente.name AS choca_con,
       existente.source AS origen_existente,
       coalesce(existente.external_id, '(sin external_id)') AS external_id_existente
FROM candidatas c
JOIN public.activity_categories existente
  ON public.normalizar_nombre(existente.name) = public.normalizar_nombre(c.name)
 AND existente.external_id IS DISTINCT FROM c.external_id;

-- C. Recuento por origen. Lo esperado tras la primera ejecución: manual=7, wikidata=4.
SELECT source, count(*) AS categorias
FROM public.activity_categories
GROUP BY source
ORDER BY source;

-- D. Categorías que no corresponden a ningún gusto. Sus actividades NO se
--    recomiendan por categoría (solo por etiquetas de gusto/interés o como
--    comodín) y tampoco pueden crearse desde el panel de admin, que deduce la
--    categoría a partir del gusto elegido.
SELECT c.name AS categoria_sin_gusto, c.source
FROM public.activity_categories c
WHERE NOT EXISTS (
  SELECT 1 FROM public.likes l
  WHERE split_part(public.normalizar_nombre(c.name), ' y ', 1) = public.normalizar_nombre(l.name)
)
ORDER BY c.source, c.name;
