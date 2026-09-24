import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useNotify } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  getRecommendedActivity,
  acceptActivity,
  getUserActivities,
} from '../../services/activityService';
import { getFriendsFeed } from '../../services/socialService';

import { HomeHeader } from './components/HomeHeader';
import { HeroBanner } from './components/HeroBanner';
import { InProgressCard } from './components/InProgressCard';
import { RecentFriendsList } from './components/RecentFriendsList';
import { RecommendationModal } from './components/RecommendationModal';
import { CreateActivityModal } from '../../components/CreateActivityModal';

export const RecommendationScreen = ({
  onActivityAccepted,
  onGoToPreferences,
  onNavigateToFeed,
  onNavigateToActivities,
}) => {
  const { user, profile } = useAuth();
  const { notify } = useNotify();
  const { t } = useLanguage();
  const [loadingRec, setLoadingRec] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [recommended, setRecommended] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const [pendingActivity, setPendingActivity] = useState(null);
  const [recentFriendPosts, setRecentFriendPosts] = useState([]);

  useEffect(() => {
    loadHomeData();
  }, [user?.id]);

  const loadHomeData = async () => {
    if (!user?.id) return;
    try {
      const { activities } = await getUserActivities(user.id);
      const pending = (activities || []).find((a) => a.status === 'PENDING');
      setPendingActivity(pending || null);

      const { posts } = await getFriendsFeed(user.id, 3, 0);
      setRecentFriendPosts(posts || []);
    } catch (err) {
      console.error('Error cargando datos del Home:', err);
    }
  };

  const handleSorprendeme = async () => {
    if (!user?.id) return;
    setLoadingRec(true);
    setRecommended(null);
    setModalVisible(true);

    // Las metas de mockapi ya están importadas en `activities` (ver
    // supabase/import_metas.sql), así que todo sale de Supabase y todo se puede
    // aceptar. Antes se leían de la API y no eran registrables.
    const { activity, error } = await getRecommendedActivity(user.id);
    setLoadingRec(false);

    if (error) {
      setModalVisible(false);
      notify(t('recommendations.error_reveal'), { type: 'error', title: t('common.error') });
    } else {
      setRecommended(activity);
    }
  };

  const handleAcceptRecommended = async () => {
    if (!user?.id || !recommended?.id) return;
    setAccepting(true);

    const { userActivity, error } = await acceptActivity(user.id, recommended.id);
    setAccepting(false);
    setModalVisible(false);

    if (error) {
      notify(t('recommendations.error_add'), { type: 'error', title: t('common.error') });
    } else {
      loadHomeData();
      if (onActivityAccepted) onActivityAccepted(userActivity);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader profile={profile} />

        <HeroBanner onPress={handleSorprendeme} />

        <InProgressCard
          pendingActivity={pendingActivity}
          onPress={onNavigateToActivities}
          onCreate={() => setCreateModalVisible(true)}
        />

        <RecentFriendsList
          recentFriendPosts={recentFriendPosts}
          onNavigateToFeed={onNavigateToFeed}
        />
      </ScrollView>

      <RecommendationModal
        visible={modalVisible}
        loading={loadingRec}
        recommended={recommended}
        onGoToPreferences={onGoToPreferences}
        accepting={accepting}
        onAccept={handleAcceptRecommended}
        onReload={handleSorprendeme}
        onClose={() => setModalVisible(false)}
      />

      <CreateActivityModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        forCatalog={false}
        onCreated={async (activity) => {
          setAccepting(true);
          const { userActivity, error } = await acceptActivity(user.id, activity.id);
          setAccepting(false);

          if (error) {
            notify(t('recommendations.error_add'), { type: 'error', title: t('common.error') });
          } else {
            loadHomeData();
            if (onActivityAccepted) onActivityAccepted(userActivity);
          }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBFCFA',
  },
  scrollContent: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 36,
  },
});
