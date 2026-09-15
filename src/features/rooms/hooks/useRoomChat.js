import { roomsService } from '../../../services/roomsService';
import { useChatMessages } from './useChatMessages';

export const useRoomChat = (roomId) => useChatMessages({
  chatId: roomId,
  fetchPage: (id, options) => roomsService.getRoomMessages(id, options),
  subscribe: (id, onNewMessage, isKnownMessage) =>
    roomsService.subscribeToRoomMessages(id, onNewMessage, isKnownMessage),
  send: (id, content, replyToMessageId, messageId) =>
    roomsService.sendTextMessage(id, content, replyToMessageId, messageId),
});
