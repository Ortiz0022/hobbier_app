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
import { getFriendsFeed, reportPost } from '../../services/socialService';

const REPORT_REASONS = [
  'Contenido ofensivo',
  'Contenido inapropiado',
  'Violencia',
  'Acoso',
  'Spam',
  'Otro',
];

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
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    loadFeed(0, true);
  }, []);

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
    setSelectedReason(REPORT_REASONS[0]);
    setReportModalVisible(true);
  };

  const handleSendReport = async () => {
    if (!selectedPost || !user?.id) return;
    setSubmittingReport(true);

    const { error } = await reportPost(
      selectedPost.id,
      user.id,
      selectedReason,
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
                      <Text style={styles.authorAction}>Completó un reto</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.optionsBtn}
                      onPress={() => openReportModal(post)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.optionsIcon}>•••</Text>
                    </TouchableOpacity>
                  </View>

                  {/* INSIGNIA DE NOMBRE DE ACTIVIDAD (TEXTO PESO NORMAL / NO NEGRITA) */}
                  <View style={[styles.activityPill, { backgroundColor: pillStyle.backgroundColor }]}>
                    <Text style={styles.activityPillText}>
                      {pillStyle.emoji} {activityTitle}
                    </Text>
                  </View>
                </View>

                {/* IMAGEN DE EVIDENCIA SOBERANA (SIN MÁRGENES LATERALES, COMO INSTAGRAM) */}
                <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" />

                {/* PIE DE LA PUBLICACIÓN CON PUNTOS */}
                <View style={styles.postFooter}>
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
      <Modal visible={reportModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reportar Publicación</Text>
            <Text style={styles.modalSubtitle}>
              Selecciona el motivo del reporte. La publicación se ocultará inmediatamente de tu feed.
            </Text>

            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonOption,
                  selectedReason === reason && styles.reasonOptionSelected,
                ]}
                onPress={() => setSelectedReason(reason)}
              >
                <Text
                  style={[
                    styles.reasonOptionText,
                    selectedReason === reason && styles.reasonOptionTextSelected,
                  ]}
                >
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setReportModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSendReport}
                disabled={submittingReport}
              >
                {submittingReport ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Enviar Reporte</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 28,
    fontWeight: '900',
    color: '#386756',
    letterSpacing: -0.5,
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
    color: '#1e293b',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  postHeader: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  authorAction: {
    fontSize: 13,
    color: '#777777',
    marginTop: 1,
  },
  optionsBtn: {
    padding: 6,
  },
  optionsIcon: {
    fontSize: 18,
    fontWeight: '900',
    color: '#333333',
    letterSpacing: -1,
  },
  activityPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activityPillText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#000000',
  },
  postImage: {
    width: '100%',
    height: 350,
    backgroundColor: '#f1f5f9',
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
  },
  pointsPill: {
    backgroundColor: '#e9efe9',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pointsPillText: {
    color: '#386641',
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
    borderColor: '#e2e8f0',
  },
  loadMoreBtnText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
  },
  reasonOption: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reasonOptionSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  reasonOptionText: {
    color: '#334155',
    fontSize: 14,
  },
  reasonOptionTextSelected: {
    color: '#4f46e5',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  modalCancelBtnText: {
    color: '#475569',
    fontWeight: '600',
  },
  modalSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#ef4444',
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

