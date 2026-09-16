import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { Text } from './scaledText';
import Feather from '@expo/vector-icons/Feather';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { getUserPosts, getFriendsList, getSentFriendRequests, sendFriendRequest } from '../services/socialService';
import { getUserActivities } from '../services/activityService';
import { getCategoryStyle, getCategoryLabel } from '../utils/category';

// Mismos tokens exactos que usa ProfileScreen para que ambos perfiles luzcan idénticos.
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
  gold: '#FFB300',
  orange: '#FF5A00',
  danger: '#ef4444',
};

const TABS = [
  { key: 'fotos', label: 'Fotos' },
  { key: 'actividades', label: 'Actividades' },
];

export const UserProfileModal = ({ visible, userProfile, onClose, onSendMessage }) => {
  const { user } = useAuth();
  const { notify } = useNotify();
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [completedActivities, setCompletedActivities] = useState([]);
  const [posts, setPosts] = useState([]);
  const [friends, setFriends] = useState([]);
  const [viewerImage, setViewerImage] = useState(null);
  const [expandedActivityId, setExpandedActivityId] = useState(null);
  const [activeTab, setActiveTab] = useState('fotos');

  // Lista de "amigos de este amigo" para poder enviarles solicitud
  const [friendsListVisible, setFriendsListVisible] = useState(false);
  const [loadingMyFriends, setLoadingMyFriends] = useState(false);
  const [myFriendIds, setMyFriendIds] = useState(new Set());
  const [sendingMap, setSendingMap] = useState({});
  const [sentMap, setSentMap] = useState({});

  const loadUserData = useCallback(async (userId) => {
    setLoadingStats(true);
    setLoadingPosts(true);
    try {
      const [actRes, postRes, friendsRes] = await Promise.all([
        getUserActivities(userId),
        getUserPosts(userId),
        getFriendsList(userId),
      ]);

      const completed = (actRes.activities || []).filter((a) => a.status === 'COMPLETED');
      setCompletedActivities(completed);
      setPosts(postRes.posts || []);
      setFriends(friendsRes.friends || []);
    } catch (err) {
      console.error('Error cargando perfil de usuario:', err);
    } finally {
      setLoadingStats(false);
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    if (visible && userProfile?.id) {
      loadUserData(userProfile.id);
    } else {
      setCompletedActivities([]);
      setPosts([]);
      setFriends([]);
      setActiveTab('fotos');
      setExpandedActivityId(null);
      setFriendsListVisible(false);
      setSendingMap({});
      setSentMap({});
    }
  }, [visible, userProfile?.id, loadUserData]);

  const openFriendsList = async () => {
    setFriendsListVisible(true);
    if (!user?.id) return;
    setLoadingMyFriends(true);
    try {
      const [{ friends: myFriends }, { addresseeIds }] = await Promise.all([
        getFriendsList(user.id),
        getSentFriendRequests(user.id),
      ]);
      setMyFriendIds(new Set((myFriends || []).map((f) => f.profile.id)));
      setSentMap((prev) => {
        const next = { ...prev };
        addresseeIds.forEach((id) => { next[id] = true; });
        return next;
      });
    } catch (err) {
      console.error('Error cargando mis amigos:', err);
    } finally {
      setLoadingMyFriends(false);
    }
  };

  const handleSendRequest = async (targetUserId) => {
    setSendingMap((prev) => ({ ...prev, [targetUserId]: true }));
    const { error } = await sendFriendRequest(user.id, targetUserId);
    setSendingMap((prev) => ({ ...prev, [targetUserId]: false }));

    if (error) {
      notify(error.message || 'No se pudo enviar la solicitud.', { type: 'error', title: 'Aviso' });
    } else {
      setSentMap((prev) => ({ ...prev, [targetUserId]: true }));
      notify('Solicitud de amistad enviada correctamente.', { type: 'success', title: '¡Éxito!' });
    }
  };

  if (!userProfile) return null;

  const suggestedFriends = friends.filter((f) => f.profile.id !== user?.id);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderTitle}>Perfil de Hobbier</Text>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="x" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.profileHeader}>
            {userProfile.avatar_url ? (
              <Image source={{ uri: userProfile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarText}>
                  {(userProfile.full_name || userProfile.username || 'U')[0].toUpperCase()}
                </Text>
              </View>
            )}

            <Text style={styles.profileName}>{userProfile.full_name || `@${userProfile.username}`}</Text>
            <Text style={styles.profileUsername}>@{userProfile.username}</Text>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, styles.statNumberCyan]}>
                  {userProfile.points || 0}
                </Text>
                <Text style={styles.statLabel}>Puntos</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {loadingStats ? '…' : completedActivities.length}
                </Text>
                <Text style={styles.statLabel}>Retos</Text>
              </View>

              <View style={styles.statDivider} />

              <TouchableOpacity
                style={styles.statItem}
                onPress={openFriendsList}
                activeOpacity={0.7}
              >
                <Text style={styles.statNumber}>
                  {loadingStats ? '…' : friends.length}
                </Text>
                <Text style={styles.statLabel}>Amigos</Text>
              </TouchableOpacity>
            </View>

            {userProfile.id !== user?.id && (
              <TouchableOpacity
                style={styles.messageButton}
                onPress={() => {
                  if (onSendMessage) {
                    onClose?.();
                    onSendMessage(userProfile);
                  }
                }}
                activeOpacity={0.8}
              >
                <Feather name="message-circle" size={16} color="#FFFFFF" />
                <Text style={styles.messageButtonText}>Enviar mensaje</Text>
              </TouchableOpacity>
            )}
          </View>

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
                  Este usuario todavía no completó ninguna actividad.
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
                            Ha completado este reto {totalRepetitions}{' '}
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
                  Este usuario todavía no subió fotos de sus actividades.
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
        </ScrollView>

        {/* MODAL VISOR DE FOTO */}
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

        {/* MODAL DE AMIGOS DE ESTE HOBBIER */}
        <Modal
          visible={friendsListVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setFriendsListVisible(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                Amigos de {userProfile.full_name || `@${userProfile.username}`}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setFriendsListVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {loadingMyFriends ? (
                <ActivityIndicator color={COLORS.cyanIcon} style={styles.sectionLoader} />
              ) : suggestedFriends.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Feather name="users" size={32} color={COLORS.textMuted} style={styles.emptyIcon} />
                  <Text style={styles.emptyTitle}>Sin amigos para mostrar</Text>
                  <Text style={styles.emptyText}>
                    Este Hobbier todavía no tiene otros amigos en común contigo.
                  </Text>
                </View>
              ) : (
                suggestedFriends.map(({ profile: candidate }) => {
                  const alreadyFriends = myFriendIds.has(candidate.id);
                  const requestSent = !!sentMap[candidate.id];
                  const sending = !!sendingMap[candidate.id];
                  return (
                    <View key={candidate.id} style={styles.userCard}>
                      {candidate.avatar_url ? (
                        <Image source={{ uri: candidate.avatar_url }} style={styles.userCardAvatarImage} />
                      ) : (
                        <View style={styles.userCardAvatar}>
                          <Text style={styles.userCardAvatarText}>
                            {(candidate.full_name || candidate.username || 'U')[0].toUpperCase()}
                          </Text>
                        </View>
                      )}

                      <View style={styles.userCardInfo}>
                        <Text style={styles.userCardName} numberOfLines={1}>{candidate.full_name}</Text>
                        <Text style={styles.userCardHandle} numberOfLines={1}>@{candidate.username}</Text>
                      </View>

                      {alreadyFriends ? (
                        <View style={styles.friendBadge}>
                          <Feather name="check" size={14} color={COLORS.cyanIcon} />
                          <Text style={styles.friendBadgeText}>Amigos</Text>
                        </View>
                      ) : requestSent ? (
                        <View style={styles.friendBadge}>
                          <Feather name="clock" size={14} color={COLORS.textMuted} />
                          <Text style={[styles.friendBadgeText, { color: COLORS.textMuted }]}>Enviada</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.addBtn}
                          onPress={() => handleSendRequest(candidate.id)}
                          disabled={sending}
                          activeOpacity={0.8}
                        >
                          {sending ? (
                            <ActivityIndicator color={COLORS.cyanIcon} size="small" />
                          ) : (
                            <>
                              <Feather name="user-plus" size={16} color={COLORS.cyanIcon} />
                              <Text style={styles.addBtnText}>Agregar</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: COLORS.cyanCardBorder,
    marginBottom: 12,
  },
  avatarLarge: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: COLORS.cyanSoft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.cyanIcon,
    marginBottom: 12,
  },
  avatarText: {
    color: COLORS.textMuted,
    fontSize: 36,
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
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cyanIcon,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
    width: '100%',
    marginTop: 20,
    elevation: 2,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 8px rgba(12, 138, 166, 0.25)',
      },
      default: {
        shadowColor: COLORS.cyanIcon,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
    }),
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  sectionLoader: {
    marginBottom: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userCardAvatarImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
  },
  userCardAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.cyanIcon,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userCardAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  userCardInfo: {
    flex: 1,
  },
  userCardName: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  userCardHandle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cyanSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  addBtnText: {
    color: COLORS.cyanIcon,
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  friendBadgeText: {
    color: COLORS.cyanIcon,
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
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
      },
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
  emptyIcon: {
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
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
      },
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
