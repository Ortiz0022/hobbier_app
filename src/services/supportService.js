import { supabase } from '../config/supabase';

const uniqueChannelName = (base) => `${base}_${Math.random().toString(36).slice(2, 10)}`;

const MESSAGE_SELECT = `
  id,
  ticket_id,
  sender_id,
  sender_role,
  content,
  created_at,
  sender:profiles(id, username, full_name, avatar_url, role)
`;

/**
 * ¿El fallo es que la base todavía no tiene el chat de soporte?
 *
 * Pasa mientras no se aplique supabase/migrations/20261020_support_chat_permanent_bans.sql:
 * PostgREST responde 42P01 (la tabla no existe) o PGRST202/PGRST205 (no encuentra
 * la función o la tabla en su caché). Conviene distinguirlo de un fallo de red,
 * porque lo que hay que hacer es muy distinto.
 */
export const soporteNoDisponible = (error) => {
  if (!error) return false;
  const codigo = error.code || '';
  const mensaje = error.message || '';
  return (
    codigo === '42P01' ||
    codigo === 'PGRST202' ||
    codigo === 'PGRST205' ||
    /support_tickets|support_messages|get_or_create_my_support_ticket/.test(mensaje)
  );
};

/** Lo que se le enseña a la persona cuando el canal no abre o no envía. */
export const explicarFalloSoporte = (error) =>
  soporteNoDisponible(error)
    ? 'El canal de soporte no está disponible en este momento. Inténtalo de nuevo más tarde.'
    : 'No se pudo conectar con soporte. Revisa tu conexión y vuelve a intentarlo.';

