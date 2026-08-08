import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
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
import { supabase } from '../../config/supabase';
import { uploadAvatarImage } from '../../services/activityService';

export const ProfileScreen = ({ onGoToPreferences }) => {
  const { profile, refreshProfile, signOut, isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [newImageUri, setNewImageUri] = useState(null);
  const [saving, setSaving] = useState(false);

  const handlePickAvatar = async () => {
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
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setNewImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Error al seleccionar avatar:', err);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      let finalAvatarUrl = profile.avatar_url;

      // Si se seleccionó una nueva foto local, subirla a Supabase Storage
      if (newImageUri) {
        const { publicUrl, error: uploadErr } = await uploadAvatarImage(profile.id, newImageUri);
        if (uploadErr || !publicUrl) {
          throw new Error('Error al subir la nueva foto de perfil.');
        }
        finalAvatarUrl = publicUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          avatar_url: finalAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      setEditing(false);
      setNewImageUri(null);

      const msg = 'Perfil actualizado correctamente con tu nueva foto.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Éxito', msg);
    } catch (err) {
      const msg = err.message || 'Error al actualizar perfil.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const displayImageUri = newImageUri || profile?.avatar_url;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* CABECERA PERFIL */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={editing ? handlePickAvatar : null}
            activeOpacity={editing ? 0.7 : 1}
          >
            {displayImageUri ? (
              <Image source={{ uri: displayImageUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarText}>
                  {(profile?.full_name || 'U')[0].toUpperCase()}
                </Text>
              </View>
            )}

            {editing && (
              <View style={styles.avatarEditOverlay}>
                <Text style={styles.avatarEditOverlayText}>📸 Cambiar</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.profileName}>{profile?.full_name}</Text>
          <Text style={styles.profileUsername}>@{profile?.username}</Text>

          {isAdmin && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>🛡️ ADMINISTRADOR</Text>
            </View>
          )}

          {/* CARD DE PUNTOS */}
          <View style={styles.pointsCard}>
            <Text style={styles.pointsEmoji}>🏆</Text>
            <Text style={styles.pointsValue}>{profile?.points || 0}</Text>
            <Text style={styles.pointsLabel}>Puntos Acumulados</Text>
          </View>
        </View>

        {/* DETALLES DE EDICIÓN */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Información Personal</Text>

          {!editing ? (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nombre Completo:</Text>
                <Text style={styles.infoValue}>{profile?.full_name}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nombre de usuario:</Text>
                <Text style={styles.infoValue}>@{profile?.username}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Fecha de Nacimiento:</Text>
                <Text style={styles.infoValue}>{profile?.birth_date}</Text>
              </View>

              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => {
                  setFullName(profile?.full_name || '');
                  setNewImageUri(null);
                  setEditing(true);
                }}
              >
                <Text style={styles.editBtnText}>✏️ Editar Perfil y Foto</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.inputLabel}>Nombre Completo</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
              />

              <Text style={styles.inputLabel}>Foto de Perfil</Text>
              <TouchableOpacity style={styles.pickPhotoBtn} onPress={handlePickAvatar}>
                <Text style={styles.pickPhotoBtnText}>
                  📷 {newImageUri ? 'Cambiar fotografía seleccionada' : 'Seleccionar foto desde galería/cámara'}
                </Text>
              </TouchableOpacity>

              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setEditing(false);
                    setNewImageUri(null);
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Guardar Cambios</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* ACCIONES DEL PERFIL */}
        <TouchableOpacity style={styles.prefBtn} onPress={onGoToPreferences}>
          <Text style={styles.prefBtnText}>⚙️ Configurar Gustos, Intereses y Recursos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
          <Text style={styles.logoutBtnText}>🚪 Cerrar Sesión</Text>
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
  scrollContent: {
    padding: 24,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#6366f1',
  },
  avatarLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#6366f1',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '800',
  },
  avatarEditOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingVertical: 4,
    borderBottomLeftRadius: 45,
    borderBottomRightRadius: 45,
    alignItems: 'center',
  },
  avatarEditOverlayText: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
  },
  profileUsername: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  adminBadge: {
    backgroundColor: '#312e81',
    borderColor: '#6366f1',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 8,
  },
  adminBadgeText: {
    color: '#c7d2fe',
    fontSize: 12,
    fontWeight: '800',
  },
  pointsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#10b981',
    width: '100%',
  },
  pointsEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#10b981',
  },
  pointsLabel: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  infoValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  editBtn: {
    backgroundColor: '#334155',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  editBtnText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 14,
    marginBottom: 12,
  },
  pickPhotoBtn: {
    backgroundColor: '#0f172a',
    borderColor: '#4f46e5',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  pickPhotoBtnText: {
    color: '#818cf8',
    fontSize: 13,
    fontWeight: '700',
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#cbd5e1',
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  prefBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  prefBtnText: {
    color: '#818cf8',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutBtn: {
    backgroundColor: '#451a03',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#b45309',
  },
  logoutBtnText: {
    color: '#fca5a5',
    fontSize: 14,
    fontWeight: '700',
  },
});
