import { useThemeValues } from '../../../context/ThemeContext';
import { createThemeStyles } from '../../../theme/themeRuntime';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useLanguage } from '../../../context/LanguageContext';

/**
 * Entrada discreta, al final de Descubre, para que un negocio o una persona
 * pida anunciar su evento o servicio. Solo abre el formulario: lo que se envía
 * queda pendiente hasta que el admin lo aprueba. En qué quedó cada solicitud
 * se ve en Perfil → Mis solicitudes de anuncio.
 */
export const AdRequestCard = ({ onPress }) => {
  const { colors, styles } = useThemeValues(getAdRequestCardTheme);
  const { t } = useLanguage();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={t('ad_request.card_title')}
    >
      <View style={styles.icon}>
        <Feather name="volume-2" size={19} color={colors.primary} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{t('ad_request.card_title')}</Text>
        <Text style={styles.meta}>{t('ad_request.card_subtitle')}</Text>
      </View>
      <Feather name="arrow-right" size={17} color={colors.primary} />
    </TouchableOpacity>
  );
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getAdRequestCardTheme = createThemeStyles((theme) => {
const { colors } = theme;
const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: 22,
    borderWidth: 1, borderColor: theme.color(colors.surfaceMuted, 'border'),
    padding: 14, marginTop: 14,
  },
  icon: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: theme.color(colors.primarySoft, 'selected'),
    alignItems: 'center', justifyContent: 'center',
  },
  copy: { flex: 1 },
  title: { color: colors.text, fontSize: 14, lineHeight: 19, fontWeight: '600' },
  meta: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 2 },
});
  return { theme, colors, styles };
});
