import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Lógica común de un chat paginado con Realtime: la usan el chat de sala
 * (useRoomChat) y los mensajes directos (useDirectChat).
 *
 * Cada chat aporta cómo leer una página, cómo suscribirse y cómo enviar. Esas
 * funciones se guardan en una ref: suelen llegar como flechas nuevas en cada
 * render y, si fueran dependencias de los efectos, el chat se recargaría y se
 * volvería a suscribir sin parar.
 */
export const useChatMessages = ({ chatId, fetchPage, subscribe, send, pageSize = 30 }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const handlersRef = useRef({ fetchPage, subscribe, send });
  handlersRef.current = { fetchPage, subscribe, send };

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
      const data = await handlersRef.current.fetchPage(chatId, { limit: pageSize, offset: messages.length });
      setMessages(prev => [...prev, ...data]); // assuming flatlist inverted
      setHasMore(data.length === pageSize);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [chatId, hasMore, loading, messages.length, pageSize]);

  useEffect(() => {
    fetchInitialMessages();
  }, [fetchInitialMessages]);

  useEffect(() => {
    if (!chatId) return;
    const unsubscribe = handlersRef.current.subscribe(chatId, (newMsg) => {
      // New messages arrive in realtime. Since we use descending order (newest first in array),
      // we prepend the new message to the top of the array.
      setMessages(prev => {
        // Prevent duplicate if we just sent it (though Realtime doesn't easily de-dup without optimistic IDs)
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [newMsg, ...prev];
      });
    });
    return unsubscribe;
  }, [chatId]);

  const sendMessage = async (content, replyToMessageId = null) => {
    const sent = await handlersRef.current.send(chatId, content, replyToMessageId);
    // Solo se inserta si el envío devolvió el mensaje ya hidratado (con `sender`).
    // Una fila plana se pintaría como ajena, así que en ese caso se espera a Realtime.
    if (sent?.id && sent.sender) {
      setMessages(prev => (prev.some(m => m.id === sent.id) ? prev : [sent, ...prev]));
    }
  };

  return { messages, loading, error, hasMore, fetchMoreMessages, sendMessage };
};
