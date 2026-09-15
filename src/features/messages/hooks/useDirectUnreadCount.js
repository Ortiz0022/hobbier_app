import { useState, useEffect, useCallback } from 'react';
import { directMessagesService } from '../../../services/directMessagesService';

// Total de mensajes directos sin leer, para el globo del icono del feed.
export const useDirectUnreadCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const count = await directMessagesService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      // Sin la migración aplicada la RPC no existe: el feed debe seguir funcionando
      // igual, solo que sin globo.
      console.log('Error obteniendo mensajes sin leer:', err?.message);
    }
  }, []);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  useEffect(() => {
    const unsubscribe = directMessagesService.subscribeToAllMessages(() => {
      fetchCount();
    });
    return unsubscribe;
  }, [fetchCount]);

  return { unreadCount, refetch: fetchCount };
};
