import { useThemeValues } from '../context/ThemeContext';
import { createThemeStyles } from '../theme/themeRuntime';
import React from 'react';
import { StyleSheet, View, TouchableOpacity, Image } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Text } from './scaledText';
import { useLanguage } from '../context/LanguageContext';
import { radii, spacing, fonts } from "../theme";

/**
 * Tarjeta de anuncio patrocinado.
 *
 * Discreta a propósito: más baja que una publicación, sin borde de color y con
 * "Patrocinado" bien visible arriba, para que nunca se confunda con lo que
 * publican los amigos. La misma tarjeta se usa en el feed y como vista previa
 * en el formulario del panel, así el admin ve exactamente lo que verá la gente.
 *
 * `matched`: el anuncio coincide con un gusto del usuario; se explica en una
 * línea ("Por tus gustos") para que el usuario sepa por qué lo ve.
 */
export const SponsoredCard = ({ ad, onPress, onInfo }) => {
  const { theme, colors, styles } = useThemeValues(getSponsoredCardTheme);

  const { t } = useLanguage();
  if (!ad) return null;

  const tieneEnlace = !!ad.link_url;

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.sponsored}>
            {t('ads.sponsored')}
            {ad.matched ? ` · ${t('ads.because_likes')}` : ''}
          </Text>
          {!!onInfo && (
            <TouchableOpacity
              onPress={onInfo}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('ads.why_title')}
            >
              <Feather name="info" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.body}
          onPress={tieneEnlace ? onPress : undefined}
          disabled={!tieneEnlace}
          activeOpacity={0.85}
          accessibilityRole={tieneEnlace ? 'link' : undefined}
        >
          {!!ad.image_url && <Image source={{ uri: ad.image_url }} style={styles.image} resizeMode="cover" />}

          <View style={styles.texts}>
            <Text style={styles.advertiser} numberOfLines={1}>
              {ad.advertiser_name}
            </Text>
            <Text style={styles.title} numberOfLines={2}>
              {ad.title}
            </Text>
            {!!ad.body && (
              <Text style={styles.description} numberOfLines={3}>
                {ad.body}
              </Text>
            )}
            {tieneEnlace && (
              <View style={styles.cta}>
                <Text style={styles.ctaText}>{ad.cta_label || t('ads.default_cta')}</Text>
                <Feather name="external-link" size={12} color={colors.primary} />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getSponsoredCardTheme = createThemeStyles((theme) => {
const { colors } = theme;
const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: theme.color(colors.surfaceMuted, 'border'),
    borderRadius: radii.input,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sponsored: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  body: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  image: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
  texts: {
    flex: 1,
  },
  advertiser: {
    fontSize: 12,
    color: colors.textFaint,
    fontWeight: '600',
  },
  title: {
    fontSize: 15,
    fontFamily: fonts.heading,
    color: colors.text,
    marginTop: 1,
  },
  description: {
    fontSize: 13,
    color: colors.textFaint,
    lineHeight: 18,
    marginTop: 2,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.round,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});
  return { theme, colors, styles };
});
