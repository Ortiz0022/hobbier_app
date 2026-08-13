import React, { useState, useEffect, useCallback } from 'react';
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
  Modal,
  Pressable,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import { uploadAvatarImage, getUserActivities } from '../../services/activityService';
import { getUserPosts } from '../../services/socialService';
import { CreateActivityModal } from '../../components/CreateActivityModal';

const COLORS = {
  bg: '#F8F8F5',
  surface: '#FFFFFF',
  border: '#EBEBE5',
  primary: '#0089A8',
  primaryDark: '#005F73',
  primarySoft: '#D9F7FB',
  accent: '#FF9130',
  textPrimary: '#1C201D',
  textSecondary: '#666C67',
  danger: '#ef4444',
  dangerSoft: '#FEF2F2',
};

export const ProfileScreen = ({ onGoToPreferences }) => {
  const { profile, refreshProfile, signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [newImageUri, setNewImageUri] = useState(null);
  const [saving, setSaving] = useState(false);

  const [createActivityOpen, setCreateActivityOpen] = useState(false);

  const [completedCount, setCompletedCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const [viewerImage, setViewerImage] = useState(null);

  const loadExtras = useCallback(async () => {
    if (!profile?.id) return;

    setLoadingStats(true);
    const { activities } = await getUserActivities(profile.id);
    setCompletedCount((activities || []).filter((a) => a.status === 'COMPLETED').length);
    setLoadingStats(false);

    setLoadingPosts(true);
    const { posts: userPosts } = await getUserPosts(profile.id);
    setPosts(userPosts);
    setLoadingPosts(false);
  }, [profile?.id]);

  useEffect(() => {
    loadExtras();
  }, [loadExtras]);

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
  const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : 'Hobbier';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.navHeader}>
          <Text style={styles.navHeaderTitle}>Hola, {firstName} 👋</Text>

          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setMenuOpen(true)}
            activeOpacity={0.8}
          >
            <Feather name="menu" size={20} color={COLORS.primaryDark} />
          </TouchableOpacity>
        </View>

        <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
          <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
            <View style={styles.menuDropdown}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  setFullName(profile?.full_name || '');
                  setNewImageUri(null);
                  setEditing(true);
                }}
              >
                <Feather name="edit-2" size={16} color={COLORS.primaryDark} />
                <Text style={styles.menuItemText}>Editar perfil</Text>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  onGoToPreferences();
                }}
              >
                <Feather name="settings" size={16} color={COLORS.primaryDark} />
                <Text style={styles.menuItemText}>Configurar Gustos, Intereses y Recursos</Text>
              </TouchableOpacity>

              <View style={styles.menuDivider} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  setCreateActivityOpen(true);
                }}
              >
                <Feather name="plus-circle" size={16} color={COLORS.primaryDark} />
                <Text style={styles.menuItemText}>Crea tu propia actividad</Text>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  signOut();
                }}
              >
                <Feather name="log-out" size={16} color={COLORS.danger} />
                <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Cerrar Sesión</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        <CreateActivityModal
          visible={createActivityOpen}
          onClose={() => setCreateActivityOpen(false)}
        />

        <Modal
          visible={!!viewerImage}
          transparent
          animationType="fade"
          onRequestClose={() => setViewerImage(null)}
        >
          <Pressable style={styles.viewerOverlay} onPress={() => setViewerImage(null)}>
            {viewerImage && (
              <Pressable style={styles.viewerCard} onPress={() => {}}>
                <View style={styles.viewerImageWrap}>
                  <Image
                    source={{ uri: viewerImage.uri }}
                    style={styles.viewerImage}
                    resizeMode="contain"
                  />

                  <TouchableOpacity
                    style={styles.viewerCloseBtn}
                    onPress={() => setViewerImage(null)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Feather name="x" size={18} color={COLORS.primaryDark} />
                  </TouchableOpacity>
                </View>

                {(viewerImage.title || viewerImage.category) && (
                  <View style={styles.viewerCaption}>
                    {viewerImage.category && (
                      <View style={styles.viewerCategoryBadge}>
                        <Text style={styles.viewerCategoryBadgeText}>{viewerImage.category}</Text>
                      </View>
                    )}
                    {viewerImage.title && (
                      <Text style={styles.viewerTitle}>{viewerImage.title}</Text>
                    )}
                  </View>
                )}
              </Pressable>
            )}
          </Pressable>
        </Modal>

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
                <Feather name="camera" size={12} color="#ffffff" />
                <Text style={styles.avatarEditOverlayText}>Cambiar</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.profileName}>{profile?.full_name}</Text>
          <Text style={styles.profileUsername}>@{profile?.username}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statChipText}>✨ {profile?.points || 0} puntos</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statChipText}>
                {loadingStats ? '…' : `🎨 ${completedCount} actividades`}
              </Text>
            </View>
          </View>
        </View>

        {editing ? (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Editar perfil</Text>

            <Text style={styles.inputLabel}>Nombre Completo</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.inputLabel}>Foto de Perfil</Text>
            <View style={styles.uploadWrapper}>
              <View style={[styles.decorDot, styles.dot1]} />
              <View style={[styles.decorDot, styles.dot2]} />
              <View style={[styles.decorDot, styles.dot3]} />
              <View style={[styles.decorDot, styles.dot4]} />
              <View style={[styles.decorDot, styles.dot5]} />

              <TouchableOpacity
                style={styles.dashedDropzone}
                onPress={handlePickAvatar}
                activeOpacity={0.85}
              >
                {newImageUri ? (
                  <Image source={{ uri: newImageUri }} style={styles.dropzonePreview} />
                ) : (
                  <View style={styles.dropzonePlaceholder}>
                    <View style={styles.cameraCircle}>
                      <Feather name="camera" size={26} color={COLORS.primary} />
                    </View>
                    <Text style={styles.dropzoneText}>Sube una foto de tu perfil</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

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
          </View>
        ) : (
          <>
            {loadingPosts ? (
              <ActivityIndicator color={COLORS.primary} style={styles.sectionLoader} />
            ) : posts.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyStateText}>
                  Todavía no subiste fotos de tus actividades.
                </Text>
                <Text style={styles.emptyStateHint}>
                  Completá una actividad y compartí la evidencia para que aparezca acá.
                </Text>
              </View>
            ) : (
              <View style={styles.photoGrid}>
                {posts.map((post, index) => {
                  const title = post.user_activity?.activity?.title || 'Actividad completada';
                  const category = post.user_activity?.activity?.category?.name;
                  const big = index === 0;
                  return (
                    <TouchableOpacity
                      key={post.id}
                      activeOpacity={0.85}
                      onPress={() => setViewerImage({ uri: post.image_url, title, category })}
                      style={[styles.photoCard, big ? styles.photoCardBig : styles.photoCardSmall]}
                    >
                      <View style={styles.photoImageWrap}>
                        <Image
                          source={{ uri: post.image_url }}
                          style={[styles.photoImage, big ? styles.photoImageBig : styles.photoImageSmall]}
                        />

                        <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
                          <Defs>
                            <LinearGradient id={`scrim-${post.id}`} x1="0" y1="0" x2="0" y2="1">
                              <Stop offset="0.4" stopColor="#000000" stopOpacity="0" />
                              <Stop offset="1" stopColor="#000000" stopOpacity="0.6" />
                            </LinearGradient>
                          </Defs>
                          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#scrim-${post.id})`} />
                        </Svg>

                        <View
                          style={[
                            styles.photoOverlayContent,
                            !big && styles.photoOverlayContentSmall,
                          ]}
                        >
                          {category && (
                            <View
                              style={[
                                styles.photoCategoryBadge,
                                !big && styles.photoCategoryBadgeSmall,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.photoCategoryBadgeText,
                                  !big && styles.photoCategoryBadgeTextSmall,
                                ]}
                                numberOfLines={1}
                              >
                                {category}
                              </Text>
                            </View>
                          )}

                          <Text
                            style={[
                              styles.photoCardTitleOverlay,
                              big ? styles.photoCardTitleOverlayBig : styles.photoCardTitleOverlaySmall,
                            ]}
                            numberOfLines={big ? 2 : 1}
                          >
                            {title}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 8,
  },
  navHeaderTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  menuDropdown: {
    position: 'absolute',
    top: 58,
    right: 20,
    width: 250,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  menuItemText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  menuItemTextDanger: {
    color: COLORS.danger,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  profileHeader: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 38,
    fontWeight: '800',
  },
  avatarEditOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(0, 95, 115, 0.8)',
    paddingVertical: 5,
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditOverlayText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  profileUsername: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  statChip: {
    backgroundColor: '#FFEEDD',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statChipText: {
    color: '#C2530A',
    fontSize: 13,
    fontWeight: '600',
  },
  sectionLoader: {
    marginBottom: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  photoCard: {
    marginBottom: 2,
  },
  photoCardBig: {
    width: '100%',
  },
  photoCardSmall: {
    width: '47%',
  },
  photoImageWrap: {
    position: 'relative',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: COLORS.primarySoft,
  },
  photoImage: {
    width: '100%',
  },
  photoImageBig: {
    height: 170,
  },
  photoImageSmall: {
    height: 150,
  },
  photoOverlayContent: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
    alignItems: 'flex-start',
    gap: 6,
  },
  photoOverlayContentSmall: {
    left: 8,
    right: 8,
    bottom: 8,
    gap: 4,
  },
  photoCategoryBadge: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  photoCategoryBadgeSmall: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    maxWidth: '100%',
  },
  photoCategoryBadgeText: {
    color: COLORS.primaryDark,
    fontSize: 11,
    fontWeight: '700',
  },
  photoCategoryBadgeTextSmall: {
    fontSize: 9,
  },
  photoCardTitleOverlay: {
    color: '#ffffff',
    fontWeight: '700',
  },
  photoCardTitleOverlayBig: {
    fontSize: 17,
  },
  photoCardTitleOverlaySmall: {
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyStateHint: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  emptyStateText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 6,
  },
  detailsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  detailsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 14,
    marginBottom: 12,
  },
  uploadWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  dashedDropzone: {
    height: 160,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#8AD9E6',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    zIndex: 2,
  },
  dropzonePlaceholder: {
    alignItems: 'center',
    padding: 16,
  },
  cameraCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#B8EEF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  dropzoneText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.primary,
    textAlign: 'center',
  },
  dropzonePreview: {
    width: '100%',
    height: '100%',
  },
  decorDot: {
    position: 'absolute',
    borderRadius: 10,
    zIndex: 1,
  },
  dot1: {
    top: 15,
    left: -8,
    width: 7,
    height: 7,
    backgroundColor: '#8AD9E6',
  },
  dot2: {
    top: 35,
    right: -6,
    width: 9,
    height: 9,
    backgroundColor: '#FF9130',
  },
  dot3: {
    bottom: 25,
    left: -6,
    width: 8,
    height: 8,
    backgroundColor: '#12D6EC',
  },
  dot4: {
    bottom: 12,
    right: -8,
    width: 6,
    height: 6,
    backgroundColor: '#FFC58A',
  },
  dot5: {
    top: 80,
    right: -10,
    width: 5,
    height: 5,
    backgroundColor: COLORS.primary,
    opacity: 0.5,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 32, 29, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  viewerCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  viewerImageWrap: {
    position: 'relative',
    backgroundColor: COLORS.primarySoft,
  },
  viewerImage: {
    width: '100%',
    height: 320,
  },
  viewerCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  viewerCaption: {
    padding: 20,
    alignItems: 'flex-start',
    gap: 8,
  },
  viewerCategoryBadge: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  viewerCategoryBadgeText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  viewerTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
});
