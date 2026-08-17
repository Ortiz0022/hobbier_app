import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getFriendsFeed, reportPost, togglePostReaction } from '../../services/socialService';
import { ReportModal } from '../../components/ReportModal';
import { StarReactionButton } from '../../components/StarReactionButton';

const getPillStyle = (title, index) => {
  const t = (title || '').toLowerCase();

  const bgList = ['#dbeafe', '#ffe4e6', '#dcfce7', '#fef3c7', '#f3e8ff'];
  const backgroundColor = bgList[index % bgList.length];

  let emoji = '🎨';

  if (t.includes('pint') || t.includes('dibuj') || t.includes('arte') || t.includes('creativ')) {
    emoji = '🎨';
  } else if (t.includes('jardin') || t.includes('plant') || t.includes('flor') || t.includes('urbana')) {
    emoji = '🪴';
  } else if (t.includes('cocin') || t.includes('recet') || t.includes('pan') || t.includes('comida') || t.includes('bebida') || t.includes('té')) {
    emoji = '🍳';
  } else if (t.includes('corr') || t.includes('ejercic') || t.includes('deport') || t.includes('bicicleta') || t.includes('fit')) {
    emoji = '🏃';
  } else if (t.includes('libr') || t.includes('lectur') || t.includes('le') || t.includes('capítulo')) {
    emoji = '📚';
  } else if (t.includes('music') || t.includes('cant') || t.includes('guitarr')) {
    emoji = '🎵';
  } else if (t.includes('foto') || t.includes('camar')) {
    emoji = '📸';
  } else if (t.includes('ajedrez') || t.includes('juego') || t.includes('carta')) {
    emoji = '♟️';
  } else if (t.includes('idioma') || t.includes('hablar')) {
    emoji = '🗣️';
  }

  return {
    backgroundColor,
    emoji,
  };
};

