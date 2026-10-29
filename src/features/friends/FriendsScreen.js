import { peekQuery, queryKeys } from '../../services/queryCache';
import { useThemeValues } from '../../context/ThemeContext';
import { createThemeStyles } from '../../theme/themeRuntime';
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { useAuth } from '../../context/AuthContext';
import { capitalizarTitulo } from '../../utils/titleCase';
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
import { isInvitationFinished } from '../rooms/utils/roomHelpers';
import { usePresence } from '../../context/PresenceContext';
import { useLanguage } from '../../context/LanguageContext';

import { RoomsListScreen } from '../rooms/screens/RoomsListScreen';
import { CreateRoomScreen } from '../rooms/screens/CreateRoomScreen';
import { RoomDetailScreen } from '../rooms/screens/RoomDetailScreen';
import { DirectChatScreen } from '../messages/screens/DirectChatScreen';

export const FriendsScreen = ({ onBack, isProfileView = false }) => {
  const { theme, styles } = useThemeValues(getFriendsScreenTheme);

  const { user } = useAuth();
  const { notify, confirm } = useNotify();
  const { isUserOnline } = usePresence();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(isProfileView ? 'friends' : 'search'); // 'friends', 'search', 'requests'
  const [loading, setLoading] = useState(false);

  // Chat directo
  const [directChatFriend, setDirectChatFriend] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filtro interno de Mis Amigos
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [friends, setFriends] = useState(() => peekQuery(queryKeys.friends(user?.id))?.friends || []);

  // Búsqueda de nuevos contactos
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [sendingMap, setSendingMap] = useState({});
  const [sentMap, setSentMap] = useState(() => Object.fromEntries(
    (peekQuery(queryKeys.sentRequests(user?.id))?.addresseeIds || []).map((id) => [id, true])));

  // Solicitudes
  const [requests, setRequests] = useState(() => peekQuery(queryKeys.receivedRequests(user?.id))?.requests || []);
  const [roomInvitations, setRoomInvitations] = useState(() =>
    (peekQuery(queryKeys.roomInvitations()) || []).filter((inv) => !isInvitationFinished(inv)));

  // Sugerencias
  const [suggestions, setSuggestions] = useState(() => peekQuery(queryKeys.suggestions(user?.id))?.suggestions || []);
  const initializedUser = useRef(null);
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
    if (!user?.id) return;
    const firstVisit = initializedUser.current !== user.id;
    initializedUser.current = user.id;
    // Los contadores se precargan una vez. Después cada opción carga solo
    // sus datos, sin repetir las llamadas de otro efecto al montar.
    if (firstVisit || activeTab === 'friends') loadFriends();
    if (firstVisit || activeTab === 'requests') loadRequests();
    if (firstVisit || activeTab === 'rooms') loadRoomInvitations();
    if (activeTab === 'search') {
      loadSuggestions();
      loadSentRequests();
    }
  }, [activeTab, user?.id]);

  // Precarga quién ya tiene una solicitud pendiente de mi parte, para pintar
  // "Enviada" en vez de "Agregar" aunque se recargue la pantalla o se repita
  // la búsqueda en otra sesión.
  const loadSentRequests = async (force = false) => {
    const { addresseeIds, error } = await getSentFriendRequests(user.id, { force });
    if (!error) setSentMap(Object.fromEntries(addresseeIds.map((id) => [id, true])));
  };

  const loadSuggestions = async (force = false) => {
    setSuggestionsLoading(!peekQuery(queryKeys.suggestions(user.id)));
    const { suggestions, error } = await getFriendSuggestionsByInterests(user.id, { force });
    if (!error) setSuggestions(suggestions || []);
    setSuggestionsLoading(false);
  };

  const loadRoomInvitations = async (force = false) => {
    try {
      const invitations = await roomsService.getPendingInvitations({ force });
      // El punto rojo es "tienes algo que decidir". Una invitación a una sala
      // que ya terminó no se puede aceptar: se avisa dentro de Salas, pero no
      // cuenta como solicitud.
      setRoomInvitations(invitations.filter((inv) => !isInvitationFinished(inv)));
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

  const loadRequests = async (force = false) => {
    const { requests, error } = await getReceivedFriendRequests(user.id, { force });
    if (!error) setRequests(requests);
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

  const loadFriends = async (force = false) => {
    setLoading(!peekQuery(queryKeys.friends(user.id)));
    const { friends, error } = await getFriendsList(user.id, { force });
    if (!error) setFriends(friends);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const tasks = [loadRoomInvitations(true)];
      if (activeTab === 'friends') tasks.push(loadFriends(true));
      else if (activeTab === 'requests') tasks.push(loadRequests(true));
      else if (activeTab === 'search') tasks.push(loadSuggestions(true), loadSentRequests(true));
      await Promise.all(tasks);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Ids de mis amigos, para decidir qué mostrar en cada resultado de búsqueda.
   * `friends` ya se carga al montar la pantalla, no solo en su pestaña.
   */
  const idsAmigos = useMemo(
    () => new Set(friends.map((item) => item.profile?.id).filter(Boolean)),
    [friends],
  );

  /**
   * El perfil de alguien solo se abre si ya es amigo. A quien no lo es se le
   * explica por qué, en vez de abrir una ficha vacía o no responder al toque.
   */
  const abrirPerfilSiEsAmigo = (perfil) => {
    if (!perfil?.id) return;
    if (idsAmigos.has(perfil.id)) {
      openFriendProfile(perfil);
      return;
    }
    notify(t('friends.profile_requires_friendship'), {
      type: 'info',
      title: t('friends.profile_locked_title'),
    });
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
                <Feather name="arrow-left" size={24} color={theme.color("#08333D", 'text')} />
              </TouchableOpacity>
            )}
            <Text style={[styles.title, { marginBottom: 0 }]}>
              {capitalizarTitulo(isProfileView ? t('friends.my_friends') : t('friends.community_and_friends'))}
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
                  color={activeTab === 'search' ? theme.color('#053E4A', 'text') : theme.color('#8A908B', 'muted')}
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
                  color={activeTab === 'requests' ? theme.color('#053E4A', 'text') : theme.color('#8A908B', 'muted')}
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
                  color={activeTab === 'rooms' ? theme.color('#053E4A', 'text') : theme.color('#8A908B', 'muted')}
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
        <View style={{ flex: 1, backgroundColor: theme.color('#FFFFFF', 'card') }}>
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
        <ScrollView
          contentContainerStyle={styles.content}
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
          {/* TAB 1: LISTA DE AMIGOS CON BUSCADOR INTERNO */}
          {activeTab === 'friends' && (
            <View>
              <View style={styles.searchBarContainer}>
                <Feather name="search" size={18} color={theme.color("#8A908B", 'muted')} style={styles.searchIcon} />
                <TextInput {...theme.textInputProps}
                  style={styles.searchInput}
                  placeholder={t('friends.search_friends_placeholder')}
                  placeholderTextColor={theme.color("#8A908B", 'muted')}
                  value={friendSearchQuery}
                  onChangeText={setFriendSearchQuery}
                  autoCapitalize="none"
                />
              </View>

              {loading && <ActivityIndicator color={theme.color("#00DBFF", 'primary')} style={{ marginTop: 24 }} />}

              {!loading && filteredFriends.length === 0 && (
                <View style={styles.emptyCard}>
                  <Feather name="users" size={36} color={theme.color("#8A908B", 'muted')} style={styles.emptyIcon} />
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
                    <Feather name="trash-2" size={14} color={theme.color("#EF4444", 'danger')} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* TAB 2: BÚSQUEDA DE NUEVOS CONTACTOS */}
          {activeTab === 'search' && (
            <View>
              <View style={styles.searchBarContainer}>
                <Feather name="search" size={18} color={theme.color("#8A908B", 'muted')} style={styles.searchIcon} />
                <TextInput {...theme.textInputProps}
                  style={styles.searchInput}
                  placeholder={t('friends.search_users_placeholder')}
                  placeholderTextColor={theme.color("#8A908B", 'muted')}
                  value={searchQuery}
                  onChangeText={handleSearch}
                  autoCapitalize="none"
                />
              </View>

              {loading && <ActivityIndicator color={theme.color("#00DBFF", 'primary')} style={{ marginTop: 24 }} />}

              {!loading && searchQuery.trim() !== '' && searchResults.length === 0 && (
                <View style={styles.emptyCard}>
                  <Feather name="user-x" size={32} color={theme.color("#8A908B", 'muted')} style={styles.emptyIcon} />
                  <Text style={styles.emptyTitle}>{t('friends.no_results')}</Text>
                  <Text style={styles.emptyText}>{t('friends.no_users_found')}</Text>
                </View>
              )}

              {searchResults.map((targetUser) => (
                <TouchableOpacity
                  key={targetUser.id}
                  style={styles.userCard}
                  onPress={() => abrirPerfilSiEsAmigo(targetUser)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={targetUser.full_name}
                >
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
                  {idsAmigos.has(targetUser.id) ? (
                    // Ya son amigos: ni "Agregar" ni "Enviada", y su perfil se abre
                    // al tocar la fila.
                    <View style={styles.friendBadge}>
                      <Feather name="users" size={14} color={theme.color("#0C8AA6", 'primary')} />
                      <Text style={styles.friendBadgeText}>{t('friends.already_friends')}</Text>
                    </View>
                  ) : sentMap[targetUser.id] ? (
                    <View style={styles.sentBadge}>
                      <Feather name="check" size={14} color={theme.color("#8A908B", 'muted')} />
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
                        <ActivityIndicator color={theme.color("#0C8AA6", 'primary')} size="small" />
                      ) : (
                        <>
                          <Feather name="user-plus" size={16} color={theme.color("#0C8AA6", 'primary')} />
                          <Text style={styles.addBtnText}>{t('friends.add_friend')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}

              {/* SUGERENCIAS (CUANDO NO SE ESTÁ BUSCANDO NADA) */}
              {!loading && searchQuery.trim() === '' && (
                <View style={{ marginTop: 16 }}>
                  <Text style={{ fontSize: 16, fontFamily: 'Poppins_700Bold', color: theme.color('#08333D', 'text'), marginBottom: 4 }}>
                    {t('friends.suggestions_for_you')}
                  </Text>
                  <Text style={{ fontSize: 13, color: theme.color('#727773', 'muted'), marginBottom: 16 }}>
                    {t('friends.hobbiers_shared_interests')}
                  </Text>

                  {suggestionsLoading ? (
                    <ActivityIndicator color={theme.color("#00DBFF", 'primary')} style={{ marginTop: 24 }} />
                  ) : suggestions.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Feather name="smile" size={32} color={theme.color("#8A908B", 'muted')} style={styles.emptyIcon} />
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
                            <Feather name="users" size={12} color={theme.color("#0C8AA6", 'primary')} />
                            <Text style={{ fontSize: 12, color: theme.color('#0C8AA6', 'primary'), fontWeight: '600' }}>
                              {t('friends.shared_interests', { count: sug.sharedCount })}
                            </Text>
                          </View>
                        </View>
                        {idsAmigos.has(sug.profile.id) ? (
                          <View style={styles.friendBadge}>
                            <Feather name="users" size={14} color={theme.color("#0C8AA6", 'primary')} />
                            <Text style={styles.friendBadgeText}>{t('friends.already_friends')}</Text>
                          </View>
                        ) : sentMap[sug.profile.id] ? (
                          <View style={styles.sentBadge}>
                            <Feather name="check" size={14} color={theme.color("#8A908B", 'muted')} />
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
                              <ActivityIndicator color={theme.color("#0C8AA6", 'primary')} size="small" />
                            ) : (
                              <>
                                <Feather name="user-plus" size={16} color={theme.color("#0C8AA6", 'primary')} />
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
              {loading && <ActivityIndicator color={theme.color("#00DBFF", 'primary')} style={{ marginTop: 24 }} />}
              {!loading && requests.length === 0 && (
                <View style={styles.emptyCard}>
                  <Feather name="inbox" size={36} color={theme.color("#8A908B", 'muted')} style={styles.emptyIcon} />
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
                      <Feather name="check" size={14} color={theme.color("#FFFFFF", 'text')} />
                      <Text style={styles.btnText}>{t('friends.accept')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleResponse(req.id, 'REJECTED')}
                      activeOpacity={0.8}
                    >
                      <Feather name="x" size={14} color={theme.color("#8A908B", 'muted')} />
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



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getFriendsScreenTheme = createThemeStyles((theme) => {
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color('#FFFFFF', 'background'),
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    color: theme.color('#08333D', 'text'),
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: theme.color('#F0F3F5', 'card'),
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
    backgroundColor: theme.color('#FFFFFF', 'selected'),
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
    color: theme.color('#8A908B', 'muted'),
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: theme.color('#053E4A', 'text'),
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.color('#00DBFF', 'primary'),
    position: 'absolute',
    top: 6,
    right: 10,
  },
  redBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.color('#FF3B30', 'dangerSurface'),
    position: 'absolute',
    top: 6,
    right: 10,
  },
  content: {
    // Al menos tan alto como la pantalla: si el contenido no desborda, en
    // Android el ScrollView no se deja arrastrar y el "tirar para recargar"
    // no llega a dispararse nunca.
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color('#FFFFFF', 'secondary'),
    borderWidth: 1,
    borderColor: theme.color('#F0F3F5', 'border'),
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
    color: theme.color('#121B22', 'text'),
  },
  emptyCard: {
    backgroundColor: theme.color('#FFFFFF', 'card'),
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.color('#F0F3F5', 'border'),
    marginTop: 16,
  },
  emptyIcon: {
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: theme.color('#121B22', 'text'),
    marginBottom: 4,
  },
  emptyText: {
    color: theme.color('#727773', 'muted'),
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color('#FFFFFF', 'card'),
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.color('#F0F3F5', 'border'),
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
    backgroundColor: theme.color('#0C8AA6', 'primary'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: theme.color('#FFFFFF', 'text'),
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
    backgroundColor: theme.color('#4CAF50', 'card'),
    borderWidth: 2,
    borderColor: theme.color('#FFFFFF', 'border'),
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: theme.color('#121B22', "muted"),
  },
  userHandle: {
    fontSize: 13,
    color: theme.color('#8A908B', 'muted'),
    marginTop: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color('#E5F6F8', 'card'),
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  addBtnText: {
    color: theme.color('#0C8AA6', 'primary'),
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  sentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color('#F0F3F5', 'card'),
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  sentBadgeText: {
    color: theme.color('#8A908B', 'muted'),
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  // "Amigos": mismo tamaño que las otras pastillas, en el turquesa de la marca
  // para que se lea como un estado logrado y no como un botón apagado.
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color('#EAF7FA', 'card'),
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  friendBadgeText: {
    color: theme.color('#0C8AA6', 'primary'),
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
    backgroundColor: theme.color('#2A6347', 'primary'),
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 5,
  },
  rejectBtn: {
    backgroundColor: theme.color('#F8FAFC', 'card'),
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.color('#F0F3F5', 'border'),
  },
  btnText: {
    color: theme.color('#FFFFFF', 'onAccent'),
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
  },
  removeBtn: {
    backgroundColor: theme.color('#FFF5F5', 'card'),
    borderRadius: 12,
    padding: 9,
  },
});
  return { theme, styles };
});
