import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useFonts } from 'expo-font';
import {
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';
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
  const [currentScreen, setCurrentScreen] = useState('recommendations');
  const [autoExpandId, setAutoExpandId] = useState(null);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#386756" />
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
            onActivityAccepted={(userActivity) => {
              if (userActivity?.id) {
                setAutoExpandId(userActivity.id);
              }
              setCurrentScreen('my_activities');
            }}
            onGoToPreferences={() => setCurrentScreen('preferences')}
            onNavigateToFeed={() => setCurrentScreen('feed')}
            onNavigateToActivities={() => setCurrentScreen('my_activities')}
          />
        );
      case 'my_activities':
        return (
          <PendingActivityScreen
            initialExpandedId={autoExpandId}
            onActivityCompleted={() => {
              setAutoExpandId(null);
              setCurrentScreen('feed');
            }}
          />
        );
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

  const navItems = [
    { key: 'recommendations', label: 'Sugerencia', icon: 'target' },
    { key: 'feed', label: 'Feed', icon: 'rss' },
    { key: 'my_activities', label: 'Actividad', icon: 'compass' },
    { key: 'friends', label: 'Amigos', icon: 'users' },
    { key: 'profile', label: 'Perfil', icon: 'user' },
  ];

  if (isAdmin) {
    navItems.push({ key: 'admin', label: 'Admin', icon: 'shield' });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* VISTA PRINCIPAL SEGÚN PESTAÑA SELECCIONADA */}
      <View style={styles.mainContent}>{renderScreen()}</View>

      {/* BARRA DE NAVEGACIÓN INFERIOR DE ESTILO MINIMALISTA */}
      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNav}>
          {navItems.map((item) => {
            const isActive = currentScreen === item.key;
            const iconColor = isActive ? '#0C8AA6' : '#121B22';

            return (
              <TouchableOpacity
                key={item.key}
                style={styles.navItem}
                onPress={() => setCurrentScreen(item.key)}
                activeOpacity={0.8}
              >
                <Feather name={item.icon} size={20} color={iconColor} />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    'DynaPuff': require('./assets/fonts/DynaPuff.ttf'),
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#386756" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748b',
    marginTop: 12,
    fontSize: 14,
  },
  mainContent: {
    flex: 1,
  },
  bottomNavContainer: {
    backgroundColor: '#ffffff',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  navLabel: {
    fontSize: 11,
    color: '#121B22',
    fontWeight: '500',
    marginTop: 3,
  },
  navLabelActive: {
    color: '#0C8AA6',
    fontWeight: '700',
  },
});
