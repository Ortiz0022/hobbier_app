import { useThemeValues } from '../context/ThemeContext';
import { createThemeStyles } from '../theme/themeRuntime';
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Image, Animated, Easing, Platform } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import Svg, { Path } from 'react-native-svg';
import { Text } from './scaledText';
import { useLanguage } from '../context/LanguageContext';
import { spacing, fonts } from "../theme";

// Segundos que la persona debe quedarse viendo el anuncio para activar los brillitos.
const DWELL_TIME_MS = 3000;

// Misma estrella de 4 puntas de StarReactionButton y HeroBanner
const SPARKLE_PATH = 'M10,0 Q10,10 20,10 Q10,10 10,20 Q10,10 0,10 Q10,10 10,0 Z';

const SparkleSvg = ({ size = 20, color }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20">
    <Path d={SPARKLE_PATH} fill={color} />
  </Svg>
);

const FloatingSparkleParticle = ({ particle, onComplete, styles }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: particle.duration,
      delay: particle.delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      onComplete(particle.id);
    });
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, particle.yEnd],
  });

  const translateX = anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, particle.xOffset * 0.5, particle.xOffset],
  });

  const scale = anim.interpolate({
    inputRange: [0, 0.2, 0.7, 1],
    outputRange: [0.1, particle.maxScale, particle.maxScale * 0.9, 0],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.1, 0.75, 1],
    outputRange: [0, 1, 0.85, 0],
  });

  const rotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${particle.rotation}deg`],
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        { pointerEvents: 'none' },
        {
          left: `${particle.startPercentX}%`,
          bottom: particle.startY,
          transform: [{ translateX }, { translateY }, { scale }, { rotate }],
          opacity,
        },
      ]}
    >
      <SparkleSvg size={particle.size} color={particle.color} />
    </Animated.View>
  );
};

/**
 * Tarjeta de anuncio patrocinado.
 *
 * Con formato de publicación (cabecera, imagen grande, texto), pero con
 * "Patrocinado" bien visible bajo el anunciante para que nunca se confunda con
 * lo que publican los amigos.
 *
 * Cuando el usuario permanece viéndola durante 3 segundos (`inView`), lanza
 * una ráfaga de brillitos mágicos (como los de dar like) en la barra de
 * "Más información".
 */
export const SponsoredCard = ({ ad, onPress, onInfo, isVisible = true }) => {
  const { theme, colors, PARTICLE_COLORS, styles } = useThemeValues(getSponsoredCardTheme);
  const { t } = useLanguage();

  const cardRef = useRef(null);
  const [webInView, setWebInView] = useState(false);
  // Guardamos el ID del anuncio que ya cumplió los 3s para que, si FlashList
  // recicla la vista en el siguiente anuncio, no aparezca como ya visto.
  const [highlightedAdId, setHighlightedAdId] = useState(null);
  const [particles, setParticles] = useState([]);
  const ctaScale = useRef(new Animated.Value(1)).current;
  const twinkleAnim = useRef(new Animated.Value(0)).current;

  const currentAdId = ad?.id ?? null;
  const highlighted = Boolean(currentAdId && highlightedAdId === currentAdId);

  // Al cambiar de anuncio (por reciclado de la lista), limpiar partículas y animaciones
  useEffect(() => {
    setParticles([]);
    ctaScale.setValue(1);
    twinkleAnim.setValue(0);
    if (Platform.OS === 'web') {
      setWebInView(false);
    }
  }, [currentAdId]);

  // En web detectamos con IntersectionObserver cuándo la tarjeta está realmente en pantalla
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return undefined;
    }
    setWebInView(false);
    if (typeof IntersectionObserver === 'undefined') {
      return undefined;
    }
    const node = cardRef.current;
    if (!node || typeof node.getBoundingClientRect !== 'function') {
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setWebInView(Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.55));
      },
      { threshold: [0, 0.25, 0.55, 0.75] }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [currentAdId]);

  const activeInView =
    Platform.OS === 'web' && typeof IntersectionObserver !== 'undefined'
      ? webInView
      : isVisible;

  useEffect(() => {
    if (!currentAdId || !activeInView || highlighted) return undefined;

    const timer = setTimeout(() => {
      setHighlightedAdId(currentAdId);
    }, DWELL_TIME_MS);

    return () => clearTimeout(timer);
  }, [currentAdId, activeInView, highlighted]);

  useEffect(() => {
    if (!highlighted) return undefined;

    // Rebote elástico suave en el texto del CTA como al dar reacción
    Animated.sequence([
      Animated.timing(ctaScale, {
        toValue: 0.96,
        duration: 90,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(ctaScale, {
        toValue: 1,
        friction: 4,
        tension: 50,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    // Ráfaga de brillitos idénticos a los de StarReactionButton repartidos por la barra
    const newParticles = [];
    const particleCount = 18;
    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: `${Date.now()}-${i}-${Math.random()}`,
        startPercentX: 6 + Math.random() * 88,
        startY: 14 + Math.random() * 12,
        xOffset: (Math.random() - 0.5) * 90,
        yEnd: -140 - Math.random() * 130,
        size: 13 + Math.random() * 15,
        maxScale: 0.85 + Math.random() * 0.55,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        rotation: (Math.random() - 0.5) * 140,
        duration: 1100 + Math.random() * 650,
        delay: i * 30 + Math.random() * 50,
      });
    }
    setParticles((prev) => [...prev, ...newParticles]);

    // Destello suave continuo en la estrellita junto al texto
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkleAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(twinkleAnim, {
          toValue: 0.35,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    loop.start();

    return () => loop.stop();
  }, [highlighted]);

  const removeParticle = (id) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  };

  if (!ad) return null;

  const tieneEnlace = !!ad.link_url;
  const inicial = (ad.advertiser_name || '?').trim()[0]?.toUpperCase() || '?';

  return (
    <View ref={cardRef} style={styles.card}>
      {/* Cabecera estilo publicación: anunciante + "Patrocinado" */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{inicial}</Text>
        </View>
        <View style={styles.headerTexts}>
          <Text style={styles.advertiser} numberOfLines={1}>
            {ad.advertiser_name}
          </Text>
          <Text style={styles.sponsored} numberOfLines={1}>
            {t('ads.sponsored')}
            {ad.matched ? ` · ${t('ads.because_likes')}` : ''}
            {ad.nearby ? ` · ${t('ads.nearby')}` : ''}
          </Text>
        </View>

        {!!onInfo && (
          <TouchableOpacity
            onPress={onInfo}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('ads.why_title')}
          >
            <Feather name="info" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        onPress={tieneEnlace ? onPress : undefined}
        disabled={!tieneEnlace}
        activeOpacity={0.9}
        accessibilityRole={tieneEnlace ? 'link' : undefined}
      >
        {!!ad.image_url && <Image source={{ uri: ad.image_url }} style={styles.image} resizeMode="cover" />}

        {tieneEnlace && (
          <View style={styles.cta}>
            {/* Brillitos flotantes cuando lleva 3s viendo el anuncio */}
            {particles.map((p) => (
              <FloatingSparkleParticle
                key={p.id}
                particle={p}
                onComplete={removeParticle}
                styles={styles}
              />
            ))}

            <Animated.View style={[styles.ctaLeft, { transform: [{ scale: ctaScale }] }]}>
              {highlighted ? (
                <Animated.View style={{ opacity: twinkleAnim }}>
                  <SparkleSvg size={18} color={theme.color('#FF8F21', 'accent')} />
                </Animated.View>
              ) : (
                <Feather name="external-link" size={14} color={colors.textMuted} />
              )}
              <Text style={styles.ctaText} numberOfLines={1}>
                {t('ads.default_cta')}
              </Text>
            </Animated.View>

            <Feather name="arrow-right" size={16} color={colors.primary} />
          </View>
        )}

        <View style={styles.texts}>
          <Text style={styles.title} numberOfLines={2}>
            {ad.title}
          </Text>
          {!!ad.body && (
            <Text style={styles.description} numberOfLines={4}>
              {ad.body}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getSponsoredCardTheme = createThemeStyles((theme) => {
const { colors } = theme;
const PARTICLE_COLORS = [
  theme.color('#FF8F21', 'accent'), // Naranja Sorpréndeme
  theme.color('#FFAA55', 'accent'), // Naranja Claro
  theme.color('#FFD166', 'accent'), // Dorado brillante
  theme.color('#00DBFF', 'primary'), // Azul Cyan Hobbier
  theme.color('#FF6B6B', 'danger'), // Coral festivo
];
const styles = StyleSheet.create({
  // Mismo contenedor que una publicación del feed (postCard en FeedScreen).
  card: {
    backgroundColor: theme.color('#ffffff', 'background'),
    marginBottom: 20,
    width: '100%',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.color('#F0F3F5', 'border'),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  headerTexts: {
    flex: 1,
  },
  advertiser: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  sponsored: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 1,
  },
  image: {
    width: '100%',
    // Misma altura que la imagen de una publicación (postImage).
    height: 460,
    backgroundColor: colors.surfaceMuted,
  },
  cta: {
    position: 'relative',
    overflow: 'visible',
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  particle: {
    position: 'absolute',
    zIndex: 999,
  },
  ctaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  texts: {
    paddingHorizontal: 16,
    paddingTop: spacing.md,
  },
  title: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  description: {
    fontSize: 14,
    color: colors.textFaint,
    lineHeight: 20,
    marginTop: 4,
  },
});
  return { theme, colors, PARTICLE_COLORS, styles };
});
