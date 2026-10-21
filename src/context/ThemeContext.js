import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes } from '../theme/palettes';

export const THEME_STORAGE_KEY = '@hobbier/theme';
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
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return theme;
};
export const useThemeValues = (factory) => factory(useTheme());
