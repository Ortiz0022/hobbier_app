import { directMessagesService } from '../../../services/directMessagesService';
import { useChatMessages } from '../../rooms/hooks/useChatMessages';

// El mismo chat que la sala (paginación, Realtime y respuestas), sobre direct_messages.
export const useDirectChat = (conversationId) => useChatMessages({
  chatId: conversationId,
  fetchPage: (id, options) => directMessagesService.getMessages(id, options),
  subscribe: (id, onNewMessage) => directMessagesService.subscribeToConversationMessages(id, onNewMessage),
  send: (id, content, replyToMessageId) => directMessagesService.sendTextMessage(id, content, replyToMessageId),
});
