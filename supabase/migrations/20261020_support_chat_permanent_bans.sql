-- ============================================================
-- MIGRACIÓN: SANCIONES PERMANENTES, CHAT DE SOPORTE Y NOTIFICACIONES ADMIN
-- ============================================================
-- 1. Sanciones permanentes:
--    Al sancionar/suspender un perfil, queda con status = 'BANNED' y
--    suspended_until = NULL (permanente, sin plazo automático de 15 días).
-- 2. Chat de soporte y apelaciones:
--    Permite a los usuarios con cuenta sancionada comunicarse en tiempo real
--    con un administrador para explicar su caso y apelar la sanción.
-- 3. Reactivación por administrador:
--    El admin puede reactivar la cuenta directamente desde el chat de soporte.
-- 4. Notificaciones para administradores:
--    Tabla y trigger para registrar notificaciones al admin cuando un usuario
--    sancionado escribe en soporte, con soporte preparado para Push Notifications.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Actualizar trigger para suspensión PERMANENTE
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.suspend_reported_profile()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET status = 'BANNED',
      suspended_until = NULL
  WHERE id = NEW.reported_profile_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_profile_reported ON public.profile_reports;
CREATE TRIGGER on_profile_reported
  AFTER INSERT ON public.profile_reports
  FOR EACH ROW EXECUTE FUNCTION public.suspend_reported_profile();

-- Consulta de suspensión para la app (indica si está sancionado)
CREATE OR REPLACE FUNCTION public.get_my_suspension()
RETURNS TABLE (status TEXT, suspended_until TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p.status, p.suspended_until
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_suspension TO authenticated;

-- ------------------------------------------------------------
-- 2. Tabla de tickets de soporte para apelaciones
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED', 'CLOSED')),
  subject TEXT NOT NULL DEFAULT 'Apelación de sanción',
  unread_admin BOOLEAN NOT NULL DEFAULT TRUE,
  unread_user BOOLEAN NOT NULL DEFAULT FALSE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_support_ticket_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_last_msg ON public.support_tickets(last_message_at DESC);

-- ------------------------------------------------------------
-- 3. Tabla de mensajes de soporte
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL DEFAULT 'USER' CHECK (sender_role IN ('USER', 'ADMIN', 'SYSTEM')),
  content TEXT NOT NULL CHECK (trim(content) <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON public.support_messages(ticket_id, created_at DESC);

-- ------------------------------------------------------------
-- 4. Tabla de notificaciones para administradores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'SUPPORT_APPEAL',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON public.admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON public.admin_notifications(is_read);

-- ------------------------------------------------------------
-- 5. Tabla de tokens Push (preparada para Expo Push Notifications)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform TEXT DEFAULT 'unknown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_push_token UNIQUE (user_id, push_token)
);

-- ------------------------------------------------------------
-- 6. Habilitar Realtime
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'admin_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 7. Row Level Security (RLS)
-- ------------------------------------------------------------
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas de support_tickets
DROP POLICY IF EXISTS "Usuarios ven su propio ticket" ON public.support_tickets;
CREATE POLICY "Usuarios ven su propio ticket" ON public.support_tickets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins ven todos los tickets" ON public.support_tickets;
CREATE POLICY "Admins ven todos los tickets" ON public.support_tickets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

DROP POLICY IF EXISTS "Usuarios crean su propio ticket" ON public.support_tickets;
CREATE POLICY "Usuarios crean su propio ticket" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios actualizan su propio ticket" ON public.support_tickets;
CREATE POLICY "Usuarios actualizan su propio ticket" ON public.support_tickets
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins actualizan cualquier ticket" ON public.support_tickets;
CREATE POLICY "Admins actualizan cualquier ticket" ON public.support_tickets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Políticas de support_messages
DROP POLICY IF EXISTS "Ver mensajes de soporte" ON public.support_messages;
CREATE POLICY "Ver mensajes de soporte" ON public.support_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_messages.ticket_id
        AND (t.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'))
    )
  );

DROP POLICY IF EXISTS "Enviar mensajes de soporte" ON public.support_messages;
CREATE POLICY "Enviar mensajes de soporte" ON public.support_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id = ticket_id AND t.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'
      )
    )
  );

-- Políticas de admin_notifications
DROP POLICY IF EXISTS "Admins ven notificaciones" ON public.admin_notifications;
CREATE POLICY "Admins ven notificaciones" ON public.admin_notifications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

DROP POLICY IF EXISTS "Admins actualizan notificaciones" ON public.admin_notifications;
CREATE POLICY "Admins actualizan notificaciones" ON public.admin_notifications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Políticas de user_push_tokens
DROP POLICY IF EXISTS "Usuarios gestionan sus tokens push" ON public.user_push_tokens;
CREATE POLICY "Usuarios gestionan sus tokens push" ON public.user_push_tokens
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 8. Trigger de mensajes de soporte (notificaciones al admin)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_support_message()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_username TEXT;
  v_sender_is_admin BOOLEAN;
