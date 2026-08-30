import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '../../../theme';

export const HeroBanner = ({ onPress }) => {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
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
      accessibilityLabel="Sorpréndeme con un hobby nuevo"
      accessibilityHint="Busca una actividad elegida para ti"
    >
      <View pointerEvents="none" style={styles.decorations}>
        <View style={styles.topDot} />
        <View style={styles.sideRing} />
        <Animated.View style={[styles.discoveryOrb, { transform: [{ scale: visualScale }] }]}>
          <View style={styles.orbit} />
          <View style={styles.orbCore}>
            <Feather name="compass" size={37} color={colors.onPrimary} />
          </View>
          <View style={styles.sparkleSmall} />
          <Feather name="star" size={18} color={colors.onPrimary} style={styles.orbStar} />
        </Animated.View>
      </View>

      <View style={styles.content}>
        <View style={styles.eyebrowRow}>
          <Feather name="zap" size={12} color="#B9F3FF" />
          <Text style={styles.eyebrow}>UNA IDEA PARA TI</Text>
        </View>
        <Text style={styles.title}>Sal de la rutina.</Text>
        <Text style={styles.subtitle}>Tu próximo hobby puede empezar ahora.</Text>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>Sorpréndeme</Text>
          <Feather name="arrow-up-right" size={17} color={colors.primaryDark} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 224, borderRadius: 30, backgroundColor: colors.primaryDark,
    overflow: 'hidden', marginBottom: 30,
  },
  content: {
    flex: 1, paddingHorizontal: 22, paddingVertical: 24,
    alignItems: 'flex-start', zIndex: 2,
  },
  eyebrowRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20,
  },
  eyebrow: {
    color: '#B9F3FF', fontSize: 10, fontWeight: '600', letterSpacing: 1.2,
  },
  title: {
    maxWidth: '72%', color: colors.onPrimary, fontSize: 27, lineHeight: 33,
    fontWeight: '600', letterSpacing: -0.7,
  },
  subtitle: {
    maxWidth: '64%', color: '#D3E7EA', fontSize: 13, lineHeight: 19,
    marginTop: 5, marginBottom: 18,
  },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.onPrimary, borderRadius: 999,
    paddingVertical: 10, paddingHorizontal: 15,
  },
  ctaText: {
    color: colors.primaryDark, fontSize: 13, fontWeight: '600',
  },
  decorations: { ...StyleSheet.absoluteFillObject },
  discoveryOrb: {
    position: 'absolute', width: 138, height: 138, borderRadius: 69,
    right: -18, bottom: -12, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  orbCore: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accentDark,
    alignItems: 'center', justifyContent: 'center',
  },
  orbit: {
    position: 'absolute', width: 112, height: 112, borderRadius: 56,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.48)',
  },
  orbStar: { position: 'absolute', top: 17, right: 23 },
  sparkleSmall: {
    position: 'absolute', width: 7, height: 7, borderRadius: 4,
    backgroundColor: colors.onPrimary, bottom: 24, left: 25,
  },
  topDot: {
    position: 'absolute', width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.salmon, right: 85, top: 25,
  },
  sideRing: {
    position: 'absolute', width: 54, height: 54, borderRadius: 27,
    borderWidth: 9, borderColor: colors.primary, right: -25, top: 25,
  },
});
