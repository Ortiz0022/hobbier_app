-- ==================================================
-- Anuncios: el admin puede borrar imágenes del bucket ad-images
-- ==================================================
-- El bucket es público. Al rechazar una solicitud, el panel borra la foto que
-- adjuntó el anunciante (solicitudes/<id>/...) para que no quede accesible con
-- el enlace. Para eso el admin necesita permiso de borrado en el bucket.
--
-- Es seguro ejecutarla más de una vez.

DROP POLICY IF EXISTS "Admin borra imagenes anuncios" ON storage.objects;
CREATE POLICY "Admin borra imagenes anuncios" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'ad-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );
