import { useThemeValues } from '../../../context/ThemeContext';
import { createThemeStyles } from '../../../theme/themeRuntime';
import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRooms } from '../hooks/useRooms';
import { usePendingInvitations } from '../hooks/usePendingInvitations';
import { RoomCard } from '../components/RoomCard';
import { spacing, fonts, radii } from "../../../theme";

import { useLanguage } from '../../../context/LanguageContext';

export const RoomsListScreen = ({ onNavigateToCreate, onNavigateToRoom }) => {
  const { theme, colors, primaryButton, card, styles } = useThemeValues(getRoomsListScreenTheme);
  const { t } = useLanguage();

  const { rooms, loading: roomsLoading, error: roomsError, refetch: refetchRooms } = useRooms();
  const {
    invitations,
    finishedInvitations,
    loading: invLoading,
    acceptInvitation,
    rejectInvitation,
    dismissInvitation,
    refetch: refetchInv,
  } = usePendingInvitations();

  const loading = roomsLoading || invLoading;
  const error = roomsError;

  const handleRefresh = () => {
    refetchRooms();
    refetchInv();
  };

  if (loading && !rooms.length) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Feather name="alert-circle" size={48} color={colors.danger} />
        <Text style={styles.errorText}>{t('rooms.error_load') || 'No se pudieron cargar las salas.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>{t('rooms.retry') || 'Reintentar'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cabecera = (invitations.length > 0 || finishedInvitations.length > 0) ? (
    <View>
      {invitations.length > 0 && (
        <View style={styles.invitationsSection}>
          <Text style={styles.sectionTitle}>
            {t('rooms.pending_invitations', { count: invitations.length }) || `Invitaciones Pendientes (${invitations.length})`}
          </Text>
          {invitations.map(inv => (
            <View key={inv.invitation_id} style={styles.invitationCard}>
              <View style={styles.invitationInfo}>
                <Text style={styles.invitationRoomName}>{inv.room_name}</Text>
                <Text style={styles.invitationSender}>
                  {t('rooms.invited_by', { username: inv.sender_username, name: inv.sender_username ? `@${inv.sender_username}` : '' }) || `Invitado por @${inv.sender_username}`}
                </Text>
                <Text style={styles.invitationChallenge}>
                  {t('rooms.challenge', { title: inv.challenge_title || '' }) || `Reto: ${inv.challenge_title}`}
                </Text>
              </View>
              <View style={styles.invitationActions}>
                <TouchableOpacity
                  style={styles.invAcceptBtn}
                  onPress={() => acceptInvitation(inv.invitation_id).then(handleRefresh)}
                >
                  <Feather name="check" size={16} color={colors.onPrimary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.invRejectBtn}
                  onPress={() => rejectInvitation(inv.invitation_id)}
                >
                  <Feather name="x" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Invitaciones a salas que ya terminaron */}
      {finishedInvitations.length > 0 && (
        <View style={styles.invitationsSection}>
          {finishedInvitations.map(inv => (
            <View key={inv.invitation_id} style={styles.finishedCard}>
              <Feather name="clock" size={18} color={colors.textFaint} style={styles.finishedIcon} />
              <View style={styles.invitationInfo}>
                <Text style={styles.finishedRoomName}>{inv.room_name}</Text>
                <Text style={styles.finishedText}>
                  <Text style={{ fontWeight: 'bold' }}>@{inv.sender_username}</Text>{' '}
                  {t('rooms.expired_invite') || 'te invitó a esta sala, pero ya finalizó: la invitación venció.'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.finishedDismissBtn}
                onPress={() => dismissInvitation(inv.invitation_id)}
                accessibilityLabel={t('common.got_it') || 'Entendido'}
              >
                <Text style={styles.finishedDismissText}>{t('common.got_it') || 'Entendido'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('rooms.title') || 'Salas'}</Text>
        <TouchableOpacity style={styles.createButton} onPress={onNavigateToCreate}>
          <Feather name="plus" size={20} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={handleRefresh}
        ListHeaderComponent={cabecera}
        renderItem={({ item }) => (
          <RoomCard
            room={item}
            onPress={() => onNavigateToRoom(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Feather name="users" size={48} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>{t('rooms.no_rooms') || 'Sin salas grupales'}</Text>
            <Text style={styles.emptyText}>
              {t('rooms.create_first_room') || 'Crea una sala para desafiar a tus amigos a completar un reto juntos.'}
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={onNavigateToCreate}>
              <Text style={styles.primaryBtnText}>{t('rooms.create_room') || 'Crear mi primera sala'}</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getRoomsListScreenTheme = createThemeStyles((theme) => {
  const { colors, primaryButton, card } = theme;
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.color(colors.background, 'background'),
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      padding: spacing.xl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    title: {
      fontSize: 24,
      fontFamily: fonts.heading,
      color: colors.text,
    },
    createButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    listContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl * 3, // Espacio para tab bar
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: spacing.xl * 2,
      paddingHorizontal: spacing.lg,
    },
    emptyIconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.primarySoft,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    emptyTitle: {
      fontSize: 20,
      fontFamily: fonts.heading,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    emptyText: {
      fontSize: 15,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: spacing.xl,
      lineHeight: 22,
    },
    primaryBtn: {
      ...primaryButton,
      paddingHorizontal: spacing.xl,
    },
    primaryBtnText: {
      color: theme.color(colors.onPrimary, 'onAccent'),
      fontWeight: 'bold',
      fontSize: 16,
    },
    errorText: {
      fontSize: 16,
      color: colors.textMuted,
      marginTop: spacing.md,
      marginBottom: spacing.lg,
    },
    retryButton: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radii.pill,
    },
    retryButtonText: {
      color: colors.text,
      fontWeight: '600',
    },
    invitationsSection: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      marginBottom: spacing.sm,
    },
    invitationCard: {
      ...card,
      flexDirection: 'row',
      padding: spacing.md,
      marginBottom: spacing.sm,
      backgroundColor: colors.surfaceAccent,
      borderColor: theme.color(colors.primarySoft, 'border'),
    },
    invitationInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    invitationRoomName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.primaryDark,
      marginBottom: 2,
    },
    invitationSender: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 2,
    },
    invitationChallenge: {
      fontSize: 12,
      color: colors.textFaint,
    },
    invitationActions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: spacing.sm,
    },
    invAcceptBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.sm,
    },
    invRejectBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceMuted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    finishedCard: {
      ...card,
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      marginBottom: spacing.sm,
      backgroundColor: colors.surfaceMuted,
      borderColor: theme.color(colors.surfaceMuted, 'border'),
    },
    finishedIcon: {
      marginRight: spacing.sm,
    },
    finishedRoomName: {
      fontSize: 15,
      fontWeight: 'bold',
      color: colors.textFaint,
      marginBottom: 2,
    },
    finishedText: {
      fontSize: 12,
      color: colors.textFaint,
    },
    finishedDismissBtn: {
      marginLeft: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radii.pill,
      backgroundColor: colors.surface,
    },
    finishedDismissText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primaryDark,
    },
  });
  return { theme, colors, primaryButton, card, styles };
});
