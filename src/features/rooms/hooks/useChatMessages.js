import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { createMessageId } from '../../../utils/createMessageId';

// Código de Postgres para clave duplicada. Al reintentar, significa que el primer
// intento sí llegó (solo se perdió la respuesta): el mensaje ya está guardado.
const DUPLICATE_KEY = '23505';

/**
 * Lógica común de un chat paginado con Realtime: la usan el chat de sala
 * (useRoomChat) y los mensajes directos (useDirectChat).
 *
 * Cada chat aporta cómo leer una página, cómo suscribirse y cómo enviar. Esas
 * funciones se guardan en una ref: suelen llegar como flechas nuevas en cada
 * render y, si fueran dependencias de los efectos, el chat se recargaría y se
 * volvería a suscribir sin parar.
 *
 * Envío optimista: el mensaje aparece al instante con `_status: 'sending'` y se
 * confirma (o pasa a `'failed'`) cuando responde el servidor. Los envíos van en
 * cola, uno detrás de otro, para que lleguen en el mismo orden en que se escribieron.
 */
export const useChatMessages = ({ chatId, fetchPage, subscribe, send, pageSize = 30 }) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const handlersRef = useRef({ fetchPage, subscribe, send });
  handlersRef.current = { fetchPage, subscribe, send };

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const sendQueueRef = useRef(Promise.resolve());
  // Ids en cola o enviándose. El estado tarda un render en reflejarse, así que dos
  // toques seguidos en "Reintentar" verían el mensaje aún como fallido.
  const inFlightIdsRef = useRef(new Set());

  // Los mensajes que aún no están en la base de datos no cuentan para el offset:
  // si contaran, la siguiente página se saltaría mensajes antiguos.
  const savedCount = messages.filter((m) => !m._status).length;

  const fetchInitialMessages = useCallback(async () => {
    if (!chatId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await handlersRef.current.fetchPage(chatId, { limit: pageSize, offset: 0 });
      setMessages(data);
      setHasMore(data.length === pageSize);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [chatId, pageSize]);

  const fetchMoreMessages = useCallback(async () => {
    if (!chatId || !hasMore || loading) return;
    try {
      setLoading(true);
      const data = await handlersRef.current.fetchPage(chatId, { limit: pageSize, offset: savedCount });
      setMessages(prev => {
        const knownIds = new Set(prev.map((m) => m.id));
        return [...prev, ...data.filter((m) => !knownIds.has(m.id))]; // más reciente primero; ChatThread lo invierte
      });
      setHasMore(data.length === pageSize);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [chatId, hasMore, loading, savedCount, pageSize]);

  useEffect(() => {
    fetchInitialMessages();
  }, [fetchInitialMessages]);

  useEffect(() => {
    if (!chatId) return;
    const unsubscribe = handlersRef.current.subscribe(
      chatId,
      (newMsg) => {
        // New messages arrive in realtime. Since we use descending order (newest first in array),
        // we prepend the new message to the top of the array.
        setMessages(prev => {
          // Si ya está (lo acabamos de enviar), el evento solo lo confirma: se fusiona
          // conservando el remitente y la cita que ya tenía.
          if (prev.some(m => m.id === newMsg.id)) {
            return prev.map(m => (m.id === newMsg.id ? { ...m, ...newMsg, _status: undefined } : m));
          }
          return [newMsg, ...prev];
        });
      },
      // Un mensaje que ya tenemos no necesita otra consulta para hidratarlo.
      (messageId) => messagesRef.current.some((m) => m.id === messageId)
    );
    return unsubscribe;
  }, [chatId]);

  const updateMessage = (messageId, changes) => {
    setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, ...changes } : m)));
  };

  const deliver = (message) => {
    if (inFlightIdsRef.current.has(message.id)) return;
    inFlightIdsRef.current.add(message.id);
    const targetChatId = chatId;
    sendQueueRef.current = sendQueueRef.current.then(async () => {
      try {
        const saved = await handlersRef.current.send(
          targetChatId,
          message.content,
          message.reply_to_message_id,
          message.id
        );
        updateMessage(message.id, { ...(saved || {}), _status: undefined });
      } catch (err) {
        if (err?.code === DUPLICATE_KEY) {
          updateMessage(message.id, { _status: undefined });
        } else {
          console.log('Error enviando mensaje:', err?.message);
          updateMessage(message.id, { _status: 'failed' });
        }
      } finally {
        inFlightIdsRef.current.delete(message.id);
      }
    });
  };

  const sendMessage = (content, replyTo = null) => {
    const trimmedContent = (content || '').trim();
    if (!trimmedContent || !chatId || !user?.id) return;

    const message = {
      id: createMessageId(),
      message_type: 'TEXT',
      content: trimmedContent,
      sender_id: user.id,
      sender: { id: user.id, username: profile?.username, avatar_url: profile?.avatar_url },
      reply_to_message_id: replyTo?.id || null,
      reply_to: replyTo
        ? { id: replyTo.id, content: replyTo.content, message_type: replyTo.message_type, sender: replyTo.sender }
        : null,
      created_at: new Date().toISOString(),
      _status: 'sending',
    };

    setMessages(prev => [message, ...prev]);
    deliver(message);
  };

  // Reintenta con el MISMO id: si el primer intento sí se guardó, la base de datos
  // lo rechaza como duplicado en vez de crear una segunda copia.
  const retryMessage = (messageId) => {
    const message = messagesRef.current.find((m) => m.id === messageId);
    if (!message || message._status !== 'failed' || inFlightIdsRef.current.has(messageId)) return;
    updateMessage(messageId, { _status: 'sending' });
    deliver(message);
  };

  const discardMessage = (messageId) => {
    setMessages(prev => prev.filter(m => !(m.id === messageId && m._status === 'failed')));
  };

  return { messages, loading, error, hasMore, fetchMoreMessages, sendMessage, retryMessage, discardMessage };
};
