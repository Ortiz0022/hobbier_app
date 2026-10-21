import { useThemeValues } from '../../../context/ThemeContext';
import { createThemeStyles } from '../../../theme/themeRuntime';
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Modal, Pressable, TouchableOpacity, Switch, Platform } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Text, TextInput } from '../../../components/scaledText';
import { useAuth } from '../../../context/AuthContext';
import { useNotify } from '../../../context/NotificationContext';
import { useLanguage } from '../../../context/LanguageContext';
import { updateAdPreferences } from '../../../services/adsService';
import { radii, spacing, fonts } from "../../../theme";

/**
 * Preferencias de anuncios del usuario.
 *
 * - Anuncios personalizados: si se apagan, get_my_ads deja de usar sus gustos
 *   y solo le muestra anuncios dirigidos a todo el mundo.
 * - Ciudad: opcional y escrita a mano. Es la única "ubicación" que usamos, a
 *   propósito: no hace falta pedir el GPS para saber qué carreras le quedan cerca.
 */
export const AdPreferencesModal = ({ visible, onClose }) => {
  const { theme, colors, input, styles } = useThemeValues(getAdPreferencesModalTheme);

  const { profile, refreshProfile } = useAuth();
  const { notify } = useNotify();
  const { t } = useLanguage();
  const [personalizados, setPersonalizados] = useState(true);
  const [ciudad, setCiudad] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setPersonalizados(profile?.ads_personalized ?? true);
    setCiudad(profile?.ads_city || '');
  }, [visible, profile?.ads_personalized, profile?.ads_city]);

  const guardar = async () => {
    if (!profile?.id) return;
    setGuardando(true);
    const { error } = await updateAdPreferences(profile.id, { personalized: personalizados, city: ciudad });
    setGuardando(false);
    if (error) {
      notify(t('ads.prefs_error'), { type: 'error', title: t('common.error') });
      return;
    }
    await refreshProfile();
    notify(t('ads.prefs_saved'), { type: 'success' });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <Feather name="speaker" size={20} color={colors.primary} />
            <Text style={styles.title}>{t('ads.prefs_title')}</Text>
          </View>
          <Text style={styles.intro}>{t('ads.prefs_intro')}</Text>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t('ads.prefs_personalized')}</Text>
              <Text style={styles.help}>
                {personalizados ? t('ads.prefs_personalized_on') : t('ads.prefs_personalized_off')}
              </Text>
            </View>
            <Switch
              value={personalizados}
              onValueChange={setPersonalizados}
              trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
              thumbColor={colors.surface}
              accessibilityLabel={t('ads.prefs_personalized')}
            />
          </View>

          <Text style={[styles.label, { marginTop: spacing.lg }]}>{t('ads.prefs_city')}</Text>
          <Text style={styles.help}>{t('ads.prefs_city_help')}</Text>
          <View style={styles.input}>
            <TextInput {...theme.textInputProps}
              style={styles.inputText}
              value={ciudad}
              onChangeText={setCiudad}
              placeholder={t('ads.prefs_city_placeholder')}
              placeholderTextColor={colors.textMuted}
              maxLength={60}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btnSave, guardando && { opacity: 0.6 }]}
              onPress={guardar}
              disabled={guardando}
              activeOpacity={0.85}
            >
              <Text style={styles.btnSaveText}>{guardando ? t('ads.prefs_saving') : t('ads.prefs_save')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnCancel} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.btnCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getAdPreferencesModalTheme = createThemeStyles((theme) => {
const { colors, input } = theme;
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
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  intro: {
    fontSize: 13,
    color: colors.textFaint,
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  help: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  input: {
    ...input,
  },
  inputText: {
    flex: 1,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    fontSize: 14,
    color: colors.text,
    ...Platform.select({ web: { outlineStyle: 'none' }, default: {} }),
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radii.input,
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textFaint,
  },
  btnSave: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: radii.input,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  btnSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.color(colors.onPrimary, 'onAccent'),
  },
});
  return { theme, colors, input, styles };
});
