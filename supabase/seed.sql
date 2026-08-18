-- ==================================================
-- HOBBIER APP - DATOS INICIALES (SEED)
-- ==================================================

-- 1. INSERTAR GUSTOS BASE
INSERT INTO public.likes (id, name, icon) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Deportes', '⚽'),
  ('11111111-1111-1111-1111-111111111102', 'Arte', '🎨'),
  ('11111111-1111-1111-1111-111111111103', 'Música', '🎵'),
  ('11111111-1111-1111-1111-111111111104', 'Lectura', '📚'),
  ('11111111-1111-1111-1111-111111111105', 'Naturaleza', '🌿'),
  ('11111111-1111-1111-1111-111111111106', 'Cocina', '🍳')
ON CONFLICT (name) DO NOTHING;

-- 2. INSERTAR INTERESES BASE
INSERT INTO public.interests (id, name, icon) VALUES
  ('22222222-2222-2222-2222-222222222201', 'Leer más', '📖'),
  ('22222222-2222-2222-2222-222222222202', 'Aprender un idioma', '🗣️'),
  ('22222222-2222-2222-2222-222222222203', 'Hacer ejercicio', '💪'),
  ('22222222-2222-2222-2222-222222222204', 'Mejorar creatividad', '💡'),
  ('22222222-2222-2222-2222-222222222205', 'Aprender cosas nuevas', '🧠')
ON CONFLICT (name) DO NOTHING;

-- 3. INSERTAR RECURSOS DISPONIBLES
INSERT INTO public.resources (id, name, icon) VALUES
  ('33333333-3333-3333-3333-333333333301', 'Bicicleta', '🚲'),
  ('33333333-3333-3333-3333-333333333302', 'Ajedrez', '♟️'),
  ('33333333-3333-3333-3333-333333333303', 'Cartas', '🃏'),
  ('33333333-3333-3333-3333-333333333304', 'Pinturas', '🖌️'),
  ('33333333-3333-3333-3333-333333333305', 'Lápices', '✏️'),
  ('33333333-3333-3333-3333-333333333306', 'Libros', '📕'),
  ('33333333-3333-3333-3333-333333333307', 'Balón', '🏀'),
  ('33333333-3333-3333-3333-333333333308', 'Computadora', '💻'),
  ('33333333-3333-3333-3333-333333333309', 'Instrumento musical', '🎸')
ON CONFLICT (name) DO NOTHING;

-- 4. CATEGORÍAS DE ACTIVIDAD
INSERT INTO public.activity_categories (id, name, icon, description) VALUES
  ('44444444-4444-4444-4444-444444444401', 'Arte', '🎨', 'Expresión plástica y pintura'),
  ('44444444-4444-4444-4444-444444444402', 'Deportes y Salud', '🏃', 'Actividad física y ejercicio'),
  ('44444444-4444-4444-4444-444444444403', 'Lectura y Aprendizaje', '📖', 'Lectura, idiomas e intelecto'),
  ('44444444-4444-4444-4444-444444444404', 'Juegos y Entretenimiento', '🎲', 'Juegos de mesa y cartas'),
  ('44444444-4444-4444-4444-444444444405', 'Cocina y Gastronomía', '👨‍🍳', 'Recetas y delicias culinarias'),
  ('44444444-4444-4444-4444-444444444406', 'Música', '🎵', 'Práctica y disfrute musical'),
  ('44444444-4444-4444-4444-444444444407', 'Naturaleza', '🌿', 'Aire libre, plantas y entorno natural')
ON CONFLICT (name) DO NOTHING;

