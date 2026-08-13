import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { createActivityAdmin } from '../services/adminService';
import { useAuth } from '../context/AuthContext';

const COLORS = {
  bg: '#F8F8F5',
  surface: '#FFFFFF',
  border: '#EBEBE5',
  primaryDark: '#005F73',
  textPrimary: '#1C201D',
  textSecondary: '#666C67',
};

export const CreateActivityModal = ({ visible, onClose, onCreated }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('20');
  const [minAge, setMinAge] = useState('');
  const [creating, setCreating] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPoints('20');
    setMinAge('');
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
      createdBy: user?.id,
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
        <View style={styles.content}>
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
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={creating}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={creating}>
              {creating ? (
                <ActivityIndicator color={COLORS.primaryDark} />
              ) : (
                <Text style={styles.saveBtnText}>Guardar Actividad</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
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
    backgroundColor: '#E7E4DC',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#8FE9F5',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: COLORS.primaryDark,
    fontSize: 15,
    fontWeight: '700',
  },
});
