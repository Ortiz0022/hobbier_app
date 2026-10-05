import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { Text } from '../components/scaledText';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme';
import { LegalDocumentModal } from './LegalDocumentModal';

const STORAGE_KEY = 'hobbier_cookie_consent';

/**
 * Elección guardada: 'accepted' | 'rejected' | null (aún no ha elegido).
 * Si algún día se añade analítica u otra cookie NO esencial, debe cargarse solo
 * cuando esto devuelva 'accepted'.
 */
export const getCookieConsent = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch (_) {
    return null;
  }
};

/**
 * Banner de consentimiento de cookies (GDPR), solo en la versión web: en las
 * apps nativas no hay cookies de navegador.
 *
 * Hoy Hobbier solo guarda lo estrictamente necesario (sesión e idioma), así que
 * "Rechazar" no desactiva nada: ese almacenamiento es imprescindible para
 * funcionar y el GDPR no exige consentimiento para él. El banner existe para
 * informar con transparencia y dejar registrada la elección.
 */
export const CookieBanner = () => {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && !getCookieConsent()) setVisible(true);
  }, []);

  const choose = (value) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (_) {
      // Navegación privada o almacenamiento bloqueado: se oculta igual.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <View style={styles.wrapper} pointerEvents="box-none">
        <View style={styles.banner} accessibilityRole="alert">
          <Text style={styles.text}>
            {t('legal.cookie_text')}{' '}
            <Text style={styles.link} onPress={() => setShowPolicy(true)}>
              {t('legal.cookie_read_more')}
            </Text>
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => choose('rejected')}>
              <Text style={styles.btnSecondaryText}>{t('legal.cookie_reject')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => choose('accepted')}>
              <Text style={styles.btnPrimaryText}>{t('legal.cookie_accept')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <LegalDocumentModal doc={showPolicy ? 'privacy' : null} onClose={() => setShowPolicy(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    alignItems: 'center',
    zIndex: 1000,
  },
  banner: {
    width: '100%',
    maxWidth: 640,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    padding: 16,
    gap: 12,
    boxShadow: '0px 6px 24px rgba(5, 62, 74, 0.15)',
  },
  text: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnPrimaryText: {
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  btnSecondary: {
    backgroundColor: colors.surfaceMuted,
  },
  btnSecondaryText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
});
