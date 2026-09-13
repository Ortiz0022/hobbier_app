import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRooms } from '../hooks/useRooms';
import { usePendingInvitations } from '../hooks/usePendingInvitations';
import { RoomCard } from '../components/RoomCard';
import { colors, spacing, fonts, radii, primaryButton, card } from '../../../theme';

export const RoomsListScreen = ({ onNavigateToCreate, onNavigateToRoom }) => {
  const { rooms, loading: roomsLoading, error: roomsError, refetch: refetchRooms } = useRooms();
  const { invitations, loading: invLoading, acceptInvitation, rejectInvitation, refetch: refetchInv } = usePendingInvitations();

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
        <Text style={styles.errorText}>No se pudieron cargar las salas.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Salas</Text>
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
        ListHeaderComponent={
          invitations.length > 0 ? (
            <View style={styles.invitationsSection}>
              <Text style={styles.sectionTitle}>Invitaciones Pendientes ({invitations.length})</Text>
              {invitations.map(inv => (
                <View key={inv.invitation_id} style={styles.invitationCard}>
                  <View style={styles.invitationInfo}>
                    <Text style={styles.invitationRoomName}>{inv.room_name}</Text>
                    <Text style={styles.invitationSender}>
                      Invitado por <Text style={{fontWeight: 'bold'}}>@{inv.sender_username}</Text>
                    </Text>
                    <Text style={styles.invitationChallenge}>Reto: {inv.challenge_title}</Text>
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
          ) : null
        }
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
            <Text style={styles.emptyTitle}>Sin salas grupales</Text>
            <Text style={styles.emptyText}>
              Crea una sala para desafiar a tus amigos a completar un reto juntos.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={onNavigateToCreate}>
              <Text style={styles.primaryBtnText}>Crear mi primera sala</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.onPrimary,
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
    borderColor: colors.primarySoft,
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
});
