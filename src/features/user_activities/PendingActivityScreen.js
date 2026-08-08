import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import {
  getUserActivities,
  uploadEvidenceImage,
  completeActivityRPC,
} from '../../services/activityService';

export const PendingActivityScreen = ({ onActivityCompleted }) => {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [pendingActivities, setPendingActivities] = useState([]);
  const [completedActivities, setCompletedActivities] = useState([]);
  
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [imageUri, setImageUri] = useState(null);

  useEffect(() => {
    loadUserActivities();
  }, []);

  const loadUserActivities = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { activities, error } = await getUserActivities(user.id);
    if (!error) {
      const pending = activities.filter((a) => a.status === 'PENDING');
      const completed = activities.filter((a) => a.status === 'COMPLETED');
      setPendingActivities(pending);
      setCompletedActivities(completed);
      if (pending.length > 0 && !selectedActivity) {
        setSelectedActivity(pending[0]);
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

  const handleComplete = async () => {
    if (!selectedActivity) return;
    if (!imageUri) {
      const msg = 'Por favor selecciona o toma una fotografía como evidencia.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Evidencia requerida', msg);
      return;
    }

    setCompleting(true);
    try {
      // 1. Subir fotografía a Supabase Storage
      const { publicUrl, error: uploadErr } = await uploadEvidenceImage(
        user.id,
        selectedActivity.activity_id,
        imageUri
      );

      if (uploadErr || !publicUrl) {
        throw new Error(uploadErr?.message || 'Error al subir la fotografía.');
      }

      // 2. Ejecutar RPC transaccional complete_activity en Supabase
      const { result, error: rpcErr } = await completeActivityRPC(
        selectedActivity.id,
        publicUrl
      );

      if (rpcErr || !result?.success) {
        throw new Error(rpcErr?.message || 'Error al completar la actividad.');
      }

      // 3. Actualizar puntos del perfil en AuthContext
      await refreshProfile();

      const msg = `¡Felicidades! Completaste la actividad y ganaste ${result.points_awarded} puntos. Tu publicación ya está disponible para tus amigos.`;
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('¡Puntos Otorgados!', msg);

      setImageUri(null);
      setSelectedActivity(null);
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
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Cargando mis actividades...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Mis Actividades</Text>
        <Text style={styles.subtitle}>
          Completa tus tareas pendientes, sube una foto como evidencia y gana puntos.
        </Text>

        {/* SECCIÓN DE ACTIVIDADES PENDIENTES */}
        <Text style={styles.sectionTitle}>⏳ Pendientes ({pendingActivities.length})</Text>

        {pendingActivities.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyText}>No tienes actividades pendientes por completar.</Text>
          </View>
        ) : (
          <View style={styles.pendingList}>
            {pendingActivities.map((item) => {
              const isSelected = selectedActivity?.id === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.activityItemCard, isSelected && styles.activityItemCardSelected]}
                  onPress={() => {
                    setSelectedActivity(item);
                    setImageUri(null);
                  }}
                >
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle}>{item.activity?.title || 'Actividad'}</Text>
                    <View style={styles.badgePoints}>
                      <Text style={styles.badgePointsText}>+{item.activity?.points_awarded || 10} pts</Text>
                    </View>
                  </View>
                  <Text style={styles.itemDescription}>{item.activity?.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* FORMULARIO DE EVIDENCIA Y COMPLETADO */}
        {selectedActivity && (
          <View style={styles.completionBox}>
            <Text style={styles.completionTitle}>
              Completar: {selectedActivity.activity?.title}
            </Text>
            <Text style={styles.completionSubtitle}>
              Sube una fotografía real como evidencia de tu actividad realizada.
            </Text>

            <TouchableOpacity style={styles.imagePickerButton} onPress={handlePickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  <Text style={styles.cameraEmoji}>📸</Text>
                  <Text style={styles.imagePickerText}>Toca para seleccionar foto de evidencia</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.completeButton}
              onPress={handleComplete}
              disabled={completing}
            >
              {completing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.completeButtonText}>Completar y Ganar Puntos</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* SECCIÓN DE HISTORIAL COMPLETADO */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>
          ✅ Completadas ({completedActivities.length})
        </Text>
        {completedActivities.map((item) => (
          <View key={item.id} style={styles.completedItemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.completedTitle}>{item.activity?.title}</Text>
              <Text style={styles.completedPoints}>+{item.points_awarded} pts</Text>
            </View>
            <Text style={styles.completedDate}>
              Completado el {new Date(item.completed_at).toLocaleDateString()}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
  },
  scrollContent: {
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 14,
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
  pendingList: {
    gap: 12,
    marginBottom: 24,
  },
  activityItemCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  activityItemCardSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#1e1b4b',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    flex: 1,
    marginRight: 10,
  },
  badgePoints: {
    backgroundColor: '#065f46',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgePointsText: {
    color: '#34d399',
    fontWeight: '800',
    fontSize: 12,
  },
  itemDescription: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
  },
  completionBox: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderColor: '#4f46e5',
    borderWidth: 1,
    marginTop: 8,
  },
  completionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  completionSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 16,
  },
  imagePickerButton: {
    height: 180,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerPlaceholder: {
    alignItems: 'center',
    padding: 16,
  },
  cameraEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  imagePickerText: {
    color: '#818cf8',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  completeButton: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  completedItemCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  completedTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  completedPoints: {
    color: '#10b981',
    fontWeight: '700',
    fontSize: 13,
  },
  completedDate: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
});
