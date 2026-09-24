-- ==================================================
-- HOBBIER - Preferencias: guardado transaccional y búsqueda de catálogos
-- ==================================================
-- PARA APLICARLO: pegar este archivo completo en el SQL Editor de Supabase.
-- (Los despliegues de este proyecto son manuales, no hay CLI enlazada.)
--
-- Qué hace
-- --------
-- 1. Añade `name_normalizado` (columna GENERADA) a `likes` e `interests`, con su
--    índice, para poder buscar sin distinguir mayúsculas ni tildes DENTRO de
--    Postgres, sin descargar el catálogo entero al dispositivo.
-- 2. Crea `public.guardar_preferencias(...)`: reemplaza el borrar-y-reinsertar
--    que hacía el cliente, en una sola transacción y usando auth.uid().
--
-- Por qué la columna generada y no `unaccent`
-- -------------------------------------------
-- El proyecto NO tiene instaladas las extensiones `unaccent` ni `pg_trgm`
-- (comprobado en la base: solo pg_stat_statements, pgcrypto, plpgsql,
-- supabase_vault y uuid-ossp). `public.normalizar_nombre` es IMMUTABLE, así que
-- sirve para una columna generada y para indexarla, sin instalar nada.
--
-- OJO: el valor guardado se recalcula al insertar o actualizar la fila. Si algún
-- día se cambia la definición de `normalizar_nombre`, hay que forzar el
-- recálculo (por ejemplo con UPDATE ... SET name = name).
--
-- Búsqueda por subcadena: con catálogos de decenas de filas, el recorrido
-- secuencial es irrelevante. Si algún día llegan a miles, habría que activar
-- `pg_trgm` y cambiar el índice por uno GIN.
--
-- Es seguro ejecutarlo más de una vez.

BEGIN;

-- 0. DEPENDENCIA
DO $$
BEGIN
  IF to_regprocedure('public.normalizar_nombre(text)') IS NULL THEN
    RAISE EXCEPTION
      'Falta public.normalizar_nombre(text). Ejecuta antes supabase/unificar_regla_gusto_categoria.sql';
  END IF;
END $$;

-- 1. COLUMNA NORMALIZADA + ÍNDICE
ALTER TABLE public.likes
  ADD COLUMN IF NOT EXISTS name_normalizado TEXT
  GENERATED ALWAYS AS (public.normalizar_nombre(name)) STORED;

ALTER TABLE public.interests
  ADD COLUMN IF NOT EXISTS name_normalizado TEXT
  GENERATED ALWAYS AS (public.normalizar_nombre(name)) STORED;

-- text_pattern_ops: sirve para los LIKE anclados al principio ('musica%').
-- Para '%musica%' Postgres hace recorrido secuencial igualmente, que a esta
-- escala es más rápido que cualquier índice.
CREATE INDEX IF NOT EXISTS idx_likes_name_normalizado
  ON public.likes (name_normalizado text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_interests_name_normalizado
  ON public.interests (name_normalizado text_pattern_ops);

-- 2. GUARDADO TRANSACCIONAL
-- Reemplaza el borrar-y-reinsertar que hacía el cliente en 4 llamadas sueltas:
-- si fallaba una después del DELETE, el usuario se quedaba sin preferencias.
-- Aquí, o se aplican las tres listas o no se aplica ninguna.
--
-- El usuario sale de auth.uid(), NUNCA de un parámetro: aunque el cliente
-- mandara otro id, no podría escribir preferencias ajenas.
--
-- El JOIN contra el catálogo descarta en silencio los ids que no existan, que es
-- justo lo que debe pasar con una lista manipulada desde el cliente.
CREATE OR REPLACE FUNCTION public.guardar_preferencias(
  p_likes     UUID[] DEFAULT '{}',
  p_interests UUID[] DEFAULT '{}',
  p_resources UUID[] DEFAULT '{}'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  DELETE FROM public.user_likes     WHERE user_id = v_uid;
  DELETE FROM public.user_interests WHERE user_id = v_uid;
  DELETE FROM public.user_resources WHERE user_id = v_uid;

  INSERT INTO public.user_likes (user_id, like_id)
  SELECT v_uid, l.id
  FROM public.likes l
  WHERE l.id = ANY (COALESCE(p_likes, '{}'::UUID[]));

  INSERT INTO public.user_interests (user_id, interest_id)
  SELECT v_uid, i.id
  FROM public.interests i
  WHERE i.id = ANY (COALESCE(p_interests, '{}'::UUID[]));

  INSERT INTO public.user_resources (user_id, resource_id)
  SELECT v_uid, r.id
  FROM public.resources r
  WHERE r.id = ANY (COALESCE(p_resources, '{}'::UUID[]));
END;
$$;

REVOKE ALL ON FUNCTION public.guardar_preferencias(UUID[], UUID[], UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guardar_preferencias(UUID[], UUID[], UUID[]) TO authenticated;

COMMIT;

-- ==================================================
-- COMPROBACIONES (ejecutar cada una por separado)
-- ==================================================

-- A. La columna generada se rellenó sola, sin tildes ni mayúsculas.
SELECT name, name_normalizado FROM public.likes ORDER BY name;

-- B. La búsqueda encuentra "Música" escribiendo "musica", sin tilde.
SELECT id, name FROM public.likes
WHERE name_normalizado LIKE '%' || public.normalizar_nombre('musica') || '%'
LIMIT 20;

-- C. La función existe y solo la puede ejecutar un usuario autenticado.
SELECT p.oid::regprocedure AS firma,
       p.prosecdef AS security_definer,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS puede_authenticated,
       has_function_privilege('anon', p.oid, 'EXECUTE')          AS puede_anon
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'guardar_preferencias';

-- D. Los índices quedaron creados.
SELECT tablename, indexname FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE '%name_normalizado%'
ORDER BY 1;
