import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '../../../theme';

const SectionHeading = ({ subtitle }) => (
  <View style={styles.sectionHeading}>
    <Text style={styles.sectionTitle}>Tu aventura en curso</Text>
    <Text style={styles.sectionSubtitle}>{subtitle}</Text>
  </View>
);

export const InProgressCard = ({ pendingActivity, onPress, onDiscover }) => {
  const activity = pendingActivity?.activity;

  return (
    <View style={styles.sectionContainer}>
      <SectionHeading
        subtitle={pendingActivity
          ? 'Sigue construyendo algo que te haga bien.'
          : 'Todo gran hobby comienza con un primer intento.'}
      />

      {pendingActivity ? (
        <TouchableOpacity
          style={styles.progressCard}
          onPress={onPress}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={`Continuar ${activity?.title || 'actividad en curso'}`}
        >
          <View style={styles.cardAccent} />
          <View style={styles.progressTopRow}>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>EN CURSO</Text>
            </View>
            {activity?.points_awarded ? (
              <Text style={styles.pointsText}>+{activity.points_awarded} pts</Text>
            ) : null}
          </View>

          <View style={styles.activityRow}>
            <View style={styles.iconCircle}>
              <Feather name="compass" size={23} color={colors.primary} />
            </View>
            <View style={styles.activityCopy}>
              <Text style={styles.progressTitle} numberOfLines={2}>
                {activity?.title || 'Actividad asignada'}
              </Text>
              <Text style={styles.progressDesc} numberOfLines={2}>
                {activity?.description || 'Completa este reto y comparte lo que creaste.'}
              </Text>
            </View>
          </View>

          <View style={styles.continueRow}>
            <Text style={styles.encouragement}>Un paso a la vez</Text>
            <View style={styles.continueButton}>
              <Text style={styles.continueText}>Continuar</Text>
              <Feather name="arrow-right" size={15} color={colors.onPrimary} />
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.emptyCard}
          onPress={onDiscover}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Encontrar mi primera aventura"
        >
          <View style={styles.emptyIconCircle}>
            <Feather name="sunrise" size={26} color={colors.accentDark} />
          </View>
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>Tu espacio está listo</Text>
            <Text style={styles.emptySubtitle}>Descubre una idea sencilla para empezar hoy.</Text>
            <View style={styles.emptyActionRow}>
              <Text style={styles.emptyAction}>Encontrar mi próxima aventura</Text>
              <Feather name="arrow-right" size={15} color={colors.accentDark} />
            </View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: { marginBottom: 30 },
  sectionHeading: { marginBottom: 13 },
  sectionTitle: {
    color: colors.text, fontSize: 19, lineHeight: 25,
    fontWeight: '500', letterSpacing: -0.3,
  },
  sectionSubtitle: {
    color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 2,
  },
  progressCard: {
    position: 'relative', overflow: 'hidden', backgroundColor: colors.primarySoft,
    borderRadius: 24, padding: 18,
  },
  cardAccent: {
    position: 'absolute', width: 92, height: 92, borderRadius: 46,
    backgroundColor: 'rgba(12, 138, 166, 0.08)', right: -35, top: -34,
  },
  progressTopRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.onPrimary, borderRadius: 999,
    paddingHorizontal: 9, paddingVertical: 5,
  },
  statusDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary,
  },
  statusText: {
    color: colors.primary, fontSize: 9, fontWeight: '600', letterSpacing: 0.8,
  },
  pointsText: { color: colors.primaryDark, fontSize: 12, fontWeight: '500' },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  iconCircle: {
    width: 52, height: 52, borderRadius: 17, backgroundColor: colors.onPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  activityCopy: { flex: 1 },
  progressTitle: {
    color: colors.text, fontSize: 17, lineHeight: 22, fontWeight: '600',
  },
  progressDesc: {
    color: colors.textFaint, fontSize: 12, lineHeight: 17, marginTop: 4,
  },
  continueRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 18,
  },
  encouragement: { color: colors.primary, fontSize: 11 },
  continueButton: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: colors.primary, borderRadius: 999,
    paddingVertical: 9, paddingHorizontal: 13,
  },
  continueText: { color: colors.onPrimary, fontSize: 12, fontWeight: '600' },
  emptyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFF5EA', borderRadius: 24, padding: 18,
  },
  emptyIconCircle: {
    width: 54, height: 54, borderRadius: 18, backgroundColor: '#FFE2C2',
    justifyContent: 'center', alignItems: 'center',
  },
  emptyCopy: { flex: 1 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '500' },
  emptySubtitle: {
    color: colors.textFaint, fontSize: 12, lineHeight: 17, marginTop: 3,
  },
  emptyActionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 9,
  },
  emptyAction: { color: colors.accentDark, fontSize: 11, fontWeight: '600' },
});
