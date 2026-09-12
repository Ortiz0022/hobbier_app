import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Feather from '@expo/vector-icons/Feather';
import { useAuth } from '../../context/AuthContext';
import {
  completeActivityRPC,
  getUserActivities,
  uploadEvidenceImage,
} from '../../services/activityService';
import { colors } from '../../theme';
import { ActivitiesHeader } from './components/ActivitiesHeader';
import { ActivityCard } from './components/ActivityCard';
import { ActivityEvidenceModal } from './components/ActivityEvidenceModal';
import { CompletionCelebrationModal } from './components/CompletionCelebrationModal';

const pickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.8,
};

const showMessage = (title, message) => {
  if (Platform.OS === 'web') alert(message);
  else Alert.alert(title, message);
};

export const PendingActivityScreen = ({
  initialExpandedId,
  onNavigateToProfile,
  onNavigateToRecommendations,
}) => {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [pendingActivities, setPendingActivities] = useState([]);
  const [completedActivities, setCompletedActivities] = useState([]);
  const [activeTab, setActiveTab] = useState('now');
  const [evidenceTarget, setEvidenceTarget] = useState(null);
  const [evidenceImageUri, setEvidenceImageUri] = useState(null);
  const [isRepeating, setIsRepeating] = useState(false);
  const [celebration, setCelebration] = useState(null);

  useEffect(() => {
    loadUserActivities();
  }, [user?.id, initialExpandedId]);

  const loadUserActivities = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { activities, error } = await getUserActivities(user.id);

    if (!error) {
      const pending = (activities || []).filter((activity) => activity.status === 'PENDING');
      const completed = (activities || []).filter((activity) => activity.status === 'COMPLETED');

      if (initialExpandedId) {
        pending.sort((a, b) => (a.id === initialExpandedId ? -1 : b.id === initialExpandedId ? 1 : 0));
      }

      setPendingActivities(pending);
      setCompletedActivities(completed);
    }

    setLoading(false);
  };

  const setSelectedEvidence = (result) => {
    if (!result.canceled && result.assets?.length > 0) {
      setEvidenceImageUri(result.assets[0].uri);
    }
  };

  const handlePickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          showMessage('Permiso requerido', 'Se requiere permiso para acceder a tus fotos.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      setSelectedEvidence(result);
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      showMessage('No pudimos abrir la galería', 'Inténtalo nuevamente en unos segundos.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          showMessage('Permiso requerido', 'Se requiere permiso para usar la cámara.');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync(pickerOptions);
      setSelectedEvidence(result);
    } catch (error) {
      console.error('Error al tomar fotografía:', error);
      showMessage('No pudimos abrir la cámara', 'Puedes elegir una foto desde la galería.');
    }
  };

  const openEvidenceFlow = (item, repeating = false) => {
    setEvidenceTarget(item);
    setIsRepeating(repeating);
    setEvidenceImageUri(null);
  };

  const closeEvidenceFlow = () => {
    if (completing) return;
    setEvidenceTarget(null);
    setEvidenceImageUri(null);
    setIsRepeating(false);
  };

  const handleCompleteActivity = async () => {
    if (!evidenceTarget || !evidenceImageUri || !user?.id) return;

    setCompleting(true);
    try {
      const { publicUrl, error: uploadError } = await uploadEvidenceImage(
        user.id,
        evidenceTarget.activity_id,
        evidenceImageUri
      );

      if (uploadError || !publicUrl) {
        throw new Error(uploadError?.message || 'Error al subir la fotografía.');
      }

      const { result, error: completionError } = await completeActivityRPC(
        evidenceTarget.id,
        publicUrl
      );

      if (completionError || !result?.success) {
        throw new Error(completionError?.message || 'Error al registrar la actividad.');
      }

      const completedTitle = evidenceTarget.activity?.title || 'Tu actividad';
      const completedWasRepeat = isRepeating;

      await refreshProfile();
      setEvidenceTarget(null);
      setEvidenceImageUri(null);
      setIsRepeating(false);
      await loadUserActivities();

      setCelebration({
        title: completedTitle,
        points: result.points_awarded || evidenceTarget.activity?.points_awarded || 0,
        isRepeating: completedWasRepeat,
      });
    } catch (error) {
      showMessage('No pudimos completar la actividad', error.message || 'Inténtalo nuevamente.');
    } finally {
      setCompleting(false);
    }
  };

  const handleGoToProfile = () => {
    setCelebration(null);
    if (onNavigateToProfile) onNavigateToProfile();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingIcon}>
          <Feather name="compass" size={27} color={colors.primary} />
        </View>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loadingText}>Preparando tu recorrido…</Text>
      </View>
    );
  }

  const totalMoments = completedActivities.reduce(
    (total, activity) => total + Math.max(activity.posts?.length || 0, 1),
    0
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ActivitiesHeader profile={profile} />

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'now' && styles.activeTab]}
            onPress={() => setActiveTab('now')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'now' }}
          >
            <Feather
              name="target"
              size={14}
              color={activeTab === 'now' ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'now' && styles.activeTabText]}>Misiones</Text>
            <View style={[styles.tabCount, activeTab === 'now' && styles.activeTabCount]}>
              <Text style={[styles.tabCountText, activeTab === 'now' && styles.activeTabCountText]}>
                {pendingActivities.length}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'history' }}
          >
            <Feather
              name="award"
              size={14}
              color={activeTab === 'history' ? colors.accentDark : colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>Logros</Text>
            <View style={[styles.tabCount, activeTab === 'history' && styles.activeTabCount]}>
              <Text style={[styles.tabCountText, activeTab === 'history' && styles.activeTabCountText]}>
                {completedActivities.length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {activeTab === 'now' ? (
          <View>
            {pendingActivities.length > 0 ? (
              <>
                <View style={styles.boardHeading}>
                  <View>
                    <Text style={styles.boardTitle}>Elige una misión</Text>
                    <Text style={styles.boardSubtitle}>Sin orden: tú decides por cuál seguir.</Text>
                  </View>
                  <View style={styles.boardCount}>
                    <Text style={styles.boardCountValue}>{pendingActivities.length}</Text>
                    <Text style={styles.boardCountLabel}>disponibles</Text>
                  </View>
                </View>

                <View style={styles.missionBoard}>
                  {pendingActivities.map((item, index) => (
                    <ActivityCard
                      key={item.id}
                      item={item}
                      isPending
                      index={index}
                      onAction={() => openEvidenceFlow(item, false)}
                    />
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Feather name="sunrise" size={29} color={colors.accentDark} />
                </View>
                <Text style={styles.emptyTitle}>Tu próxima historia aún no empieza</Text>
                <Text style={styles.emptyText}>
                  Descubre una actividad y conviértela en algo que puedas recordar.
                </Text>
                <TouchableOpacity
                  style={styles.discoverButton}
                  onPress={onNavigateToRecommendations}
                  accessibilityRole="button"
                >
                  <Text style={styles.discoverButtonText}>Buscar una aventura</Text>
                  <Feather name="arrow-right" size={16} color={colors.onPrimary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View>
            {completedActivities.length > 0 ? (
              <>
                <View style={styles.achievementBanner}>
                  <View style={styles.achievementCopy}>
                    <Text style={styles.achievementEyebrow}>TU COLECCIÓN</Text>
                    <Text style={styles.achievementTitle}>
                      {completedActivities.length}{' '}
                      {completedActivities.length === 1 ? 'misión lograda' : 'misiones logradas'}
                    </Text>
                    <Text style={styles.achievementMeta}>
                      {totalMoments} {totalMoments === 1 ? 'avance registrado' : 'avances registrados'}
                    </Text>
                  </View>
                  <View style={styles.achievementIcon}>
                    <Feather name="award" size={23} color={colors.accentDark} />
                  </View>
                </View>

                <View style={styles.boardHeading}>
                  <View>
                    <Text style={styles.boardTitle}>Tus favoritas</Text>
                    <Text style={styles.boardSubtitle}>Puedes repetirlas; las fotos viven en tu Perfil.</Text>
                  </View>
                </View>
                <View style={styles.missionBoard}>
                  {completedActivities.map((item, index) => (
                    <ActivityCard
                      key={item.id}
                      item={item}
                      isPending={false}
                      index={index}
                      onAction={() => openEvidenceFlow(item, true)}
                    />
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, styles.emptyHistoryIcon]}>
                  <Feather name="bookmark" size={28} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>Aquí aparecerán tus logros</Text>
                <Text style={styles.emptyText}>
                  Completa tu primera misión y empieza a construir tu colección.
                </Text>
                <TouchableOpacity style={styles.switchButton} onPress={() => setActiveTab('now')}>
                  <Text style={styles.switchButtonText}>Ver misiones</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <ActivityEvidenceModal
        visible={Boolean(evidenceTarget)}
        item={evidenceTarget}
        isRepeating={isRepeating}
        imageUri={evidenceImageUri}
        completing={completing}
        onPickImage={handlePickImage}
        onTakePhoto={handleTakePhoto}
        onComplete={handleCompleteActivity}
        onClose={closeEvidenceFlow}
      />
      <CompletionCelebrationModal
        visible={Boolean(celebration)}
        result={celebration}
        onProfile={handleGoToProfile}
        onClose={() => setCelebration(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFCFA' },
  loadingContainer: {
    flex: 1, backgroundColor: '#FBFCFA', alignItems: 'center', justifyContent: 'center',
  },
  loadingIcon: {
    width: 56, height: 56, borderRadius: 19, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  loadingText: { color: colors.textMuted, marginTop: 10, fontSize: 13 },
  scrollContent: {
    width: '100%', maxWidth: 560, alignSelf: 'center',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 38,
  },
  tabs: {
    flexDirection: 'row', gap: 4, backgroundColor: colors.surfaceMuted,
    borderRadius: 17, padding: 4, marginBottom: 18,
  },
  tab: {
    flex: 1, minHeight: 38, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 7, borderRadius: 13,
  },
  activeTab: { backgroundColor: colors.surface },
  tabText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  activeTabText: { color: colors.primaryDark },
  tabCount: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  activeTabCount: { backgroundColor: colors.primarySoft },
  tabCountText: { color: colors.textMuted, fontSize: 9, fontWeight: '600' },
  activeTabCountText: { color: colors.primary },
  boardHeading: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 12,
    paddingHorizontal: 2, marginBottom: 11,
  },
  boardTitle: {
    color: colors.text, fontSize: 17, lineHeight: 22,
    fontWeight: '500', letterSpacing: -0.25,
  },
  boardSubtitle: { color: colors.textMuted, fontSize: 10.5, lineHeight: 15, marginTop: 1 },
  boardCount: {
    flexDirection: 'row', alignItems: 'baseline', gap: 4,
    backgroundColor: colors.primarySoft, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  boardCountValue: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  boardCountLabel: { color: colors.primary, fontSize: 8.5 },
  missionBoard: { paddingBottom: 8 },
  achievementBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF1E3', borderRadius: 14,
    padding: 14, marginBottom: 17,
  },
  achievementCopy: { flex: 1, paddingRight: 12 },
  achievementEyebrow: {
    color: colors.accentDark, fontSize: 8, fontWeight: '600', letterSpacing: 1,
  },
  achievementTitle: {
    color: colors.text, fontSize: 17, lineHeight: 22,
    fontWeight: '600', letterSpacing: -0.25, marginTop: 3,
  },
  achievementMeta: { color: colors.textFaint, fontSize: 10, marginTop: 2 },
  achievementIcon: {
    width: 50, height: 50, borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center', paddingHorizontal: 24, paddingVertical: 38,
  },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 22, backgroundColor: '#FFF1E3',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyHistoryIcon: { backgroundColor: colors.primarySoft },
  emptyTitle: {
    color: colors.text, fontSize: 19, lineHeight: 25,
    fontWeight: '500', textAlign: 'center',
  },
  emptyText: {
    color: colors.textMuted, fontSize: 12, lineHeight: 18,
    textAlign: 'center', maxWidth: 300, marginTop: 6,
  },
  discoverButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.accent, borderRadius: 17,
    paddingHorizontal: 17, paddingVertical: 12, marginTop: 20,
  },
  discoverButtonText: { color: colors.onPrimary, fontSize: 13, fontWeight: '600' },
  switchButton: { paddingHorizontal: 18, paddingVertical: 12, marginTop: 10 },
  switchButtonText: { color: colors.primary, fontSize: 13, fontWeight: '500' },
});
