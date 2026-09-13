import { useState, useEffect, useCallback } from 'react';
import { roomsService } from '../../../services/roomsService';

export const useRoomDetails = (roomId) => {
  const [room, setRoom] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDetails = useCallback(async () => {
    if (!roomId) return;
    try {
      setLoading(true);
      setError(null);
      const [roomData, rankingData] = await Promise.all([
        roomsService.getRoomDetails(roomId),
        roomsService.getRoomRanking(roomId)
      ]);
      setRoom(roomData);
      setRanking(rankingData);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return { room, ranking, loading, error, refetch: fetchDetails };
};
