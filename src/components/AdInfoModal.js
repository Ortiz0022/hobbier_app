import { useThemeValues } from '../context/ThemeContext';
import { createThemeStyles } from '../theme/themeRuntime';
import React from 'react';
import { StyleSheet, View, Modal, Pressable, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Text } from './scaledText';
import { useLanguage } from '../context/LanguageContext';
import { radii, spacing, fonts } from "../theme";

/**
 * "¿Por qué veo este anuncio?". Enumera TODAS las razones que aplican (gustos,
 * zona) en vez de una sola, y se queda abierto hasta que la persona lo cierra.
 */
export const AdInfoModal = ({ ad, onClose }) => {
  const { colors, styles } = useThemeValues(getAdInfoModalTheme);
  const { t } = useLanguage();

  const razones = [];
  if (ad?.matched) razones.push({ icon: 'heart', text: t('ads.why_reason_likes') });
  if (ad?.nearby) razones.push({ icon: 'map-pin', text: t('ads.why_reason_nearby') });

  return (
    <Modal visible={!!ad} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <Feather name="info" size={20} color={colors.primary} />
            <Text style={styles.title}>{t('ads.why_title')}</Text>
          </View>

          {razones.length > 0 ? (
            razones.map((r) => (
              <View key={r.icon} style={styles.row}>
                <View style={styles.rowIcon}>
                  <Feather name={r.icon} size={16} color={colors.primary} />
                </View>
                <Text style={styles.rowText}>{r.text}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.rowText}>{t('ads.why_generic')}</Text>
          )}

          <Text style={styles.privacy}>{t('ads.why_privacy')}</Text>

          <TouchableOpacity style={styles.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.btnText}>{t('ads.why_ok')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export const getAdInfoModalTheme = createThemeStyles((theme) => {
const { colors } = theme;
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  privacy: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  btn: {
    marginTop: spacing.xl,
    paddingVertical: 13,
    borderRadius: radii.input,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.color(colors.onPrimary, 'onAccent'),
  },
});
  return { theme, colors, styles };
});
