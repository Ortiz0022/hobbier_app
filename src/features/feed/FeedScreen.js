import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Platform,
  RefreshControl,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { FlashList } from '@shopify/flash-list';
import { useAuth } from '../../context/AuthContext';
import { useNotify } from '../../context/NotificationContext';
import { getFriendsFeed, reportPost, togglePostReaction } from '../../services/socialService';
import { acceptActivity } from '../../services/activityService';
import { ReportModal } from '../../components/ReportModal';
import { StarReactionButton } from '../../components/StarReactionButton';
import { UserProfileModal } from '../../components/UserProfileModal';
import { DoAlsoModal } from './components/DoAlsoModal';
import { MessagesInboxScreen } from '../messages/screens/MessagesInboxScreen';
import { DirectChatScreen } from '../messages/screens/DirectChatScreen';
import { useDirectUnreadCount } from '../messages/hooks/useDirectUnreadCount';
import { colors } from '../../theme';

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

// Publicaciones por página del scroll infinito.
const FEED_PAGE_SIZE = 10;

export const FeedScreen = ({ onActivityAccepted }) => {
  const { user, profile } = useAuth();
  const { notify } = useNotify();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [posts, setPosts] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  // onEndReached puede dispararse varias veces antes de que el estado se actualice:
  // la ref impide pedir la misma página dos veces.
  const loadingMoreRef = useRef(false);
  // La lista de amigos se pide una vez por carga del feed, no en cada página.
  const friendIdsRef = useRef(null);

  // Estado para el modal de reportes y perfil de usuario
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);

  // Estado para 'Hacer también' (Bottom Sheet)
  const [doAlsoModalVisible, setDoAlsoModalVisible] = useState(false);
  const [doAlsoPost, setDoAlsoPost] = useState(null);
  const [acceptingDoAlso, setAcceptingDoAlso] = useState(false);

  // Mensajes directos: navegación interna, igual que las salas dentro de Amigos.
  // null = feed | { screen: 'INBOX' } | { screen: 'CHAT', conversationId, friend }
  const [messagesView, setMessagesView] = useState(null);
  const { unreadCount, refetch: refetchUnreadCount } = useDirectUnreadCount();

  useEffect(() => {
    loadFeed();
  }, []);

  const handleOpenDoAlso = (post) => {
    setDoAlsoPost(post);
    setDoAlsoModalVisible(true);
  };

  const handleAcceptDoAlso = async () => {
    if (!user?.id || !doAlsoPost) return;
    const targetActivityId = doAlsoPost.activityId || doAlsoPost.user_activity?.activity?.id;
    if (!targetActivityId) {
      notify('Esta actividad no está disponible para agregar en este momento.', { type: 'warning', title: 'Aviso' });
      return;
    }

    setAcceptingDoAlso(true);
    try {
      const { userActivity, error } = await acceptActivity(user.id, targetActivityId);
      setAcceptingDoAlso(false);
      setDoAlsoModalVisible(false);

      if (error) {
        notify('No pudimos agregar la misión a tus actividades. Inténtalo de nuevo.', { type: 'error', title: 'Error' });
        return;
      }

      if (onActivityAccepted && userActivity) {
        onActivityAccepted(userActivity);
      }
    } catch (err) {
      console.error('Error al agregar actividad desde feed:', err);
      setAcceptingDoAlso(false);
    }
  };

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

  // Primera página (o recarga completa). Devuelve si fue bien.
  const fetchFirstPage = async () => {
    const { posts: newPosts, hasMore: more, friendIds, error } = await getFriendsFeed(user.id, FEED_PAGE_SIZE, 0);
    if (error) return false;
    setPosts(newPosts);
    setHasMore(more);
    setLoadMoreError(false);
    friendIdsRef.current = friendIds;
    return true;
  };

  const loadFeed = async () => {
    if (!user?.id) return;
    setLoading(true);
    await fetchFirstPage();
    setLoading(false);
  };

  // Scroll infinito: la siguiente página empieza en la publicación más antigua cargada.
  const loadMore = async () => {
    if (!user?.id || !hasMore || loadingMoreRef.current || posts.length === 0) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(false);

    const oldest = posts[posts.length - 1];
    const { posts: newPosts, hasMore: more, friendIds, error } = await getFriendsFeed(
      user.id,
      FEED_PAGE_SIZE,
      0,
      { before: oldest.created_at, friendIds: friendIdsRef.current }
    );

    if (error) {
      setLoadMoreError(true);
    } else {
      friendIdsRef.current = friendIds;
      // Sin ids repetidos: dos claves iguales descolocan el reciclado de FlashList.
      setPosts((prev) => {
        const knownIds = new Set(prev.map((p) => p.id));
        return [...prev, ...newPosts.filter((p) => !knownIds.has(p.id))];
      });
      setHasMore(more);
    }
    loadingMoreRef.current = false;
    setLoadingMore(false);
  };

  const onRefresh = async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await fetchFirstPage();
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
      notify(error.message || 'No se pudo procesar el reporte.', { type: 'error', title: 'Error' });
    } else {
      // Ocultar inmediatamente del feed local (ACTIVE -> REPORTED)
      setPosts((prev) => prev.filter((p) => p.id !== selectedPost.id));
      notify('La publicación ha sido reportada y fue ocultada inmediatamente del feed.', {
        type: 'success',
        title: 'Reporte enviado',
      });
    }
  };

  if (messagesView?.screen === 'CHAT') {
    return (
      <DirectChatScreen
        conversationId={messagesView.conversationId}
        friend={messagesView.friend}
        onBack={() => setMessagesView({ screen: 'INBOX' })}
      />
    );
  }

  if (messagesView?.screen === 'INBOX') {
    return (
      <MessagesInboxScreen
        onBack={() => {
          setMessagesView(null);
          refetchUnreadCount();
        }}
        onOpenChat={({ conversationId, friend }) => setMessagesView({ screen: 'CHAT', conversationId, friend })}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#386756" />
        <Text style={styles.loadingText}>Cargando feed de amigos...</Text>
      </View>
    );
  }

  const renderPost = ({ item: post, index }) => {
    const activityTitle = post.activityTitle || post.user_activity?.activity?.title || 'Pinta algo creativo';
    const pillStyle = getPillStyle(activityTitle, index);
    const pointsAwarded = post.pointsAwarded || post.user_activity?.points_awarded || 20;

    return (
      <View style={styles.postCard}>
        {/* CABECERA DE LA PUBLICACIÓN */}
        <View style={styles.postHeader}>
          <View style={styles.authorRow}>
            <TouchableOpacity
              style={styles.authorClickArea}
              onPress={() => setSelectedUserProfile(post.author)}
              activeOpacity={0.8}
            >
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
            </TouchableOpacity>

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
            // Clave por publicación: FlashList reutiliza la tarjeta para otra publicación
            // y el botón guarda estado propio (reacción y animación).
            key={post.id}
            initialCount={post.likesCount || 0}
            initialReacted={post.userReacted || false}
            onToggle={(newReacted) => handleToggleReaction(post.id, newReacted)}
          />

          <View style={styles.postFooterRight}>
            <TouchableOpacity
              style={styles.doAlsoBtn}
              onPress={() => handleOpenDoAlso(post)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={post.user_id === user?.id ? 'Repetir este reto' : 'Hacer también este reto'}
            >
              <Feather
                name={post.user_id === user?.id ? 'repeat' : 'plus-circle'}
                size={14}
                color={colors.primary}
              />
              <Text style={styles.doAlsoBtnText}>
                {post.user_id === user?.id ? 'Repetir' : 'Hacer también'}
              </Text>
            </TouchableOpacity>

            <View style={styles.pointsPill}>
              <Text style={styles.pointsPillText}>
                ✪ +{pointsAwarded}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // NAVBAR CON LOGO HOBBIER AL CENTRO (SE ESCONDE AL HACER SCROLL)
  const listHeader = (
    <View style={styles.navHeader}>
      <Text style={styles.logoTitle}>Hobbier</Text>

      {/* MENSAJES DIRECTOS (ESQUINA SUPERIOR DERECHA, COMO EN INSTAGRAM) */}
      <TouchableOpacity
        style={styles.messagesBtn}
        onPress={() => setMessagesView({ screen: 'INBOX' })}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={unreadCount > 0 ? `Mensajes, ${unreadCount} sin leer` : 'Mensajes'}
      >
        <Feather name="message-circle" size={24} color="#121B22" />
        {unreadCount > 0 && (
          <View style={styles.messagesBadge}>
            <Text style={styles.messagesBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const listFooter = loadingMore ? (
    <ActivityIndicator color="#1e293b" style={styles.loadMoreSpinner} />
  ) : loadMoreError ? (
    <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
      <Text style={styles.loadMoreBtnText}>No se pudieron cargar más · Reintentar</Text>
    </TouchableOpacity>
  ) : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* LISTA DE PUBLICACIONES DE AMIGOS (SCROLL INFINITO) */}
      <FlashList
        data={posts}
        keyExtractor={(post) => post.id}
        renderItem={renderPost}
        // renderPost depende del usuario actual (Repetir / Hacer también)
        extraData={user?.id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📸</Text>
            <Text style={styles.emptyTitle}>Sin publicaciones aún</Text>
            <Text style={styles.emptySubtitle}>
              Agrega amigos o espera a que completen actividades para ver sus fotos aquí.
            </Text>
            <TouchableOpacity style={styles.refreshEmptyBtn} onPress={loadFeed}>
              <Text style={styles.refreshEmptyBtnText}>🔄 Actualizar feed</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={listFooter}
        onEndReached={loadMore}
        // Una pantalla antes del final: la siguiente página llega antes de que se
        // note el hueco y sus fotos ya van descargando.
        onEndReachedThreshold={1}
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
      />

      {/* MODAL DE REPORTE DE CONTENIDO */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleSendReport}
        submitting={submittingReport}
      />

      {/* MODAL DE PERFIL DE USUARIO */}
      <UserProfileModal
        visible={!!selectedUserProfile}
        userProfile={selectedUserProfile}
        onClose={() => setSelectedUserProfile(null)}
        onSendMessage={(friend) => {
          setSelectedUserProfile(null);
          setMessagesView({ screen: 'CHAT', friend });
        }}
      />

      {/* BOTTOM SHEET DE HACER TAMBIÉN */}
      <DoAlsoModal
        visible={doAlsoModalVisible}
        post={doAlsoPost}
        accepting={acceptingDoAlso}
        onAccept={handleAcceptDoAlso}
        onClose={() => setDoAlsoModalVisible(false)}
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
  // Absoluto para que el logo siga centrado en la pantalla
  messagesBtn: {
    position: 'absolute',
    right: 20,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  messagesBadge: {
    position: 'absolute',
    top: '50%',
    right: -8,
    marginTop: -20,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    elevation: 2,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 10px rgba(0,0,0,0.05)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      }
    }),
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
    justifyContent: 'space-between',
  },
  authorClickArea: {
    flex: 1,
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
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  postFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  doAlsoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EAF7FA',
    borderWidth: 1,
    borderColor: '#BDECF3',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  doAlsoBtnText: {
    color: '#0C8AA6',
    fontWeight: '700',
    fontSize: 12,
  },
  pointsPill: {
    backgroundColor: '#F0F3F5',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pointsPillText: {
    color: '#0C8AA6',
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
  loadMoreSpinner: {
    marginVertical: 24,
  },
});

