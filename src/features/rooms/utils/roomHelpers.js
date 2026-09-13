export const isRoomClosed = (room) => {
  if (!room) return false;
  if (room.status === 'CLOSED') return true;
  if (room.end_at && new Date(room.end_at) <= new Date()) return true;
  return false;
};
