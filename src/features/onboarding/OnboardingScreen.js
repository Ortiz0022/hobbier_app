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
import Feather from '@expo/vector-icons/Feather';
import { useAuth } from '../../context/AuthContext';
import {
  fetchAllCatalogs,
  fetchUserPreferences,
  saveUserPreferences,
} from '../../services/catalogService';

// Mismos tokens exactos que usan PendingActivityScreen, ActivitiesHeader,
// ActivityCard, InlineEvidenceUploader y ProfileScreen (pantalla "Actividad").
const COLORS = {
  bg: '#FFFFFF',
  border: '#F0F3F5',
  textPrimary: '#08333D',
  textSecondary: '#64748B',
  textMuted: '#8A908B',
  cyan: '#00C9FD',
  cyanIcon: '#0C8AA6',
  cyanSoft: 'rgba(0, 201, 253, 0.09)',
  cyanBorder: 'rgba(0, 201, 253, 0.22)',
  orange: '#FF5A00',
};

const SECTIONS = [
  { key: 'likes', icon: 'check-circle', title: 'Mis Gustos', description: '¿Qué tipo de cosas te gustan?' },
  { key: 'interests', icon: 'target', title: 'Mis Intereses', description: '¿Qué objetivos o habilidades buscas desarrollar?' },
  { key: 'resources', icon: 'star', title: 'Recursos Disponibles', description: '¿Qué objetos o herramientas tienes a la mano?' },
];

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
        <ActivityIndicator size="large" color={COLORS.cyanIcon} />
        <Text style={styles.loadingText}>Cargando catálogos...</Text>
      </View>
    );
  }

  const sectionData = {
    likes: { catalog: likesCatalog, selected: selectedLikes, setSelected: setSelectedLikes },
    interests: { catalog: interestsCatalog, selected: selectedInterests, setSelected: setSelectedInterests },
    resources: { catalog: resourcesCatalog, selected: selectedResources, setSelected: setSelectedResources },
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Personaliza tu Experiencia</Text>
        <Text style={styles.subtitle}>
          Selecciona tus gustos, intereses y recursos para recibir las mejores recomendaciones.
        </Text>

        {SECTIONS.map((section) => {
          const { catalog, selected, setSelected } = sectionData[section.key];
          return (
            <View key={section.key} style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Feather name={section.icon} size={16} color={COLORS.cyanIcon} />
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <Text style={styles.sectionDescription}>{section.description}</Text>

              <View style={styles.chipsContainer}>
                {catalog.map((item) => {
                  const isSelected = selected.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => toggleItem(item.id, selected, setSelected)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.88}
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
    backgroundColor: COLORS.bg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: 12,
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 22,
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionDescription: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipSelected: {
    backgroundColor: COLORS.cyan,
    borderColor: COLORS.cyan,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  chipTextSelected: {
    color: '#ffffff',
  },
  saveButton: {
    backgroundColor: COLORS.orange,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
