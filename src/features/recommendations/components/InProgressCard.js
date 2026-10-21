import { useThemeValues } from '../../../context/ThemeContext';
import { createThemeStyles } from '../../../theme/themeRuntime';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useLanguage } from '../../../context/LanguageContext';

export const InProgressCard = ({ pendingActivity, onPress, onCreate }) => {
  const { theme, colors, styles } = useThemeValues(getInProgressCardTheme);

  const { t } = useLanguage();
  const activity = pendingActivity?.activity;
  const points = activity?.points_awarded || 0;

  if (!pendingActivity) {
    return (
      <TouchableOpacity
        style={styles.emptyCard}
        onPress={onCreate}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={t('recommendations.add_first_mission')}
      >
        <View style={styles.emptyIcon}>
          <Feather name="target" size={21} color={colors.accentDark} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.eyebrowEmpty}>{t('recommendations.empty_deck_title')}</Text>
          <Text style={styles.title}>{t('recommendations.add_first_mission')}</Text>
          <Text style={styles.meta}>{t('recommendations.create_challenge_start_points')}</Text>
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
      accessibilityLabel={`${t('recommendations.active_mission')} ${activity?.title || t('recommendations.your_current_mission')}`}
    >
      <View style={[styles.cardOrb, { pointerEvents: 'none' }]} />
      <View style={styles.activeIcon}>
        <Feather name="compass" size={21} color={colors.primary} />
      </View>

      <View style={styles.copy}>
        <View style={styles.eyebrowRow}>
          <View style={styles.statusDot} />
          <Text style={styles.eyebrow}>{t('recommendations.active_mission')}</Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {activity?.title || t('recommendations.your_current_mission')}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {t('recommendations.step_pending')}{points ? ` · ${t('recommendations.points_pending', { points })}` : ''}
        </Text>
      </View>

      <View style={styles.playButton}>
        <Feather name="play" size={15} color={colors.onPrimary} />
      </View>
    </TouchableOpacity>
  );
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getInProgressCardTheme = createThemeStyles((theme) => {
const { colors } = theme;
const styles = StyleSheet.create({
  activeCard: {
    position: 'relative', overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.color(colors.primarySoft, "card"), borderRadius: 22,
    padding: 14, marginBottom: 26,
  },
  cardOrb: {
    position: 'absolute', width: 72, height: 72, borderRadius: 36,
    backgroundColor: theme.color('rgba(12, 138, 166, 0.08)', 'card'), right: -28, top: -28,
  },
  activeIcon: {
    width: 44, height: 44, borderRadius: 15,
    backgroundColor: theme.color(colors.onPrimary, 'selected'), alignItems: 'center', justifyContent: 'center',
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
    backgroundColor: theme.color('#FFF5EA', 'card'), borderRadius: 22,
    padding: 14, marginBottom: 26,
  },
  emptyIcon: {
    width: 44, height: 44, borderRadius: 15,
    backgroundColor: theme.color('#FFE2C2', 'card'), alignItems: 'center', justifyContent: 'center',
  },
  emptyAction: {
    width: 37, height: 37, borderRadius: 19,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
});
  return { theme, colors, styles };
});
