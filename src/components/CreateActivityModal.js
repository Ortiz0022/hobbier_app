import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Text, TextInput } from './scaledText';
import { createActivityAdmin } from '../services/adminService';
import { fetchActivityCategories, fetchAllCatalogs } from '../services/catalogService';
import { TOKENS } from '../theme/designTokens';
import { useAuth } from '../context/AuthContext';

// Alias a los tokens del sistema. Antes eran hexadecimales propios de este
// archivo, así que el formulario iba por libre: fondo beige y botón cian claro
// que no existían en ninguna otra pantalla.
const COLORS = {
  bg: TOKENS.colors.white,
  surface: TOKENS.colors.white,
  border: TOKENS.colors.inactiveBorder,
  primaryDark: TOKENS.colors.active,
  textPrimary: TOKENS.colors.textDark,
  textSecondary: TOKENS.colors.textMuted,
};

/**
 * Formulario de creación de actividades, compartido por Perfil y Admin.
 *
 * `forCatalog` marca la diferencia de fondo entre ambos usos:
 *   - false (Perfil): la actividad se guarda con `created_by = tu id`, y
 *     get_recommended_activity solo se la ofrece a esa persona. Es una actividad
 *     personal.
 *   - true (Admin): se guarda con `created_by NULL`, así entra al catálogo y se
 *     puede recomendar a cualquiera.
 *
 * Mezclarlos haría que todo lo creado desde el panel quedara visible solo para
 * el administrador que lo creó.
 */
export const CreateActivityModal = ({ visible, onClose, onCreated, forCatalog = false }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('20');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [creating, setCreating] = useState(false);

  // null = sin categoría. Es el valor POR DEFECTO: la categoría es opcional, y
  // obligar a elegir una empujaría a encasillar actividades que no encajan.
  const [categories, setCategories] = useState([]);

  // Gusto con el que se etiqueta la actividad. Es lo que decide a quién se le
  // recomienda: sin gusto, la actividad sale para cualquiera por igual.
  const [likes, setLikes] = useState([]);
  const [likeId, setLikeId] = useState(null);
  const [likeOpen, setLikeOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    fetchActivityCategories().then(({ categories: list }) => setCategories(list));
    fetchAllCatalogs().then(({ likes: list }) => setLikes(list || []));
  }, [visible]);

  const likeSeleccionado = likes.find((l) => l.id === likeId);

  /**
   * Categoría deducida del gusto elegido.
   *
   * Se usa la misma regla que get_recommended_activity en SQL: la categoría
   * corresponde al gusto si su nombre EMPIEZA por él (Deportes -> Deportes y
   * Salud). Así el admin elige una sola vez y ambos campos quedan coherentes.
   *
   * Si el gusto no tiene categoría equivalente, queda NULL y la interfaz la
   * muestra como "Libre", que es un estado válido.
   */
  const categoryId = (() => {
    if (!likeSeleccionado) return null;
    const gusto = likeSeleccionado.name.trim().toLowerCase();
    const cat = categories.find((c) => c.name.trim().toLowerCase().startsWith(gusto));
    return cat ? cat.id : null;
  })();

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPoints('20');
    setMinAge('');
    setMaxAge('');
    setLikeId(null);
    setLikeOpen(false);
  };

  const handleClose = () => {
    if (creating) return;
    onClose();
  };

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) {
      const msg = 'Por favor completa el título y la descripción.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Campos requeridos', msg);
      return;
    }

    setCreating(true);
    const { error, activity } = await createActivityAdmin({
      title,
      description,
      pointsAwarded: points,
      minAge,
      maxAge,
      categoryId,
      likeId,
      createdBy: forCatalog ? null : user?.id,
    });
    setCreating(false);

    if (error) {
      const msg = error.message || 'Error al crear la actividad.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    resetForm();
    onClose();
    if (onCreated) onCreated(activity);

    const msg = '¡Actividad creada correctamente!';
    if (Platform.OS === 'web') alert(msg);
    else Alert.alert('Éxito', msg);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        {/* Desplazable y con alto máximo: al abrir el desplegable el formulario
            crece y en pantallas cortas los botones quedaban fuera de vista. */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>Título de la actividad</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. Pinta un cuadro abstracto"
            placeholderTextColor={COLORS.textSecondary}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Explica detalladamente qué debe hacer el usuario..."
            placeholderTextColor={COLORS.textSecondary}
            multiline
            value={description}
            onChangeText={setDescription}
          />

          <Text style={styles.label}>¿A qué gusto corresponde?</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setLikeOpen(!likeOpen)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dropdownText, !likeSeleccionado && styles.dropdownPlaceholder]}>
              {likeSeleccionado ? likeSeleccionado.name : 'Sin gusto asignado'}
            </Text>
            <Text style={styles.dropdownChevron}>{likeOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {/* Se despliega en línea y no en otro Modal: anidar modales en React
              Native da problemas de foco y de cierre en Android. */}
          {likeOpen && (
            <View style={styles.dropdownList}>
              <TouchableOpacity
                style={styles.dropdownOption}
                onPress={() => {
                  setLikeId(null);
                  setLikeOpen(false);
                }}
              >
                <Text style={[styles.dropdownOptionText, likeId === null && styles.dropdownOptionActive]}>
                  Sin gusto asignado
                </Text>
              </TouchableOpacity>

              {likes.map((l) => (
                <TouchableOpacity
                  key={l.id}
                  style={styles.dropdownOption}
                  onPress={() => {
                    setLikeId(l.id);
                    setLikeOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownOptionText, likeId === l.id && styles.dropdownOptionActive]}>
                    {l.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.helperText}>
            Sin gusto, la actividad se recomienda a todo el mundo por igual en vez de
            a quien le interesa.
          </Text>


          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Puntos</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={points}
                onChangeText={setPoints}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Edad Mínima</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. 12"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="number-pad"
                value={minAge}
                onChangeText={setMinAge}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Edad Máxima</Text>
              <TextInput
                style={styles.input}
                placeholder="Sin límite"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="number-pad"
                value={maxAge}
                onChangeText={setMaxAge}
              />
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={creating}>
              {creating ? (
                <ActivityIndicator color={TOKENS.colors.white} />
              ) : (
                <Text style={styles.saveBtnText}>Guardar Actividad</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={creating}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: COLORS.bg,
    borderRadius: 24,
    // Un ScrollView dentro de un contenedor flex se estira para ocupar todo el
    // espacio disponible aunque su contenido sea corto: de ahí el hueco blanco
    // bajo los botones. `flexGrow: 0` lo hace medir por su contenido, y
    // maxHeight solo entra en juego cuando el formulario crece de verdad
    // (al desplegar los gustos).
    flexGrow: 0,
    maxHeight: '85%',
  },
  contentInner: {
    padding: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  inputMultiline: {
    height: 90,
    textAlignVertical: 'top',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  dropdownPlaceholder: {
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  dropdownChevron: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  dropdownList: {
    marginTop: 4,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownOptionText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  dropdownOptionActive: {
    color: COLORS.primaryDark,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginTop: 6,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: TOKENS.colors.inactiveBg,
    borderWidth: 1,
    borderColor: TOKENS.colors.inactiveBorder,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: TOKENS.colors.inactiveText,
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    // Naranja de acción principal (TOKENS.colors.primary), no el turquesa: en
    // esta pantalla el turquesa ya lo llevan el desplegable y los campos, así
    // que el botón que ejecuta se distingue del resto en vez de fundirse.
    backgroundColor: TOKENS.colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: TOKENS.colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
