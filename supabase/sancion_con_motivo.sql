-- ============================================================
-- SANCIONAR UNA CUENTA: EL MOTIVO ES OBLIGATORIO Y SE LE DICE
-- ============================================================
-- Hasta ahora una sanción no dejaba constancia de POR QUÉ, así que quien la
-- recibía solo veía "tu cuenta ha sido sancionada" y el administrador que la
-- revisaba después tampoco sabía qué había pasado.
--
-- Este lote:
--   1. Guarda el motivo en el perfil (ban_reason) con su fecha.
--   2. Lo devuelve en get_my_suspension, que es lo que la app consulta.
--   3. Añade admin_suspend_account(usuario, motivo): exige el motivo, sanciona
--      y DEJA EL MOTIVO ESCRITO EN EL CHAT DE SOPORTE, para que la persona lo
--      lea en el mismo sitio donde va a apelar.
--   4. Hace lo mismo con la sanción automática por reporte de la comunidad.
--   5. Al reactivar, borra el motivo: ya no está sancionada.
--
-- Requiere el chat de soporte (20261020_support_chat_permanent_bans.sql).
-- Es idempotente: se puede correr las veces que haga falta.
-- ============================================================

-- ------------------------------------------------------------
-- 1. El motivo, en el perfil
-- ------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;

-- ------------------------------------------------------------
-- 2. La app pregunta por su estado: que venga con el motivo
-- ------------------------------------------------------------
-- Cambia el tipo de retorno, así que hay que borrarla antes de crearla.
DROP FUNCTION IF EXISTS public.get_my_suspension();

CREATE FUNCTION public.get_my_suspension()
RETURNS TABLE (
  status TEXT,
  suspended_until TIMESTAMPTZ,
  ban_reason TEXT,
  banned_at TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p.status, p.suspended_until, p.ban_reason, p.banned_at
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_suspension TO authenticated;

-- ------------------------------------------------------------
-- 3. Sancionar: sin motivo, no hay sanción
-- ------------------------------------------------------------
-- El motivo se exige AQUÍ, no solo en la pantalla del panel: una comprobación
-- que vive únicamente en el cliente se salta con una llamada directa a la API.
CREATE OR REPLACE FUNCTION public.admin_suspend_account(p_user_id UUID, p_reason TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_motivo TEXT := btrim(COALESCE(p_reason, ''));
  v_ticket UUID;
BEGIN
  SELECT (role = 'ADMIN') INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  IF NOT COALESCE(v_is_admin, FALSE) THEN
    RAISE EXCEPTION 'Solo administradores pueden sancionar cuentas';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes sancionar tu propia cuenta';
  END IF;

  IF length(v_motivo) < 10 THEN
    RAISE EXCEPTION 'Hay que explicar el motivo de la sanción (al menos 10 caracteres)';
  END IF;

  -- 1. La sanción, con su motivo y su fecha
  UPDATE public.profiles
  SET status = 'BANNED',
      suspended_until = NULL,
      ban_reason = v_motivo,
      banned_at = NOW()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe esa cuenta';
  END IF;

  -- 2. El canal de apelación, para dejarle el motivo escrito
  SELECT id INTO v_ticket FROM public.support_tickets WHERE user_id = p_user_id LIMIT 1;

  IF v_ticket IS NULL THEN
    INSERT INTO public.support_tickets (user_id, status, subject)
    VALUES (p_user_id, 'OPEN', 'Apelación de sanción')
    RETURNING id INTO v_ticket;
  END IF;

  -- El mensaje lo firma el administrador, así que el trigger de soporte ya deja
  -- el ticket marcado como no leído para la persona sancionada.
  INSERT INTO public.support_messages (ticket_id, sender_id, sender_role, content)
  VALUES (
    v_ticket,
    auth.uid(),
    'SYSTEM',
    'Tu cuenta ha sido sancionada. Motivo: ' || v_motivo ||
    E'\n\nSi crees que es un error, explícalo aquí y un administrador revisará tu caso.'
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_suspend_account TO authenticated;

-- ------------------------------------------------------------
-- 4. La sanción automática por reporte también dice por qué
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.suspend_reported_profile()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET status = 'BANNED',
      suspended_until = NULL,
      ban_reason = 'Reporte de la comunidad: ' || COALESCE(NULLIF(btrim(NEW.reason), ''), 'sin detalle'),
      banned_at = NOW()
  WHERE id = NEW.reported_profile_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_profile_reported ON public.profile_reports;
CREATE TRIGGER on_profile_reported
  AFTER INSERT ON public.profile_reports
  FOR EACH ROW EXECUTE FUNCTION public.suspend_reported_profile();

-- ------------------------------------------------------------
-- 5. Al reactivar, el motivo deja de aplicar
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reactivate_account(p_user_id UUID, p_ticket_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_ticket UUID := p_ticket_id;
BEGIN
  SELECT (role = 'ADMIN') INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  IF NOT COALESCE(v_is_admin, FALSE) THEN
    RAISE EXCEPTION 'Solo administradores pueden reactivar cuentas';
  END IF;

  UPDATE public.profiles
  SET status = 'ACTIVE',
      suspended_until = NULL,
      ban_reason = NULL,
      banned_at = NULL
  WHERE id = p_user_id;

  UPDATE public.profile_reports
  SET status = 'RESOLVED'
  WHERE reported_profile_id = p_user_id AND status = 'PENDING';

  IF v_ticket IS NULL THEN
    SELECT id INTO v_ticket FROM public.support_tickets WHERE user_id = p_user_id LIMIT 1;
  END IF;

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
      '¡Tu cuenta ha sido reactivada por el equipo de administración! La sanción ha sido levantada y ya puedes volver a usar Hobbier con normalidad.'
    );
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.admin_reactivate_account TO authenticated;

-- ------------------------------------------------------------
-- 6. Que la API vea la columna y las funciones nuevas
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
