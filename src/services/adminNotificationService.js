import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

const uniqueChannelName = (base) => `${base}_${Math.random().toString(36).slice(2, 10)}`;

export const adminNotificationService = {
  /**
   * Obtiene la lista de notificaciones para administradores.
   */
  async getNotifications({ unreadOnly = false, limit = 20 } = {}) {
    try {
      let query = supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Error al obtener notificaciones de admin:', err.message);
      return [];
    }
  },

  /**
   * Obtiene la cantidad de notificaciones no leídas.
   */
  async getUnreadCount() {
    try {
      const { count, error } = await supabase
        .from('admin_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (err) {
      return 0;
    }
  },

  /**
   * Marca una notificación como leída.
   */
  async markAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (err) {
      console.warn('Error marcando notificación como leída:', err.message);
    }
  },

  /**
   * Marca todas las notificaciones como leídas.
   */
  async markAllAsRead() {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) throw error;
    } catch (err) {
      console.warn('Error marcando todas las notificaciones como leídas:', err.message);
    }
  },

  /**
   * Suscribe en tiempo real a nuevas notificaciones de administración.
   */
  subscribeToNotifications(onNewNotification) {
    const channel = supabase
      .channel(uniqueChannelName('admin_notifications_live'))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications',
        },
        (payload) => {
          onNewNotification(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Guarda o actualiza el token de notificación push del usuario / admin.
   * Listo para conectarse con Expo Push Notifications o Firebase Cloud Messaging.
   *
   * @param {string} pushToken - Token generado por Expo Notifications (ExponentPushToken[...])
   * @param {string} platform - Plataforma ('ios', 'android', 'web')
   */
  async registerPushToken(pushToken, platform = Platform.OS) {
    if (!pushToken) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      const { error } = await supabase
        .from('user_push_tokens')
        .upsert(
          {
            user_id: userId,
            push_token: pushToken,
            platform,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,push_token' }
        );

      if (error) throw error;
      console.log('Token push registrado con éxito para el usuario:', userId);
    } catch (err) {
      console.warn('No se pudo registrar el token push:', err.message);
    }
  },
};
