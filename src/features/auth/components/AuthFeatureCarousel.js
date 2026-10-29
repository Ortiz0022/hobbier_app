import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Text } from '../../../components/scaledText';
import { useThemeValues } from '../../../context/ThemeContext';
import { createThemeStyles } from '../../../theme/themeRuntime';
import {
  Users,
  Compass,
  HeartHandshake,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Flame,
  Award,
  Layers,
  MessageSquare,
} from 'lucide-react-native';

const SLIDES = [
  {
    id: 'rooms',
    category: 'Salas en vivo',
    title: 'Charlas y talleres en tiempo real',
    description:
      'Participa en salas temáticas para intercambiar ideas, aprender nuevas técnicas y crear proyectos en vivo junto a otros entusiastas.',
    tags: ['Salas temáticas', 'Talleres prácticos', 'Audio y chat'],
    color: '#0C8AA6',
    bgColor: '#EAF7FA',
    icon: Users,
    highlight: 'Más de 50 salas activas',
    highlightIcon: Flame,
  },
  {
    id: 'explore',
    category: 'Inspiración',
    title: 'Descubre y explora nuevos hobbies',
    description:
      'Encuentra inspiración diaria en disciplinas como cerámica, fotografía, acuarela, café de especialidad, jardinería y música.',
    tags: ['Ideas diarias', 'Retos creativos', 'Tendencias'],
    color: '#FF8F21',
    bgColor: '#FFF5EB',
    icon: Compass,
    highlight: 'Descubre cada semana',
    highlightIcon: Sparkles,
  },
  {
    id: 'community',
    category: 'Comunidad',
    title: 'Conoce personas con tus mismos intereses',
    description:
      'Conecta con personas afines en tu zona o en todo el país. Comparte pasiones, haz preguntas y construye amistades duraderas.',
    tags: ['Intereses afines', 'Mensajes directos', 'Comunidades'],
    color: '#10B981',
    bgColor: '#ECFDF5',
    icon: HeartHandshake,
    highlight: 'Conexión auténtica',
    highlightIcon: Award,
  },
  {
    id: 'showcase',
    category: 'Portafolio',
    title: 'Comparte tu proceso y creaciones',
    description:
      'Publica fotografías de tus avances, documenta tu aprendizaje y recibe consejos y apoyo constructivo de la comunidad.',
    tags: ['Galería de fotos', 'Feedback positivo', 'Tu portafolio'],
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    icon: Sparkles,
    highlight: 'Muestra tu talento',
    highlightIcon: Layers,
  },
];

