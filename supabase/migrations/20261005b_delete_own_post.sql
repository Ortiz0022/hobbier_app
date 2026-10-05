-- ==================================================
-- Eliminar publicaciones propias
-- ==================================================
-- posts no tiene política de UPDATE ni DELETE para usuarios normales (solo el
-- admin puede actualizar), así que el borrado pasa por esta función.
--
-- La comprobación de autoría vive AQUÍ, no en la app: la función es SECURITY
-- DEFINER y se salta la RLS, de modo que es ella la que garantiza que nadie
-- pueda borrar la publicación de otra persona llamando a la API directamente.
--
-- Es un borrado lógico (status = 'DELETED'), igual que cuando el admin elimina
-- un post reportado: desaparece del feed y del perfil (todas las consultas
-- filtran por ACTIVE) pero se conservan los reportes que tuviera asociados.
-- Los puntos ganados por la actividad NO se restan: la actividad se hizo igual.
--
-- Es seguro ejecutarla más de una vez.

CREATE OR REPLACE FUNCTION public.delete_own_post(p_post_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_author UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para eliminar publicaciones.';
  END IF;

  SELECT user_id INTO v_author
  FROM public.posts
  WHERE id = p_post_id AND status != 'DELETED'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La publicación no existe o ya fue eliminada.';
  END IF;

  IF v_author != auth.uid() THEN
    RAISE EXCEPTION 'Solo puedes eliminar tus propias publicaciones.';
  END IF;

  UPDATE public.posts
  SET status = 'DELETED'
  WHERE id = p_post_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.delete_own_post(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_post(UUID) TO authenticated;
