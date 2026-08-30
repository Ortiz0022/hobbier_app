import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '../../../theme';

export const InProgressCard = ({ pendingActivity, onPress, onDiscover }) => {
  const activity = pendingActivity?.activity;
  const points = activity?.points_awarded || 0;

  if (!pendingActivity) {
    return (
      <TouchableOpacity
        style={styles.emptyCard}
        onPress={onDiscover}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="Revelar mi primera misión"
      >
        <View style={styles.emptyIcon}>
          <Feather name="target" size={21} color={colors.accentDark} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.eyebrowEmpty}>MAZO VACÍO</Text>
          <Text style={styles.title}>Añade tu primera misión</Text>
          <Text style={styles.meta}>Revela un reto y empieza a sumar puntos.</Text>
        </View>
        <View style={styles.emptyAction}>
          <Feather name="plus" size={17} color={colors.onPrimary} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.activeCard}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`Jugar ${activity?.title || 'misión activa'}`}
    >
      <View pointerEvents="none" style={styles.cardOrb} />
      <View style={styles.activeIcon}>
        <Feather name="compass" size={21} color={colors.primary} />
      </View>

      <View style={styles.copy}>
        <View style={styles.eyebrowRow}>
          <View style={styles.statusDot} />
          <Text style={styles.eyebrow}>MISIÓN ACTIVA</Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {activity?.title || 'Tu misión actual'}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          1 paso pendiente{points ? ` · +${points} pts` : ''}
        </Text>
      </View>

      <View style={styles.playButton}>
        <Feather name="play" size={15} color={colors.onPrimary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  activeCard: {
    position: 'relative', overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.primarySoft, borderRadius: 22,
    padding: 14, marginBottom: 26,
  },
  cardOrb: {
    position: 'absolute', width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(12, 138, 166, 0.08)', right: -28, top: -28,
  },
  activeIcon: {
    width: 44, height: 44, borderRadius: 15,
    backgroundColor: colors.onPrimary, alignItems: 'center', justifyContent: 'center',
  },
  copy: { flex: 1 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary },
  eyebrow: {
    color: colors.primary, fontSize: 8, fontWeight: '600', letterSpacing: 0.8,
  },
  eyebrowEmpty: {
    color: colors.accentDark, fontSize: 8, fontWeight: '600', letterSpacing: 0.8,
  },
  title: {
    color: colors.text, fontSize: 14, lineHeight: 19,
    fontWeight: '600', marginTop: 2,
  },
  meta: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 2 },
  playButton: {
    width: 37, height: 37, borderRadius: 19,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  emptyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF5EA', borderRadius: 22,
    padding: 14, marginBottom: 26,
  },
  emptyIcon: {
    width: 44, height: 44, borderRadius: 15,
    backgroundColor: '#FFE2C2', alignItems: 'center', justifyContent: 'center',
  },
  emptyAction: {
    width: 37, height: 37, borderRadius: 19,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
});
