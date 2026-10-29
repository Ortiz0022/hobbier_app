import { useThemeValues } from '../../context/ThemeContext';
import { createThemeStyles } from '../../theme/themeRuntime';
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
// En web el RefreshControl de react-native-web no hace nada: este sí.
import { RefreshControl } from '../../components/refrescoArrastrando';
import { Text, TextInput } from '../../components/scaledText';
import Feather from '@expo/vector-icons/Feather';
import { Languages } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useNotify } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../config/supabase';
import { uploadAvatarImage, getUserActivities } from '../../services/activityService';
import { getUserPosts, getFriendsList, deleteOwnPost } from '../../services/socialService';
import { CreateActivityModal } from '../../components/CreateActivityModal';
import { LegalDocumentModal } from '../../legal/LegalDocumentModal';
import { MyAdRequestsModal } from '../recommendations/components/MyAdRequestsModal';
import { AdRequestModal } from '../recommendations/components/AdRequestModal';
import { getMyAdRequests } from '../../services/adsService';
import { formatDateTime } from '../../utils/dateFormat';
import { getCategoryStyle, getCategoryLabel } from '../../utils/category';

// Mismos tokens exactos que usan PendingActivityScreen, ActivitiesHeader,
// ActivityCard e InlineEvidenceUploader (pantalla "Actividad").


