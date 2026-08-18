import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { Text } from '../../components/scaledText';
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

  // Secciones colapsables
  const [showPending, setShowPending] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);

  // Estados de expansión y carga de fotos para pendientes y completadas
  const [expandedPendingId, setExpandedPendingId] = useState(initialExpandedId || null);
  const [pendingImageUri, setPendingImageUri] = useState(null);

  const [expandedCompletedId, setExpandedCompletedId] = useState(null);
  const [completedImageUri, setCompletedImageUri] = useState(null);

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
        setExpandedPendingId(initialExpandedId);
      } else if (pending.length > 0 && !expandedPendingId) {
        setExpandedPendingId(pending[0].id);
      }
    }
    setLoading(false);
  };

  const handlePickImage = async (isForCompleted = false) => {
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
        const selectedUri = result.assets[0].uri;
        if (isForCompleted) {
          setCompletedImageUri(selectedUri);
        } else {
          setPendingImageUri(selectedUri);
        }
      }
    } catch (err) {
      console.error('Error al seleccionar imagen:', err);
    }
  };

  const handleCompleteOrRepeatActivity = async (targetActivity, isRepeating = false) => {
    if (!targetActivity) return;
    const targetImageUri = isRepeating ? completedImageUri : pendingImageUri;

    if (!targetImageUri) {
      const msg = isRepeating
        ? 'Por favor selecciona la foto de tu repetición.'
        : 'Por favor selecciona o toma una fotografía de tu creación.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Evidencia requerida', msg);
      return;
    }

    setCompleting(true);
    try {
      const { publicUrl, error: uploadErr } = await uploadEvidenceImage(
        user.id,
        targetActivity.activity_id,
        targetImageUri
      );

      if (uploadErr || !publicUrl) {
        throw new Error(uploadErr?.message || 'Error al subir la fotografía.');
      }

      const { result, error: rpcErr } = await completeActivityRPC(
        targetActivity.id,
        publicUrl
      );

      if (rpcErr || !result?.success) {
        throw new Error(rpcErr?.message || 'Error al registrar la actividad.');
      }

      await refreshProfile();

      const successMsg = isRepeating
        ? `¡Excelente constancia! Registraste tu avance y ganaste +${result.points_awarded} puntos.`
        : `¡Felicidades! Completaste la actividad y ganaste ${result.points_awarded} puntos.`;

      if (Platform.OS === 'web') alert(successMsg);
      else Alert.alert('¡Puntos Otorgados!', successMsg);

      if (isRepeating) {
        setCompletedImageUri(null);
      } else {
        setPendingImageUri(null);
        setExpandedPendingId(null);
      }

      await loadUserActivities();
      if (!isRepeating && onActivityCompleted) {
        onActivityCompleted();
      }
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
        <ActivityIndicator size="large" color="#08333D" />
        <Text style={styles.loadingText}>Cargando mis actividades...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ActivitiesHeader profile={profile} />

        {/* SECCIÓN 1: PENDIENTES */}
        <TouchableOpacity
          style={styles.sectionHeaderBtn}
          onPress={() => setShowPending(!showPending)}
          activeOpacity={0.8}
        >
          <Text style={styles.sectionTitle}>
            Pendientes ({pendingActivities.length})
          </Text>
          <Feather
            name={showPending ? 'chevron-up' : 'chevron-down'}
            size={17}
            color={showPending ? '#00C9FD' : '#08333D'}
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
                const isExpanded = expandedPendingId === item.id;
                return (
                  <ActivityCard
                    key={item.id}
                    item={item}
                    isPending={true}
                    isExpanded={isExpanded}
                    onToggleExpand={() => {
                      setExpandedPendingId(isExpanded ? null : item.id);
                      setPendingImageUri(null);
                    }}
                    imageUri={isExpanded ? pendingImageUri : null}
                    completing={completing}
                    onPickImage={() => handlePickImage(false)}
                    onComplete={() => handleCompleteOrRepeatActivity(item, false)}
                  />
                );
              })
            )}
          </View>
        )}

        {/* SECCIÓN 2: COMPLETADAS CON REPETICIÓN */}
        <TouchableOpacity
          style={[styles.sectionHeaderBtn, { marginTop: 14 }]}
          onPress={() => setShowCompleted(!showCompleted)}
          activeOpacity={0.8}
        >
          <Text style={styles.sectionTitle}>
            Completadas ({completedActivities.length})
          </Text>
          <Feather
            name={showCompleted ? 'chevron-up' : 'chevron-down'}
            size={17}
            color={showCompleted ? '#00C9FD' : '#08333D'}
          />
        </TouchableOpacity>

        {showCompleted && (
          <View style={styles.listContainer}>
            {completedActivities.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No has completado actividades aún.</Text>
              </View>
            ) : (
              completedActivities.map((item) => {
                const isExpanded = expandedCompletedId === item.id;
                return (
                  <ActivityCard
                    key={item.id}
                    item={item}
                    isPending={false}
                    isExpanded={isExpanded}
                    onToggleExpand={() => {
                      setExpandedCompletedId(isExpanded ? null : item.id);
                      setCompletedImageUri(null);
                    }}
                    imageUri={isExpanded ? completedImageUri : null}
                    completing={completing}
                    onPickImage={() => handlePickImage(true)}
                    onComplete={() => handleCompleteOrRepeatActivity(item, true)}
                  />
                );
              })
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
    paddingVertical: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#08333D',
  },
  listContainer: {
    marginBottom: 8,
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
