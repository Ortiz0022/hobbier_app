import React from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

export const HomeHeader = ({ profile }) => {
  const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : 'Sofía';
  const points = profile?.points || 0;

  return (
    <View style={styles.headerRow}>
      <View style={styles.userGreetingRow}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.headerAvatar} />
        ) : (
          <View style={styles.headerAvatarPlaceholder}>
            <Text style={styles.avatarInitial}>{firstName[0].toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.greetingText}>Hola, {firstName}</Text>
      </View>

      <View style={styles.pointsBadge}>
        <Feather name="award" size={14} color="#2A6347" />
        <Text style={styles.pointsValue}>{points} puntos</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userGreetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#DF9C8E',
  },
  headerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DF9C8E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  greetingText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C201D',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECF4EE',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  pointsValue: {
    color: '#2A6347',
    fontWeight: '800',
    fontSize: 13,
  },
});
