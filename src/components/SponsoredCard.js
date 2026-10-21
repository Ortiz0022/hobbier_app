import { useThemeValues } from '../context/ThemeContext';
import { createThemeStyles } from '../theme/themeRuntime';
import React from 'react';
import { StyleSheet, View, TouchableOpacity, Image } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Text } from './scaledText';
import { useLanguage } from '../context/LanguageContext';
import { spacing, fonts } from "../theme";

/**
 * Tarjeta de anuncio patrocinado.
 *
 * Con formato de publicación (cabecera, imagen grande, texto), pero con
 * "Patrocinado" bien visible bajo el anunciante para que nunca se confunda con
 * lo que publican los amigos. La misma tarjeta se usa en el feed y como vista previa
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

  const inicial = (ad.advertiser_name || '?').trim()[0]?.toUpperCase() || '?';

  return (
    <View style={styles.card}>
      {/* Cabecera estilo publicación: anunciante + "Patrocinado" */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{inicial}</Text>
        </View>
        <View style={styles.headerTexts}>
          <Text style={styles.advertiser} numberOfLines={1}>
            {ad.advertiser_name}
          </Text>
          <Text style={styles.sponsored} numberOfLines={1}>
            {t('ads.sponsored')}
            {ad.matched ? ` · ${t('ads.because_likes')}` : ''}
            {ad.nearby ? ` · ${t('ads.nearby')}` : ''}
          </Text>
        </View>
        {!!onInfo && (
          <TouchableOpacity
            onPress={onInfo}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('ads.why_title')}
          >
            <Feather name="info" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        onPress={tieneEnlace ? onPress : undefined}
        disabled={!tieneEnlace}
        activeOpacity={0.9}
        accessibilityRole={tieneEnlace ? 'link' : undefined}
      >
        {!!ad.image_url && <Image source={{ uri: ad.image_url }} style={styles.image} resizeMode="cover" />}

        {tieneEnlace && (
          <View style={styles.cta}>
            <Text style={styles.ctaText}>{ad.cta_label || t('ads.default_cta')}</Text>
            <Feather name="chevron-right" size={18} color={colors.primary} />
          </View>
        )}

        <View style={styles.texts}>
          <Text style={styles.title} numberOfLines={2}>
            {ad.title}
          </Text>
          {!!ad.body && (
            <Text style={styles.description} numberOfLines={4}>
              {ad.body}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getSponsoredCardTheme = createThemeStyles((theme) => {
const { colors } = theme;
const styles = StyleSheet.create({
  // Mismo contenedor que una publicación del feed (postCard en FeedScreen).
  card: {
    backgroundColor: theme.color('#ffffff', 'background'),
    marginBottom: 20,
    width: '100%',
    paddingBottom: spacing.md,
    borderBottomWidth: theme.isDark ? 0 : 1,
    borderBottomColor: theme.color('#F0F3F5', 'background'),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  headerTexts: {
    flex: 1,
  },
  advertiser: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  sponsored: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 1,
  },
  image: {
    width: '100%',
    // Misma altura que la imagen de una publicación (postImage).
    height: 460,
    backgroundColor: colors.surfaceMuted,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  texts: {
    paddingHorizontal: 16,
    paddingTop: spacing.md,
  },
  title: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  description: {
    fontSize: 14,
    color: colors.textFaint,
    lineHeight: 20,
    marginTop: 4,
  },
});
  return { theme, colors, styles };
});
