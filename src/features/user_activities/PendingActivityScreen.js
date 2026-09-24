import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Feather from '@expo/vector-icons/Feather';
import { useAuth } from '../../context/AuthContext';
import { useNotify } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
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

export const PendingActivityScreen = ({
  initialExpandedId,
  onNavigateToProfile,
  onNavigateToRecommendations,
}) => {
  const { user, profile, refreshProfile } = useAuth();
  const { notify } = useNotify();
  const { t } = useLanguage();
  const showMessage = (title, message) => notify(message, { type: 'error', title });
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [pendingActivities, setPendingActivities] = useState([]);
  const [completedActivities, setCompletedActivities] = useState([]);
  const [activeTab, setActiveTab] = useState('now');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
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
          showMessage(t('missions.permission_required'), t('missions.gallery_permission'));
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      setSelectedEvidence(result);
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      showMessage(t('missions.gallery_error_title'), t('missions.gallery_error_text'));
    }
  };

  const handleTakePhoto = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          showMessage(t('missions.permission_required'), t('missions.camera_permission'));
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync(pickerOptions);
      setSelectedEvidence(result);
    } catch (error) {
      console.error('Error al tomar fotografía:', error);
      showMessage(t('missions.camera_error_title'), t('missions.camera_error_text'));
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
      showMessage(t('missions.complete_error_title'), error.message || t('common.retry'));
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
        <Text style={styles.loadingText}>{t('missions.loading')}</Text>
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

        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>{t('missions.showing')}</Text>
          <TouchableOpacity 
            style={styles.filterDropdownBtn} 
            onPress={() => setShowFilterDropdown(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.filterDropdownText}>
              {activeTab === 'now' ? t('missions.pending_tab') : t('missions.completed_tab')}
            </Text>
            <Feather name="chevron-down" size={14} color={colors.primaryDark} />
          </TouchableOpacity>
        </View>

        <Modal 
          visible={showFilterDropdown} 
          transparent 
          animationType="slide" 
          onRequestClose={() => setShowFilterDropdown(false)}
        >
          <TouchableOpacity style={styles.filterOverlay} activeOpacity={1} onPress={() => setShowFilterDropdown(false)}>
            <View style={styles.filterMenu}>
              <View style={styles.grabber} />
              <Text style={styles.filterModalTitle}>{t('missions.sort_by')}</Text>

              <TouchableOpacity style={styles.filterMenuItem} onPress={() => { setActiveTab('now'); setShowFilterDropdown(false); }}>
                <Text style={[styles.filterMenuText, activeTab === 'now' && styles.filterMenuTextActive]}>{t('missions.pending_tab')}</Text>
                <Feather name={activeTab === 'now' ? 'check-circle' : 'circle'} size={20} color={activeTab === 'now' ? colors.primary : colors.textMuted} />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.filterMenuItem} onPress={() => { setActiveTab('history'); setShowFilterDropdown(false); }}>
                <Text style={[styles.filterMenuText, activeTab === 'history' && styles.filterMenuTextActive]}>{t('missions.completed_tab')}</Text>
                <Feather name={activeTab === 'history' ? 'check-circle' : 'circle'} size={20} color={activeTab === 'history' ? colors.primary : colors.textMuted} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {activeTab === 'now' ? (
          <View>
            {pendingActivities.length > 0 ? (
              <>
                <View style={styles.boardHeading}>
                  <View>
                    <Text style={styles.boardTitle}>{t('missions.choose_mission')}</Text>
                    <Text style={styles.boardSubtitle}>{t('missions.choose_subtitle')}</Text>
                  </View>
                  <View style={styles.boardCount}>
                    <Text style={styles.boardCountValue}>{pendingActivities.length}</Text>
                    <Text style={styles.boardCountLabel}>{t('common.available')}</Text>
                  </View>
                </View>

                <View style={styles.missionBoard}>
                  {pendingActivities.map((item, index) => (
                    <ActivityCard
                      key={item.id}
                      item={item}
                      isPending={item.status === 'PENDING'}
                      index={index}
                      onAction={() => openEvidenceFlow(item, item.status === 'COMPLETED')}
                    />
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Feather name="sunrise" size={29} color={colors.accentDark} />
                </View>
                <Text style={styles.emptyTitle}>{t('missions.empty_pending_title')}</Text>
                <Text style={styles.emptyText}>{t('missions.empty_pending_text')}</Text>
                <TouchableOpacity
                  style={styles.discoverButton}
                  onPress={onNavigateToRecommendations}
                  accessibilityRole="button"
                >
                  <Text style={styles.discoverButtonText}>{t('missions.find_adventure')}</Text>
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
                    <Text style={styles.achievementEyebrow}>{t('missions.your_collection')}</Text>
                    <Text style={styles.achievementTitle}>
                      {completedActivities.length}{' '}
                      {completedActivities.length === 1 ? t('missions.missions_achieved_one') : t('missions.missions_achieved_other')}
                    </Text>
                    <Text style={styles.achievementMeta}>
                      {totalMoments} {totalMoments === 1 ? t('missions.moments_one') : t('missions.moments_other')}
                    </Text>
                  </View>
                  <View style={styles.achievementIcon}>
                    <Feather name="award" size={23} color={colors.accentDark} />
                  </View>
                </View>

                <View style={styles.boardHeading}>
                  <View>
                    <Text style={styles.boardTitle}>{t('missions.favorites_title')}</Text>
                    <Text style={styles.boardSubtitle}>{t('missions.favorites_subtitle')}</Text>
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
                <Text style={styles.emptyTitle}>{t('missions.empty_history_title')}</Text>
                <Text style={styles.emptyText}>{t('missions.empty_history_text')}</Text>
                <TouchableOpacity style={styles.switchButton} onPress={() => setActiveTab('now')}>
                  <Text style={styles.switchButtonText}>{t('missions.see_missions')}</Text>
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  filterLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginRight: 8,
  },
  filterDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterDropdownText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '500',
    marginRight: 6,
  },
  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  filterMenu: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    elevation: 8,
    ...Platform.select({
      web: {
        boxShadow: '0px -2px 10px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
    }),
  },
  filterMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  filterMenuText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  filterMenuTextActive: {
    color: colors.primaryDark,
    fontWeight: '500',
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  filterModalTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryDark,
    textAlign: 'center',
    marginBottom: 8,
  },
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
