import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { TOKENS } from '../theme/designTokens';

interface StepProgressBarProps {
  /** Paso actual, empezando en 1. */
  currentStep: number;
  totalSteps: number;
}

/**
 * Barra de progreso del asistente de preferencias.
 *
 * El relleno se anima al cambiar de paso en vez de saltar: el movimiento es lo
 * que comunica "avanzaste", y de paso empata con la transición de la pantalla.
 */
export const StepProgressBar: React.FC<StepProgressBarProps> = ({ currentStep, totalSteps }) => {
  const destino = totalSteps > 0 ? currentStep / totalSteps : 0;
  const progreso = useRef(new Animated.Value(destino)).current;

  useEffect(() => {
    Animated.timing(progreso, {
      toValue: destino,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      // `width` es una propiedad de layout: el driver nativo no puede animarla
      // en NINGUNA plataforma, no es una limitación solo de web.
      useNativeDriver: false,
    }).start();
  }, [destino, progreso]);

  return (
    <View
      style={styles.track}
      // Un lector de pantalla anuncia "paso 2 de 4" en lugar de describir una
      // caja de color sin nombre.
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: totalSteps, now: currentStep }}
      accessibilityLabel={`Paso ${currentStep} de ${totalSteps}`}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            width: progreso.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: TOKENS.radius.full,
    backgroundColor: TOKENS.colors.segmentTrack,
    // Recorta el relleno a las esquinas redondeadas de la barra; sin esto se
    // le sale por los extremos.
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: TOKENS.radius.full,
    // Cian y no naranja a propósito: el naranja queda reservado para el botón
    // de avanzar. Si la barra también fuera naranja, el único elemento que hay
    // que tocar dejaría de ser el que más resalta en la pantalla.
    backgroundColor: TOKENS.colors.active,
  },
});