export const ProfileScreen = ({ onGoToPreferences, onNavigateToFriends, onNavigateToAdmin }) => {
  const { theme, COLORS, styles } = useThemeValues(getProfileScreenTheme);

  const { profile, refreshProfile, signOut, isAdmin } = useAuth();
  const { notify, confirm } = useNotify();
  const { t, language, setLanguage, languages } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [newImageUri, setNewImageUri] = useState(null);
  const [saving, setSaving] = useState(false);

  const [createActivityOpen, setCreateActivityOpen] = useState(false);

  // "Mis solicitudes de anuncio": se piden al abrirlas, para ver siempre el
  // estado actual (el admin puede haberlas revisado hace un momento).
  const [myAdRequestsOpen, setMyAdRequestsOpen] = useState(false);
  const [myAdRequests, setMyAdRequests] = useState([]);
  const [adRequestOpen, setAdRequestOpen] = useState(false);

  const loadMyAdRequests = async () => {
    const { requests } = await getMyAdRequests(profile?.id);
    setMyAdRequests(requests);
  };

  const [completedActivities, setCompletedActivities] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const [friendsCount, setFriendsCount] = useState(0);

  const [viewerImage, setViewerImage] = useState(null);
  // Documento legal abierto desde el menú: 'privacy' | 'terms' | null
  const [legalDoc, setLegalDoc] = useState(null);
  const [expandedActivityId, setExpandedActivityId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState('fotos');

  const TABS = [
    { key: 'fotos', label: t('profile.photos_tab') },
    { key: 'actividades', label: t('profile.activities_tab') },
  ];

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

    const { friends } = await getFriendsList(profile.id);
    setFriendsCount((friends || []).length);
  }, [profile?.id]);

  useEffect(() => {
    loadExtras();
  }, [loadExtras]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExtras();
    setRefreshing(false);
  };

  // Este perfil es siempre el propio, así que todas las fotos del visor se
  // pueden eliminar. El servidor vuelve a comprobar la autoría de todos modos.
  const [deletingPost, setDeletingPost] = useState(false);
  const handleDeleteViewerPost = async () => {
    const postId = viewerImage?.postId;
    if (!postId || deletingPost) return;

    const ok = await confirm({
      title: 'Eliminar publicación',
      message: '¿Seguro que quieres eliminar esta publicación? Dejará de verse en el feed y en tu perfil.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;

    setDeletingPost(true);
    const { error } = await deleteOwnPost(postId);
    setDeletingPost(false);

    if (error) {
      notify(error.message || 'No se pudo eliminar la publicación.', { type: 'error', title: 'Error' });
      return;
    }

    setViewerImage(null);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setCompletedActivities((prev) =>
      prev.map((a) => ({ ...a, posts: (a.posts || []).filter((p) => p.id !== postId) }))
    );
    notify('Publicación eliminada.', { type: 'success', title: 'Listo' });
  };

  const handlePickAvatar = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        notify('Se requiere permiso para acceder a tus fotos.', { type: 'warning', title: 'Permiso requerido' });
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

      notify('Perfil actualizado correctamente con tu nueva foto.', { type: 'success', title: 'Éxito' });
    } catch (err) {
      notify(err.message || 'Error al actualizar perfil.', { type: 'error', title: 'Error' });
    } finally {
      setSaving(false);
    }
  };

  const displayImageUri = newImageUri || profile?.avatar_url;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.color('#0C8AA6', 'primary')]}
            tintColor={theme.color("#0C8AA6", 'primary')}
          />
        }
      >
        <View style={styles.headerContainer}>
          <View style={styles.headerRow}>
            <View style={styles.titleCol}>
              <Text style={styles.mainTitle}>Mi perfil</Text>
              <Text style={styles.userHandleText}>@{profile?.username}</Text>
            </View>

            <View style={styles.actionsRow}>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: theme.isDark }}
                accessibilityLabel={t(theme.isDark ? 'theme.switch_light' : 'theme.switch_dark')}
                onPress={theme.toggleTheme}
                hitSlop={6}
                style={({ hovered, pressed }) => [
                  styles.themeToggle,
                  theme.isDark && (hovered || pressed) && { backgroundColor: theme.palette.selected },
                ]}
              >
                <Feather name={theme.isDark ? 'sun' : 'moon'} size={17} color={COLORS.cyanIcon} />
              </Pressable>
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
                <Text style={styles.menuItemText}>{t('profile.edit_profile')}</Text>
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
                <Text style={styles.menuItemText}>{t('profile.config_preferences')}</Text>
              </TouchableOpacity>

              {isAdmin && (
                <>
                  <View style={styles.menuDivider} />
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuOpen(false);
                      if (onNavigateToAdmin) onNavigateToAdmin();
                    }}
                  >
                    <Feather name="shield" size={16} color={COLORS.orange} />
                    <Text style={styles.menuItemText}>Administrar aplicación</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  setLanguageModalOpen(true);
                }}
              >
                <Feather name="globe" size={16} color={COLORS.cyanIcon} />
                <Text style={styles.menuItemText}>
                  {t('language.title')} ({language === 'es' ? 'ES' : 'EN'})
                </Text>
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
                <Text style={styles.menuItemText}>{t('profile.create_own_activity')}</Text>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  loadMyAdRequests();
                  setMyAdRequestsOpen(true);
                }}
              >
                <Feather name="volume-2" size={16} color={COLORS.cyanIcon} />
                <Text style={styles.menuItemText}>{t('profile.my_ad_requests')}</Text>
              </TouchableOpacity>


              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  setLegalDoc('privacy');
                }}
              >
                <Feather name="shield" size={16} color={COLORS.textPrimary} />
                <Text style={styles.menuItemText}>{t('legal.privacy_policy')}</Text>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  setLegalDoc('terms');
                }}
              >
                <Feather name="file-text" size={16} color={COLORS.textPrimary} />
                <Text style={styles.menuItemText}>{t('legal.terms_of_use')}</Text>
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
                <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>{t('profile.logout')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* MODAL PARA CAMBIAR IDIOMA (ESPAÑOL / ENGLISH) */}
        <Modal
          visible={languageModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setLanguageModalOpen(false)}
        >
          <Pressable style={styles.menuOverlay} onPress={() => setLanguageModalOpen(false)}>
            <View style={styles.langModalCard}>
              <View style={styles.langModalHeader}>
                <Feather name="globe" size={20} color={COLORS.cyanIcon} />
                <Text style={styles.langModalTitle}>{t('language.select')}</Text>
              </View>

              <View style={styles.langOptionsList}>
                {languages.map((item) => {
                  const isSelected = language === item.code;
                  return (
                    <TouchableOpacity
                      key={item.code}
                      style={[styles.langOptionItem, isSelected && styles.langOptionItemActive]}
                      onPress={() => {
                        setLanguage(item.code);
                        setLanguageModalOpen(false);
                        notify(
                          item.code === 'es' ? 'Idioma cambiado a Español' : 'Language changed to English',
                          { type: 'success' }
                        );
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.langOptionLeft}>
                        <Languages size={18} color={isSelected ? COLORS.cyanIcon : COLORS.slateMuted} style={{ marginRight: 10 }} />
                        <Text style={[styles.langOptionLabel, isSelected && styles.langOptionLabelActive]}>
                          {item.label}
                        </Text>
                      </View>
                      {isSelected && <Feather name="check" size={18} color={COLORS.cyanIcon} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.langCloseBtn}
                onPress={() => setLanguageModalOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.langCloseBtnText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        <CreateActivityModal
          visible={createActivityOpen}
          onClose={() => setCreateActivityOpen(false)}
        />

        <LegalDocumentModal doc={legalDoc} onClose={() => setLegalDoc(null)} />

        <MyAdRequestsModal
          visible={myAdRequestsOpen}
          requests={myAdRequests}
          onClose={() => setMyAdRequestsOpen(false)}
          onChanged={loadMyAdRequests}
          onNewRequest={() => {
            setMyAdRequestsOpen(false);
            setAdRequestOpen(true);
          }}
        />

        <AdRequestModal
          visible={adRequestOpen}
          onClose={() => setAdRequestOpen(false)}
          onSent={loadMyAdRequests}
        />

        <Modal
          visible={!!viewerImage}
          transparent
          animationType="fade"
          onRequestClose={() => setViewerImage(null)}
        >
          <Pressable style={styles.viewerOverlay} onPress={() => setViewerImage(null)}>
            {viewerImage && (
              <Pressable style={styles.viewerCard} onPress={() => { }}>
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

                  {!!viewerImage.postId && (
                    <TouchableOpacity
                      style={styles.viewerDeleteBtn}
                      onPress={handleDeleteViewerPost}
                      disabled={deletingPost}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityRole="button"
                      accessibilityLabel="Eliminar publicación"
                    >
                      {deletingPost ? (
                        <ActivityIndicator size="small" color={COLORS.danger} />
                      ) : (
                        <Feather name="trash-2" size={17} color={COLORS.danger} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {(viewerImage.title || viewerImage.category) && (
                  <View style={styles.viewerCaption}>
                    {(
                      <View style={styles.viewerCategoryBadge}>
                        <Text style={styles.viewerCategoryBadgeText}>
                          {viewerImage.category || 'Libre'}
                        </Text>
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
                            {formatDateTime(viewerImage.completedAt, language)}
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
                <Feather name="camera" size={12} color={theme.color("#ffffff", 'text')} />
                <Text style={styles.avatarEditOverlayText}>{t('profile.change_avatar')}</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.profileName}>{profile?.full_name}</Text>
          <Text style={styles.profileUsername}>@{profile?.username}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, styles.statNumberCyan]}>
                {profile?.points || 0}
              </Text>
              <Text style={styles.statLabel}>{t('profile.points')}</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {loadingStats ? '…' : completedActivities.length}
              </Text>
              <Text style={styles.statLabel}>{t('profile.challenges')}</Text>
            </View>

            <View style={styles.statDivider} />

            <TouchableOpacity
              style={styles.statItem}
              onPress={onNavigateToFriends}
              activeOpacity={0.7}
            >
              <Text style={styles.statNumber}>{friendsCount}</Text>
              <Text style={styles.statLabel}>{t('profile.friends')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {editing ? (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>{t('profile.edit_profile')}</Text>

            <Text style={styles.inputLabel}>{t('profile.full_name')}</Text>
            <TextInput {...theme.textInputProps}
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.inputLabel}>{t('profile.profile_photo')}</Text>
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
                    <Text style={styles.dropzoneText}>{t('profile.upload_photo_prompt')}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={theme.color("#fff", 'text')} />
                ) : (
                  <Text style={styles.saveBtnText}>{t('profile.save_changes')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setEditing(false);
                  setNewImageUri(null);
                }}
              >
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
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
                                        postId: post.id,
                                        uri: post.image_url,
                                        title: item.activity?.title,
                                        category: getCategoryLabel(item.activity?.category),
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
                    const category = getCategoryLabel(post.user_activity?.activity?.category);
                    const points = post.user_activity?.activity?.points_awarded || 0;
                    const reactionsCount = (post.post_reactions || []).length;
                    return (
                      <TouchableOpacity
                        key={post.id}
                        activeOpacity={0.85}
                        onPress={() =>
                          setViewerImage({
                            postId: post.id,
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




// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getProfileScreenTheme = createThemeStyles((theme) => {
const COLORS = {
  bg: theme.color('#FFFFFF', 'card'),
  surface: theme.color('#FFFFFF', 'card'),
  border: theme.color('#F0F3F5', 'border'),
  textPrimary: theme.color('#08333D', 'text'),
  textSecondary: theme.color('#64748B', 'muted'),
  textMuted: theme.color('#8A908B', 'muted'),
  cyan: theme.color('#00C9FD', 'primary'),
  cyanIcon: theme.color('#0C8AA6', 'primary'),
  cyanSoft: theme.color('rgba(0, 201, 253, 0.09)', 'card'),
  cyanBorder: theme.color('rgba(0, 201, 253, 0.22)', 'border'),
  cyanCardBorder: theme.color('#D4F1F9', 'border'),
  cyanDropzoneBg: theme.color('rgba(0, 201, 253, 0.05)', 'secondary'),
  cyanDropzoneBorder: theme.color('rgba(0, 201, 253, 0.35)', 'border'),
  gold: theme.color('#FFB300', 'accent'),
  goldSoft: theme.color('#FFF9EB', 'card'),
  goldBorder: theme.color('rgba(255, 179, 0, 0.3)', 'border'),
  orange: theme.color('#FF5A00', 'accent'),
  disabledBg: theme.color('#F1F3F5', 'secondary'),
  disabledText: theme.color('#9AA0A6', 'muted'),
  danger: theme.color('#ef4444', 'danger'),
  dangerSoft: theme.color('#FEF2F2', 'card'),
};
const styles = StyleSheet.create({
  themeToggle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color('#F0F3F5', 'secondary'),
    borderWidth: 1,
    borderColor: theme.color('#F0F3F5', 'border'),
  },
  container: {
    flex: 1,
    backgroundColor: theme.color(COLORS.bg, 'background'),
  },
  scrollContent: {
    // Al menos tan alto como la pantalla: si el contenido no desborda, en
    // Android el ScrollView no se deja arrastrar y el "tirar para recargar"
    // no llega a dispararse nunca.
    flexGrow: 1,
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
    backgroundColor: theme.color('#FFFFFF', 'card'),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.color(COLORS.border, 'border'),
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: theme.color('rgba(8, 51, 61, 0.15)', "scrim"),
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
    borderColor: theme.color(COLORS.border, 'border'),
    elevation: 8,
    boxShadow: '0px 4px 16px rgba(0,0,0,0.1)',
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
    borderColor: theme.color(COLORS.cyanCardBorder, 'border'),
  },
  avatarLarge: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: COLORS.cyanSoft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.color(COLORS.cyanIcon, 'border'),
  },
  avatarText: {
    color: COLORS.textMuted,
    fontSize: 36,
    fontWeight: '700',
  },
  avatarEditOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 4,
    backgroundColor: theme.color('rgba(8, 51, 61, 0.8)', "scrim"),
    paddingVertical: 5,
    borderBottomLeftRadius: 46,
    borderBottomRightRadius: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditOverlayText: {
    color: theme.color('#ffffff', 'text'),
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
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
    justifyContent: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  statNumberCyan: {
    color: COLORS.cyanIcon,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  sectionLoader: {
    marginBottom: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.color(COLORS.border, 'border'),
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
    borderBottomColor: theme.color(COLORS.cyan, "primary"),
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
    backgroundColor: theme.color('#FFFFFF', 'card'),
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.color(COLORS.border, 'border'),
    marginHorizontal: -20,
  },
  activityCardActive: {
    borderColor: theme.color(COLORS.cyanCardBorder, "primary"),
    elevation: 4,
    ...Platform.select({
      web: {
        boxShadow: '0px 3px 8px rgba(0,0,0,0.06)',
      },
      default: {
        shadowColor: COLORS.textPrimary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      }
    }),
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
    borderColor: theme.color(COLORS.cyanBorder, 'border'),
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
    color: theme.color(COLORS.textPrimary, 'onAccent'),
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
    borderTopColor: theme.color(COLORS.border, 'border'),
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
    backgroundColor: theme.color('#FFFFFF', 'card'),
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.color(COLORS.border, 'border'),
    marginBottom: 10,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: theme.color('#FFFFFF', 'card'),
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.color(COLORS.border, 'border'),
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
    backgroundColor: theme.color('#FFFFFF', 'secondary'),
    borderWidth: 1,
    borderColor: theme.color(COLORS.border, 'border'),
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
    borderColor: theme.color(COLORS.cyanDropzoneBorder, 'border'),
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
    backgroundColor: theme.color('#FFFFFF', 'card'),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 6px rgba(0,0,0,0.08)',
      },
      default: {
        shadowColor: COLORS.textPrimary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      }
    }),
  },
  plusIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: theme.color('#FFFFFF', 'card'),
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
    elevation: 4,
    ...Platform.select({
      web: {
        boxShadow: '0px 3px 6px rgba(255,107,0,0.2)',
      },
      default: {
        shadowColor: COLORS.orange,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      }
    }),
  },
  saveBtnText: {
    color: theme.color('#ffffff', 'onAccent'),
    fontWeight: '700',
    fontSize: 14,
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: theme.color('rgba(8, 51, 61, 0.7)', "scrim"),
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
    elevation: 20,
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 24px rgba(0,0,0,0.2)',
      },
      default: {
        shadowColor: COLORS.textPrimary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
      }
    }),
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
    borderColor: theme.color(COLORS.border, 'border'),
  },
  // Esquina opuesta a la X: así nadie la pulsa por error al querer cerrar
  viewerDeleteBtn: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.dangerSoft,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderColor: theme.color(COLORS.cyanBorder, 'border'),
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
  // ── Language selector modal ──────────────────────────────────────────────────
  langModalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginHorizontal: 32,
    paddingVertical: 24,
    paddingHorizontal: 20,
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 24px rgba(0,0,0,0.12)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
      },
    }),
    elevation: 10,
  },
  langModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  langModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  langOptionsList: {
    gap: 8,
    marginBottom: 20,
  },
  langOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.color(COLORS.border, 'border'),
    backgroundColor: theme.color('#FAFAFA', 'card'),
  },
  langOptionItemActive: {
    borderColor: theme.color(COLORS.cyan, "primary"),
    backgroundColor: theme.color(COLORS.cyanSoft, 'selected'),
  },
  langOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  langFlag: {
    fontSize: 26,
  },
  langOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  langOptionLabelActive: {
    color: COLORS.cyanIcon,
  },
  langCloseBtn: {
    backgroundColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  langCloseBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
  return { theme, COLORS, styles };
});
