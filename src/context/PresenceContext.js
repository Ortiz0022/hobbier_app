import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';

const PresenceContext = createContext();

export const usePresence = () => {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error('usePresence must be used within a PresenceProvider');
  }
  return context;
};

export const PresenceProvider = ({ children }) => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const channelRef = useRef(null);

  useEffect(() => {
    if (!user) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setOnlineUsers(new Set());
      return;
    }

    let isMounted = true;

    // Remover cualquier canal previo existente con el mismo nombre para evitar conflicto de callbacks
    const existingChannels = supabase.getChannels().filter((c) => c.topic === 'realtime:global-presence');
    existingChannels.forEach((c) => {
      supabase.removeChannel(c);
    });

    // Iniciar canal de Presence global
    const channel = supabase.channel('global-presence', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });
    
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        if (!isMounted) return;
        const state = channel.presenceState();
        const activeUsers = new Set(Object.keys(state));
        setOnlineUsers(activeUsers);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        if (!isMounted) return;
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (!isMounted) return;
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && isMounted) {
          try {
            await channel.track({
              user_id: user.id,
              online_at: new Date().toISOString(),
            });
          } catch (_) {}
        }
      });

    // Manejar paso a segundo plano (background) para dejar de rastrear
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (!channelRef.current || !isMounted) return;
      
      try {
        if (nextAppState === 'active') {
          await channelRef.current.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        } else if (nextAppState === 'background' || nextAppState === 'inactive') {
          await channelRef.current.untrack();
        }
      } catch (_) {}
    });

    // En web, intentar enviar untrack cuando cierran la pestaña
    const handleBeforeUnload = async () => {
      if (channelRef.current) {
        try {
          await channelRef.current.untrack();
        } catch (_) {}
      }
    };
    if (Platform.OS === 'web') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      isMounted = false;
      subscription.remove();
      if (Platform.OS === 'web') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user]);

  const isUserOnline = (userId) => onlineUsers.has(userId);

  return (
    <PresenceContext.Provider value={{ onlineUsers, isUserOnline }}>
      {children}
    </PresenceContext.Provider>
  );
};