export const supportService = {
  /**
   * Obtiene o crea el ticket de soporte para el usuario autenticado (incluso si está suspendido).
   */
  async getOrCreateMyTicket() {
    try {
      const { data, error } = await supabase.rpc('get_or_create_my_support_ticket');
      if (!error && data) {
        return data; // Retorna ticket_id (UUID)
      }
    } catch (e) {
      console.warn('RPC get_or_create_my_support_ticket no disponible, intentando consulta directa:', e);
    }

    // Fallback directo por si la función no se ha cargado en la base
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error('No hay sesión de usuario activa.');

    const { data: existing, error: findError } = await supabase
      .from('support_tickets')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing?.id) return existing.id;

    const { data: created, error: createError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId,
        status: 'OPEN',
        subject: 'Apelación de sanción',
      })
      .select('id')
      .single();

    if (createError) throw createError;

    // Mensaje inicial del sistema
    try {
      await supabase.from('support_messages').insert({
        ticket_id: created.id,
        sender_id: userId,
        sender_role: 'SYSTEM',
        content:
          'Canal oficial de soporte: Tu cuenta ha recibido una sanción permanente. Explica a continuación los motivos por los que consideras que fue un error para que un administrador evalúe reactivar tu cuenta.',
      });
    } catch (_) {}

    return created.id;
  },

  /**
   * Obtiene la información del ticket actual del usuario.
   */
  async getMyTicket() {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        user:profiles(id, username, full_name, avatar_url, status)
      `)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error al obtener mi ticket de soporte:', error.message);
      return null;
    }
    return data;
  },

  /**
   * Obtiene los mensajes de un ticket con paginación.
   */
  async getTicketMessages(ticketId, { limit = 40, offset = 0 } = {}) {
    if (!ticketId) return [];

    const { data, error } = await supabase
      .from('support_messages')
      .select(MESSAGE_SELECT)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  },

  /**
   * Envía un mensaje de texto dentro del ticket.
   */
  async sendSupportMessage(ticketId, content, senderRole = 'USER') {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error('No hay usuario autenticado.');

    const cleanContent = (content || '').trim();
    if (!cleanContent) throw new Error('El mensaje no puede estar vacío.');

    const { data, error } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: userId,
        sender_role: senderRole,
        content: cleanContent,
      })
      .select(MESSAGE_SELECT)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Marca los mensajes de un ticket como leídos.
   */
  async markTicketRead(ticketId, forAdmin = false) {
    if (!ticketId) return;
    try {
      const payload = forAdmin ? { unread_admin: false } : { unread_user: false };
      await supabase.from('support_tickets').update(payload).eq('id', ticketId);
    } catch (err) {
      console.log('Error al marcar ticket como leído:', err?.message);
    }
  },

  /**
   * Consulta los tickets de soporte para el panel de administración.
   */
  async adminGetTickets({ status = 'ALL', search = '' } = {}) {
    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        user:profiles(id, username, full_name, avatar_url, status, created_at)
      `)
      .order('last_message_at', { ascending: false });

    if (status === 'OPEN') {
      query = query.eq('status', 'OPEN');
    } else if (status === 'RESOLVED') {
      query = query.eq('status', 'RESOLVED');
    }

    const { data, error } = await query;
    if (error) throw error;

    let tickets = data || [];
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      tickets = tickets.filter(
        (t) =>
          t.user?.username?.toLowerCase().includes(term) ||
          t.user?.full_name?.toLowerCase().includes(term)
      );
    }

    return tickets;
  },

  /**
   * Reactiva la cuenta de un usuario desde la administración.
   */
  async adminReactivateAccount(userId, ticketId = null) {
    try {
      const { data, error } = await supabase.rpc('admin_reactivate_account', {
        p_user_id: userId,
        p_ticket_id: ticketId,
      });

      if (!error) return { success: true };
    } catch (e) {
      console.warn('RPC admin_reactivate_account no disponible, ejecutando actualización directa:', e);
    }

    // Fallback directo en caso de que la RPC no se haya ejecutado aún en la BD
    try {
      // 1. Reactivar perfil (solo status; suspended_until puede no existir aún)
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ status: 'ACTIVE' })
        .eq('id', userId);

      if (profileErr) throw profileErr;

      // Limpiar suspended_until si la columna existe
      try {
        await supabase
          .from('profiles')
          .update({ suspended_until: null })
          .eq('id', userId);
      } catch (_) {}

      // 2. Resolver reportes
      await supabase
        .from('profile_reports')
        .update({ status: 'RESOLVED' })
        .eq('reported_profile_id', userId)
        .eq('status', 'PENDING');

      // 3. Actualizar ticket
      if (ticketId) {
        await supabase
          .from('support_tickets')
          .update({ status: 'RESOLVED', unread_user: true, unread_admin: false })
          .eq('id', ticketId);

        const { data: { session } } = await supabase.auth.getSession();
        await supabase.from('support_messages').insert({
          ticket_id: ticketId,
          sender_id: session?.user?.id || userId,
          sender_role: 'SYSTEM',
          content:
            '¡Tu cuenta ha sido reactivada por el equipo de administración! La sanción permanente ha sido levantada y ya puedes volver a usar Hobbier con normalidad.',
        });
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Error al reactivar cuenta de usuario:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Sanciona permanentemente la cuenta de un usuario desde la administración.
   */
  async adminBanAccount(userId, ticketId = null, reason = null) {
    // 1. Sancionar perfil
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ status: 'BANNED' })
      .eq('id', userId);

    if (profileErr) {
      console.error('Error al sancionar cuenta de usuario:', profileErr);
      return { success: false, error: profileErr };
    }

    try {
      // 2. Actualizar ticket
      if (ticketId) {
        await supabase
          .from('support_tickets')
          .update({ status: 'RESOLVED', unread_user: true, unread_admin: false })
          .eq('id', ticketId);

        const { data: { session } } = await supabase.auth.getSession();
        await supabase.from('support_messages').insert({
          ticket_id: ticketId,
          sender_id: session?.user?.id || userId,
          sender_role: 'SYSTEM',
          content:
            reason ||
            'Tu apelación ha sido revisada. La sanción permanente sobre tu cuenta se mantiene y la cuenta seguirá bloqueada. No podrás volver a acceder a Hobbier.',
        });
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Error al actualizar ticket tras sanción:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Suscripción en tiempo real a los mensajes de un ticket.
   */
  subscribeToTicketMessages(ticketId, onNewMessage, isKnownMessage = null) {
    if (!ticketId) return () => {};

    const channel = supabase
      .channel(uniqueChannelName(`support_messages_${ticketId}`))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        async (payload) => {
          if (isKnownMessage?.(payload.new.id)) {
            onNewMessage(payload.new);
            return;
          }

          const { data, error } = await supabase
            .from('support_messages')
            .select(MESSAGE_SELECT)
            .eq('id', payload.new.id)
            .single();

          if (!error && data) {
            onNewMessage(data);
          } else {
            onNewMessage(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Suscripción en tiempo real para el panel de tickets de admin.
   */
  subscribeToAdminTickets(onTicketUpdated) {
    const channel = supabase
      .channel(uniqueChannelName('support_tickets_admin'))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
        },
        (payload) => {
          onTicketUpdated(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
