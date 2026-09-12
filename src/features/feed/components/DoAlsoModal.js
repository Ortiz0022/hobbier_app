import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '../../../theme';

const getActivityIcon = (title = '') => {
  const normalizedTitle = title.toLowerCase();
  if (normalizedTitle.includes('café') || normalizedTitle.includes('cafe')) return 'coffee';
  if (normalizedTitle.includes('deporte') || normalizedTitle.includes('ejercicio') || normalizedTitle.includes('corr')) return 'activity';
  if (normalizedTitle.includes('foto') || normalizedTitle.includes('camar')) return 'camera';
  if (normalizedTitle.includes('escri') || normalizedTitle.includes('le') || normalizedTitle.includes('libr')) return 'book-open';
  if (normalizedTitle.includes('pint') || normalizedTitle.includes('dibuj') || normalizedTitle.includes('arte')) return 'edit-3';
  if (normalizedTitle.includes('cocin') || normalizedTitle.includes('recet') || normalizedTitle.includes('salsa') || normalizedTitle.includes('comida')) return 'smile';
  return 'compass';
};

export const DoAlsoModal = ({
  visible,
  post,
  accepting = false,
  onAccept,
  onClose,
}) => {
  if (!post) return null;

  const activityTitle = post.activityTitle || post.activity?.title || 'Actividad';
  const activityDescription =
    post.activityDescription ||
    post.activity?.description ||
    'Completa esta actividad y comparte tu momento en la comunidad.';
  const authorName = post.author?.username
    ? `@${post.author.username}`
    : (post.author?.full_name || 'un amigo');
  const points = post.pointsAwarded || post.activity?.points_awarded || 20;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Manija superior (Grabber) */}
          <View style={styles.grabber} />

          {/* Botón de cierre superior derecho */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Cerrar misión"
          >
            <Feather name="x" size={19} color={colors.textFaint} />
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.recommendationContent}
          >
            {/* Fila superior: Badges */}
            <View style={styles.topRow}>
              <View style={styles.foundBadge}>
                <Feather name="zap" size={11} color={colors.primary} />
                <Text style={styles.foundText}>MISIÓN DE AMIGO</Text>
              </View>
              <View style={styles.pointsBadge}>
                <Feather name="star" size={12} color={colors.accentDark} />
                <Text style={styles.pointsText}>+{points} pts</Text>
              </View>
            </View>

            {/* Círculos concéntricos e icono temático */}
            <View style={styles.visualArea}>
              <View style={styles.visualRing} />
              <View style={styles.visualCircle}>
                <Feather
                  name={getActivityIcon(activityTitle)}
                  size={44}
                  color={colors.onPrimary}
                />
              </View>
              <Feather name="star" size={18} color={colors.accent} style={styles.visualStar} />
            </View>

            {/* Título y descripción */}
            <Text style={styles.activityTitle}>{activityTitle}</Text>
            <Text style={styles.activityDescription}>{activityDescription}</Text>

            {/* Tarjeta de inspiración */}
            <View style={styles.reasonBox}>
              <Feather name="heart" size={14} color={colors.primary} />
              <Text style={styles.reasonText}>Inspirado por el logro de {authorName}</Text>
            </View>

            {/* Frase motivacional */}
            <Text style={styles.encouragement}>
              No tiene que salir perfecto. Solo tienes que jugar a tu manera.
            </Text>

            {/* Botón principal: Añadir a mis misiones */}
            <TouchableOpacity
              style={[styles.acceptButton, accepting && styles.disabledButton]}
              onPress={onAccept}
              disabled={accepting}
              accessibilityRole="button"
            >
              {accepting ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <>
                  <Text style={styles.acceptButtonText}>Añadir a mis misiones</Text>
                  <Feather name="arrow-right" size={17} color={colors.onPrimary} />
                </>
              )}
            </TouchableOpacity>

            {/* Enlace secundario: Seguir en el feed */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={accepting}
              accessibilityRole="button"
            >
              <Text style={styles.cancelButtonText}>Seguir en el feed</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 31, 37, 0.58)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '92%',
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 24,
  },
  grabber: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D9DEDC',
    alignSelf: 'center',
    marginBottom: 8,
  },
  closeButton: {
    position: 'absolute',
    zIndex: 4,
    top: 17,
    right: 18,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendationContent: {
    paddingTop: 24,
    paddingBottom: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 40,
  },
  foundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  foundText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF5EA',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  pointsText: {
    color: colors.accentDark,
    fontSize: 11,
    fontWeight: '500',
  },
  visualArea: {
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  visualCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualRing: {
    position: 'absolute',
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 1,
    borderColor: colors.salmonSoft,
  },
  visualStar: {
    position: 'absolute',
    right: '27%',
    top: 25,
  },
  activityTitle: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '600',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  activityDescription: {
    color: colors.textFaint,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginTop: 15,
  },
  reasonText: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: 12,
    lineHeight: 18,
  },
  encouragement: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 15,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    minHeight: 52,
    backgroundColor: colors.accent,
    borderRadius: 18,
  },
  disabledButton: {
    opacity: 0.65,
  },
  acceptButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 44,
    marginTop: 7,
  },
  cancelButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '500',
  },
});
