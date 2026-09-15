import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { directMessagesService } from '../../../services/directMessagesService';

// Total de mensajes directos sin leer, para el globo del icono del feed.
export const useDirectUnreadCount = () => {
  const { user } = useAuth();
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
    const unsubscribe = directMessagesService.subscribeToAllMessages((newMsg) => {
      // Lo que envío yo nunca cambia mis no leídos: el feed sigue montado debajo del
      // chat, y sin este filtro cada mensaje enviado costaba una consulta más.
      if (newMsg?.sender_id === user?.id) return;
      fetchCount();
    });
    return unsubscribe;
  }, [fetchCount, user?.id]);

  return { unreadCount, refetch: fetchCount };
};
