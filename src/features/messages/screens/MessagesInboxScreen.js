import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Text, TextInput } from '../../../components/scaledText';
import { useAuth } from '../../../context/AuthContext';
import { useDirectInbox } from '../hooks/useDirectInbox';
import { formatMessageTime } from '../utils/formatMessageTime';
import { colors, spacing, fonts, radii, input } from '../../../theme';

export const MessagesInboxScreen = ({ onBack, onOpenChat }) => {
  const { user } = useAuth();
  const { conversations, loading, error, refetch } = useDirectInbox();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const query = searchQuery.trim().toLowerCase();
  const filtered = query
    ? conversations.filter((c) =>
        (c.friend_username || '').toLowerCase().includes(query) ||
        (c.friend_full_name || '').toLowerCase().includes(query)
      )
    : conversations;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => {
    const hasUnread = item.unread_count > 0;
    const displayName = item.friend_full_name || item.friend_username;
    const preview = item.last_message
      ? `${item.last_message_sender_id === user?.id ? 'Tú: ' : ''}${item.last_message}`
      : 'Toca para empezar a chatear';

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => onOpenChat({
          conversationId: item.conversation_id,
          friend: {
            id: item.friend_id,
            username: item.friend_username,
            full_name: item.friend_full_name,
            avatar_url: item.friend_avatar_url,
          },
        })}
      >
        {item.friend_avatar_url ? (
          <Image source={{ uri: item.friend_avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{(displayName || 'U')[0].toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.rowBody}>
          <Text style={[styles.name, hasUnread && styles.nameUnread]} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.previewRow}>
            <Text
              style={[styles.preview, hasUnread && styles.previewUnread, !item.last_message && styles.previewEmpty]}
              numberOfLines={1}
            >
              {preview}
            </Text>
            {item.last_message_at ? (
              <Text style={styles.time}> · {formatMessageTime(item.last_message_at)}</Text>
            ) : null}
          </View>
        </View>

        {hasUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mensajes</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchBar}>
        <Feather name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar amigos..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Feather name="alert-circle" size={48} color={colors.danger} />
          <Text style={styles.stateTitle}>No se pudieron cargar los mensajes.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.friend_id}
          renderItem={renderItem}
          contentContainerStyle={filtered.length === 0 ? styles.emptyListContent : styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Feather name="message-circle" size={48} color={colors.primarySoft} />
              <Text style={styles.stateTitle}>
                {query ? 'Ningún amigo coincide con la búsqueda.' : 'Aún no tienes amigos con quien chatear.'}
              </Text>
              {!query && (
                <Text style={styles.stateSubtitle}>Agrega amigos desde la pestaña Amigos para empezar.</Text>
              )}
            </View>
          }
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  searchBar: {
    ...input,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 15,
    color: colors.text,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radii.round,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: radii.round,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  rowBody: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  nameUnread: {
    fontWeight: '700',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  preview: {
    flexShrink: 1,
    fontSize: 13.5,
    color: colors.textMuted,
  },
  previewUnread: {
    color: colors.text,
    fontWeight: '600',
  },
  previewEmpty: {
    fontStyle: 'italic',
  },
  time: {
    fontSize: 13,
    color: colors.textMuted,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  stateTitle: {
    marginTop: spacing.md,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  stateSubtitle: {
    marginTop: spacing.xs,
    fontSize: 13.5,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.input,
  },
  retryButtonText: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
});
