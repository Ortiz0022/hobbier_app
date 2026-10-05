import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { roomsService } from '../../../services/roomsService';
import { getFriendsList } from '../../../services/socialService';
import { useNotify } from '../../../context/NotificationContext';
import { colors, spacing, fonts, radii, primaryButton } from '../../../theme';

/**
 * Permite al anfitrión invitar amigos a una sala que ya existe.
 * Los amigos que ya están dentro o con invitación pendiente se muestran
 * deshabilitados para no mandar invitaciones repetidas.
 */
export const InviteFriendsModal = ({ visible, onClose, roomId, userId, memberIds = [], onInvited }) => {
  const { notify } = useNotify();

  const [friends, setFriends] = useState([]);
  const [pendingIds, setPendingIds] = useState(new Set());
  const [selectedFriends, setSelectedFriends] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedFriends(new Set());
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [{ friends: friendsData }, pending] = await Promise.all([
        getFriendsList(userId),
        roomsService.getSentPendingInvitations(roomId).catch(() => []),
      ]);
      setFriends(friendsData || []);
      setPendingIds(new Set(pending));
    } finally {
      setLoading(false);
    }
  };

  const toggleFriend = (friendId) => {
    const newSet = new Set(selectedFriends);
    if (newSet.has(friendId)) newSet.delete(friendId);
    else newSet.add(friendId);
    setSelectedFriends(newSet);
  };

  const handleSend = async () => {
    if (selectedFriends.size === 0 || sending) return;
    setSending(true);

    let failed = 0;
    for (const friendId of selectedFriends) {
      try {
        await roomsService.inviteFriendToRoom(roomId, friendId);
      } catch (err) {
        console.error(`Error invitando al amigo ${friendId}:`, err);
        failed += 1;
      }
    }

    setSending(false);
    const sent = selectedFriends.size - failed;

    if (sent > 0) {
      notify(
        sent === 1 ? 'Invitación enviada.' : `${sent} invitaciones enviadas.`,
        { type: 'success', title: 'Listo' }
      );
      onInvited?.();
      onClose();
    }
    if (failed > 0) {
      notify(
        failed === 1
          ? 'No se pudo enviar una invitación. Inténtalo de nuevo.'
          : `No se pudieron enviar ${failed} invitaciones. Inténtalo de nuevo.`,
        { type: 'error', title: 'Aviso' }
      );
      if (sent === 0) loadData();
    }
  };

  const memberSet = new Set(memberIds);

  const renderFriend = (item, index) => {
    const friend = item.profile;
    if (!friend) return null;

    const isMember = memberSet.has(friend.id);
    const isPending = pendingIds.has(friend.id);
    const isDisabled = isMember || isPending;
    const isSelected = selectedFriends.has(friend.id);

    return (
      <TouchableOpacity
        key={item.friendshipId || `${friend.id}-${index}`}
        style={[styles.friendItem, isSelected && styles.friendItemSelected]}
        onPress={() => toggleFriend(friend.id)}
        disabled={isDisabled || sending}
        activeOpacity={0.7}
      >
        {friend.avatar_url ? (
          <Image source={{ uri: friend.avatar_url }} style={[styles.friendAvatar, isDisabled && styles.disabled]} />
        ) : (
          <View style={[styles.friendAvatarPlaceholder, isDisabled && styles.disabled]}>
            <Text style={styles.friendAvatarInitials}>
              {friend.username?.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={[styles.friendName, isDisabled && styles.friendNameDisabled]} numberOfLines={1}>
          {friend.full_name || friend.username}
        </Text>
        {isMember ? (
          <Text style={styles.statusTag}>En la sala</Text>
        ) : isPending ? (
          <Text style={styles.statusTag}>Invitado</Text>
        ) : isSelected ? (
          <Feather name="check-circle" size={20} color={colors.primary} />
        ) : (
          <Feather name="circle" size={20} color={colors.surfaceMuted} />
        )}
      </TouchableOpacity>
    );
  };

  const hasSelection = selectedFriends.size > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content}>
          <View style={styles.grabber} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>Invitar amigos</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Feather name="x" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Recibirán una invitación para unirse a la sala.</Text>

          {loading ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : friends.length === 0 ? (
            <Text style={styles.emptyText}>No tienes amigos agregados aún.</Text>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {friends.map(renderFriend)}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[styles.sendBtn, (!hasSelection || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!hasSelection || sending}
            activeOpacity={0.85}
          >
            {sending ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[styles.sendBtnText, !hasSelection && styles.sendBtnTextDisabled]}>
                {hasSelection
                  ? `Enviar ${selectedFriends.size === 1 ? 'invitación' : `${selectedFriends.size} invitaciones`}`
                  : 'Selecciona amigos'}
              </Text>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  grabber: {
    width: 40,
    height: 4,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  emptyText: {
    color: colors.textMuted,
    fontStyle: 'italic',
    marginVertical: spacing.lg,
  },
  list: {
    flexGrow: 0,
    marginBottom: spacing.lg,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.input,
    marginBottom: 4,
  },
  friendItemSelected: {
    backgroundColor: colors.primarySoft,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.md,
  },
  friendAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  friendAvatarInitials: {
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  disabled: {
    opacity: 0.5,
  },
  friendName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  friendNameDisabled: {
    color: colors.textMuted,
  },
  statusTag: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.round,
    overflow: 'hidden',
  },
  sendBtn: {
    ...primaryButton,
    borderRadius: radii.round,
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceMuted,
  },
  sendBtnText: {
    color: colors.onPrimary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  sendBtnTextDisabled: {
    color: colors.textMuted,
  },
});
