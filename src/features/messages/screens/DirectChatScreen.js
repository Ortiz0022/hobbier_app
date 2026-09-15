import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Text } from '../../../components/scaledText';
import { useAuth } from '../../../context/AuthContext';
import { directMessagesService } from '../../../services/directMessagesService';
import { useDirectChat } from '../hooks/useDirectChat';
import { ChatThread } from '../../rooms/components/ChatThread';
import { colors, spacing, fonts, radii } from '../../../theme';

/**
 * Chat uno a uno con un amigo. Si todavía no habían hablado llega sin
 * conversationId: se crea al abrir, así la bandeja no tiene que esperar a la RPC
 * antes de navegar.
 */
export const DirectChatScreen = ({ conversationId: initialConversationId, friend, onBack }) => {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState(initialConversationId || null);
  const [openError, setOpenError] = useState(null);

  const { messages, loading, error, fetchMoreMessages, sendMessage, retryMessage, discardMessage } = useDirectChat(conversationId);

  useEffect(() => {
    if (conversationId || !friend?.id) return;
    let mounted = true;
    directMessagesService.getOrCreateConversation(friend.id)
      .then((id) => { if (mounted) setConversationId(id); })
      .catch((err) => { if (mounted) setOpenError(err); });
    return () => { mounted = false; };
  }, [conversationId, friend?.id]);

  // Se marca como leída al abrir y con cada mensaje del AMIGO que llega mientras
  // está abierta. Los propios no: el trigger de la base de datos ya los deja leídos,
  // y marcar en cada envío era una llamada extra por mensaje.
  const newestIncomingId = messages.find((m) => (m.sender?.id || m.sender_id) !== user?.id)?.id;
  useEffect(() => {
    if (!conversationId) return;
    directMessagesService.markConversationRead(conversationId).catch((err) => {
      console.log('Error marcando conversación como leída:', err?.message);
    });
  }, [conversationId, newestIncomingId]);

  const displayName = friend?.full_name || friend?.username || 'Amigo';
  // Un fallo al paginar no debe tapar los mensajes que ya se ven.
  const failure = openError || (error && messages.length === 0 ? error : null);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>

        {friend?.avatar_url ? (
          <Image source={{ uri: friend.avatar_url }} style={styles.headerAvatar} />
        ) : (
          <View style={styles.headerAvatarPlaceholder}>
            <Text style={styles.headerAvatarInitial}>{displayName[0].toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.headerText}>
          <Text style={styles.headerName} numberOfLines={1}>{displayName}</Text>
          {friend?.username ? (
            <Text style={styles.headerUsername} numberOfLines={1}>@{friend.username}</Text>
          ) : null}
        </View>
      </View>

      {failure ? (
        <View style={styles.centerContainer}>
          <Feather name="alert-circle" size={48} color={colors.danger} />
          <Text style={styles.errorText}>
            {failure.message?.includes('amigos') ? failure.message : 'No se pudo abrir la conversación.'}
          </Text>
          <TouchableOpacity style={styles.backBtnError} onPress={onBack}>
            <Text style={styles.backBtnErrorText}>Volver</Text>
          </TouchableOpacity>
        </View>
      ) : !conversationId ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ChatThread
          messages={messages}
          loading={loading}
          onLoadOlder={fetchMoreMessages}
          currentUserId={user?.id}
          onSend={sendMessage}
          onRetry={retryMessage}
          onDiscard={discardMessage}
          showSenderName={false}
          emptyIcon="message-circle"
          emptyTitle={`Saluda a ${displayName}`}
          emptySubtitle="Envía un mensaje para iniciar la conversación"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  backBtn: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: radii.round,
  },
  headerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: radii.round,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarInitial: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  headerText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  headerName: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  headerUsername: {
    fontSize: 12.5,
    color: colors.textMuted,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
  },
  backBtnError: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.input,
  },
  backBtnErrorText: {
    color: colors.text,
    fontWeight: '600',
  },
});
