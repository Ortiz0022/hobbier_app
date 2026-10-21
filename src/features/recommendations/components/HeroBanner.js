import { useThemeValues } from '../../../context/ThemeContext';
import { createThemeStyles } from '../../../theme/themeRuntime';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useLanguage } from '../../../context/LanguageContext';

export const HeroBanner = ({ onPress }) => {
  const { theme, colors, styles } = useThemeValues(getHeroBannerTheme);

  const { t } = useLanguage();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const visualScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.92}
      accessibilityRole="button"
      accessibilityLabel={t('recommendations.surprise_mission')}
      accessibilityHint={t('recommendations.reveal_challenge')}
    >
      <View style={[styles.decorations, { pointerEvents: 'none' }]}>
        <View style={styles.topDot} />
        <View style={styles.sideRing} />
        <Animated.View style={[styles.discoveryOrb, { transform: [{ scale: visualScale }] }]}>
          <View style={styles.orbit} />
          <View style={styles.orbCore}>
            <Feather name="gift" size={31} color={colors.onPrimary} />
          </View>
          <View style={styles.sparkleSmall} />
          <Feather name="star" size={18} color={colors.onPrimary} style={styles.orbStar} />
        </Animated.View>
      </View>

      <View style={styles.content}>
        <View style={styles.eyebrowRow}>
          <Feather name="zap" size={12} color={theme.color("#B9F3FF", 'text')} />
          <Text style={styles.eyebrow}>{t('recommendations.surprise_mission')}</Text>
        </View>
        <Text style={styles.title}>{t('recommendations.dare_you')}</Text>
        <Text style={styles.subtitle}>{t('recommendations.reveal_challenge')}</Text>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>{t('recommendations.reveal_mission')}</Text>
          <Feather name="zap" size={15} color={theme.color(colors.primaryDark, 'onAccent')} />
        </View>
      </View>
    </TouchableOpacity>
  );
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getHeroBannerTheme = createThemeStyles((theme) => {
const { colors } = theme;
const styles = StyleSheet.create({
  card: {
    minHeight: 168, borderRadius: 27, backgroundColor: theme.color(colors.primaryDark, 'card'),
    overflow: 'hidden', marginBottom: 20,
  },
  content: {
    flex: 1, paddingHorizontal: 19, paddingVertical: 18,
    alignItems: 'flex-start', zIndex: 2,
  },
  eyebrowRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12,
  },
  eyebrow: {
    color: theme.color('#B9F3FF', 'primary'), fontSize: 10, fontWeight: '600', letterSpacing: 1.2,
  },
  title: {
    maxWidth: '68%', color: theme.color(colors.onPrimary, 'text'), fontSize: 24, lineHeight: 29,
    fontWeight: '600', letterSpacing: -0.5,
  },
  subtitle: {
    maxWidth: '60%', color: theme.color('#D3E7EA', 'muted'), fontSize: 11, lineHeight: 16,
    marginTop: 3, marginBottom: 12,
  },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.color(colors.onPrimary, 'inverse'), borderRadius: 999,
    paddingVertical: 9, paddingHorizontal: 13,
  },
  ctaText: {
    color: theme.color(colors.primaryDark, 'onAccent'), fontSize: 12, fontWeight: '600',
  },
  decorations: { ...StyleSheet.absoluteFillObject },
  discoveryOrb: {
    position: 'absolute', width: 112, height: 112, borderRadius: 56,
    right: -15, bottom: -13, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  orbCore: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.accentDark,
    alignItems: 'center', justifyContent: 'center',
  },
  orbit: {
    position: 'absolute', width: 91, height: 91, borderRadius: 46,
    borderWidth: 1, borderColor: theme.color('rgba(255, 255, 255, 0.48)', 'border'),
  },
  orbStar: { position: 'absolute', top: 13, right: 18 },
  sparkleSmall: {
    position: 'absolute', width: 7, height: 7, borderRadius: 4,
    backgroundColor: theme.color(colors.onPrimary, 'card'), bottom: 19, left: 20,
  },
  topDot: {
    position: 'absolute', width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.salmon, right: 73, top: 20,
  },
  sideRing: {
    position: 'absolute', width: 48, height: 48, borderRadius: 24,
    borderWidth: 8, borderColor: theme.color(colors.primary, 'border'), right: -22, top: 18,
  },
});
  return { theme, colors, styles };
});
