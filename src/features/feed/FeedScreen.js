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

export const FeedScreen = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
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
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Cargando feed de amigos...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Feed de Amigos</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => loadFeed(0, true)}>
          <Text style={styles.refreshBtnText}>🔄 Actualizar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {posts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📸</Text>
            <Text style={styles.emptyTitle}>Sin publicaciones aún</Text>
            <Text style={styles.emptySubtitle}>
              Agrega amigos o espera a que completen actividades para ver sus fotos aquí.
            </Text>
          </View>
        ) : (
          posts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              {/* CABECERA DEL POST */}
              <View style={styles.postHeader}>
                {post.author?.avatar_url ? (
                  <Image source={{ uri: post.author.avatar_url }} style={styles.authorAvatarImage} />
                ) : (
                  <View style={styles.authorAvatar}>
                    <Text style={styles.authorInitial}>
                      {(post.author?.full_name || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.authorInfo}>
                  <Text style={styles.authorName}>{post.author?.full_name}</Text>
                  <Text style={styles.authorHandle}>@{post.author?.username}</Text>
                </View>
                <TouchableOpacity
                  style={styles.reportBtn}
                  onPress={() => openReportModal(post)}
                >
                  <Text style={styles.reportBtnText}>🚩 Reportar</Text>
                </TouchableOpacity>
              </View>

              {/* IMAGEN DE EVIDENCIA */}
              <Image source={{ uri: post.image_url }} style={styles.postImage} />

              {/* DETALLE DE ACTIVIDAD COMPLETADA */}
              <View style={styles.postFooter}>
                <View style={styles.activityBadge}>
                  <Text style={styles.activityBadgeTitle}>
                    ✅ {post.user_activity?.activity?.title || 'Actividad completada'}
                  </Text>
                  <View style={styles.pointsPill}>
                    <Text style={styles.pointsPillText}>
                      +{post.user_activity?.points_awarded || 10} pts
                    </Text>
                  </View>
                </View>
                <Text style={styles.postDate}>
                  {new Date(post.created_at).toLocaleDateString()} a las{' '}
                  {new Date(post.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          ))
        )}

        {/* BOTÓN PAGINACIÓN */}
        {hasMore && (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={() => loadFeed(page + 1, false)}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loadMoreBtnText}>Cargar más publicaciones</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* MODAL DE REPORTE */}
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
    backgroundColor: '#0f172a',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f8fafc',
  },
  refreshBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  refreshBtnText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 12,
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
  postCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  authorAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  authorInitial: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  authorHandle: {
    fontSize: 12,
    color: '#94a3b8',
  },
  reportBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reportBtnText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '600',
  },
  postImage: {
    width: '100%',
    height: 260,
    backgroundColor: '#0f172a',
  },
  postFooter: {
    padding: 14,
  },
  activityBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  activityBadgeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    flex: 1,
    marginRight: 8,
  },
  pointsPill: {
    backgroundColor: '#065f46',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pointsPillText: {
    color: '#34d399',
    fontWeight: '800',
    fontSize: 12,
  },
  postDate: {
    fontSize: 12,
    color: '#64748b',
  },
  loadMoreBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  loadMoreBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 16,
  },
  reasonOption: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  reasonOptionSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#1e1b4b',
  },
  reasonOptionText: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  reasonOptionTextSelected: {
    color: '#ffffff',
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
    backgroundColor: '#334155',
  },
  modalCancelBtnText: {
    color: '#cbd5e1',
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
