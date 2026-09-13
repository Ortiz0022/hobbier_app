import { useState, useEffect, useCallback } from 'react';
import { roomsService } from '../../../services/roomsService';

export const useRoomChat = (roomId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  
  const LIMIT = 30;

  const fetchInitialMessages = useCallback(async () => {
    if (!roomId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await roomsService.getRoomMessages(roomId, { limit: LIMIT, offset: 0 });
      setMessages(data);
      setHasMore(data.length === LIMIT);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  const fetchMoreMessages = useCallback(async () => {
    if (!roomId || !hasMore || loading) return;
    try {
      setLoading(true);
      const data = await roomsService.getRoomMessages(roomId, { limit: LIMIT, offset: messages.length });
      setMessages(prev => [...prev, ...data]); // assuming flatlist inverted
      setHasMore(data.length === LIMIT);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [roomId, hasMore, loading, messages.length]);

  useEffect(() => {
    fetchInitialMessages();
  }, [fetchInitialMessages]);

  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = roomsService.subscribeToRoomMessages(roomId, (newMsg) => {
      // New messages arrive in realtime. Since we use descending order (newest first in array),
      // we prepend the new message to the top of the array.
      setMessages(prev => {
        // Prevent duplicate if we just sent it (though Realtime doesn't easily de-dup without optimistic IDs)
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [newMsg, ...prev];
      });
    });
    return unsubscribe;
  }, [roomId]);

  const sendMessage = async (content) => {
    await roomsService.sendTextMessage(roomId, content);
  };

  return { messages, loading, error, hasMore, fetchMoreMessages, sendMessage };
};
