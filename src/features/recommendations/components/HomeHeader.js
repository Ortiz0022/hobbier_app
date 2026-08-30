import React from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '../../../theme';

const getDisplayName = (profile) => {
  const fullName = profile?.full_name?.trim();
  if (fullName) return fullName.split(/\s+/)[0];
  if (profile?.username) return profile.username;
  return 'explorador';
};

export const HomeHeader = ({ profile }) => {
  const displayName = getDisplayName(profile);
  const points = profile?.points || 0;
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <Text style={styles.brand}>hobbier.</Text>

        <View style={styles.profileSummary}>
          <View style={styles.pointsBadge}>
            <Feather name="star" size={13} color={colors.accent} />
            <Text style={styles.pointsValue}>{points} pts</Text>
          </View>

          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.avatar}
              accessibilityLabel={`Foto de perfil de ${displayName}`}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{avatarInitial}</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.greeting}>Hola, {displayName} 👋</Text>
      <Text style={styles.prompt}>¿Qué historia quieres vivir hoy?</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { marginBottom: 22 },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22,
  },
  brand: {
    fontFamily: 'DynaPuff', fontSize: 24, color: colors.primaryDark, letterSpacing: -0.6,
  },
  profileSummary: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  pointsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF5EA',
    borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7,
  },
  pointsValue: { color: colors.accentDark, fontSize: 12, fontWeight: '500' },
  avatar: {
    width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: colors.salmonSoft,
  },
  avatarPlaceholder: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.salmon,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { color: colors.onPrimary, fontSize: 15, fontWeight: '600' },
  greeting: { color: colors.textMuted, fontSize: 14, marginBottom: 4 },
  prompt: {
    color: colors.text, fontSize: 25, lineHeight: 32, fontWeight: '500',
    letterSpacing: -0.6, maxWidth: 330,
  },
});
