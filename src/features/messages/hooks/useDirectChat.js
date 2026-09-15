import { directMessagesService } from '../../../services/directMessagesService';
import { useChatMessages } from '../../rooms/hooks/useChatMessages';

// El mismo chat que la sala (paginación, Realtime y respuestas), sobre direct_messages.
export const useDirectChat = (conversationId) => useChatMessages({
  chatId: conversationId,
  fetchPage: (id, options) => directMessagesService.getMessages(id, options),
  subscribe: (id, onNewMessage, isKnownMessage) =>
    directMessagesService.subscribeToConversationMessages(id, onNewMessage, isKnownMessage),
  send: (id, content, replyToMessageId, messageId) =>
    directMessagesService.sendTextMessage(id, content, replyToMessageId, messageId),
});
