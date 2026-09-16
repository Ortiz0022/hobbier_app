-- ==========================================
-- MIGRACIÓN: AMIGOS VEN RETOS COMPLETADOS
-- ==========================================
-- El modal de perfil de un amigo (UserProfileModal) muestra sus "Retos"
-- completados y la pestaña "Actividades", pero la única política de
-- user_activities era "Gestionar propias user_activities" (auth.uid() = user_id),
-- así que un amigo no podía leer esas filas y el conteo salía en 0.
--
-- Se agrega una política adicional de SOLO LECTURA para actividades COMPLETED
-- de amigos aceptados, igual al patrón ya usado en "Ver posts en feed".
--
-- Es seguro ejecutarla más de una vez.

DROP POLICY IF EXISTS "Ver retos completados de amigos" ON public.user_activities;
CREATE POLICY "Ver retos completados de amigos" ON public.user_activities FOR SELECT USING (
  status = 'COMPLETED' AND EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'ACCEPTED'
      AND ((f.requester_id = auth.uid() AND f.addressee_id = user_activities.user_id)
        OR (f.addressee_id = auth.uid() AND f.requester_id = user_activities.user_id))
  )
);
