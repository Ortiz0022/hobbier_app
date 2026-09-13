import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors, radii, spacing, fonts } from '../../../theme';

export const RoomRankingItem = ({ user, position, isFinal }) => {
  const getMedalColor = () => {
    switch(position) {
      case 1: return '#FFD700'; // Oro
      case 2: return '#C0C0C0'; // Plata
      case 3: return '#CD7F32'; // Bronce
      default: return colors.surfaceMuted;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.positionContainer}>
        {position <= 3 ? (
          <View style={[styles.medal, { backgroundColor: getMedalColor() }]}>
            <Text style={styles.medalText}>{position}</Text>
          </View>
        ) : (
          <Text style={styles.positionText}>{position}</Text>
        )}
      </View>

      <View style={styles.avatarContainer}>
        {user.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>
              {user.username?.charAt(0)?.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={1}>{user.full_name || user.username}</Text>
        <Text style={styles.username}>@{user.username}</Text>
      </View>

      <View style={styles.pointsContainer}>
        <Text style={styles.points}>{user.total_points}</Text>
        <Text style={styles.pointsLabel}>pts</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  positionContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  medal: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  avatarContainer: {
    marginRight: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textMuted,
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
  },
  username: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  pointsContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  points: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: fonts.heading,
    color: colors.primaryDark,
  },
  pointsLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
