import { useThemeValues } from '../context/ThemeContext';
import { createThemeStyles } from '../theme/themeRuntime';
import React from 'react';
import { StyleSheet, View, Modal, Pressable, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Text } from './scaledText';
import { useLanguage } from '../context/LanguageContext';
import { radii, spacing, fonts } from "../theme";

/**
 * Explica para qué queremos la ubicación ANTES del aviso del navegador o del
 * sistema (que no se puede personalizar). Ese aviso solo sale si se toca
 * "Activar". Ver syncAdCity en adsService.
 */
export const LocationAskModal = ({ visible, onAccept, onLater }) => {
  const { colors, styles } = useThemeValues(getLocationAskModalTheme);
  const { t } = useLanguage();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onLater}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Feather name="map-pin" size={30} color={colors.primary} />
          </View>
          <Text style={styles.title}>{t('location_ask.title')}</Text>
          <Text style={styles.body}>{t('location_ask.body')}</Text>

          <View style={styles.privacy}>
            <Feather name="lock" size={14} color={colors.textMuted} />
            <Text style={styles.privacyText}>{t('location_ask.privacy')}</Text>
          </View>

          <TouchableOpacity style={styles.btnAccept} onPress={onAccept} activeOpacity={0.85}>
            <Text style={styles.btnAcceptText}>{t('location_ask.accept')}</Text>
          </TouchableOpacity>
          <Pressable style={styles.btnLater} onPress={onLater} hitSlop={8}>
            <Text style={styles.btnLaterText}>{t('location_ask.later')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export const getLocationAskModalTheme = createThemeStyles((theme) => {
const { colors } = theme;
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: colors.textFaint,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  privacy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.input,
    backgroundColor: colors.surfaceMuted,
    alignSelf: 'stretch',
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  btnAccept: {
    marginTop: spacing.xl,
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: radii.input,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  btnAcceptText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.color(colors.onPrimary, 'onAccent'),
  },
  btnLater: {
    marginTop: spacing.md,
    paddingVertical: 6,
  },
  btnLaterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
  return { theme, colors, styles };
});
