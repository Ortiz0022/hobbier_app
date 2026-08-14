-- ==================================================
-- HOBBIER - Diagnóstico y arreglo rápido de las recomendaciones
-- Ejecutar por bloques en el SQL Editor.
-- ==================================================

-- 1. ¿Está aplicada la migración de candidatos?
--    Debe devolver 1. Si devuelve 0, la Edge Function responde 500 y la app cae
--    al RPC viejo, que recomienda al azar.
SELECT count(*) AS funcion_existe
FROM pg_proc WHERE proname = 'get_recommendation_candidates';


-- 2. ¿Qué actividades tienen preferencias asignadas?
--    Las que salen con 0 gustos y 0 intereses no pueden recomendarse por
--    afinidad: casan con cualquiera y por eso las sugerencias parecen aleatorias.
SELECT
  a.title,
  (SELECT count(*) FROM activity_likes     al WHERE al.activity_id = a.id) AS gustos,
  (SELECT count(*) FROM activity_interests ai WHERE ai.activity_id = a.id) AS intereses,
  (SELECT count(*) FROM activity_resources ar WHERE ar.activity_id = a.id) AS recursos
FROM activities a
WHERE a.is_active
ORDER BY gustos DESC, intereses DESC;


-- 3. Catálogos disponibles para etiquetar
SELECT name FROM likes     ORDER BY name;
SELECT name FROM interests ORDER BY name;
SELECT name FROM resources ORDER BY name;


-- 4. ARREGLO RÁPIDO: etiquetar una actividad existente.
--    Cambia el título y los nombres por los tuyos. Se puede repetir por cada
--    actividad que salga con ceros en el paso 2.
--    (Lo definitivo es que el panel de admin permita elegir esto al crearla.)

INSERT INTO activity_likes (activity_id, like_id)
SELECT a.id, l.id
FROM activities a
JOIN likes l ON l.name IN ('Cocina')            -- <- gustos que encajan
WHERE a.title = 'Tomar café en la casa de Greilyn'  -- <- tu actividad
ON CONFLICT DO NOTHING;

INSERT INTO activity_interests (activity_id, interest_id)
SELECT a.id, i.id
FROM activities a
JOIN interests i ON i.name IN ('Aprender cosas nuevas')  -- <- intereses que encajan
WHERE a.title = 'Tomar café en la casa de Greilyn'
ON CONFLICT DO NOTHING;


-- 5. Comprobar que quedó: vuelve a correr el bloque 2.
