import React, { useState, useEffect } from 'react';
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
import { useAuth } from '../../context/AuthContext';
import {
  searchUsersByUsername,
  sendFriendRequest,
  getReceivedFriendRequests,
  respondToFriendRequest,
  getFriendsList,
  removeFriendship,
} from '../../services/socialService';

export const FriendsScreen = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('search'); // 'search', 'requests', 'friends'
  const [loading, setLoading] = useState(false);

  // Búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [sendingMap, setSendingMap] = useState({});

  // Solicitudes
  const [requests, setRequests] = useState([]);

  // Amigos
  const [friends, setFriends] = useState([]);

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
    setLoading(true);
    const { requests } = await getReceivedFriendRequests(user.id);
    setRequests(requests);
    setLoading(false);
  };

  const handleResponse = async (friendshipId, status) => {
    const { error } = await respondToFriendRequest(friendshipId, status);
    if (error) {
      const msg = 'Error al responder a la solicitud.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
    } else {
      loadRequests();
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Comunidad y Amigos</Text>
        
        {/* NAVEGACIÓN POR PESTAÑAS */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'search' && styles.activeTab]}
            onPress={() => setActiveTab('search')}
          >
            <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
              🔍 Buscar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
              📩 Solicitudes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
            onPress={() => setActiveTab('friends')}
          >
            <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
              👥 Mis Amigos
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* TAB 1: BÚSQUEDA */}
        {activeTab === 'search' && (
          <View>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar usuarios por @username..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={handleSearch}
              autoCapitalize="none"
            />

            {loading && <ActivityIndicator color="#6366f1" style={{ marginTop: 20 }} />}

            {!loading && searchQuery.trim() !== '' && searchResults.length === 0 && (
              <Text style={styles.emptyText}>No se encontraron usuarios coincidentes.</Text>
            )}

            {searchResults.map((targetUser) => (
              <View key={targetUser.id} style={styles.userCard}>
                {targetUser.avatar_url ? (
                  <Image source={{ uri: targetUser.avatar_url }} style={styles.avatarCircleImage} />
                ) : (
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitial}>
                      {(targetUser.full_name || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{targetUser.full_name}</Text>
                  <Text style={styles.userHandle}>@{targetUser.username}</Text>
                </View>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => handleSendRequest(targetUser.id)}
                  disabled={sendingMap[targetUser.id]}
                >
                  {sendingMap[targetUser.id] ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.addBtnText}>+ Agregar</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* TAB 2: SOLICITUDES */}
        {activeTab === 'requests' && (
          <View>
            {loading && <ActivityIndicator color="#6366f1" style={{ marginTop: 20 }} />}
            {!loading && requests.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>📬</Text>
                <Text style={styles.emptyText}>No tienes solicitudes de amistad pendientes.</Text>
              </View>
            )}
            {requests.map((req) => (
              <View key={req.id} style={styles.userCard}>
                {req.requester?.avatar_url ? (
                  <Image source={{ uri: req.requester.avatar_url }} style={styles.avatarCircleImage} />
                ) : (
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitial}>
                      {(req.requester?.full_name || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{req.requester?.full_name}</Text>
                  <Text style={styles.userHandle}>@{req.requester?.username}</Text>
                </View>
                <View style={styles.actionGroup}>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => handleResponse(req.id, 'ACCEPTED')}
                  >
                    <Text style={styles.btnText}>Aceptar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleResponse(req.id, 'REJECTED')}
                  >
                    <Text style={styles.btnText}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 3: LISTA DE AMIGOS */}
        {activeTab === 'friends' && (
          <View>
            {loading && <ActivityIndicator color="#6366f1" style={{ marginTop: 20 }} />}
            {!loading && friends.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>🤝</Text>
                <Text style={styles.emptyText}>Aún no has agregado amigos. ¡Busca usuarios arriba!</Text>
              </View>
            )}
            {friends.map((item) => (
              <View key={item.friendshipId} style={styles.userCard}>
                {item.profile?.avatar_url ? (
                  <Image source={{ uri: item.profile.avatar_url }} style={styles.avatarCircleImage} />
                ) : (
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitial}>
                      {(item.profile?.full_name || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.profile?.full_name}</Text>
                  <Text style={styles.userHandle}>@{item.profile?.username}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() =>
                    handleRemoveFriend(item.friendshipId, item.profile?.full_name)
                  }
                >
                  <Text style={styles.removeBtnText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    padding: 24,
    paddingBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#4f46e5',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  content: {
    padding: 24,
    paddingTop: 12,
  },
  searchInput: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#f8fafc',
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 12,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarCircleImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  userHandle: {
    fontSize: 13,
    color: '#94a3b8',
  },
  addBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  actionGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptBtn: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  removeBtn: {
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  removeBtnText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '600',
  },
});
