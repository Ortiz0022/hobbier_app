import { supabase } from '../config/supabase';

// Misma forma que un mensaje de sala, para que RoomMessageBubble lo pinte igual.
const MESSAGE_SELECT = `
  *,
  sender:profiles(id, username, avatar_url)
`;

// Un nombre de canal repetido devuelve el MISMO canal ya suscrito (realtime-js
// los deduplica por nombre), y dos pantallas escuchando a la vez se pisarían.
const uniqueChannelName = (base) => `${base}_${Math.random().toString(36).slice(2, 10)}`;

export const directMessagesService = {
  // ----------------------------------------------------
  // RPC: CONVERSACIONES
  // ----------------------------------------------------
  async getOrCreateConversation(friendId) {
    const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
      p_friend_id: friendId,
    });
    if (error) throw error;
    return data; // Retorna el conversation_id UUID
  },

  async getInbox() {
    const { data, error } = await supabase.rpc('get_direct_inbox');
    if (error) throw error;
    return data || [];
  },

  async getUnreadCount() {
    const { data, error } = await supabase.rpc('get_direct_unread_count');
    if (error) throw error;
    return data || 0;
  },

  async markConversationRead(conversationId) {
    const { error } = await supabase.rpc('mark_direct_conversation_read', {
      p_conversation_id: conversationId,
    });
    if (error) throw error;
  },

  // ----------------------------------------------------
  // MENSAJES (Respaldados por RLS)
  // ----------------------------------------------------
  async getMessages(conversationId, { limit = 30, offset = 0 } = {}) {
    const { data, error } = await supabase
      .from('direct_messages')
      .select(MESSAGE_SELECT)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false }) // Descendente: la FlatList del chat va inverted
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return await this._hydrateReplyPreviews(data || []);
  },

  // Igual que en roomsService: el self-join embebido de PostgREST sobre
  // reply_to_message_id no resuelve de forma confiable, así que se resuelve aparte.
  async _hydrateReplyPreviews(messages) {
    const replyIds = [...new Set(
      messages.filter((m) => m.reply_to_message_id).map((m) => m.reply_to_message_id)
    )];
    if (replyIds.length === 0) return messages;

    const { data: repliedMessages, error } = await supabase
      .from('direct_messages')
      .select('id, content, sender:profiles(id, username)')
      .in('id', replyIds);

    if (error || !repliedMessages) return messages;

    const replyMap = new Map(repliedMessages.map((m) => [m.id, m]));
    return messages.map((m) => ({
      ...m,
      reply_to: m.reply_to_message_id ? replyMap.get(m.reply_to_message_id) || null : null,
    }));
  },

  // `messageId` lo genera el chat antes de enviar (envío optimista e idempotente).
  async sendTextMessage(conversationId, content, replyToMessageId = null, messageId = null) {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error('No user authenticated');

    const trimmedContent = (content || '').trim();
    if (!trimmedContent) throw new Error('Message content cannot be empty');

    const { data, error } = await supabase
      .from('direct_messages')
      .insert({
        ...(messageId ? { id: messageId } : {}),
        conversation_id: conversationId,
        sender_id: userId,
        content: trimmedContent,
        reply_to_message_id: replyToMessageId || null,
      })
      // Solo lo que el chat no sabe ya. El remitente y la cita los tiene del mensaje
      // optimista: pedirlos otra vez era un join y, al responder, una consulta más.
      .select('id, created_at')
      .single();

    if (error) throw error;
    return data;
  },

  // ----------------------------------------------------
  // REALTIME
  // ----------------------------------------------------
  // `isKnownMessage(id)`: si el chat ya tiene ese mensaje (lo envió este mismo
  // dispositivo), se entrega la fila tal cual sin consultar de nuevo.
  subscribeToConversationMessages(conversationId, onNewMessage, isKnownMessage = null) {
    const channel = supabase
      .channel(uniqueChannelName(`direct_messages_${conversationId}`))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          if (isKnownMessage?.(payload.new.id)) {
            onNewMessage(payload.new);
            return;
          }

          // payload.new solo trae la fila plana; se hidrata con remitente y cita
          const { data, error } = await supabase
            .from('direct_messages')
            .select(MESSAGE_SELECT)
            .eq('id', payload.new.id)
            .single();

          if (!error && data) {
            const [hydrated] = await directMessagesService._hydrateReplyPreviews([data]);
            onNewMessage(hydrated);
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

  // Cualquier mensaje nuevo en cualquiera de mis conversaciones. Realtime aplica
  // el RLS de SELECT, así que solo llegan los de chats donde participo.
  subscribeToAllMessages(onNewMessage) {
    const channel = supabase
      .channel(uniqueChannelName('direct_messages_all'))
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => onNewMessage(payload.new)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
