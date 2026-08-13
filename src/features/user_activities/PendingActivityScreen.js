import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Feather from '@expo/vector-icons/Feather';
import { useAuth } from '../../context/AuthContext';
import {
  getUserActivities,
  uploadEvidenceImage,
  completeActivityRPC,
} from '../../services/activityService';

import { ActivitiesHeader } from './components/ActivitiesHeader';
import { ActivityCard } from './components/ActivityCard';

export const PendingActivityScreen = ({ initialExpandedId, onActivityCompleted }) => {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [pendingActivities, setPendingActivities] = useState([]);
  const [completedActivities, setCompletedActivities] = useState([]);

  // Secciones colapsables con flechita de abrir/cerrar
  const [showPending, setShowPending] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);

  const [expandedActivityId, setExpandedActivityId] = useState(initialExpandedId || null);
  const [imageUri, setImageUri] = useState(null);

  useEffect(() => {
    loadUserActivities();
  }, [user?.id, initialExpandedId]);

  const loadUserActivities = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { activities, error } = await getUserActivities(user.id);
    if (!error) {
      const pending = (activities || []).filter((a) => a.status === 'PENDING');
      const completed = (activities || []).filter((a) => a.status === 'COMPLETED');
      setPendingActivities(pending);
      setCompletedActivities(completed);

      if (initialExpandedId && pending.some((a) => a.id === initialExpandedId)) {
        setExpandedActivityId(initialExpandedId);
      } else if (pending.length > 0 && !expandedActivityId) {
        setExpandedActivityId(pending[0].id);
      }
    }
    setLoading(false);
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        const msg = 'Se requiere permiso para acceder a tus fotos.';
        if (Platform.OS === 'web') alert(msg);
        else Alert.alert('Permiso requerido', msg);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Error al seleccionar imagen:', err);
    }
  };

  const handleCompleteActivity = async (targetActivity) => {
    if (!targetActivity) return;
    if (!imageUri) {
      const msg = 'Por favor selecciona o toma una fotografía de tu creación.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Evidencia requerida', msg);
      return;
    }

    setCompleting(true);
    try {
      const { publicUrl, error: uploadErr } = await uploadEvidenceImage(
        user.id,
        targetActivity.activity_id,
        imageUri
      );

      if (uploadErr || !publicUrl) {
        throw new Error(uploadErr?.message || 'Error al subir la fotografía.');
      }

      const { result, error: rpcErr } = await completeActivityRPC(
        targetActivity.id,
        publicUrl
      );

      if (rpcErr || !result?.success) {
        throw new Error(rpcErr?.message || 'Error al completar la actividad.');
      }

      await refreshProfile();

      const msg = `¡Felicidades! Completaste la actividad y ganaste ${result.points_awarded} puntos.`;
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('¡Puntos Otorgados!', msg);

      setImageUri(null);
      setExpandedActivityId(null);
      await loadUserActivities();
      if (onActivityCompleted) onActivityCompleted();
    } catch (err) {
      const msg = err.message || 'No se pudo completar la actividad.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#386756" />
        <Text style={styles.loadingText}>Cargando mis actividades...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ActivitiesHeader profile={profile} />

        {/* SECCIÓN 1: PENDIENTES COLAPSABLE */}
        <TouchableOpacity
          style={styles.sectionHeaderBtn}
          onPress={() => setShowPending(!showPending)}
          activeOpacity={0.8}
        >
          <Text style={styles.sectionTitle}>
            PENDIENTES ({pendingActivities.length})
          </Text>
          <Feather
            name={showPending ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#386756"
          />
        </TouchableOpacity>

        {showPending && (
          <View style={styles.listContainer}>
            {pendingActivities.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No tienes actividades pendientes.</Text>
              </View>
            ) : (
              pendingActivities.map((item) => {
                const isExpanded = expandedActivityId === item.id;
                return (
                  <ActivityCard
                    key={item.id}
                    item={item}
                    isPending={true}
                    isExpanded={isExpanded}
                    onToggleExpand={() => {
                      setExpandedActivityId(isExpanded ? null : item.id);
                      setImageUri(null);
                    }}
                    imageUri={isExpanded ? imageUri : null}
                    completing={completing}
                    onPickImage={handlePickImage}
                    onComplete={() => handleCompleteActivity(item)}
                  />
                );
              })
            )}
          </View>
        )}

        {/* SECCIÓN 2: COMPLETADAS COLAPSABLE */}
        <TouchableOpacity
          style={[styles.sectionHeaderBtn, { marginTop: 18 }]}
          onPress={() => setShowCompleted(!showCompleted)}
          activeOpacity={0.8}
        >
          <Text style={styles.sectionTitle}>
            COMPLETADAS ({completedActivities.length})
          </Text>
          <Feather
            name={showCompleted ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#386756"
          />
        </TouchableOpacity>

        {showCompleted && (
          <View style={styles.listContainer}>
            {completedActivities.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No has completado actividades aún.</Text>
              </View>
            ) : (
              completedActivities.map((item) => (
                <ActivityCard key={item.id} item={item} isPending={false} />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8A908B',
    marginTop: 12,
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  sectionHeaderBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#121B22',
    letterSpacing: 0.8,
  },
  listContainer: {
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F3F5',
    marginBottom: 10,
  },
  emptyText: {
    color: '#8A908B',
    fontSize: 13,
  },
});
