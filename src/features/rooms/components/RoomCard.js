import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors, radii, spacing, fonts, card } from '../../../theme';
import { useSignedUrl } from '../hooks/useSignedUrl';
import { isRoomClosed } from '../utils/roomHelpers';

export const RoomCard = ({ room, onPress }) => {
  const isClosed = isRoomClosed(room);
  const { url: coverUrl, loading } = useSignedUrl('room-images', room.image_path);
  
  const getStatusText = () => {
    if (isClosed) return 'Reto finalizado';
    if (!room.end_at) return 'Activa · Sin fecha límite';
    
    const endDate = new Date(room.end_at);
    return `Activa · Finaliza el ${endDate.toLocaleDateString()}`;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Portada */}
      {room.image_path ? (
        <View style={styles.imageContainer}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.image} />
          ) : (
            <View style={styles.placeholderContainerSmall}>
               {/* Loading state can be handled implicitly with background color */}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.placeholderContainer}>
          <Feather name="users" size={32} color={colors.primary} />
        </View>
      )}

      {/* Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={1}>{room.name}</Text>
        <Text style={styles.challengeTitle} numberOfLines={1}>
          {room.challenge?.title || 'Reto grupal'}
        </Text>
        
        <View style={[styles.statusBadge, isClosed && styles.statusBadgeClosed]}>
          <Feather 
            name={isClosed ? 'check-circle' : 'activity'} 
            size={12} 
            color={isClosed ? colors.textFaint : colors.primaryDark} 
            style={styles.statusIcon} 
          />
          <Text style={[styles.statusText, isClosed && styles.statusTextClosed]}>
            {getStatusText()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    ...card,
    flexDirection: 'row',
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  imageContainer: {
    width: 70,
    height: 70,
    borderRadius: radii.pill,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    marginRight: spacing.md,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainerSmall: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceMuted,
  },
  placeholderContainer: {
    width: 70,
    height: 70,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fonts.heading,
    marginBottom: 2,
  },
  challengeTitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAccent,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  statusBadgeClosed: {
    backgroundColor: colors.surfaceMuted,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  statusTextClosed: {
    color: colors.textFaint,
  },
});
