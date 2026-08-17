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
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import { uploadAvatarImage, getUserActivities } from '../../services/activityService';
import { getUserPosts } from '../../services/socialService';
import { CreateActivityModal } from '../../components/CreateActivityModal';

const TABS = [
  { key: 'fotos', label: 'Fotos' },
  { key: 'actividades', label: 'Actividades' },
];

// Misma función que usa ActivityCard.js para mapear categoría/título a un ícono.
const getCategoryStyle = (categoryObj, title = '') => {
  const catName = categoryObj?.name || '';
  const searchKey = `${catName} ${title}`.toLowerCase();

  let name = catName || 'Hobby';
  let iconName = 'star';

  if (searchKey.includes('arte') || searchKey.includes('pint') || searchKey.includes('cerám')) {
    name = catName || 'Arte';
    iconName = 'edit-2';
  } else if (searchKey.includes('tecno') || searchKey.includes('python') || searchKey.includes('idioma') || searchKey.includes('program')) {
    name = catName || 'Tecnología';
    iconName = 'monitor';
  } else if (searchKey.includes('natura') || searchKey.includes('botán') || searchKey.includes('deport') || searchKey.includes('paseo') || searchKey.includes('camin')) {
    name = catName || 'Naturaleza';
    iconName = 'map';
  } else if (searchKey.includes('músic') || searchKey.includes('canc') || searchKey.includes('jam') || searchKey.includes('instrum')) {
    name = catName || 'Música';
    iconName = 'music';
  } else if (searchKey.includes('juego') || searchKey.includes('ajedrez')) {
    name = catName || 'Juegos';
    iconName = 'award';
  } else if (searchKey.includes('leer') || searchKey.includes('libro')) {
    name = catName || 'Lectura';
    iconName = 'book-open';
  }

  return { name, iconName };
};

