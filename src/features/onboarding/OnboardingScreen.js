import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { Text, TextInput } from '../../components/scaledText';
import Feather from '@expo/vector-icons/Feather';
import { SelectableTag } from '../../components/SelectableTag';
import { TOKENS } from '../../theme/designTokens';
import { getCatalogIcon } from './catalogIcons';
import { useAuth } from '../../context/AuthContext';
// Se reutilizan las reglas de fecha del registro en lugar de escribir otras:
// ya están probadas y así el formato pedido es el mismo en toda la app.
import { validateBirthDate } from '../auth/validation';
import {
  fetchAllCatalogs,
  fetchUserPreferences,
  saveUserPreferences,
  saveUserBirthDate,
} from '../../services/catalogService';

const SECTIONS = [
  {
    key: 'likes',
    title: 'Mis Gustos',
    description: '¿Qué temáticas disfrutas en tu día a día?',
  },
  {
    key: 'interests',
    title: 'Mis Objetivos',
    description: '¿Qué habilidades buscas desarrollar?',
  },
  {
    key: 'resources',
    title: 'Recursos Disponibles',
    description: '¿Qué herramientas tienes a la mano?',
  },
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

  // Fecha de nacimiento: define qué metas son aptas por edad.
  const [birthDate, setBirthDate] = useState('');
  const [birthDateError, setBirthDateError] = useState('');


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
      // Se muestra en dd/mm/aaaa aunque la base la guarde como YYYY-MM-DD.
      if (prefs.birthDate) {
        const [y, m, d] = prefs.birthDate.split('-');
        setBirthDate(`${d}/${m}/${y}`);
      }
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

    // La fecha se valida ANTES de tocar la red: si está mal, no tiene sentido
    // guardar preferencias a medias.
    const birth = validateBirthDate(birthDate);
    if (birth.error) {
      setBirthDateError(birth.error);
      return;
    }
    setBirthDateError('');

    setSaving(true);

    const [result] = await Promise.all([
      saveUserPreferences(user.id, selectedLikes, selectedInterests, selectedResources),
      saveUserBirthDate(user.id, birth.isoDate),
    ]);

    setSaving(false);

    if (result.success) {
      const msg = 'Preferencias guardadas correctamente.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('¡Excelente!', msg);
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
        <ActivityIndicator size="large" color={TOKENS.colors.active} />
        <Text style={styles.loadingText}>Cargando catálogos...</Text>
      </View>
    );
  }

  const sectionData = {
    likes: { catalog: likesCatalog, selected: selectedLikes, setSelected: setSelectedLikes },
    interests: {
      catalog: interestsCatalog,
      selected: selectedInterests,
      setSelected: setSelectedInterests,
    },
    resources: {
      catalog: resourcesCatalog,
      selected: selectedResources,
      setSelected: setSelectedResources,
    },
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.mainTitle}>Personaliza tu Experiencia</Text>

        {/* SECCIÓN: FECHA DE NACIMIENTO */}
        <View style={styles.section}>
          <View style={styles.rowHeader}>
            <Text style={styles.sectionTitle}>Tu Fecha de Nacimiento</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>OBLIGATORIO</Text>
            </View>
          </View>
          <Text style={styles.sectionSubtitle}>
            Usamos tu edad para asegurarnos de sugerirte actividades adecuadas.
          </Text>

          <View style={[styles.inputRow, birthDateError ? styles.inputRowInvalid : null]}>
            <Feather name="calendar" size={16} color={TOKENS.colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="dd/mm/aaaa"
              placeholderTextColor={TOKENS.colors.textMuted}
              value={birthDate}
              onChangeText={(value) => {
                setBirthDate(value);
                if (birthDateError) setBirthDateError('');
              }}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          {birthDateError ? <Text style={styles.errorText}>{birthDateError}</Text> : null}
        </View>

        {/* SECCIONES DE TAGS: gustos, objetivos y recursos */}
        {SECTIONS.map((section) => {
          const { catalog, selected, setSelected } = sectionData[section.key];
          return (
            <View key={section.key} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionSubtitle}>{section.description}</Text>

              <View style={styles.tagsContainer}>
                {catalog.map((item) => (
                  <SelectableTag
                    key={item.id}
                    label={item.name}
                    icon={getCatalogIcon(item.name)}
                    isSelected={selected.includes(item.id)}
                    onPress={() => toggleItem(item.id, selected, setSelected)}
                  />
                ))}
              </View>
            </View>
          );
        })}

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.submitButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={TOKENS.colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>Guardar Preferencias</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: TOKENS.colors.white,
  },
  section: {
    marginBottom: TOKENS.spacing.lg,
  },
  contentContainer: {
    padding: TOKENS.spacing.lg,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: TOKENS.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: TOKENS.spacing.md,
    fontSize: 14,
    color: TOKENS.colors.textMuted,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: TOKENS.colors.textDark,
    marginBottom: 22,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    // Envuelve para que la insignia baje de línea en vez de empujar el título
    // fuera de la pantalla con la letra del sistema agrandada.
    flexWrap: 'wrap',
    gap: TOKENS.spacing.sm,
    marginBottom: TOKENS.spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TOKENS.colors.textDark,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: TOKENS.colors.textMuted,
    marginTop: 2,
    marginBottom: TOKENS.spacing.md,
    lineHeight: 18,
  },
  badge: {
    backgroundColor: TOKENS.colors.badgeBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: TOKENS.spacing.sm,
  },
  badgeText: {
    color: TOKENS.colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: TOKENS.colors.inactiveBg,
    borderWidth: 1,
    borderColor: TOKENS.colors.inactiveBorder,
    borderRadius: TOKENS.radius.card,
    paddingHorizontal: TOKENS.spacing.md,
  },
  inputRowInvalid: {
    borderColor: TOKENS.colors.danger,
  },
  input: {
    flex: 1,
    paddingVertical: TOKENS.spacing.md,
    fontSize: 15,
    color: TOKENS.colors.textDark,
  },
  errorText: {
    color: TOKENS.colors.danger,
    fontSize: 12,
    marginTop: 6,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Permite que pasen a la siguiente línea de forma natural
    alignItems: 'center', // Alinea los elementos verticalmente en su propia fila
    gap: TOKENS.spacing.sm, // Separación exacta entre filas y columnas
    marginTop: TOKENS.spacing.sm,
  },
  submitButton: {
    backgroundColor: TOKENS.colors.primary,
    paddingVertical: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.card,
    alignItems: 'center',
    marginTop: TOKENS.spacing.md,
  },
  submitButtonText: {
    color: TOKENS.colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
