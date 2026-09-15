import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  FlatList,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { RoomMessageBubble } from './RoomMessageBubble';
import { colors, spacing, fonts, radii } from '../../../theme';

/**
 * Conversación completa: lista de mensajes, responder a un mensaje concreto,
 * saltar al mensaje citado y caja de texto. Es la pestaña CHAT de la sala sacada
 * a un componente para que los mensajes directos usen exactamente el mismo chat.
 */
export const ChatThread = ({
  messages,
  loading,
  onEndReached,
  currentUserId,
  onSend,
  onRetry,
  onDiscard,
  readOnly = false,
  readOnlyText = 'Chat en modo solo lectura.',
  emptyIcon = 'message-square',
  emptyTitle,
  emptySubtitle,
  emptyText = 'No hay mensajes aún.',
  showSenderName = true,
  keyboardVerticalOffset = 90,
}) => {
  const [textMessage, setTextMessage] = useState('');
  // El texto también vive en una ref: Enter y el botón pueden disparar dos envíos
  // en el mismo instante, y ambos leerían el mismo estado antes de que se vacíe.
  const textRef = useRef('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const chatListRef = useRef(null);
  const highlightTimeoutRef = useRef(null);

  useEffect(() => () => {
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
  }, []);

  const alert = (msg) => {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Aviso', msg);
  };

  const handleChangeText = (text) => {
    textRef.current = text;
    setTextMessage(text);
  };

  // No se espera al servidor: el mensaje aparece al momento en la lista (envío
  // optimista) y la caja queda libre para escribir el siguiente. Antes se esperaba
  // la respuesta con el texto aún escrito, y cada toque extra lo enviaba otra vez.
  const handleSendText = () => {
    const content = textRef.current;
    if (!content.trim() || readOnly) return;
    textRef.current = '';
    setTextMessage('');
    setReplyingTo(null);
    onSend(content, replyingTo);
  };

  const handleJumpToMessage = (messageId) => {
    const index = messages.findIndex((m) => m.id === messageId);
    if (index === -1) {
      alert('No se encontró el mensaje original. Desplázate hacia arriba para buscarlo.');
      return;
    }

    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    setHighlightedMessageId(messageId);
    chatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    highlightTimeoutRef.current = setTimeout(() => setHighlightedMessageId(null), 1500);
  };

  return (
    <KeyboardAvoidingView
      style={styles.chatContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <FlatList
        ref={chatListRef}
        data={messages}
        keyExtractor={item => item.id}
        inverted
        contentContainerStyle={styles.chatListContent}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        onScrollToIndexFailed={(info) => {
          // Los items tienen alturas variables (fotos vs texto); reintentamos tras dejar que midan.
          setTimeout(() => {
            chatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
          }, 100);
        }}
        ListFooterComponent={loading ? <ActivityIndicator color={colors.primary} style={{ margin: 20 }} /> : null}
        renderItem={({ item }) => (
          <RoomMessageBubble
            message={item}
            isMe={item.sender?.id === currentUserId}
            onReply={setReplyingTo}
            onJumpToReply={handleJumpToMessage}
            isHighlighted={item.id === highlightedMessageId}
            showSenderName={showSenderName}
            onRetry={onRetry}
            onDiscard={onDiscard}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyChatContainer}>
              {emptyIcon ? (
                <View style={styles.emptyIconCircle}>
                  <Feather name={emptyIcon} size={26} color={colors.primary} />
                </View>
              ) : null}
              <Text style={styles.emptyChatTitle}>
                {emptyTitle || emptyText}
              </Text>
              {emptySubtitle ? (
                <Text style={styles.emptyChatSubtitle}>{emptySubtitle}</Text>
              ) : null}
            </View>
          ) : null
        }
      />
      {!readOnly ? (
        <View>
          {replyingTo && (
            <View style={styles.replyPreviewBar}>
              <View style={styles.replyPreviewAccent} />
              <View style={styles.replyPreviewBody}>
                <Text style={styles.replyPreviewAuthor}>
                  {replyingTo.sender?.username || 'Usuario'}
                </Text>
                <Text style={styles.replyPreviewText} numberOfLines={1}>
                  {replyingTo.message_type === 'EVIDENCE' ? '📷 Registró un avance' : replyingTo.content}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setReplyingTo(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder="Escribe un mensaje..."
              value={textMessage}
              onChangeText={handleChangeText}
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={handleSendText}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !textMessage.trim() && { opacity: 0.5 }]}
              onPress={handleSendText}
              disabled={!textMessage.trim()}
            >
              <Feather name="send" size={20} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.chatClosedBanner}>
          <Text style={styles.chatClosedText}>{readOnlyText}</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  chatContainer: {
    flex: 1,
  },
  chatListContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  emptyChatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    transform: [{ scaleY: -1 }], // Ya que la lista es inverted, invertimos el texto
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.round,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyChatTitle: {
    fontSize: 15,
    fontFamily: fonts.heading,
    color: colors.text,
    textAlign: 'center',
  },
  emptyChatSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  emptyChatText: {
    color: colors.textMuted,
  },
  replyPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  replyPreviewAccent: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  replyPreviewBody: {
    flex: 1,
  },
  replyPreviewAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  replyPreviewText: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatClosedBanner: {
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.textFaint,
  },
  chatClosedText: {
    color: colors.textFaint,
    fontWeight: '600',
  },
});
