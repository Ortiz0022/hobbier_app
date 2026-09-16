import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { FlashList } from '@shopify/flash-list';

import { RoomMessageBubble } from './RoomMessageBubble';
import { colors, spacing, fonts, radii } from '../../../theme';
import { useNotify } from '../../../context/NotificationContext';

/**
 * Conversación completa: lista de mensajes, responder a un mensaje concreto,
 * saltar al mensaje citado y caja de texto. Es la pestaña CHAT de la sala sacada
 * a un componente para que los mensajes directos usen exactamente el mismo chat.
 *
 * La lista es FlashList (solo dibuja los mensajes visibles). FlashList 2 no tiene
 * `inverted`: los mensajes se muestran de antiguo a nuevo, la lista arranca abajo
 * y los antiguos se cargan al llegar ARRIBA (`onLoadOlder`).
 */
export const ChatThread = ({
  messages,
  loading,
  onLoadOlder,
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
  // Al enviar hay que bajar al final aunque el usuario estuviera leyendo arriba,
  // pero el mensaje nuevo aún no está en la lista: se baja en el siguiente render.
  const scrollToEndPendingRef = useRef(false);
  const { notify } = useNotify();

  // useChatMessages guarda el más reciente primero; en pantalla van al revés.
  const orderedMessages = useMemo(() => [...messages].reverse(), [messages]);

  // renderItem depende de esto además de `data`: sin extraData, FlashList no
  // repintaría el resaltado al saltar a un mensaje citado.
  const extraData = useMemo(
    () => ({ highlightedMessageId, currentUserId, showSenderName }),
    [highlightedMessageId, currentUserId, showSenderName]
  );

  useEffect(() => {
    if (!scrollToEndPendingRef.current) return;
    scrollToEndPendingRef.current = false;
    requestAnimationFrame(() => chatListRef.current?.scrollToEnd({ animated: true }));
  }, [orderedMessages]);

  useEffect(() => () => {
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
  }, []);

  const alert = (msg) => notify(msg, { type: 'warning', title: 'Aviso' });

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
    scrollToEndPendingRef.current = true;
    onSend(content, replyingTo);
  };

  const handleJumpToMessage = (messageId) => {
    const index = orderedMessages.findIndex((m) => m.id === messageId);
    if (index === -1) {
      alert('No se encontró el mensaje original. Desplázate hacia arriba para buscarlo.');
      return;
    }

    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    setHighlightedMessageId(messageId);
    chatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 })?.catch?.(() => {});
    highlightTimeoutRef.current = setTimeout(() => setHighlightedMessageId(null), 1500);
  };

  return (
    <KeyboardAvoidingView
      style={styles.chatContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {orderedMessages.length === 0 ? (
        // Fuera de la lista para poder centrarlo: FlashList no admite flexGrow
        // en contentContainerStyle.
        <View style={styles.emptyChatContainer}>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
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
            </>
          )}
        </View>
      ) : (
        <FlashList
          ref={chatListRef}
          data={orderedMessages}
          keyExtractor={item => item.id}
          // Las fotos de avance y los textos miden muy distinto: reciclar cada uno
          // con los de su tipo evita saltos al hacer scroll.
          getItemType={item => (item.message_type === 'EVIDENCE' ? 'evidence' : 'text')}
          extraData={extraData}
          contentContainerStyle={styles.chatListContent}
          onStartReached={onLoadOlder}
          onStartReachedThreshold={0.5}
          maintainVisibleContentPosition={{
            // Con pocos mensajes, pegados abajo junto a la caja de texto.
            startRenderingFromBottom: true,
            // Si estás a menos de un 20% del final, baja sola con cada mensaje nuevo.
            autoscrollToBottomThreshold: 0.2,
          }}
          ListHeaderComponent={loading ? <ActivityIndicator color={colors.primary} style={{ margin: 20 }} /> : null}
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
        />
      )}
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
  },
  emptyChatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
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