BEGIN
  SELECT user_id INTO v_user_id FROM public.support_tickets WHERE id = NEW.ticket_id;
  SELECT (role = 'ADMIN') INTO v_sender_is_admin FROM public.profiles WHERE id = NEW.sender_id;
  
  IF COALESCE(v_sender_is_admin, FALSE) THEN
    -- Admin respondió
    UPDATE public.support_tickets
    SET last_message_at = NEW.created_at,
        unread_user = TRUE,
        unread_admin = FALSE,
        updated_at = NOW()
    WHERE id = NEW.ticket_id;
  ELSE
    -- Usuario envió mensaje
    UPDATE public.support_tickets
    SET last_message_at = NEW.created_at,
        unread_admin = TRUE,
        unread_user = FALSE,
        status = 'OPEN',
        updated_at = NOW()
    WHERE id = NEW.ticket_id;

    SELECT username INTO v_username FROM public.profiles WHERE id = NEW.sender_id;

    -- Generar notificación para administradores
    INSERT INTO public.admin_notifications (type, title, body, data)
    VALUES (
      'SUPPORT_APPEAL',
      'Apelación de sanción de @' || COALESCE(v_username, 'usuario'),
      SUBSTRING(NEW.content FROM 1 FOR 150),
      jsonb_build_object(
        'ticket_id', NEW.ticket_id,
        'user_id', NEW.sender_id,
        'username', v_username,
        'message_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_support_message_created ON public.support_messages;
CREATE TRIGGER on_support_message_created
  AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_support_message();

-- ------------------------------------------------------------
-- 9. RPC: Obtener o crear ticket de soporte del usuario
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_or_create_my_support_ticket()
RETURNS UUID AS $$
DECLARE
  v_ticket_id UUID;
BEGIN
  SELECT id INTO v_ticket_id
  FROM public.support_tickets
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_ticket_id IS NULL THEN
    INSERT INTO public.support_tickets (user_id, status, subject)
    VALUES (auth.uid(), 'OPEN', 'Apelación de sanción')
    RETURNING id INTO v_ticket_id;

    -- Mensaje de bienvenida oficial
    INSERT INTO public.support_messages (ticket_id, sender_id, sender_role, content)
    VALUES (
      v_ticket_id,
      auth.uid(),
      'SYSTEM',
      'Canal oficial de soporte: Tu cuenta ha sido sancionada. Explica a continuación por qué consideras que fue un error para que un administrador revise tu caso y evalúe reactivar tu cuenta.'
    );
  END IF;

  RETURN v_ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_or_create_my_support_ticket TO authenticated;

-- ------------------------------------------------------------
-- 10. RPC: Reactivar cuenta desde administración
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reactivate_account(p_user_id UUID, p_ticket_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_ticket UUID := p_ticket_id;
BEGIN
  -- Validar rol de administrador
  SELECT (role = 'ADMIN') INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  IF NOT COALESCE(v_is_admin, FALSE) THEN
    RAISE EXCEPTION 'Solo administradores pueden reactivar cuentas';
  END IF;

  -- 1. Reactivar cuenta en perfiles (status ACTIVE y suspended_until NULL)
  UPDATE public.profiles
  SET status = 'ACTIVE',
      suspended_until = NULL
  WHERE id = p_user_id;

  -- 2. Resolver reportes pendientes del perfil
  UPDATE public.profile_reports
  SET status = 'RESOLVED'
  WHERE reported_profile_id = p_user_id AND status = 'PENDING';

  -- 3. Localizar ticket si no vino por parámetro
  IF v_ticket IS NULL THEN
    SELECT id INTO v_ticket FROM public.support_tickets WHERE user_id = p_user_id LIMIT 1;
  END IF;

  -- 4. Marcar ticket como resuelto y agregar mensaje de confirmación
  IF v_ticket IS NOT NULL THEN
    UPDATE public.support_tickets
    SET status = 'RESOLVED',
        unread_user = TRUE,
        unread_admin = FALSE,
        updated_at = NOW()
    WHERE id = v_ticket;

    INSERT INTO public.support_messages (ticket_id, sender_id, sender_role, content)
    VALUES (
      v_ticket,
      auth.uid(),
      'SYSTEM',
      '¡Tu cuenta ha sido reactivada por el equipo de administración! La sanción permanente ha sido levantada y ya puedes volver a usar Hobbier con normalidad.'
    );
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_reactivate_account TO authenticated;

-- Recargar caché de PostgREST
NOTIFY pgrst, 'reload schema';
