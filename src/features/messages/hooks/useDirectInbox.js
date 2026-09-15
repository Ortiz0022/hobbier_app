import { useState, useEffect, useCallback } from 'react';
import { directMessagesService } from '../../../services/directMessagesService';

export const useDirectInbox = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInbox = useCallback(async () => {
    try {
      setError(null);
      const data = await directMessagesService.getInbox();
      setConversations(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  // Un mensaje nuevo cambia el orden, la vista previa y los no leídos: se recarga
  // la bandeja entera en vez de intentar recomponerla a mano.
  useEffect(() => {
    const unsubscribe = directMessagesService.subscribeToAllMessages(() => {
      fetchInbox();
    });
    return unsubscribe;
  }, [fetchInbox]);

  return { conversations, loading, error, refetch: fetchInbox };
};
