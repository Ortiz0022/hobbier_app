import React, { useState, useEffect } from 'react';
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
import { Text, TextInput } from '../../components/scaledText';
import Feather from '@expo/vector-icons/Feather';
import { useAuth } from '../../context/AuthContext';
import { useNotify } from '../../context/NotificationContext';
import {
  searchUsersByUsername,
  sendFriendRequest,
  getReceivedFriendRequests,
  getSentFriendRequests,
  respondToFriendRequest,
  getFriendsList,
  removeFriendship,
  getUserPosts,
  getFriendSuggestionsByInterests,
} from '../../services/socialService';
import { getUserActivities } from '../../services/activityService';
import { UserProfileModal } from '../../components/UserProfileModal';
import { roomsService } from '../../services/roomsService';
import { usePresence } from '../../context/PresenceContext';
import { useLanguage } from '../../context/LanguageContext';

import { RoomsListScreen } from '../rooms/screens/RoomsListScreen';
import { CreateRoomScreen } from '../rooms/screens/CreateRoomScreen';
import { RoomDetailScreen } from '../rooms/screens/RoomDetailScreen';
import { DirectChatScreen } from '../messages/screens/DirectChatScreen';

export const FriendsScreen = ({ onBack, isProfileView = false }) => {
  const { user } = useAuth();
  const { notify, confirm } = useNotify();
  const { isUserOnline } = usePresence();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(isProfileView ? 'friends' : 'search'); // 'friends', 'search', 'requests'
  const [loading, setLoading] = useState(false);

  // Chat directo
  const [directChatFriend, setDirectChatFriend] = useState(null);

  // Filtro interno de Mis Amigos
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [friends, setFriends] = useState([]);

  // Búsqueda de nuevos contactos
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [sendingMap, setSendingMap] = useState({});
  const [sentMap, setSentMap] = useState({});

  // Solicitudes
  const [requests, setRequests] = useState([]);
  const [roomInvitations, setRoomInvitations] = useState([]);

  // Sugerencias
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Perfil de amigo en modal
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [friendProfileLoading, setFriendProfileLoading] = useState(false);
  const [friendStats, setFriendStats] = useState({ points: 0, completedCount: 0 });
  const [friendPosts, setFriendPosts] = useState([]);
  const [friendViewerImage, setFriendViewerImage] = useState(null);

  // Salas navegación interna
  const [roomScreen, setRoomScreen] = useState('LIST'); // 'LIST', 'CREATE', 'DETAIL'
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  useEffect(() => {
    loadFriends();
    loadRequests();
    loadRoomInvitations();
    if (activeTab === 'search') {
      loadSuggestions();
      loadSentRequests();
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'requests') loadRequests();
    if (activeTab === 'friends') loadFriends();
    if (activeTab === 'rooms') loadRoomInvitations();
    if (activeTab === 'search') {
      loadSuggestions();
      loadSentRequests();
    }
  }, [activeTab]);

  // Precarga quién ya tiene una solicitud pendiente de mi parte, para pintar
  // "Enviada" en vez de "Agregar" aunque se recargue la pantalla o se repita
  // la búsqueda en otra sesión.
  const loadSentRequests = async () => {
    const { addresseeIds } = await getSentFriendRequests(user.id);
    setSentMap((prev) => {
      const next = { ...prev };
      addresseeIds.forEach((id) => { next[id] = true; });
      return next;
    });
  };

  const loadSuggestions = async () => {
    setSuggestionsLoading(true);
    const { suggestions } = await getFriendSuggestionsByInterests(user.id);
    setSuggestions(suggestions || []);
    setSuggestionsLoading(false);
  };

  const loadRoomInvitations = async () => {
    try {
      const invitations = await roomsService.getPendingInvitations();
      setRoomInvitations(invitations);
    } catch (err) {
      console.error('Error cargando invitaciones a salas:', err);
    }
  };

  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    const { users } = await searchUsersByUsername(text, user.id);
    setSearchResults(users);
    setLoading(false);
  };

  const handleSendRequest = async (targetUserId) => {
    setSendingMap((prev) => ({ ...prev, [targetUserId]: true }));
    const { error } = await sendFriendRequest(user.id, targetUserId);
    setSendingMap((prev) => ({ ...prev, [targetUserId]: false }));

    if (error) {
      notify(error.message || t('friends.request_error'), { type: 'error', title: t('common.error') });
    } else {
      setSentMap((prev) => ({ ...prev, [targetUserId]: true }));
      notify(t('friends.request_sent'), { type: 'success', title: t('common.success') });
    }
  };

  const loadRequests = async () => {
    const { requests } = await getReceivedFriendRequests(user.id);
    setRequests(requests);
  };

  const handleResponse = async (friendshipId, status) => {
    const { error } = await respondToFriendRequest(friendshipId, status);
    if (error) {
      notify(t('friends.request_error'), { type: 'error', title: t('common.error') });
    } else {
      loadRequests();
      loadFriends();
    }
  };

  const loadFriends = async () => {
    setLoading(true);
    const { friends } = await getFriendsList(user.id);
    setFriends(friends);
    setLoading(false);
  };

  const handleRemoveFriend = async (friendshipId, friendName) => {
    const ok = await confirm({
      title: t('friends.remove_friend_title'),
      message: t('friends.remove_friend_confirm', { name: friendName }),
      confirmLabel: t('friends.remove'),
      destructive: true,
    });
    if (ok) removeFriendship(friendshipId).then(loadFriends);
  };

  const openFriendProfile = async (friendProfile) => {
    if (!friendProfile?.id) return;
    setSelectedFriend(friendProfile);
    setFriendProfileLoading(true);

    try {
      const [actRes, postRes] = await Promise.all([
        getUserActivities(friendProfile.id),
        getUserPosts(friendProfile.id),
      ]);

      const completed = (actRes.activities || []).filter((a) => a.status === 'COMPLETED').length;
      setFriendStats({
        points: friendProfile.points || 0,
        completedCount: completed,
      });
      setFriendPosts(postRes.posts || []);
    } catch (err) {
      console.error('Error cargando perfil de amigo:', err);
    } finally {
      setFriendProfileLoading(false);
    }
  };

  const filteredFriends = friends.filter((item) => {
    if (!friendSearchQuery.trim()) return true;
    const q = friendSearchQuery.toLowerCase().trim();
    const name = (item.profile?.full_name || '').toLowerCase();
    const uname = (item.profile?.username || '').toLowerCase();
    return name.includes(q) || uname.includes(q);
  });

  const showTabs = !isProfileView;
  const showHeader = isProfileView || !(activeTab === 'rooms' && roomScreen !== 'LIST');

  if (directChatFriend) {
    return (
      <DirectChatScreen
        friend={directChatFriend}
        onBack={() => setDirectChatFriend(null)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            {onBack && (
              <TouchableOpacity onPress={onBack} style={{ marginRight: 12 }}>
                <Feather name="arrow-left" size={24} color="#08333D" />
              </TouchableOpacity>
            )}
            <Text style={[styles.title, { marginBottom: 0 }]}>
              {isProfileView ? t('friends.my_friends') : t('friends.community_and_friends')}
            </Text>
          </View>

          {/* NAVEGACIÓN POR PESTAÑAS: 2. BUSCAR | 3. SOLICITUDES | 4. SALAS */}
          {showTabs && (
            <View style={styles.tabsRow}>

              <TouchableOpacity
                style={[styles.tab, activeTab === 'search' && styles.activeTab]}
                onPress={() => setActiveTab('search')}
                activeOpacity={0.8}
              >
                <Feather
                  name="user-plus"
                  size={14}
                  color={activeTab === 'search' ? '#053E4A' : '#8A908B'}
                />
                <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
                  {t('friends.connect_tab')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
                onPress={() => setActiveTab('requests')}
                activeOpacity={0.8}
              >
                <Feather
                  name="bell"
                  size={14}
                  color={activeTab === 'requests' ? '#053E4A' : '#8A908B'}
                />
                {requests.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{requests.length}</Text>
                  </View>
                )}
                <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
                  {t('friends.requests_tab')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === 'rooms' && styles.activeTab]}
                onPress={() => {
                  setActiveTab('rooms');
                  setRoomScreen('LIST');
                }}
                activeOpacity={0.8}
              >
                <Feather
                  name="grid"
                  size={14}
                  color={activeTab === 'rooms' ? '#053E4A' : '#8A908B'}
                />
                {roomInvitations.length > 0 && (
                  <View style={styles.redBadgeDot} />
                )}
                <Text style={[styles.tabText, activeTab === 'rooms' && styles.activeTabText]}>
                  {t('friends.rooms_tab')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {activeTab === 'rooms' ? (
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          {roomScreen === 'LIST' && (
            <RoomsListScreen
              onNavigateToCreate={() => setRoomScreen('CREATE')}
              onNavigateToRoom={(id) => { setSelectedRoomId(id); setRoomScreen('DETAIL'); }}
            />
          )}
          {roomScreen === 'CREATE' && (
            <CreateRoomScreen
              onBack={() => setRoomScreen('LIST')}
              onRoomCreated={(id) => { setSelectedRoomId(id); setRoomScreen('DETAIL'); }}
            />
          )}
          {roomScreen === 'DETAIL' && (
            <RoomDetailScreen
              roomId={selectedRoomId}
              onBack={() => setRoomScreen('LIST')}
            />
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* TAB 1: LISTA DE AMIGOS CON BUSCADOR INTERNO */}
          {activeTab === 'friends' && (
            <View>
              <View style={styles.searchBarContainer}>
                <Feather name="search" size={18} color="#8A908B" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('friends.search_friends_placeholder')}
                  placeholderTextColor="#8A908B"
                  value={friendSearchQuery}
                  onChangeText={setFriendSearchQuery}
                  autoCapitalize="none"
                />
              </View>

              {loading && <ActivityIndicator color="#00DBFF" style={{ marginTop: 24 }} />}

              {!loading && filteredFriends.length === 0 && (
                <View style={styles.emptyCard}>
                  <Feather name="users" size={36} color="#8A908B" style={styles.emptyIcon} />
                  <Text style={styles.emptyTitle}>
                    {friendSearchQuery.trim() ? t('friends.no_matches') : t('friends.no_friends_yet')}
                  </Text>
                  <Text style={styles.emptyText}>
                    {friendSearchQuery.trim()
                      ? t('friends.no_users_found')
                      : t('friends.switch_to_search_tab')}
                  </Text>
                </View>
              )}

              {filteredFriends.map((item) => (
                <TouchableOpacity
                  key={item.friendshipId}
                  style={styles.userCard}
                  onPress={() => openFriendProfile(item.profile)}
                  activeOpacity={0.85}
                >
                  <View style={styles.avatarRing}>
                    <View style={styles.avatarWrapper}>
                      {item.profile?.avatar_url ? (
                        <Image source={{ uri: item.profile.avatar_url }} style={styles.avatarCircleImage} />
                      ) : (
                        <View style={styles.avatarCircle}>
                          <Text style={styles.avatarInitial}>
                            {(item.profile?.full_name || 'U')[0].toUpperCase()}
                          </Text>
                        </View>
                      )}
                      {isUserOnline(item.profile?.id) && <View style={styles.onlineDot} />}
                    </View>
                  </View>

                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.profile?.full_name}</Text>
                    <Text style={styles.userHandle}>@{item.profile?.username}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleRemoveFriend(item.friendshipId, item.profile?.full_name);
                    }}
                    activeOpacity={0.8}
                  >
                    <Feather name="trash-2" size={14} color="#EF4444" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* TAB 2: BÚSQUEDA DE NUEVOS CONTACTOS */}
          {activeTab === 'search' && (
            <View>
              <View style={styles.searchBarContainer}>
                <Feather name="search" size={18} color="#8A908B" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('friends.search_users_placeholder')}
                  placeholderTextColor="#8A908B"
                  value={searchQuery}
                  onChangeText={handleSearch}
                  autoCapitalize="none"
                />
              </View>

              {loading && <ActivityIndicator color="#00DBFF" style={{ marginTop: 24 }} />}

              {!loading && searchQuery.trim() !== '' && searchResults.length === 0 && (
                <View style={styles.emptyCard}>
                  <Feather name="user-x" size={32} color="#8A908B" style={styles.emptyIcon} />
                  <Text style={styles.emptyTitle}>{t('friends.no_results')}</Text>
                  <Text style={styles.emptyText}>{t('friends.no_users_found')}</Text>
                </View>
              )}

              {searchResults.map((targetUser) => (
                <View key={targetUser.id} style={styles.userCard}>
                  <View style={styles.avatarRing}>
                    {targetUser.avatar_url ? (
                      <Image source={{ uri: targetUser.avatar_url }} style={styles.avatarCircleImage} />
                    ) : (
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarInitial}>
                          {(targetUser.full_name || 'U')[0].toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{targetUser.full_name}</Text>
                    <Text style={styles.userHandle}>@{targetUser.username}</Text>
                  </View>
                  {sentMap[targetUser.id] ? (
                    <View style={styles.sentBadge}>
                      <Feather name="check" size={14} color="#8A908B" />
                      <Text style={styles.sentBadgeText}>{t('friends.sent')}</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={() => handleSendRequest(targetUser.id)}
                      disabled={sendingMap[targetUser.id]}
                      activeOpacity={0.8}
                    >
                      {sendingMap[targetUser.id] ? (
                        <ActivityIndicator color="#0C8AA6" size="small" />
                      ) : (
                        <>
                          <Feather name="user-plus" size={16} color="#0C8AA6" />
                          <Text style={styles.addBtnText}>{t('friends.add_friend')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {/* SUGERENCIAS (CUANDO NO SE ESTÁ BUSCANDO NADA) */}
              {!loading && searchQuery.trim() === '' && (
                <View style={{ marginTop: 16 }}>
                  <Text style={{ fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#08333D', marginBottom: 4 }}>
                    {t('friends.suggestions_for_you')}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#727773', marginBottom: 16 }}>
                    {t('friends.hobbiers_shared_interests')}
                  </Text>

                  {suggestionsLoading ? (
                    <ActivityIndicator color="#00DBFF" style={{ marginTop: 24 }} />
                  ) : suggestions.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Feather name="smile" size={32} color="#8A908B" style={styles.emptyIcon} />
                      <Text style={styles.emptyTitle}>{t('friends.no_suggestions')}</Text>
                      <Text style={styles.emptyText}>{t('friends.add_more_interests')}</Text>
                    </View>
                  ) : (
                    suggestions.map((sug) => (
                      <View key={sug.profile.id} style={styles.userCard}>
                        <View style={styles.avatarRing}>
                          {sug.profile.avatar_url ? (
                            <Image source={{ uri: sug.profile.avatar_url }} style={styles.avatarCircleImage} />
                          ) : (
                            <View style={styles.avatarCircle}>
                              <Text style={styles.avatarInitial}>
                                {(sug.profile.full_name || 'U')[0].toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.userInfo}>
                          <Text style={styles.userName}>{sug.profile.full_name}</Text>
                          <Text style={styles.userHandle}>@{sug.profile.username}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                            <Feather name="users" size={12} color="#0C8AA6" />
                            <Text style={{ fontSize: 12, color: '#0C8AA6', fontWeight: '600' }}>
                              {t('friends.shared_interests', { count: sug.sharedCount })}
                            </Text>
                          </View>
                        </View>
                        {sentMap[sug.profile.id] ? (
                          <View style={styles.sentBadge}>
                            <Feather name="check" size={14} color="#8A908B" />
                            <Text style={styles.sentBadgeText}>{t('friends.sent')}</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.addBtn}
                            onPress={() => handleSendRequest(sug.profile.id)}
                            disabled={sendingMap[sug.profile.id]}
                            activeOpacity={0.8}
                          >
                            {sendingMap[sug.profile.id] ? (
                              <ActivityIndicator color="#0C8AA6" size="small" />
                            ) : (
                              <>
                                <Feather name="user-plus" size={16} color="#0C8AA6" />
                                <Text style={styles.addBtnText}>{t('friends.add_friend')}</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          )}

          {/* TAB 3: SOLICITUDES PENDIENTES */}
          {activeTab === 'requests' && (
            <View>
              {loading && <ActivityIndicator color="#00DBFF" style={{ marginTop: 24 }} />}
              {!loading && requests.length === 0 && (
                <View style={styles.emptyCard}>
                  <Feather name="inbox" size={36} color="#8A908B" style={styles.emptyIcon} />
                  <Text style={styles.emptyTitle}>{t('friends.inbox_clean')}</Text>
                  <Text style={styles.emptyText}>{t('friends.no_pending_requests')}</Text>
                </View>
              )}
              {requests.map((req) => (
                <View key={req.id} style={styles.userCard}>
                  <View style={styles.avatarRing}>
                    {req.requester?.avatar_url ? (
                      <Image source={{ uri: req.requester.avatar_url }} style={styles.avatarCircleImage} />
                    ) : (
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarInitial}>
                          {(req.requester?.full_name || 'U')[0].toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{req.requester?.full_name}</Text>
                    <Text style={styles.userHandle}>@{req.requester?.username}</Text>
                  </View>
                  <View style={styles.actionGroup}>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleResponse(req.id, 'ACCEPTED')}
                      activeOpacity={0.8}
                    >
                      <Feather name="check" size={14} color="#FFFFFF" />
                      <Text style={styles.btnText}>{t('friends.accept')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleResponse(req.id, 'REJECTED')}
                      activeOpacity={0.8}
                    >
                      <Feather name="x" size={14} color="#8A908B" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* MODAL DE PERFIL DE AMIGO */}
      <UserProfileModal
        visible={!!selectedFriend}
        userProfile={selectedFriend}
        onClose={() => setSelectedFriend(null)}
        onSendMessage={(friend) => {
          setSelectedFriend(null);
          setDirectChatFriend(friend);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    color: '#08333D',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F0F3F5',
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 6,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 6px rgba(0,0,0,0.05)',
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
    }),
  },
  tabText: {
    color: '#8A908B',
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#053E4A',
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00DBFF',
    position: 'absolute',
    top: 6,
    right: 10,
  },
  redBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    position: 'absolute',
    top: 6,
    right: 10,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F3F5',
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 16,
    elevation: 2,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 6px rgba(0,0,0,0.05)',
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      }
    }),
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#121B22',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F3F5',
    marginTop: 16,
  },
  emptyIcon: {
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#121B22',
    marginBottom: 4,
  },
  emptyText: {
    color: '#727773',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F3F5',
  },
  avatarRing: {
    marginRight: 12,
  },
  avatarCircleImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#0C8AA6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  avatarWrapper: {
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: '#121B22',
  },
  userHandle: {
    fontSize: 13,
    color: '#8A908B',
    marginTop: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5F6F8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  addBtnText: {
    color: '#0C8AA6',
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  sentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F3F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  sentBadgeText: {
    color: '#8A908B',
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A6347',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 5,
  },
  rejectBtn: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F0F3F5',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  removeBtn: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 9,
  },
});
