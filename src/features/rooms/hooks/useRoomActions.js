import { useState } from 'react';
import { roomsService } from '../../../services/roomsService';

export const useRoomActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const executeAction = async (actionFn) => {
    try {
      setLoading(true);
      setError(null);
      const result = await actionFn();
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createRoom = (roomData) => executeAction(() => roomsService.createRoom(roomData));
  const closeRoom = (roomId) => executeAction(() => roomsService.closeRoom(roomId));
  const deleteRoom = (roomId) => executeAction(() => roomsService.deleteRoom(roomId));
  
  const inviteFriend = (roomId, receiverId) => executeAction(() => roomsService.inviteFriendToRoom(roomId, receiverId));
  
  const uploadCover = async (roomId, localUri) => {
    return executeAction(async () => {
      const path = await roomsService.uploadRoomCover(roomId, localUri);
      await roomsService.setRoomImagePath(roomId, path);
      return path;
    });
  };

  return {
    createRoom,
    closeRoom,
    deleteRoom,
    inviteFriend,
    uploadCover,
    loading,
    error
  };
};