export const AuthFeatureCarousel = () => {
  const { theme, styles } = useThemeValues(getCarouselTheme);
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const current = SLIDES[currentIndex];
  const IconComponent = current.icon;
  const HighlightIcon = current.highlightIcon;

  const goToSlide = (nextIndex) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: nextIndex > currentIndex ? -10 : 10,
        duration: 150,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      setCurrentIndex(nextIndex);
      slideAnim.setValue(nextIndex > currentIndex ? 10 : -10);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    });
  };

  const nextSlide = () => {
    const next = (currentIndex + 1) % SLIDES.length;
    goToSlide(next);
  };

  const prevSlide = () => {
    const prev = (currentIndex - 1 + SLIDES.length) % SLIDES.length;
    goToSlide(prev);
  };

  // Auto-avance suave cada 6 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      goToSlide((currentIndex + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [currentIndex]);

  return (
    <View style={styles.container}>
      {/* Tarjeta principal con contenido */}
      <View style={styles.card}>
        <Animated.View
          style={[
            styles.animatedContent,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Fila superior: Icono grande con tinte de color + Categoría + Contador */}
          <View style={styles.topRow}>
            <View style={[styles.iconBox, { backgroundColor: current.bgColor }]}>
              <IconComponent size={24} color={current.color} />
            </View>

            <View style={styles.categoryWrap}>
              <View style={[styles.categoryBadge, { backgroundColor: current.bgColor }]}>
                <Text style={[styles.categoryText, { color: current.color }]}>{current.category}</Text>
              </View>
            </View>

            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>
                {String(currentIndex + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
              </Text>
            </View>
          </View>

          {/* Título de la función */}
          <Text style={styles.title}>{current.title}</Text>

          {/* Descripción clara y ligera */}
          <Text style={styles.description}>{current.description}</Text>

          {/* Chips de características */}
          <View style={styles.chipsRow}>
            {current.tags.map((tag, idx) => (
              <View key={idx} style={styles.chip}>
                <Text style={styles.chipText}>{tag}</Text>
              </View>
            ))}
          </View>

          {/* Barra de destaque inferior */}
          <View style={styles.highlightBanner}>
            <HighlightIcon size={14} color={current.color} />
            <Text style={[styles.highlightText, { color: current.color }]}>{current.highlight}</Text>
          </View>
        </Animated.View>

        {/* Barra de control inferior: Indicadores de puntos + Flechas ant/sig */}
        <View style={styles.footerControls}>
          <View style={styles.dotsRow}>
            {SLIDES.map((slide, idx) => {
              const isActive = idx === currentIndex;
              return (
                <TouchableOpacity
                  key={slide.id}
                  onPress={() => goToSlide(idx)}
                  style={[
                    styles.dot,
                    isActive && [styles.dotActive, { backgroundColor: current.color }],
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Ir a la función ${slide.title}`}
                />
              );
            })}
          </View>

          <View style={styles.navButtonsRow}>
            <TouchableOpacity
              onPress={prevSlide}
              style={styles.navButton}
              accessibilityRole="button"
              accessibilityLabel="Función anterior"
              activeOpacity={0.7}
            >
              <ChevronLeft size={18} color={theme.color('#475569', 'text')} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={nextSlide}
              style={[styles.navButton, styles.navButtonNext, { backgroundColor: current.bgColor }]}
              accessibilityRole="button"
              accessibilityLabel="Siguiente función"
              activeOpacity={0.7}
            >
              <ChevronRight size={18} color={current.color} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const getCarouselTheme = createThemeStyles((theme) => {
  const styles = StyleSheet.create({
    container: {
      width: '100%',
      maxWidth: 420,
      marginTop: 4,
    },
    card: {
      backgroundColor: theme.color('#FFFFFF', 'card'),
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.color('#E2E8F0', 'border'),
      padding: 24,
      ...Platform.select({
        web: {
          boxShadow: '0 10px 30px -10px rgba(12, 138, 166, 0.08)',
        },
        default: {
          elevation: 2,
        },
      }),
    },
    animatedContent: {
      minHeight: 220,
      justifyContent: 'space-between',
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    iconBox: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    categoryWrap: {
      flex: 1,
    },
    categoryBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    categoryText: {
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    counterBadge: {
      backgroundColor: theme.color('#F1F5F9', 'secondary'),
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
    },
    counterText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.color('#64748B', 'muted'),
      letterSpacing: 0.5,
    },
    title: {
      fontSize: 19,
      fontWeight: '700',
      color: theme.color('#0F172A', 'text'),
      letterSpacing: -0.3,
      marginBottom: 8,
      lineHeight: 25,
    },
    description: {
      fontSize: 13,
      lineHeight: 20,
      color: theme.color('#475569', 'muted'),
      marginBottom: 16,
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 14,
    },
    chip: {
      backgroundColor: theme.color('#F8FAFC', 'secondary'),
      borderWidth: 1,
      borderColor: theme.color('#E2E8F0', 'border'),
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    chipText: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.color('#334155', 'text'),
    },
    highlightBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.color('#F1F5F9', 'border'),
    },
    highlightText: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    footerControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 18,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: theme.color('#F1F5F9', 'border'),
    },
    dotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.color('#CBD5E1', 'border'),
      transitionDuration: '0.2s',
    },
    dotActive: {
      width: 22,
      height: 7,
      borderRadius: 4,
    },
    navButtonsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    navButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.color('#F1F5F9', 'secondary'),
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        web: {
          cursor: 'pointer',
        },
      }),
    },
    navButtonNext: {
      // Background and color are customized per slide
    },
  });
  return { theme, styles };
});
