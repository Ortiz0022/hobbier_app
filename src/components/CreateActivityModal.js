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
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';

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
            placeholder={forCatalog ? "Ej. Pinta un cuadro abstracto" : "Ej. Leer un capítulo del libro"}
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder={forCatalog ? "Explica detalladamente qué debe hacer el usuario..." : "Describe de qué trata tu reto personal..."}
            placeholderTextColor={colors.textMuted}
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

          {forCatalog && (
            <Text style={styles.helperText}>
              Sin gusto, la actividad se recomienda a todo el mundo por igual en vez de
              a quien le interesa.
            </Text>
          )}


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
            {forCatalog && (
              <>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Edad Mínima</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej. 12"
                    placeholderTextColor={colors.textMuted}
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
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={maxAge}
                    onChangeText={setMaxAge}
                  />
                </View>
              </>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={creating}>
              {creating ? (
                <ActivityIndicator color={colors.onPrimary} />
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
    backgroundColor: colors.surface,
    borderRadius: 24,
    flexGrow: 0,
    maxHeight: '85%',
  },
  contentInner: {
    padding: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.text,
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
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  dropdownPlaceholder: {
    color: colors.textMuted,
    fontWeight: '400',
  },
  dropdownChevron: {
    fontSize: 10,
    color: colors.textMuted,
  },
  dropdownList: {
    marginTop: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  dropdownOptionText: {
    fontSize: 14,
    color: colors.text,
  },
  dropdownOptionActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 12,
    color: colors.textMuted,
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
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.textFaint,
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});
