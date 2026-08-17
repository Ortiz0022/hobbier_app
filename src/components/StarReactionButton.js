import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Path de la estrella/chispita idéntica a la de Sorpréndeme (HeroBanner)
const SPARKLE_PATH = 'M10,0 Q10,10 20,10 Q10,10 10,20 Q10,10 0,10 Q10,10 10,0 Z';

const StarSvg = ({ size = 26, color = '#FF8F21' }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20">
    <Path d={SPARKLE_PATH} fill={color} />
  </Svg>
);

// Componente individual para cada estrella animada flotante
const FloatingStarParticle = ({ particle, onComplete }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: particle.duration,
      delay: particle.delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
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
      pointerEvents="none"
      style={[
        styles.particle,
        {
          left: particle.startX,
          bottom: particle.startY,
          transform: [{ translateX }, { translateY }, { scale }, { rotate }],
          opacity,
        },
      ]}
    >
      <StarSvg size={particle.size} color={particle.color} />
    </Animated.View>
  );
};

const PARTICLE_COLORS = [
  '#FF8F21', // Naranja Sorpréndeme
  '#FFAA55', // Naranja Claro
  '#FFD166', // Dorado brillante
  '#00DBFF', // Azul Cyan Hobbier
  '#FF6B6B', // Coral festivo
];

export const StarReactionButton = ({ initialCount = 0, initialReacted = false, onToggle }) => {
  const [reacted, setReacted] = useState(initialReacted);
  const [count, setCount] = useState(initialCount);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    setReacted(initialReacted);
    setCount(initialCount);
  }, [initialCount, initialReacted]);

  // Animación de rebote en el botón al reaccionar
  const buttonScale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    const newReacted = !reacted;
    setReacted(newReacted);
    setCount((prev) => (newReacted ? prev + 1 : Math.max(0, prev - 1)));

    if (onToggle) {
      onToggle(newReacted);
    }

    // Animación física de rebote elástico en el botón
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.72,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 3.5,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();

    // Generar ráfaga de estrellas flotantes mágicas
    if (newReacted) {
      spawnStarBurst();
    }
  };

  const spawnStarBurst = () => {
    const newParticles = [];
    const particleCount = 18; // Cantidad de estrellas en la animación

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: Date.now() + '-' + i + '-' + Math.random(),
        startX: 16 + (Math.random() - 0.5) * 20,
        startY: 20,
        xOffset: (Math.random() - 0.5) * 120, // Variación horizontal suave
        yEnd: -240 - Math.random() * 140,     // Trayectoria ascendente mucho más alta
        size: 14 + Math.random() * 16,       // Escala de tamaños
        maxScale: 0.9 + Math.random() * 0.6,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        rotation: (Math.random() - 0.5) * 140,
        duration: 1100 + Math.random() * 600,
        delay: i * 25 + Math.random() * 40,
      });
    }

    setParticles((prev) => [...prev, ...newParticles]);
  };

  const removeParticle = (id) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <View style={styles.container}>
      {/* Renderizado de partículas flotantes */}
      {particles.map((p) => (
        <FloatingStarParticle key={p.id} particle={p} onComplete={removeParticle} />
      ))}

      {/* Botón Interactivo (sin fondo ni borde) */}
      <TouchableOpacity onPress={handlePress} activeOpacity={0.75} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Animated.View
          style={[
            styles.buttonRow,
            { transform: [{ scale: buttonScale }] },
          ]}
        >
          <StarSvg size={26} color={reacted ? '#FF8F21' : '#94A3B8'} />
          <Text style={[styles.countText, reacted && styles.countTextReacted]}>
            {count}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 99,
  },
  particle: {
    position: 'absolute',
    zIndex: 999,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingVertical: 2,
    gap: 7,
  },
  countText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#94A3B8',
  },
  countTextReacted: {
    color: '#FF8F21',
    fontWeight: '700',
  },
});

