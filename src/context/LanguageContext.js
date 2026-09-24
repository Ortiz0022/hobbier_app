import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import es from '../i18n/locales/es.json';
import en from '../i18n/locales/en.json';

const STORAGE_KEY = '@hobbier_app_language';

const translations = {
  es,
  en,
};

export const SUPPORTED_LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
];

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('es');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadStoredLanguage = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && (stored === 'es' || stored === 'en')) {
          setLanguageState(stored);
        }
      } catch (e) {
        console.warn('Error loading language from storage:', e);
      } finally {
        setIsReady(true);
      }
    };
    loadStoredLanguage();
  }, []);

  const setLanguage = useCallback(async (newLang) => {
    if (newLang !== 'es' && newLang !== 'en') return;
    setLanguageState(newLang);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newLang);
    } catch (e) {
      console.warn('Error saving language to storage:', e);
    }
  }, []);

  const t = useCallback(
    (keyPath, params = {}) => {
      if (!keyPath) return '';
      const keys = keyPath.split('.');

      // Helper to traverse an object by key path
      const resolve = (obj) => {
        if (!obj) return null;
        let curr = obj;
        for (const k of keys) {
          if (curr && typeof curr === 'object' && k in curr) {
            curr = curr[k];
          } else {
            return null;
          }
        }
        return typeof curr === 'string' ? curr : null;
      };

      // 1. Try current language
      let text = resolve(translations[language]);

      // 2. Fallback to Spanish if missing in current language
      if (text === null && language !== 'es') {
        text = resolve(translations.es);
      }

      // 3. Fallback to the key itself
      if (text === null) {
        text = keyPath;
      }

      // 4. Interpolate variables like {name}
      if (params && typeof params === 'object') {
        Object.keys(params).forEach((paramKey) => {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(params[paramKey]));
        });
      }

      return text;
    },
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
        isReady,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
