import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, StatusBar, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes } from '../theme/palettes';

export const THEME_STORAGE_KEY = '@hobbier/theme';
// Lo que dura el fundido al cambiar de tema. Corto a propósito: es una
// respuesta a algo que la persona acaba de tocar, no una animación de lucirse.
export const DURACION_FUNDIDO = 320;
const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState('light');
  const [ready, setReady] = useState(false);
  const saveQueue = useRef(Promise.resolve());

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (mounted && (saved === 'light' || saved === 'dark')) setMode(saved);
      })
      .catch(() => { /* Storage unavailable: keep the original light theme. */ })
      .finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    // Serialize saves so rapid toggles cannot leave an older preference stored.
    saveQueue.current = saveQueue.current
      .then(() => AsyncStorage.setItem(THEME_STORAGE_KEY, mode))
      .catch(() => { /* Theme still works when device storage is unavailable. */ });
  }, [mode, ready]);

  const toggleTheme = useCallback(() => setMode((previous) => previous === 'dark' ? 'light' : 'dark'), []);

  // Cambiar de tema repinta la app entera de golpe, y de claro a oscuro ese
  // salto seco se ve como un fogonazo. Un velo del color del fondo tapa la
  // pantalla, pasa del color viejo al nuevo y se retira: el cambio se ve como
  // un fundido en vez de un parpadeo.
  const [velo, setVelo] = useState(null);
  const avanceDelVelo = useRef(new Animated.Value(0)).current;
  const fondoAnterior = useRef(null);

  useEffect(() => {
    if (!ready) return undefined;
    const fondo = themes[mode].colors.background;
    const anterior = fondoAnterior.current;
    fondoAnterior.current = fondo;
    // El primer pintado no se anima: no hay tema anterior del que venir, así
    // que el tema guardado aparece ya puesto al abrir la app.
    if (anterior === null || anterior === fondo) return undefined;

    setVelo({ desde: anterior, hasta: fondo });
    avanceDelVelo.setValue(0);
    const fundido = Animated.timing(avanceDelVelo, {
      toValue: 1,
      duration: DURACION_FUNDIDO,
      easing: Easing.out(Easing.quad),
      // El hilo nativo no sabe animar backgroundColor, así que esta va en JS.
      // Es una sola vista y dura un suspiro.
      useNativeDriver: false,
    });
    fundido.start(({ finished }) => { if (finished) setVelo(null); });
    // Si se vuelve a cambiar a mitad, el fundido de antes se corta y arranca el
    // del tema nuevo; nunca quedan dos velos peleándose.
    return () => fundido.stop();
  }, [mode, ready, avanceDelVelo]);
  const theme = themes[mode];
  const themeValues = useMemo(() => ({
    light: { ...themes.light, toggleTheme },
    dark: { ...themes.dark, toggleTheme },
  }), [toggleTheme]);
  const value = themeValues[mode];

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined' || !ready) return;
    const root = document.documentElement;
    const previousScheme = root.style.colorScheme;
    const previousBackground = document.body.style.backgroundColor;
    root.style.colorScheme = mode;
    document.body.style.backgroundColor = theme.colors.background;
    return () => {
      root.style.colorScheme = previousScheme;
      document.body.style.backgroundColor = previousBackground;
    };
  }, [mode, ready, theme]);

  // Wait for the saved preference before mounting screens to prevent a light flash.
  if (!ready) return null;
  return (
    <ThemeContext.Provider value={value}>
      <StatusBar animated barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      {children}
      {velo && (
        <Animated.View
          testID="fundido-de-tema"
          // Solo tapa a la vista: nadie pierde un toque por culpa del fundido.
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: avanceDelVelo.interpolate({
                inputRange: [0, 1],
                outputRange: [velo.desde, velo.hasta],
              }),
              // Opaco mientras cambia de color, y a partir de ahí se va
              // dejando ver la app ya con el tema nuevo.
              opacity: avanceDelVelo.interpolate({
                inputRange: [0, 0.35, 1],
                outputRange: [1, 1, 0],
              }),
            },
          ]}
        />
      )}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return theme;
};
export const useThemeValues = (factory) => factory(useTheme());