export const FeedScreen = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Estado para el modal de reportes
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    loadFeed(0, true);
  }, []);

  const handleToggleReaction = async (postId, newReacted) => {
    if (!user?.id) return;

    // Actualización optimista local en la lista de publicaciones
    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p.id === postId) {
          const currentCount = p.likesCount || 0;
          return {
            ...p,
            userReacted: newReacted,
            likesCount: newReacted ? currentCount + 1 : Math.max(0, currentCount - 1),
          };
        }
        return p;
      })
    );

    // Persistir en Supabase
    const { error } = await togglePostReaction(postId, user.id);
    if (error) {
      console.error('Error al persistir reacción:', error);
      // Revertir estado si falla
      setPosts((prevPosts) =>
        prevPosts.map((p) => {
          if (p.id === postId) {
            const currentCount = p.likesCount || 0;
            return {
              ...p,
              userReacted: !newReacted,
              likesCount: !newReacted ? currentCount + 1 : Math.max(0, currentCount - 1),
            };
          }
          return p;
        })
      );
    }
  };

  const loadFeed = async (pageNumber = 0, reset = false) => {
    if (!user?.id) return;
    if (reset) setLoading(true);
    else setLoadingMore(true);

    const { posts: newPosts, hasMore: more, error } = await getFriendsFeed(
      user.id,
      5,
      pageNumber
    );

    if (!error) {
      if (reset) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }
      setHasMore(more);
      setPage(pageNumber);
    }
    setLoading(false);
    setLoadingMore(false);
  };

  const onRefresh = async () => {
    if (!user?.id) return;
    setRefreshing(true);
    const { posts: newPosts, hasMore: more } = await getFriendsFeed(user.id, 5, 0);
    setPosts(newPosts);
    setHasMore(more);
    setPage(0);
    setRefreshing(false);
  };

  const openReportModal = (post) => {
    setSelectedPost(post);
    setReportModalVisible(true);
  };

  const handleSendReport = async (reason) => {
    if (!selectedPost || !user?.id || !reason) return;
    setSubmittingReport(true);

    const { error } = await reportPost(
      selectedPost.id,
      user.id,
      reason,
      'Reportado desde el feed'
    );

    setSubmittingReport(false);
    setReportModalVisible(false);

    if (error) {
      const msg = error.message || 'No se pudo procesar el reporte.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
    } else {
      // Ocultar inmediatamente del feed local (ACTIVE -> REPORTED)
      setPosts((prev) => prev.filter((p) => p.id !== selectedPost.id));
      const msg = 'La publicación ha sido reportada y fue ocultada inmediatamente del feed.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Reporte Enviado', msg);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#386756" />
        <Text style={styles.loadingText}>Cargando feed de amigos...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#386756']}
            tintColor="#386756"
          />
        }
      >
        {/* NAVBAR CON LOGO HOBBIER AL CENTRO (SE ESCONDE AL HACER SCROLL) */}
        <View style={styles.navHeader}>
          <Text style={styles.logoTitle}>Hobbier</Text>
        </View>

        {/* LISTA DE PUBLICACIONES DE AMIGOS */}
        {posts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📸</Text>
            <Text style={styles.emptyTitle}>Sin publicaciones aún</Text>
            <Text style={styles.emptySubtitle}>
              Agrega amigos o espera a que completen actividades para ver sus fotos aquí.
            </Text>
            <TouchableOpacity style={styles.refreshEmptyBtn} onPress={() => loadFeed(0, true)}>
              <Text style={styles.refreshEmptyBtnText}>🔄 Actualizar feed</Text>
            </TouchableOpacity>
          </View>
        ) : (
          posts.map((post, index) => {
            const activityTitle = post.activityTitle || post.user_activity?.activity?.title || 'Pinta algo creativo';
            const pillStyle = getPillStyle(activityTitle, index);
            const pointsAwarded = post.pointsAwarded || post.user_activity?.points_awarded || 20;

            return (
              <View key={post.id} style={styles.postCard}>
                {/* CABECERA DE LA PUBLICACIÓN */}
                <View style={styles.postHeader}>
                  <View style={styles.authorRow}>
                    {post.author?.avatar_url ? (
                      <Image source={{ uri: post.author.avatar_url }} style={styles.authorAvatarImage} />
                    ) : (
                      <View style={styles.authorAvatar}>
                        <Text style={styles.authorInitial}>
                          {(post.author?.full_name || post.author?.username || 'U')[0].toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.authorInfo}>
                      <Text style={styles.authorHandle}>@{post.author?.username || 'usuario'}</Text>
                      <Text style={styles.authorAction} numberOfLines={1}>
                        {pillStyle.emoji} {activityTitle}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.optionsBtn}
                      onPress={() => openReportModal(post)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.optionsIcon}>•••</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* IMAGEN DE EVIDENCIA SOBERANA (SIN MÁRGENES LATERALES, COMO INSTAGRAM) */}
                <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" />

                {/* PIE DE LA PUBLICACIÓN CON REACCIÓN DE ESTRELLA Y PUNTOS */}
                <View style={styles.postFooter}>
                  <StarReactionButton
                    initialCount={post.likesCount || 0}
                    initialReacted={post.userReacted || false}
                    onToggle={(newReacted) => handleToggleReaction(post.id, newReacted)}
                  />

                  <View style={styles.pointsPill}>
                    <Text style={styles.pointsPillText}>
                      ✪ +{pointsAwarded} puntos
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {/* BOTÓN DE PAGINACIÓN */}
        {hasMore && (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={() => loadFeed(page + 1, false)}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <ActivityIndicator color="#1e293b" />
            ) : (
              <Text style={styles.loadMoreBtnText}>Cargar más publicaciones</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* MODAL DE REPORTE DE CONTENIDO */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleSendReport}
        submitting={submittingReport}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748b',
    marginTop: 12,
    fontSize: 15,
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  navHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  logoTitle: {
    fontSize: 24, // DynaPuff es más robusta
    color: '#121B22',
    fontFamily: 'DynaPuff',
    marginBottom: 0, // Restaurando márgenes naturales
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginTop: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#121B22',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  refreshEmptyBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  refreshEmptyBtnText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 14,
  },
  postCard: {
    backgroundColor: '#ffffff',
    marginBottom: 20,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3F5',
  },
  postHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F0F3F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#00DBFF',
  },
  authorAvatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#00DBFF',
  },
  authorInitial: {
    color: '#334155',
    fontSize: 18,
    fontWeight: '700',
  },
  authorInfo: {
    flex: 1,
  },
  authorHandle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#121B22',
  },
  authorAction: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
    marginTop: 1,
  },
  optionsBtn: {
    padding: 6,
  },
  optionsIcon: {
    fontSize: 18,
    fontWeight: '900',
    color: '#121B22',
    letterSpacing: -1,
  },
  postImage: {
    width: '100%',
    height: 460,
    backgroundColor: '#f1f5f9',
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  pointsPill: {
    backgroundColor: '#F0F3F5',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pointsPillText: {
    color: '#00DBFF',
    fontWeight: '700',
    fontSize: 13,
  },
  loadMoreBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#F0F3F5',
  },
  loadMoreBtnText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '700',
  },
});

