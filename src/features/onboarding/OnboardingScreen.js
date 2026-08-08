import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import {
  fetchAllCatalogs,
  fetchUserPreferences,
  saveUserPreferences,
} from '../../services/catalogService';

export const OnboardingScreen = ({ onComplete }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [likesCatalog, setLikesCatalog] = useState([]);
  const [interestsCatalog, setInterestsCatalog] = useState([]);
  const [resourcesCatalog, setResourcesCatalog] = useState([]);

  const [selectedLikes, setSelectedLikes] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [selectedResources, setSelectedResources] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const catalogs = await fetchAllCatalogs();
    setLikesCatalog(catalogs.likes);
    setInterestsCatalog(catalogs.interests);
    setResourcesCatalog(catalogs.resources);

    if (user?.id) {
      const prefs = await fetchUserPreferences(user.id);
      setSelectedLikes(prefs.userLikes);
      setSelectedInterests(prefs.userInterests);
      setSelectedResources(prefs.userResources);
    }
    setLoading(false);
  };

  const toggleItem = (id, list, setList) => {
    if (list.includes(id)) {
      setList(list.filter((item) => item !== id));
    } else {
      setList([...list, id]);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);

    const result = await saveUserPreferences(
      user.id,
      selectedLikes,
      selectedInterests,
      selectedResources
    );

    setSaving(false);

    if (result.success) {
      if (Platform.OS === 'web') {
        alert('Preferencias guardadas correctamente');
      } else {
        Alert.alert('¡Excelente!', 'Preferencias guardadas correctamente.');
      }
      if (onComplete) onComplete();
    } else {
      const msg = 'Error al guardar tus preferencias.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Cargando catálogos...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Personaliza tu Experiencia</Text>
        <Text style={styles.subtitle}>
          Selecciona tus gustos, intereses y recursos para recibir las mejores recomendaciones.
        </Text>

        {/* SECCIÓN 1: GUSTOS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎨 Mis Gustos</Text>
          <Text style={styles.sectionDescription}>¿Qué tipo de cosas te gustan?</Text>
          <View style={styles.chipsContainer}>
            {likesCatalog.map((item) => {
              const isSelected = selectedLikes.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => toggleItem(item.id, selectedLikes, setSelectedLikes)}
                >
                  <Text style={styles.chipEmoji}>{item.icon || '❤️'}</Text>
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SECCIÓN 2: INTERESES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Mis Intereses</Text>
          <Text style={styles.sectionDescription}>¿Qué objetivos o habilidades buscas desarrollar?</Text>
          <View style={styles.chipsContainer}>
            {interestsCatalog.map((item) => {
              const isSelected = selectedInterests.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => toggleItem(item.id, selectedInterests, setSelectedInterests)}
                >
                  <Text style={styles.chipEmoji}>{item.icon || '🌟'}</Text>
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SECCIÓN 3: RECURSOS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Recursos Disponibles</Text>
          <Text style={styles.sectionDescription}>¿Qué objetos o herramientas tienes a la mano?</Text>
          <View style={styles.chipsContainer}>
            {resourcesCatalog.map((item) => {
              const isSelected = selectedResources.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => toggleItem(item.id, selectedResources, setSelectedResources)}
                >
                  <Text style={styles.chipEmoji}>{item.icon || '🔧'}</Text>
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar Preferencias</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
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
  scrollContent: {
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  chipEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  chipTextSelected: {
    color: '#ffffff',
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 40,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
