import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AuthScreen } from './src/features/auth/AuthScreen';
import { OnboardingScreen } from './src/features/onboarding/OnboardingScreen';
import { RecommendationScreen } from './src/features/recommendations/RecommendationScreen';
import { PendingActivityScreen } from './src/features/user_activities/PendingActivityScreen';
import { FeedScreen } from './src/features/feed/FeedScreen';
import { FriendsScreen } from './src/features/friends/FriendsScreen';
import { ProfileScreen } from './src/features/profile/ProfileScreen';
import { AdminScreen } from './src/features/admin/AdminScreen';

const MainApp = () => {
  const { user, loading, isAdmin } = useAuth();
  const [currentScreen, setCurrentScreen] = useState('recommendations'); // 'recommendations', 'my_activities', 'feed', 'friends', 'profile', 'preferences', 'admin'

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Cargando Hobbier...</Text>
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'recommendations':
        return (
          <RecommendationScreen
            onActivityAccepted={() => setCurrentScreen('my_activities')}
            onGoToPreferences={() => setCurrentScreen('preferences')}
          />
        );
      case 'my_activities':
        return <PendingActivityScreen onActivityCompleted={() => setCurrentScreen('feed')} />;
      case 'feed':
        return <FeedScreen />;
      case 'friends':
        return <FriendsScreen />;
      case 'profile':
        return <ProfileScreen onGoToPreferences={() => setCurrentScreen('preferences')} />;
      case 'preferences':
        return <OnboardingScreen onComplete={() => setCurrentScreen('recommendations')} />;
      case 'admin':
        return <AdminScreen />;
      default:
        return <RecommendationScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      
      {/* VISTA PRINCIPAL SEGÚN PESTAÑA SELECCIONADA */}
      <View style={styles.mainContent}>{renderScreen()}</View>

      {/* BARRA DE NAVEGACIÓN INFERIOR */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentScreen('recommendations')}
        >
          <Text style={[styles.navIcon, currentScreen === 'recommendations' && styles.navIconActive]}>
            🎯
          </Text>
          <Text style={[styles.navLabel, currentScreen === 'recommendations' && styles.navLabelActive]}>
            Sugerida
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentScreen('my_activities')}
        >
          <Text style={[styles.navIcon, currentScreen === 'my_activities' && styles.navIconActive]}>
            ⏳
          </Text>
          <Text style={[styles.navLabel, currentScreen === 'my_activities' && styles.navLabelActive]}>
            Tareas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentScreen('feed')}
        >
          <Text style={[styles.navIcon, currentScreen === 'feed' && styles.navIconActive]}>
            📰
          </Text>
          <Text style={[styles.navLabel, currentScreen === 'feed' && styles.navLabelActive]}>
            Feed
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentScreen('friends')}
        >
          <Text style={[styles.navIcon, currentScreen === 'friends' && styles.navIconActive]}>
            👥
          </Text>
          <Text style={[styles.navLabel, currentScreen === 'friends' && styles.navLabelActive]}>
            Amigos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentScreen('profile')}
        >
          <Text style={[styles.navIcon, currentScreen === 'profile' && styles.navIconActive]}>
            👤
          </Text>
          <Text style={[styles.navLabel, currentScreen === 'profile' && styles.navLabelActive]}>
            Perfil
          </Text>
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setCurrentScreen('admin')}
          >
            <Text style={[styles.navIcon, currentScreen === 'admin' && styles.navIconActive]}>
              🛡️
            </Text>
            <Text style={[styles.navLabel, currentScreen === 'admin' && styles.navLabelActive]}>
              Admin
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
  },
  mainContent: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 4,
    justifyContent: 'space-around',
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  navIcon: {
    fontSize: 20,
    opacity: 0.6,
  },
  navIconActive: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  navLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
  },
  navLabelActive: {
    color: '#818cf8',
    fontWeight: '800',
  },
});