-- 5. ACTIVIDADES DE EJEMPLO
INSERT INTO public.activities (id, title, description, category_id, min_age, max_age, points_awarded, is_active) VALUES
  ('55555555-5555-5555-5555-555555555501', 'Pinta algo que tengas frente a ti', 'Elige un objeto cercano en tu habitación y dibújalo o píntalo con paciencia.', '44444444-4444-4444-4444-444444444401', 5, NULL, 20, true),
  ('55555555-5555-5555-5555-555555555502', 'Paseo en bicicleta por 20 minutos', 'Sal a pedalear un momento y respira aire fresco en tu zona.', '44444444-4444-4444-4444-444444444402', 10, NULL, 25, true),
  ('55555555-5555-5555-5555-555555555503', 'Leer un capítulo de un libro', 'Toma un libro que tengas guardado y lee durante al menos 15 minutos.', '44444444-4444-4444-4444-444444444403', 8, NULL, 15, true),
  ('55555555-5555-5555-5555-555555555504', 'Partida de ajedrez o cartas', 'Juega una partida relajante de ajedrez o cartas.', '44444444-4444-4444-4444-444444444404', 6, NULL, 15, true),
  ('55555555-5555-5555-5555-555555555505', 'Practicar 15 minutos de un nuevo idioma', 'Utiliza la computadora para repasar vocabulario en otro idioma.', '44444444-4444-4444-4444-444444444403', 10, NULL, 20, true),
  ('55555555-5555-5555-5555-555555555506', 'Tocar una canción con tu instrumento', 'Practica escalas o tu melodía favorita en tu instrumento musical.', '44444444-4444-4444-4444-444444444406', 7, NULL, 25, true),
  ('55555555-5555-5555-5555-555555555507', 'Caminata ligera al aire libre', 'Realiza una caminata de 15 minutos sin necesitar recursos especiales.', '44444444-4444-4444-4444-444444444402', 0, NULL, 10, true)
ON CONFLICT (id) DO NOTHING;

-- RELACIONES DE ACTIVIDADES CON GUSTOS/INTERESES/RECURSOS
-- Actividad 1: Pinta algo (Requiere Pinturas)
INSERT INTO public.activity_likes (activity_id, like_id) VALUES ('55555555-5555-5555-5555-555555555501', '11111111-1111-1111-1111-111111111102') ON CONFLICT DO NOTHING;
INSERT INTO public.activity_interests (activity_id, interest_id) VALUES ('55555555-5555-5555-5555-555555555501', '22222222-2222-2222-2222-222222222204') ON CONFLICT DO NOTHING;
INSERT INTO public.activity_resources (activity_id, resource_id) VALUES ('55555555-5555-5555-5555-555555555501', '33333333-3333-3333-3333-333333333304') ON CONFLICT DO NOTHING;

-- Actividad 2: Paseo en bicicleta (Requiere Bicicleta)
INSERT INTO public.activity_likes (activity_id, like_id) VALUES ('55555555-5555-5555-5555-555555555502', '11111111-1111-1111-1111-111111111101') ON CONFLICT DO NOTHING;
INSERT INTO public.activity_interests (activity_id, interest_id) VALUES ('55555555-5555-5555-5555-555555555502', '22222222-2222-2222-2222-222222222203') ON CONFLICT DO NOTHING;
INSERT INTO public.activity_resources (activity_id, resource_id) VALUES ('55555555-5555-5555-5555-555555555502', '33333333-3333-3333-3333-333333333301') ON CONFLICT DO NOTHING;

-- Actividad 3: Leer capítulo (Requiere Libros)
INSERT INTO public.activity_likes (activity_id, like_id) VALUES ('55555555-5555-5555-5555-555555555503', '11111111-1111-1111-1111-111111111104') ON CONFLICT DO NOTHING;
INSERT INTO public.activity_interests (activity_id, interest_id) VALUES ('55555555-5555-5555-5555-555555555503', '22222222-2222-2222-2222-222222222201') ON CONFLICT DO NOTHING;
INSERT INTO public.activity_resources (activity_id, resource_id) VALUES ('55555555-5555-5555-5555-555555555503', '33333333-3333-3333-3333-333333333306') ON CONFLICT DO NOTHING;

-- Actividad 5: Idioma (Requiere Computadora)
INSERT INTO public.activity_interests (activity_id, interest_id) VALUES ('55555555-5555-5555-5555-555555555505', '22222222-2222-2222-2222-222222222202') ON CONFLICT DO NOTHING;
INSERT INTO public.activity_resources (activity_id, resource_id) VALUES ('55555555-5555-5555-5555-555555555505', '33333333-3333-3333-3333-333333333308') ON CONFLICT DO NOTHING;

-- Actividad 6: Instrumento (Requiere Instrumento musical)
INSERT INTO public.activity_likes (activity_id, like_id) VALUES ('55555555-5555-5555-5555-555555555506', '11111111-1111-1111-1111-111111111103') ON CONFLICT DO NOTHING;
INSERT INTO public.activity_resources (activity_id, resource_id) VALUES ('55555555-5555-5555-5555-555555555506', '33333333-3333-3333-3333-333333333309') ON CONFLICT DO NOTHING;
