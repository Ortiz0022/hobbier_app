-- Descontar los puntos de una publicación al eliminarla (perfil, admin o SQL).
-- Ejecutar completa en Supabase SQL Editor o mediante las migraciones del proyecto.
BEGIN;
LOCK TABLE public.user_activities, public.profiles, public.posts IN SHARE ROW EXCLUSIVE MODE;

-- Cada foto conserva los puntos que realmente otorgó, aunque cambie el catálogo.
-- Solo las funciones del servidor pueden escribir este registro contable.
CREATE TABLE IF NOT EXISTS public.post_point_awards (
  post_id UUID PRIMARY KEY REFERENCES public.posts(id) ON DELETE CASCADE,
  points_awarded INT NOT NULL CHECK (points_awarded >= 0),
  counted BOOLEAN NOT NULL DEFAULT TRUE
);
ALTER TABLE public.post_point_awards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.post_point_awards FROM PUBLIC, anon, authenticated;

-- Antes no se guardaban puntos por foto: user_activities contiene el acumulado.
-- Distribuirlo entre TODAS sus publicaciones (también las ya eliminadas) conserva
-- exactamente el total histórico, sin asumir el precio actual del catálogo.
-- Si hubo cambios de precio históricos, el valor exacto de cada foto no es recuperable.
-- No se descuentan eliminaciones anteriores a esta migración de forma retroactiva.
WITH historial AS (
  SELECT p.id,
         GREATEST(COALESCE(ua.points_awarded, 0), 0) AS total,
         COUNT(*) OVER (PARTITION BY p.user_activity_id)::INT AS cantidad,
         ROW_NUMBER() OVER (PARTITION BY p.user_activity_id ORDER BY p.created_at, p.id) AS posicion
  FROM public.posts p
  JOIN public.user_activities ua ON ua.id = p.user_activity_id
)
INSERT INTO public.post_point_awards (post_id, points_awarded)
SELECT id, total / cantidad + CASE WHEN posicion <= total % cantidad THEN 1 ELSE 0 END
FROM historial
ON CONFLICT (post_id) DO NOTHING;

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

  INSERT INTO public.post_point_awards (post_id, points_awarded)
  VALUES (v_post_id, v_points);

  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_points,
    'post_id', v_post_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- El estado del registro contable impide descontar dos veces y permite restaurar.
-- BEFORE DELETE también cubre un borrado físico y las eliminaciones en cascada.
CREATE OR REPLACE FUNCTION public.sync_post_points()
RETURNS TRIGGER AS $$
DECLARE
  v_points INT;
  v_delta INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.post_point_awards
    SET counted = FALSE
    WHERE post_id = OLD.id AND counted
    RETURNING points_awarded INTO v_points;
    v_delta := -COALESCE(v_points, 0);
  ELSIF NEW.status = 'DELETED' AND OLD.status != 'DELETED' THEN
    UPDATE public.post_point_awards
    SET counted = FALSE
    WHERE post_id = OLD.id AND counted
    RETURNING points_awarded INTO v_points;
    v_delta := -COALESCE(v_points, 0);
  ELSIF OLD.status = 'DELETED' AND NEW.status != 'DELETED' THEN
    UPDATE public.post_point_awards
    SET counted = TRUE
    WHERE post_id = OLD.id AND NOT counted
    RETURNING points_awarded INTO v_points;
    v_delta := COALESCE(v_points, 0);
  ELSE
    RETURN NEW;
  END IF;

  IF v_delta != 0 THEN
    -- Mismo orden de actualización que log_activity_progress.
    UPDATE public.user_activities
    SET points_awarded = GREATEST(0, COALESCE(points_awarded, 0) + v_delta)
    WHERE id = OLD.user_activity_id AND user_id = OLD.user_id;

    UPDATE public.profiles
    SET points = GREATEST(0, COALESCE(points, 0) + v_delta), updated_at = NOW()
    WHERE id = OLD.user_id;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
REVOKE ALL ON FUNCTION public.sync_post_points() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_post_points_status ON public.posts;
CREATE TRIGGER trg_post_points_status
AFTER UPDATE OF status ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.sync_post_points();

DROP TRIGGER IF EXISTS trg_post_points_delete ON public.posts;
CREATE TRIGGER trg_post_points_delete
BEFORE DELETE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.sync_post_points();

COMMIT;
