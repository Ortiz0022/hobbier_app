-- ==========================================
-- PATCH: SALAS GRUPALES
-- ==========================================

-- 1. RPC para actualizar la imagen de la sala
CREATE OR REPLACE FUNCTION public.set_room_image_path(
  p_room_id UUID,
  p_image_path TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.rooms 
  SET image_path = p_image_path, updated_at = NOW()
  WHERE id = p_room_id AND owner_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No tienes permiso o la sala no existe';
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.set_room_image_path TO authenticated;


-- 2. Reforzar política INSERT en storage.objects para room-evidence
-- El formato esperado del path es: {room_id}/{auth.uid()}/{request_id}.jpg
-- Verificamos que sea el bucket correcto, que el owner coincida, 
-- que el segundo segmento del path sea el uid y que el primer segmento sea un room_id donde es miembro.
-- IMPORTANTE: Usamos ::text en las columnas de la DB en lugar de castear el string a ::UUID
-- para evitar errores tipo "invalid input syntax for type uuid" si hay archivos mal nombrados.

DROP POLICY IF EXISTS "Usuarios pueden subir evidencia" ON storage.objects;

CREATE POLICY "Usuarios pueden subir evidencia" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'room-evidence' 
    AND auth.uid() = owner
    AND array_length(string_to_array(name, '/'), 1) >= 3
    AND (string_to_array(name, '/'))[2] = auth.uid()::text
    AND EXISTS (SELECT 1 FROM public.room_members WHERE room_id::text = (string_to_array(name, '/'))[1] AND user_id = auth.uid())
  );

-- 3. Helpers SECURITY DEFINER para policies de storage.objects
-- Evitan la recursión RLS ("new row violates row-level security policy")
-- al aislar las consultas a public.rooms / public.room_members en un contexto privilegiado.

CREATE OR REPLACE FUNCTION public.is_room_owner_for_storage(p_room_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rooms
    WHERE id::text = p_room_id
      AND owner_id = auth.uid()
      AND status != 'DELETED'
  );
$$;

REVOKE ALL ON FUNCTION public.is_room_owner_for_storage(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_room_owner_for_storage(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_view_room_image(p_room_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.rooms
      WHERE id::text = p_room_id
        AND owner_id = auth.uid()
        AND status != 'DELETED'
    )
    OR EXISTS (
      SELECT 1
      FROM public.room_members
      WHERE room_id::text = p_room_id
        AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.room_invitations
      WHERE room_id::text = p_room_id
        AND receiver_id = auth.uid()
        AND status = 'PENDING'
    );
$$;

REVOKE ALL ON FUNCTION public.can_view_room_image(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_room_image(TEXT) TO authenticated;

-- 4. Recrear policies de room-images usando los helpers y soportando upsert (UPDATE+INSERT)

DROP POLICY IF EXISTS "Owners pueden subir imagen de sala" ON storage.objects;
CREATE POLICY "Owners pueden subir imagen de sala" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'room-images' AND 
    public.is_room_owner_for_storage((storage.foldername(name))[1])
  );

DROP POLICY IF EXISTS "Owners pueden modificar imagen de sala" ON storage.objects;
CREATE POLICY "Owners pueden modificar imagen de sala" ON storage.objects
  FOR UPDATE 
  USING (
    bucket_id = 'room-images' AND 
    public.is_room_owner_for_storage((storage.foldername(name))[1])
  )
  WITH CHECK (
    bucket_id = 'room-images' AND 
    public.is_room_owner_for_storage((storage.foldername(name))[1])
  );

DROP POLICY IF EXISTS "Owners pueden borrar imagen de sala" ON storage.objects;
CREATE POLICY "Owners pueden borrar imagen de sala" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'room-images' AND 
    public.is_room_owner_for_storage((storage.foldername(name))[1])
  );

DROP POLICY IF EXISTS "Miembros e invitados pueden ver imagen de sala" ON storage.objects;
CREATE POLICY "Miembros e invitados pueden ver imagen de sala" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'room-images' AND 
    public.can_view_room_image((storage.foldername(name))[1])
  );
