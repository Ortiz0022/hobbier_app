import { roomsService } from '../../../services/roomsService';
import { useChatMessages } from './useChatMessages';

export const useRoomChat = (roomId) => useChatMessages({
  chatId: roomId,
  fetchPage: (id, options) => roomsService.getRoomMessages(id, options),
  subscribe: (id, onNewMessage) => roomsService.subscribeToRoomMessages(id, onNewMessage),
  send: (id, content, replyToMessageId) => roomsService.sendTextMessage(id, content, replyToMessageId),
});
