CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  birth_date DATE NOT NULL,
  avatar_url TEXT,
  points INT NOT NULL DEFAULT 0 CHECK (points >= 0),
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activity_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  icon TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_likes (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  like_id UUID REFERENCES public.likes(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, like_id)
);

CREATE TABLE IF NOT EXISTS public.user_interests (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  interest_id UUID REFERENCES public.interests(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, interest_id)
);

CREATE TABLE IF NOT EXISTS public.user_resources (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, resource_id)
);

CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.activity_categories(id) ON DELETE SET NULL,
  min_age INT CHECK (min_age >= 0),
  max_age INT CHECK (max_age >= min_age OR max_age IS NULL),
  points_awarded INT NOT NULL DEFAULT 10 CHECK (points_awarded > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activity_likes (
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
  like_id UUID REFERENCES public.likes(id) ON DELETE CASCADE,
  PRIMARY KEY (activity_id, like_id)
);

CREATE TABLE IF NOT EXISTS public.activity_interests (
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
  interest_id UUID REFERENCES public.interests(id) ON DELETE CASCADE,
  PRIMARY KEY (activity_id, interest_id)
);

CREATE TABLE IF NOT EXISTS public.activity_resources (
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE,
  PRIMARY KEY (activity_id, resource_id)
);

CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  points_awarded INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_activity_id UUID NOT NULL REFERENCES public.user_activities(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REPORTED', 'DELETED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT idx_unique_post_user_reaction UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_no_self_friendship CHECK (requester_id <> addressee_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_friendship_pair
ON public.friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('Contenido ofensivo', 'Contenido inapropiado', 'Violencia', 'Acoso', 'Spam', 'Otro')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_unique_report UNIQUE (post_id, reporter_id)
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, birth_date, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTRING(NEW.id::text, 1, 8)),
    COALESCE((NEW.raw_user_meta_data->>'birth_date')::DATE, '2000-01-01'::DATE),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'role', 'USER')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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

CREATE OR REPLACE FUNCTION public.log_activity_progress(
  p_user_activity_id UUID,
  p_image_url TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_activity_id UUID;
  v_status TEXT;
  v_points INT;
  v_post_id UUID;
BEGIN
  SELECT user_id, activity_id, status
  INTO v_user_id, v_activity_id, v_status
  FROM public.user_activities
  WHERE id = p_user_activity_id AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La actividad del usuario no existe o no tiene permisos.';
  END IF;

  SELECT points_awarded INTO v_points FROM public.activities WHERE id = v_activity_id;
  v_points := COALESCE(v_points, 10);

  UPDATE public.user_activities
  SET status = 'COMPLETED',
      completed_at = NOW(),
      points_awarded = COALESCE(points_awarded, 0) + v_points
  WHERE id = p_user_activity_id;

  UPDATE public.profiles
  SET points = COALESCE(points, 0) + v_points,
      updated_at = NOW()
  WHERE id = auth.uid();

  INSERT INTO public.posts (user_id, user_activity_id, image_url, status, created_at)
  VALUES (auth.uid(), p_user_activity_id, p_image_url, 'ACTIVE', NOW())
  RETURNING id INTO v_post_id;

  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_points,
    'post_id', v_post_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.complete_activity(
  p_user_activity_id UUID,
  p_image_url TEXT
)
RETURNS JSONB AS $$
BEGIN
  RETURN public.log_activity_progress(p_user_activity_id, p_image_url);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.report_post(
  p_post_id UUID,
  p_reason TEXT,
  p_details TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reporter_id UUID := auth.uid();
  v_post_author UUID;
BEGIN
  IF v_reporter_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para reportar.';
  END IF;

  SELECT user_id INTO v_post_author FROM public.posts WHERE id = p_post_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La publicación no existe.';
  END IF;

  IF v_post_author = v_reporter_id THEN
    RAISE EXCEPTION 'No puedes reportar tu propia publicación.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.reports WHERE post_id = p_post_id AND reporter_id = v_reporter_id) THEN
    RAISE EXCEPTION 'Ya has reportado esta publicación anteriormente.';
  END IF;

  INSERT INTO public.reports (post_id, reporter_id, reason, details, status)
  VALUES (p_post_id, v_reporter_id, p_reason, p_details, 'PENDING');

  UPDATE public.posts
  SET status = 'REPORTED'
  WHERE id = p_post_id AND status = 'ACTIVE';

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_post_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author UUID;
BEGIN
  SELECT user_id INTO v_post_author FROM public.posts WHERE id = NEW.post_id;

  IF v_post_author = NEW.reporter_id THEN
    RAISE EXCEPTION 'No puedes reportar tu propia publicación.';
  END IF;

  UPDATE public.posts
  SET status = 'REPORTED'
  WHERE id = NEW.post_id AND status = 'ACTIVE';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_post_reported ON public.reports;
CREATE TRIGGER on_post_reported
  BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_post_report();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver perfiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Editar perfil propio" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Lectura publica likes" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Lectura publica interests" ON public.interests FOR SELECT USING (true);
CREATE POLICY "Lectura publica resources" ON public.resources FOR SELECT USING (true);
CREATE POLICY "Lectura publica categories" ON public.activity_categories FOR SELECT USING (true);

CREATE POLICY "Gestionar user_likes" ON public.user_likes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Gestionar user_interests" ON public.user_interests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Gestionar user_resources" ON public.user_resources FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Lectura actividades activas" ON public.activities FOR SELECT USING (
  (is_active = true AND (created_by IS NULL OR auth.uid() = created_by))
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
CREATE POLICY "Admin gestionar actividades" ON public.activities FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Usuarios crean actividades" ON public.activities FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Lectura activity_likes" ON public.activity_likes FOR SELECT USING (true);
CREATE POLICY "Admin activity_likes" ON public.activity_likes FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Lectura activity_interests" ON public.activity_interests FOR SELECT USING (true);
CREATE POLICY "Admin activity_interests" ON public.activity_interests FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Lectura activity_resources" ON public.activity_resources FOR SELECT USING (true);
CREATE POLICY "Admin activity_resources" ON public.activity_resources FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Gestionar propias user_activities" ON public.user_activities FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Ver posts en feed" ON public.posts FOR SELECT USING (
  status = 'ACTIVE' AND (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'ACCEPTED'
        AND ((f.requester_id = auth.uid() AND f.addressee_id = posts.user_id)
          OR (f.addressee_id = auth.uid() AND f.requester_id = posts.user_id))
    )
  ) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
CREATE POLICY "Crear propios posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin gestionar posts" ON public.posts FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Lectura publica reacciones" ON public.post_reactions FOR SELECT USING (true);
CREATE POLICY "Insertar propia reaccion" ON public.post_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Eliminar propia reaccion" ON public.post_reactions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Ver propias amistades" ON public.friendships FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Crear solicitud amistad" ON public.friendships FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Actualizar solicitud amistad" ON public.friendships FOR UPDATE USING (auth.uid() = addressee_id OR auth.uid() = requester_id);
CREATE POLICY "Eliminar amistad" ON public.friendships FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Crear reportes" ON public.reports;
DROP POLICY IF EXISTS "Admin ver reportes" ON public.reports;
DROP POLICY IF EXISTS "Admin gestionar reportes" ON public.reports;

CREATE POLICY "Crear reportes" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admin ver reportes" ON public.reports FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admin gestionar reportes" ON public.reports FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

INSERT INTO storage.buckets (id, name, public)
VALUES ('activity-evidence', 'activity-evidence', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Lectura publica evidencia" ON storage.objects FOR SELECT USING (bucket_id = 'activity-evidence');
CREATE POLICY "Subida propia evidencia" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'activity-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);
