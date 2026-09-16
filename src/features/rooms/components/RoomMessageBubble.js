import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, Pressable } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRecyclingState } from '@shopify/flash-list';
import { colors, radii, spacing, fonts } from '../../../theme';
import { useSignedUrl } from '../hooks/useSignedUrl';

export const RoomMessageBubble = ({ message, isMe, onReply, onJumpToReply, isHighlighted, showSenderName = true, onRetry, onDiscard }) => {
  const isEvidence = message.message_type === 'EVIDENCE';
  // Estados locales del envío optimista (ver useChatMessages). Mientras el mensaje
  // no esté guardado no se puede responder: la cita apuntaría a una fila inexistente.
  const isSending = message._status === 'sending';
  const isFailed = message._status === 'failed';
  const { url: evidenceUrl } = useSignedUrl('room-evidence', message.evidence?.image_path);
  // FlashList reutiliza esta burbuja para otros mensajes al hacer scroll: con un
  // useState normal, el visor abierto de una foto seguiría abierto en otra.
  const [viewerOpen, setViewerOpen] = useRecyclingState(false, [message.id]);

  return (
    <View style={[
      styles.container,
      isMe ? styles.containerMe : styles.containerOther,
      isHighlighted && styles.containerHighlighted,
    ]}>
      {/* Avatar del sender si no soy yo */}
      {!isMe && (
        <View style={styles.avatarContainer}>
          {message.sender?.avatar_url ? (
            <Image source={{ uri: message.sender.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {message.sender?.username?.charAt(0)?.toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={[styles.bubbleWrapper, isMe ? styles.bubbleWrapperMe : styles.bubbleWrapperOther]}>
        {/* En un chat de dos el nombre sobra: ya está en la cabecera */}
        {!isMe && showSenderName && (
          <Text style={styles.senderName}>{message.sender?.username}</Text>
        )}

        {isEvidence ? (
          <View style={[styles.bubble, styles.evidenceBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
            <View style={styles.evidenceHeader}>
              <Feather name="camera" size={16} color={colors.primaryDark} style={styles.evidenceIcon} />
              <Text style={styles.evidenceHeaderText}>registró un avance</Text>
            </View>

            {message.reply_to && (
              <TouchableOpacity
                style={styles.replyQuote}
                activeOpacity={0.7}
                onPress={() => onJumpToReply?.(message.reply_to.id)}
              >
                <Text style={styles.replyQuoteAuthor}>
                  {message.reply_to.sender?.username || 'Usuario'}
                </Text>
                <Text style={styles.replyQuoteText} numberOfLines={1}>
                  {message.reply_to.message_type === 'EVIDENCE' ? '📷 Registró un avance' : message.reply_to.content}
                </Text>
              </TouchableOpacity>
            )}

            {evidenceUrl ? (
              <TouchableOpacity activeOpacity={0.9} onPress={() => setViewerOpen(true)}>
                <Image source={{ uri: evidenceUrl }} style={styles.evidenceImage} />
              </TouchableOpacity>
            ) : (
               <View style={styles.evidenceImagePlaceholder} />
            )}

            <View style={styles.evidencePoints}>
              <Text style={styles.pointsText}>+{message.evidence?.points_awarded || 0} pts</Text>
            </View>

            <Modal
              visible={viewerOpen}
              transparent
              animationType="fade"
              onRequestClose={() => setViewerOpen(false)}
            >
              <Pressable style={styles.viewerOverlay} onPress={() => setViewerOpen(false)}>
                <Image
                  source={{ uri: evidenceUrl }}
                  style={styles.viewerImage}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={styles.viewerCloseBtn}
                  onPress={() => setViewerOpen(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="x" size={22} color="#FFF" />
                </TouchableOpacity>
              </Pressable>
            </Modal>
          </View>
        ) : (
          <View style={[
            styles.bubble,
            isMe ? styles.bubbleMe : styles.bubbleOther,
            isSending && styles.bubbleSending,
            isFailed && styles.bubbleFailed,
          ]}>
            {message.reply_to && (
              <TouchableOpacity
                style={[styles.replyQuote, isMe && styles.replyQuoteMe]}
                activeOpacity={0.7}
                onPress={() => onJumpToReply?.(message.reply_to.id)}
              >
                <Text style={[styles.replyQuoteAuthor, isMe && styles.replyQuoteAuthorMe]}>
                  {message.reply_to.sender?.username || 'Usuario'}
                </Text>
                <Text style={[styles.replyQuoteText, isMe && styles.replyQuoteTextMe]} numberOfLines={1}>
                  {message.reply_to.message_type === 'EVIDENCE' ? '📷 Registró un avance' : message.reply_to.content}
                </Text>
              </TouchableOpacity>
            )}
            <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
              {message.content}
            </Text>
          </View>
        )}

        <View style={[styles.footerRow, isMe ? styles.footerRowMe : styles.footerRowOther]}>
          {isFailed ? (
            <>
              <Feather name="alert-circle" size={12} color={colors.danger} />
              <Text style={styles.failedText}>No se envió</Text>
              <TouchableOpacity onPress={() => onRetry?.(message.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={styles.failedAction}>Reintentar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDiscard?.(message.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={styles.replyBtnText}>Descartar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {isMe && (
                isSending ? (
                  <Feather name="clock" size={11} color={colors.textFaint} style={styles.timeMe} />
                ) : (
                  <Text style={[styles.time, styles.timeMe]}>
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )
              )}

              {!isSending && (
                <TouchableOpacity
                  style={styles.replyBtn}
                  onPress={() => onReply?.(message)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Feather name="corner-up-left" size={12} color={colors.textMuted} />
                  <Text style={styles.replyBtnText}>Responder</Text>
                </TouchableOpacity>
              )}

              {!isMe && (
                <Text style={[styles.time, styles.timeOther]}>
                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-end',
  },
  containerMe: {
    justifyContent: 'flex-end',
  },
  containerOther: {
    justifyContent: 'flex-start',
  },
  containerHighlighted: {
    backgroundColor: colors.surfaceAccent,
    borderRadius: radii.card,
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  avatarContainer: {
    marginRight: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  bubbleWrapper: {
    maxWidth: '85%',
  },
  bubbleWrapperMe: {
    alignItems: 'flex-end',
  },
  bubbleWrapperOther: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    padding: spacing.md,
    borderRadius: radii.card,
  },
  bubbleMe: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
  },
  bubbleSending: {
    opacity: 0.65,
  },
  bubbleFailed: {
    opacity: 0.5,
  },
  evidenceBubble: {
    padding: spacing.sm,
    backgroundColor: colors.surfaceAccent,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextMe: {
    color: colors.onPrimary,
  },
  messageTextOther: {
    color: colors.text,
  },
  evidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  evidenceIcon: {
    marginRight: spacing.xs,
  },
  evidenceHeaderText: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  evidenceImage: {
    width: '100%',
    aspectRatio: 0.75,
    borderRadius: radii.input,
    backgroundColor: colors.surfaceMuted,
  },
  evidenceImagePlaceholder: {
    width: '100%',
    aspectRatio: 0.75,
    borderRadius: radii.input,
    backgroundColor: colors.surfaceMuted,
  },
  evidencePoints: {
    position: 'absolute',
    bottom: spacing.sm + 8,
    right: spacing.sm + 8,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  pointsText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  replyQuote: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: spacing.xs,
  },
  replyQuoteMe: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderLeftColor: colors.onPrimary,
  },
  replyQuoteAuthor: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  replyQuoteAuthorMe: {
    color: colors.onPrimary,
  },
  replyQuoteText: {
    fontSize: 12.5,
    color: colors.textMuted,
  },
  replyQuoteTextMe: {
    color: colors.onPrimary,
    opacity: 0.85,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  footerRowMe: {
    justifyContent: 'flex-end',
  },
  footerRowOther: {
    justifyContent: 'flex-start',
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  replyBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  failedText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.danger,
  },
  failedAction: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '80%',
  },
  viewerCloseBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  time: {
    fontSize: 11,
    color: colors.textFaint,
  },
  timeMe: {
    marginRight: 4,
  },
  timeOther: {
    marginLeft: 4,
  },
});
