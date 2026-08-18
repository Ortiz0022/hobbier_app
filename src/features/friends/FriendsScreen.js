import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
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
import { Text, TextInput } from '../../components/scaledText';
import Feather from '@expo/vector-icons/Feather';
import { useAuth } from '../../context/AuthContext';
import {
  searchUsersByUsername,
  sendFriendRequest,
  getReceivedFriendRequests,
  respondToFriendRequest,
  getFriendsList,
  removeFriendship,
} from '../../services/socialService';
import { UserProfileModal } from '../../components/UserProfileModal';

export const FriendsScreen = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'search', 'requests'
  const [loading, setLoading] = useState(false);

  // Filtro interno de Mis Amigos
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [friends, setFriends] = useState([]);

  // Búsqueda de nuevos contactos
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [sendingMap, setSendingMap] = useState({});

  // Solicitudes
  const [requests, setRequests] = useState([]);

  // Perfil de amigo en modal
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [friendProfileLoading, setFriendProfileLoading] = useState(false);
  const [friendStats, setFriendStats] = useState({ points: 0, completedCount: 0 });
  const [friendPosts, setFriendPosts] = useState([]);
  const [friendViewerImage, setFriendViewerImage] = useState(null);

  useEffect(() => {
    loadFriends();
    loadRequests();
  }, []);

  useEffect(() => {
    if (activeTab === 'requests') loadRequests();
    if (activeTab === 'friends') loadFriends();
  }, [activeTab]);

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
      const msg = error.message || 'No se pudo enviar la solicitud.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Aviso', msg);
    } else {
      const msg = 'Solicitud de amistad enviada correctamente.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('¡Éxito!', msg);
    }
  };

  const loadRequests = async () => {
    const { requests } = await getReceivedFriendRequests(user.id);
    setRequests(requests);
  };

  const handleResponse = async (friendshipId, status) => {
    const { error } = await respondToFriendRequest(friendshipId, status);
    if (error) {
      const msg = 'Error al responder a la solicitud.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
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
    const confirm = () => removeFriendship(friendshipId).then(loadFriends);
    if (Platform.OS === 'web') {
      if (window.confirm(`¿Estás seguro de eliminar a ${friendName} de tus amigos?`)) {
        confirm();
      }
    } else {
      Alert.alert('Eliminar amigo', `¿Deseas eliminar a ${friendName}?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: confirm },
      ]);
    }
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Comunidad y Amigos</Text>

        {/* NAVEGACIÓN POR PESTAÑAS: 1. MIS AMIGOS | 2. BUSCAR | 3. SOLICITUDES */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
            onPress={() => setActiveTab('friends')}
            activeOpacity={0.8}
          >
            <Feather
              name="users"
              size={14}
              color={activeTab === 'friends' ? '#053E4A' : '#8A908B'}
            />
            <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
              Mis Amigos
            </Text>
          </TouchableOpacity>

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
              Conectar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
            onPress={() => setActiveTab('requests')}
            activeOpacity={0.8}
          >
            <Feather
              name="inbox"
              size={14}
              color={activeTab === 'requests' ? '#053E4A' : '#8A908B'}
            />
            <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
              Solicitudes
            </Text>
            {requests.length > 0 && activeTab !== 'requests' && (
              <View style={styles.badgeDot} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* TAB 1: LISTA DE AMIGOS CON BUSCADOR INTERNO */}
        {activeTab === 'friends' && (
          <View>
            <View style={styles.searchBarContainer}>
              <Feather name="search" size={18} color="#8A908B" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar entre mis amigos..."
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
                  {friendSearchQuery.trim() ? 'Sin coincidencias' : 'Aún no tienes amigos'}
                </Text>
                <Text style={styles.emptyText}>
                  {friendSearchQuery.trim()
                    ? 'No se encontraron amigos con ese nombre o usuario.'
                    : 'Cambia a la pestaña "Buscar" para encontrar y agregar contactos.'}
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
                  {item.profile?.avatar_url ? (
                    <Image source={{ uri: item.profile.avatar_url }} style={styles.avatarCircleImage} />
                  ) : (
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarInitial}>
                        {(item.profile?.full_name || 'U')[0].toUpperCase()}
                      </Text>
                    </View>
                  )}
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
                placeholder="Buscar otros usuarios por @username..."
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
                <Text style={styles.emptyTitle}>Sin resultados</Text>
                <Text style={styles.emptyText}>No se encontraron usuarios coincidentes con tu búsqueda.</Text>
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
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => handleSendRequest(targetUser.id)}
                  disabled={sendingMap[targetUser.id]}
                  activeOpacity={0.8}
                >
                  {sendingMap[targetUser.id] ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Feather name="user-plus" size={14} color="#FFFFFF" />
                      <Text style={styles.addBtnText}>Agregar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* TAB 3: SOLICITUDES PENDIENTES */}
        {activeTab === 'requests' && (
          <View>
            {loading && <ActivityIndicator color="#00DBFF" style={{ marginTop: 24 }} />}
            {!loading && requests.length === 0 && (
              <View style={styles.emptyCard}>
                <Feather name="inbox" size={36} color="#8A908B" style={styles.emptyIcon} />
                <Text style={styles.emptyTitle}>Bandeja limpia</Text>
                <Text style={styles.emptyText}>No tienes solicitudes de amistad pendientes por responder.</Text>
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
                    <Text style={styles.btnText}>Aceptar</Text>
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

      {/* MODAL DE PERFIL DE AMIGO */}
      <UserProfileModal
        visible={!!selectedFriend}
        userProfile={selectedFriend}
        onClose={() => setSelectedFriend(null)}
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
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
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: '#00DBFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarCircleImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0C8AA6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
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
    backgroundColor: '#121B22',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  addBtnText: {
    color: '#FFFFFF',
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