// Mismos tokens exactos que usan PendingActivityScreen, ActivitiesHeader,
// ActivityCard e InlineEvidenceUploader (pantalla "Actividad").
const COLORS = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#F0F3F5',
  textPrimary: '#08333D',
  textSecondary: '#64748B',
  textMuted: '#8A908B',
  cyan: '#00C9FD',
  cyanIcon: '#0C8AA6',
  cyanSoft: 'rgba(0, 201, 253, 0.09)',
  cyanBorder: 'rgba(0, 201, 253, 0.22)',
  cyanCardBorder: '#D4F1F9',
  cyanDropzoneBg: 'rgba(0, 201, 253, 0.05)',
  cyanDropzoneBorder: 'rgba(0, 201, 253, 0.35)',
  gold: '#FFB300',
  goldSoft: '#FFF9EB',
  goldBorder: 'rgba(255, 179, 0, 0.3)',
  orange: '#FF5A00',
  disabledBg: '#F1F3F5',
  disabledText: '#9AA0A6',
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

  const [completedActivities, setCompletedActivities] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const [viewerImage, setViewerImage] = useState(null);
  const [expandedActivityId, setExpandedActivityId] = useState(null);

  const [activeTab, setActiveTab] = useState('fotos');

  const loadExtras = useCallback(async () => {
    if (!profile?.id) return;

    setLoadingStats(true);
    const { activities } = await getUserActivities(profile.id);
    const completed = (activities || []).filter((a) => a.status === 'COMPLETED');
    setCompletedActivities(completed);
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          <View style={styles.headerRow}>
            <View style={styles.titleCol}>
              <Text style={styles.mainTitle}>Mi perfil</Text>
              <Text style={styles.userHandleText}>@{profile?.username}</Text>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setMenuOpen(true)}
                activeOpacity={0.8}
              >
                <Feather name="menu" size={17} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
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
                <Feather name="edit-2" size={16} color={COLORS.textPrimary} />
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
                <Feather name="sliders" size={16} color={COLORS.textPrimary} />
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
                <Feather name="plus-circle" size={16} color={COLORS.orange} />
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
                    <Feather name="x" size={18} color={COLORS.textPrimary} />
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

                    <View style={styles.viewerStatsRow}>
                      <View style={styles.viewerStatItem}>
                        <Feather name="heart" size={13} color={COLORS.textSecondary} />
                        <Text style={styles.viewerStatText}>{viewerImage.reactionsCount || 0}</Text>
                      </View>

                      {!!viewerImage.completedAt && (
                        <View style={styles.viewerStatItem}>
                          <Feather name="clock" size={13} color={COLORS.textSecondary} />
                          <Text style={styles.viewerStatText}>
                            {new Date(viewerImage.completedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                      )}

                      <View style={styles.viewerStatItem}>
                        <Feather name="star" size={13} color={COLORS.gold} />
                        <Text style={styles.viewerStatText}>+{viewerImage.points || 0} pts</Text>
                      </View>
                    </View>
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
              <Feather name="star" size={13} color={COLORS.gold} />
              <Text style={styles.statChipText}>{profile?.points || 0} puntos</Text>
            </View>
            <View style={styles.statChipCyan}>
              <Feather name="check-circle" size={13} color={COLORS.cyanIcon} />
              <Text style={styles.statChipCyanText}>
                {loadingPosts ? '…' : `${posts.length} actividades`}
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
              <TouchableOpacity
                style={styles.dashedDropzone}
                onPress={handlePickAvatar}
                activeOpacity={0.85}
              >
                {newImageUri ? (
                  <Image source={{ uri: newImageUri }} style={styles.dropzonePreview} />
                ) : (
                  <View style={styles.dropzonePlaceholder}>
                    <View style={styles.cameraIconContainer}>
                      <View style={styles.cameraCircle}>
                        <Feather name="camera" size={28} color={COLORS.textPrimary} />
                      </View>
                      <View style={styles.plusIconBadge}>
                        <Feather name="plus-circle" size={18} color={COLORS.orange} />
                      </View>
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
            <View style={styles.tabsRow}>
              {TABS.map((tab) => {
                const active = tab.key === activeTab;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.tabItem, active && styles.tabItemActive]}
                    onPress={() => setActiveTab(tab.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tabItemText, active && styles.tabItemTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {activeTab === 'actividades' && (
              loadingStats ? (
                <ActivityIndicator color={COLORS.cyanIcon} style={styles.sectionLoader} />
              ) : completedActivities.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    Todavía no completaste ninguna actividad.
                  </Text>
                </View>
              ) : (
                <View style={styles.activitiesList}>
                  {completedActivities.map((item) => {
                    const isExpanded = expandedActivityId === item.id;
                    const activityPosts = item.posts || [];
                    const catStyle = getCategoryStyle(item.activity?.category, item.activity?.title);
                    const totalRepetitions = activityPosts.length > 0 ? activityPosts.length : 1;
                    return (
                      <View
                        key={item.id}
                        style={[styles.activityCard, isExpanded && styles.activityCardActive]}
                      >
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => setExpandedActivityId(isExpanded ? null : item.id)}
                        >
                          <View style={styles.cardTopRow}>
                            <View style={styles.categoryPill}>
                              <Feather
                                name={catStyle.iconName}
                                size={12}
                                color={COLORS.cyanIcon}
                                style={{ marginRight: 4 }}
                              />
                              <Text style={styles.categoryText} numberOfLines={1}>
                                {catStyle.name}
                              </Text>
                            </View>

                            <View style={styles.topRightRow}>
                              <View style={styles.pointsBadge}>
                                <Feather name="star" size={11} color={COLORS.textPrimary} />
                                <Text style={styles.pointsBadgeText}>
                                  +{item.points_awarded || item.activity?.points_awarded || 0} pts
                                </Text>
                              </View>
                              <Feather
                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                size={18}
                                color={isExpanded ? COLORS.cyan : COLORS.textMuted}
                                style={{ marginLeft: 6 }}
                              />
                            </View>
                          </View>

                          <Text style={styles.titleText}>
                            {item.activity?.title || 'Actividad completada'}
                          </Text>

                          <View style={styles.streakRow}>
                            <Feather name="zap" size={12} color={COLORS.orange} style={{ marginRight: 4 }} />
                            <Text style={styles.streakText}>
                              Has completado este reto {totalRepetitions}{' '}
                              {totalRepetitions === 1 ? 'vez' : 'veces'}
                            </Text>
                          </View>

                          {item.activity?.description ? (
                            <Text
                              style={styles.descText}
                              numberOfLines={isExpanded ? undefined : 2}
                            >
                              {item.activity.description}
                            </Text>
                          ) : null}
                        </TouchableOpacity>

                        {isExpanded && (
                          <View style={styles.photosSection}>
                            {activityPosts.length === 0 ? (
                              <Text style={styles.emptyText}>
                                Todavía no hay fotos para esta actividad.
                              </Text>
                            ) : (
                              <View style={styles.igGrid}>
                                {activityPosts.map((post) => (
                                  <TouchableOpacity
                                    key={post.id}
                                    style={styles.igThumb}
                                    activeOpacity={0.85}
                                    onPress={() =>
                                      setViewerImage({
                                        uri: post.image_url,
                                        title: item.activity?.title,
                                        category: item.activity?.category?.name,
                                        points: item.activity?.points_awarded || 0,
                                        completedAt: post.created_at,
                                        reactionsCount: (post.post_reactions || []).length,
                                      })
                                    }
                                  >
                                    <Image
                                      source={{ uri: post.image_url }}
                                      style={styles.igThumbImage}
                                    />
                                  </TouchableOpacity>
                                ))}
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )
            )}

            {activeTab === 'fotos' && (
              loadingPosts ? (
                <ActivityIndicator color={COLORS.cyanIcon} style={styles.sectionLoader} />
              ) : posts.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    Todavía no subiste fotos de tus actividades.
                  </Text>
                </View>
              ) : (
                <View style={styles.photoGrid}>
                  {posts.map((post) => {
                    const title = post.user_activity?.activity?.title || 'Actividad completada';
                    const category = post.user_activity?.activity?.category?.name;
                    const points = post.user_activity?.activity?.points_awarded || 0;
                    const reactionsCount = (post.post_reactions || []).length;
                    return (
                      <TouchableOpacity
                        key={post.id}
                        activeOpacity={0.85}
                        onPress={() =>
                          setViewerImage({
                            uri: post.image_url,
                            title,
                            category,
                            points,
                            completedAt: post.created_at,
                            reactionsCount,
                          })
                        }
                        style={styles.photoCard}
                      >
                        <View style={styles.photoImageWrap}>
                          <Image
                            source={{ uri: post.image_url }}
                            style={styles.photoImage}
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )
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
    paddingTop: 16,
    paddingBottom: 32,
  },
  headerContainer: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleCol: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  userHandleText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 51, 61, 0.15)',
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
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
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
    marginTop: 8,
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: COLORS.cyanCardBorder,
  },
  avatarLarge: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: COLORS.cyan,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.cyanCardBorder,
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
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(8, 51, 61, 0.8)',
    paddingVertical: 5,
    borderBottomLeftRadius: 46,
    borderBottomRightRadius: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditOverlayText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  profileUsername: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.goldSoft,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
  },
  statChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statChipCyan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.cyanSoft,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.cyanBorder,
  },
  statChipCyanText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionLoader: {
    marginBottom: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: COLORS.cyan,
  },
  tabItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabItemTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  activitiesList: {
    gap: 10,
    marginBottom: 8,
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: -20,
  },
  activityCardActive: {
    borderColor: COLORS.cyanCardBorder,
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cyanSoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderWidth: 1,
    borderColor: COLORS.cyanBorder,
    flexShrink: 1,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 3.5,
  },
  pointsBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  titleText: {
    fontSize: 15.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 21,
    marginBottom: 3,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  descText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    fontWeight: '400',
    lineHeight: 17,
  },
  photosSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  igGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -14,
    marginBottom: -14,
    overflow: 'hidden',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  igThumb: {
    width: '33.3%',
    aspectRatio: 1,
    backgroundColor: COLORS.cyanSoft,
  },
  igThumbImage: {
    width: '100%',
    height: '100%',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -20,
    marginBottom: 8,
  },
  photoCard: {
    width: '33.3%',
    aspectRatio: 1,
  },
  photoImageWrap: {
    flex: 1,
    backgroundColor: COLORS.cyanSoft,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailsTitle: {
    fontSize: 15.5,
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
    backgroundColor: '#FFFFFF',
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
    marginBottom: 12,
  },
  dashedDropzone: {
    height: 165,
    backgroundColor: COLORS.cyanDropzoneBg,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.cyanDropzoneBorder,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  dropzonePlaceholder: {
    alignItems: 'center',
    padding: 16,
  },
  cameraIconContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  cameraCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  plusIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  dropzoneText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  dropzonePreview: {
    width: '100%',
    height: '100%',
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: COLORS.disabledBg,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: COLORS.orange,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 51, 61, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  viewerCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  viewerImageWrap: {
    position: 'relative',
    backgroundColor: COLORS.cyanSoft,
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
    padding: 18,
    alignItems: 'flex-start',
    gap: 8,
  },
  viewerCategoryBadge: {
    backgroundColor: COLORS.cyanSoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.cyanBorder,
  },
  viewerCategoryBadgeText: {
    color: COLORS.textPrimary,
    fontSize: 11.5,
    fontWeight: '600',
  },
  viewerTitle: {
    color: COLORS.textPrimary,
    fontSize: 15.5,
    fontWeight: '700',
  },
  viewerStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
  },
  viewerStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  viewerStatText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
  },
});
