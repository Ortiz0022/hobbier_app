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
  if (normalizedTitle.includes('deporte') || normalizedTitle.includes('ejercicio')) return 'activity';
  if (normalizedTitle.includes('foto')) return 'camera';
  if (normalizedTitle.includes('escri')) return 'edit-3';
  return 'compass';
};

export const RecommendationModal = ({
  visible,
  loading,
  recommended,
  reason = null,
  accepting,
  onAccept,
  onReload,
  onClose,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    statusBarTranslucent
    onRequestClose={onClose}
  >
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Cerrar recomendación"
        >
          <Feather name="x" size={19} color={colors.textFaint} />
        </TouchableOpacity>

        {loading ? (
          <View style={styles.loadingBox}>
            <View style={styles.loadingVisual}>
              <View style={styles.loadingOrbit} />
              <Feather name="compass" size={38} color={colors.onPrimary} />
            </View>
            <ActivityIndicator color={colors.accent} style={styles.loadingIndicator} />
            <Text style={styles.loadingTitle}>Buscando una chispa para ti…</Text>
            <Text style={styles.loadingText}>Algo nuevo, posible y con ganas de convertirse en historia.</Text>
          </View>
        ) : recommended ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.recommendationContent}
          >
            <View style={styles.topRow}>
              <View style={styles.foundBadge}>
                <Feather name="zap" size={11} color={colors.primary} />
                <Text style={styles.foundText}>IDEA ENCONTRADA</Text>
              </View>
              <View style={styles.pointsBadge}>
                <Feather name="star" size={12} color={colors.accentDark} />
                <Text style={styles.pointsText}>+{recommended.points_awarded || 0} pts</Text>
              </View>
            </View>

            <View style={styles.visualArea}>
              <View style={styles.visualRing} />
              <View style={styles.visualCircle}>
                <Feather
                  name={getActivityIcon(recommended.title)}
                  size={44}
                  color={colors.onPrimary}
                />
              </View>
              <Feather name="star" size={18} color={colors.accent} style={styles.visualStar} />
            </View>

            <Text style={styles.activityTitle}>{recommended.title}</Text>
            <Text style={styles.activityDescription}>{recommended.description}</Text>

            {reason ? (
              <View style={styles.reasonBox}>
                <Feather name="heart" size={14} color={colors.primary} />
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            ) : null}

            <Text style={styles.encouragement}>
              No tiene que salir perfecto. Solo tiene que empezar.
            </Text>

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
                  <Text style={styles.acceptButtonText}>Quiero intentarlo</Text>
                  <Feather name="arrow-right" size={17} color={colors.onPrimary} />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reloadButton}
              onPress={onReload}
              disabled={accepting}
              accessibilityRole="button"
            >
              <Feather name="refresh-cw" size={14} color={colors.primary} />
              <Text style={styles.reloadButtonText}>Muéstrame otra idea</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Feather name="search" size={31} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Hoy no encontramos el match</Text>
            <Text style={styles.emptyText}>Ajusta tus gustos o recursos en tu perfil y volvemos a intentarlo.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={onClose}>
              <Text style={styles.emptyButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(5, 31, 37, 0.58)', justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%', maxWidth: 560, maxHeight: '92%', alignSelf: 'center',
    backgroundColor: colors.surface, borderTopLeftRadius: 34, borderTopRightRadius: 34,
    paddingHorizontal: 22, paddingTop: 12, paddingBottom: 24,
  },
  grabber: {
    width: 42, height: 4, borderRadius: 2, backgroundColor: '#D9DEDC',
    alignSelf: 'center', marginBottom: 8,
  },
  closeButton: {
    position: 'absolute', zIndex: 4, top: 17, right: 18,
    width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  loadingBox: {
    minHeight: 390, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center',
  },
  loadingVisual: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  loadingOrbit: {
    position: 'absolute', width: 76, height: 76, borderRadius: 38,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.65)',
  },
  loadingIndicator: { marginBottom: 14 },
  loadingTitle: {
    color: colors.text, fontSize: 20, lineHeight: 27, fontWeight: '500', textAlign: 'center',
  },
  loadingText: {
    maxWidth: 290, color: colors.textMuted, fontSize: 13, lineHeight: 19,
    textAlign: 'center', marginTop: 7,
  },
  recommendationContent: { paddingTop: 24, paddingBottom: 4 },
  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingRight: 40,
  },
  foundBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.primarySoft, borderRadius: 999,
    paddingHorizontal: 9, paddingVertical: 6,
  },
  foundText: {
    color: colors.primary, fontSize: 9, fontWeight: '600', letterSpacing: 0.8,
  },
  pointsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF5EA', borderRadius: 999,
    paddingHorizontal: 9, paddingVertical: 6,
  },
  pointsText: { color: colors.accentDark, fontSize: 11, fontWeight: '500' },
  visualArea: {
    height: 132, alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  visualCircle: {
    width: 92, height: 92, borderRadius: 46, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  visualRing: {
    position: 'absolute', width: 116, height: 116, borderRadius: 58,
    borderWidth: 1, borderColor: colors.salmonSoft,
  },
  visualStar: { position: 'absolute', right: '27%', top: 25 },
  activityTitle: {
    color: colors.text, fontSize: 24, lineHeight: 31, fontWeight: '600',
    letterSpacing: -0.5, textAlign: 'center',
  },
  activityDescription: {
    color: colors.textFaint, fontSize: 13, lineHeight: 20,
    textAlign: 'center', marginTop: 8,
  },
  reasonBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: colors.primarySoft, borderRadius: 16,
    paddingHorizontal: 13, paddingVertical: 11, marginTop: 15,
  },
  reasonText: { flex: 1, color: colors.primaryDark, fontSize: 12, lineHeight: 18 },
  encouragement: {
    color: colors.textMuted, fontSize: 11, fontStyle: 'italic',
    textAlign: 'center', marginTop: 15, marginBottom: 15,
  },
  acceptButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    minHeight: 52, backgroundColor: colors.accent, borderRadius: 18,
  },
  disabledButton: { opacity: 0.65 },
  acceptButtonText: { color: colors.onPrimary, fontSize: 15, fontWeight: '600' },
  reloadButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    minHeight: 44, marginTop: 7,
  },
  reloadButtonText: { color: colors.primary, fontSize: 13, fontWeight: '500' },
  emptyBox: {
    minHeight: 350, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center',
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  emptyTitle: {
    color: colors.text, fontSize: 20, lineHeight: 27, fontWeight: '500', textAlign: 'center',
  },
  emptyText: {
    color: colors.textMuted, fontSize: 13, lineHeight: 19,
    textAlign: 'center', marginTop: 7, maxWidth: 300,
  },
  emptyButton: {
    marginTop: 22, backgroundColor: colors.primary, borderRadius: 16,
    paddingHorizontal: 25, paddingVertical: 12,
  },
  emptyButtonText: { color: colors.onPrimary, fontSize: 13, fontWeight: '600' },
});
