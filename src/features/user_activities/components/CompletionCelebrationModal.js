import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '../../../theme';

export const CompletionCelebrationModal = ({ visible, result, onProfile, onClose }) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    statusBarTranslucent
    onRequestClose={onClose}
  >
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View pointerEvents="none" style={styles.decorations}>
          <Feather name="star" size={20} color={colors.accent} style={styles.starOne} />
          <Feather name="star" size={13} color={colors.salmon} style={styles.starTwo} />
          <View style={styles.dot} />
        </View>

        <View style={styles.iconRing}>
          <View style={styles.iconCircle}>
            <Feather name="check" size={40} color={colors.onPrimary} />
          </View>
        </View>

        <Text style={styles.eyebrow}>{result?.isRepeating ? 'NUEVO AVANCE REGISTRADO' : 'MISIÓN SUPERADA'}</Text>
        <Text style={styles.title}>{result?.isRepeating ? 'Seguiste avanzando.' : '¡Misión cumplida!'}</Text>
        <Text style={styles.activityName}>{result?.title}</Text>

        <View style={styles.pointsPill}>
          <Feather name="star" size={15} color={colors.accentDark} />
          <Text style={styles.pointsText}>+{result?.points || 0} puntos</Text>
        </View>

        <Text style={styles.message}>
          Tu evidencia quedó guardada. Este momento ya forma parte de tu Perfil.
        </Text>

        <TouchableOpacity
          style={styles.profileButton}
          onPress={onProfile}
          activeOpacity={0.9}
          accessibilityRole="button"
        >
          <Text style={styles.profileButtonText}>Ver en mi Perfil</Text>
          <Feather name="arrow-up-right" size={17} color={colors.onPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityRole="button">
          <Text style={styles.closeButtonText}>Seguir aquí</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(5, 31, 37, 0.62)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  card: {
    width: '100%', maxWidth: 430, overflow: 'hidden',
    backgroundColor: colors.surface, borderRadius: 32,
    alignItems: 'center', paddingHorizontal: 24, paddingVertical: 28,
  },
  decorations: { ...StyleSheet.absoluteFillObject },
  starOne: { position: 'absolute', top: 35, right: 52 },
  starTwo: { position: 'absolute', top: 82, left: 44 },
  dot: {
    position: 'absolute', width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.primary, top: 48, left: 75,
  },
  iconRing: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 1, borderColor: colors.salmonSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  iconCircle: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: {
    color: colors.primary, fontSize: 9,
    fontWeight: '600', letterSpacing: 1.1,
  },
  title: {
    color: colors.text, fontSize: 25, lineHeight: 32,
    fontWeight: '600', letterSpacing: -0.5, marginTop: 5,
  },
  activityName: {
    color: colors.textFaint, fontSize: 13,
    lineHeight: 19, textAlign: 'center', marginTop: 3,
  },
  pointsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF5EA', borderRadius: 999,
    paddingHorizontal: 13, paddingVertical: 8, marginTop: 16,
  },
  pointsText: { color: colors.accentDark, fontSize: 13, fontWeight: '500' },
  message: {
    color: colors.textMuted, fontSize: 12, lineHeight: 18,
    textAlign: 'center', maxWidth: 290, marginTop: 15, marginBottom: 20,
  },
  profileButton: {
    width: '100%', minHeight: 52, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 9,
    backgroundColor: colors.primary, borderRadius: 18,
  },
  profileButtonText: { color: colors.onPrimary, fontSize: 14, fontWeight: '600' },
  closeButton: { paddingVertical: 13, paddingHorizontal: 20 },
  closeButtonText: { color: colors.primary, fontSize: 13, fontWeight: '500' },
});
