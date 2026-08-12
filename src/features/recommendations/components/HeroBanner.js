import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, Animated, View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

const Sparkle = ({ size = 20, color = '#4B6959', style, delay = 0 }) => {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration: 1200 + Math.random() * 500,
          delay: delay,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 1200 + Math.random() * 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animValue, delay]);

  const scale = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 1.1, 0.6],
  });

  const opacity = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.9, 0.3],
  });

  return (
    <Animated.View style={[style, { transform: [{ scale }], opacity }]}>
      <Svg width={size} height={size} viewBox="0 0 20 20">
        <Path d="M10,0 Q10,10 20,10 Q10,10 10,20 Q10,10 0,10 Q10,10 10,0 Z" fill={color} />
      </Svg>
    </Animated.View>
  );
};

export const HeroBanner = ({ onPress }) => {
  const blobScaleX = useRef(new Animated.Value(1)).current;
  const blobScaleY = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animación de respiración horizontal
    Animated.loop(
      Animated.sequence([
        Animated.timing(blobScaleX, {
          toValue: 1.04,
          duration: 3500,
          useNativeDriver: true,
        }),
        Animated.timing(blobScaleX, {
          toValue: 1,
          duration: 3500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animación de respiración vertical (desfasada para simular cambio de forma orgánico)
    Animated.loop(
      Animated.sequence([
        Animated.timing(blobScaleY, {
          toValue: 1.03,
          duration: 4200,
          useNativeDriver: true,
        }),
        Animated.timing(blobScaleY, {
          toValue: 1,
          duration: 4200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [blobScaleX, blobScaleY]);

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>

        {/* FONDO BLOB ANIMADO - Volando sin recuadro blanco */}
        <Animated.View style={[styles.blobWrapper, { transform: [{ scaleX: blobScaleX }, { scaleY: blobScaleY }] }]}>
          <Svg width="200%" height="220%" viewBox="0 0 200 200" style={styles.svgBlob}>
            <Defs>
              <LinearGradient id="blobGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#FBF7E7" />
                <Stop offset="0.4" stopColor="#E0F0DE" />
                <Stop offset="1" stopColor="#ADD2BE" />
              </LinearGradient>
            </Defs>
            {/* Blob orgánico horizontal (menos alto de arriba y más extendido a los lados) */}
            <Path
              d="M180,105C172,135,138,152,98,150C58,148,20,132,16,100C12,68,45,46,95,45C145,44,188,75,180,105Z"
              fill="url(#blobGrad)"
            />
          </Svg>
        </Animated.View>

        {/* LÍNEA ROSA DECORATIVA (SQUIGGLE) ABAJO A LA DERECHA */}
        <View style={styles.squiggleWrapper}>
          <Svg width={40} height={20} viewBox="0 0 40 20">
            <Path d="M0,10 Q10,0 20,10 T40,10" fill="none" stroke="#F1C2B8" strokeWidth="2.5" strokeLinecap="round" />
          </Svg>
        </View>

        {/* ESTRELLAS ANIMADAS */}
        <Sparkle size={18} style={{ position: 'absolute', top: 15, left: 35 }} delay={0} />
        <Sparkle size={12} style={{ position: 'absolute', top: 55, left: 15 }} delay={500} />
        <Sparkle size={14} style={{ position: 'absolute', bottom: 20, right: 35 }} delay={800} color="#355342" />
        <Sparkle size={10} style={{ position: 'absolute', bottom: 10, right: 60 }} delay={300} />
        <Sparkle size={18} style={{ position: 'absolute', top: '65%', left: '48%' }} delay={1200} color="#355342" />
        <Sparkle size={10} style={{ position: 'absolute', top: '73%', left: '55%' }} delay={200} />

        {/* ÁREA CLIQUEABLE RESTRINGIDA AL CONTENEDOR CENTRAL */}
        <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', zIndex: 10 }]}>
          <View style={styles.textContent}>
            <Text style={styles.heroTitle}>Sorpréndeme</Text>
            <Text style={styles.heroSubtitle}>Descubre un nuevo hobby hoy</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 30,
    marginTop: 5,
  },
  cardContainer: {
    height: 145,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  blobWrapper: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  svgBlob: {
    position: 'absolute',
  },
  squiggleWrapper: {
    position: 'absolute',
    bottom: -5,
    right: 15,
  },
  textContent: {
    alignItems: 'center',
    zIndex: 10,
    // Ajuste sutil para centrar ópticamente el texto con el peso visual del blob
    marginTop: 5,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#355342',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#4B6959',
    fontWeight: '500',
  },
});
