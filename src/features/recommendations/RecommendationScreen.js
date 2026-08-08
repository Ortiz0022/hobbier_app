import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getRecommendedActivity, acceptActivity } from '../../services/activityService';

export const RecommendationScreen = ({ onActivityAccepted, onGoToPreferences }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [recommended, setRecommended] = useState(null);
  const [searched, setSearched] = useState(false);

  const fetchRecommendation = async () => {
    if (!user?.id) return;
    setLoading(true);
    setSearched(true);
    const { activity, error } = await getRecommendedActivity(user.id);
    setLoading(false);
    if (error) {
      const msg = 'Error al consultar recomendación. Verifica tus datos.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
    } else {
      setRecommended(activity);
    }
  };

  const handleAccept = async () => {
    if (!user?.id || !recommended?.id) return;
    setAccepting(true);
    const { userActivity, error } = await acceptActivity(user.id, recommended.id);
    setAccepting(false);

    if (error) {
      const msg = 'No se pudo aceptar la actividad.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
    } else {
      const msg = '¡Actividad aceptada! La encontrarás en tus pendientes.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('¡Genial!', msg);
      if (onActivityAccepted) onActivityAccepted(userActivity);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.badgeText}>🎯 Motor de Recomendación</Text>
        <Text style={styles.title}>¿Qué te gustaría hacer hoy?</Text>
        <Text style={styles.subtitle}>
          Encontramos la mejor actividad filtrando tu edad, gustos, intereses y objetos disponibles.
        </Text>

        {!searched && !loading && (
          <View style={styles.initialStateBox}>
            <Text style={styles.initialEmoji}>🎲</Text>
            <Text style={styles.initialTitle}>¿Listo para tu recomendación?</Text>
            <Text style={styles.initialSubtitle}>
              Toca el botón a continuación para obtener una actividad compatible.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={fetchRecommendation}
            >
              <Text style={styles.primaryButtonText}>Descubrir Actividad</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Filtrando actividades compatibles en la base de datos...</Text>
          </View>
        )}

        {!loading && searched && !recommended && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>No encontramos actividades compatibles</Text>
            <Text style={styles.emptySubtitle}>
              Intenta seleccionar más gustos, intereses o recursos en tus preferencias para desbloquear más opciones.
            </Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onGoToPreferences}
            >
              <Text style={styles.secondaryButtonText}>Ajustar Preferencias</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && recommended && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.categoryBadge}>⭐ Actividad Sugerida</Text>
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsText}>+{recommended.points_awarded} pts</Text>
              </View>
            </View>

            <Text style={styles.activityTitle}>{recommended.title}</Text>
            <Text style={styles.activityDescription}>{recommended.description}</Text>

            <View style={styles.metaRow}>
              {recommended.min_age ? (
                <Text style={styles.metaText}>👤 Edad mín: {recommended.min_age} años</Text>
              ) : null}
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={handleAccept}
                disabled={accepting}
              >
                {accepting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.acceptButtonText}>Aceptar Actividad</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reloadButton}
                onPress={fetchRecommendation}
                disabled={accepting}
              >
                <Text style={styles.reloadButtonText}>🔄 Otra Opción</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 24,
    flex: 1,
    justifyContent: 'center',
  },
  badgeText: {
    color: '#818cf8',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
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
  initialStateBox: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  initialEmoji: {
    fontSize: 54,
    marginBottom: 12,
  },
  initialTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  initialSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingBox: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 14,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyBox: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderColor: '#334155',
    borderWidth: 1,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#4f46e5',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryBadge: {
    color: '#818cf8',
    fontWeight: '700',
    fontSize: 12,
  },
  pointsBadge: {
    backgroundColor: '#065f46',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  pointsText: {
    color: '#34d399',
    fontWeight: '800',
    fontSize: 13,
  },
  activityTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 10,
  },
  activityDescription: {
    fontSize: 15,
    color: '#cbd5e1',
    lineHeight: 22,
    marginBottom: 20,
  },
  metaRow: {
    marginBottom: 20,
  },
  metaText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  actionsRow: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#334155',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
  },
  secondaryButtonText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  reloadButton: {
    backgroundColor: '#334155',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reloadButtonText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
});
