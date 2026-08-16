-- Migración: Habilitar repetición de actividades con historial fotográfico

-- 1. Eliminar restricción de unicidad en posts.user_activity_id si existe
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_user_activity_id_key;

-- 2. Función RPC para registrar repetición o avance de una actividad (ya sea PENDING o COMPLETED)
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

  -- Actualizar estado a COMPLETED si estaba en PENDING, actualizar fecha y sumar puntos
  UPDATE public.user_activities
  SET status = 'COMPLETED',
      completed_at = NOW(),
      points_awarded = COALESCE(points_awarded, 0) + v_points
  WHERE id = p_user_activity_id;

  -- Otorgar puntos al perfil del usuario
  UPDATE public.profiles
  SET points = COALESCE(points, 0) + v_points,
      updated_at = NOW()
  WHERE id = auth.uid();

  -- Insertar nuevo post con la foto de evidencia
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

-- 3. Mantener complete_activity compatible permitiendo repeticiones si ya está COMPLETED
CREATE OR REPLACE FUNCTION public.complete_activity(
  p_user_activity_id UUID,
  p_image_url TEXT
)
RETURNS JSONB AS $$
BEGIN
  RETURN public.log_activity_progress(p_user_activity_id, p_image_url);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
