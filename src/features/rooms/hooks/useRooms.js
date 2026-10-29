import { peekQuery, queryKeys } from '../../../services/queryCache';
import { useState, useEffect, useCallback } from 'react';
import { roomsService } from '../../../services/roomsService';

export const useRooms = () => {
  const [rooms, setRooms] = useState(() => peekQuery(queryKeys.rooms()) || []);
  const [loading, setLoading] = useState(() => !peekQuery(queryKeys.rooms()));
  const [error, setError] = useState(null);

  const fetchRooms = useCallback(async (force = false) => {
    try {
      setLoading(!peekQuery(queryKeys.rooms()));
      setError(null);
      const data = await roomsService.getMyRooms({ force });
      setRooms(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const refetch = useCallback(() => fetchRooms(true), [fetchRooms]);
  return { rooms, loading, error, refetch };
};
