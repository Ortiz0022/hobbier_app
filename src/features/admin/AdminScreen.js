import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Text } from '../../components/scaledText';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getCategoryLabel } from '../../utils/category';
import { TOKENS } from '../../theme/designTokens';
import { CreateActivityModal } from '../../components/CreateActivityModal';
import {
  getReportedPostsAdmin,
  resolveReportedPostAdmin,
  getAllActivitiesAdmin,
  toggleActivityActiveAdmin,
} from '../../services/adminService';

export const AdminScreen = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'activities'
  const [loading, setLoading] = useState(false);

  // Estado de publicaciones reportadas
  const [reportedPosts, setReportedPosts] = useState([]);

  // Estado de actividades
  const [activities, setActivities] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  // Guarda el id del post pendiente de confirmar. Null = no hay confirmación abierta.
  const [postToDelete, setPostToDelete] = useState(null);


  useEffect(() => {
    if (activeTab === 'reports') loadReports();
    if (activeTab === 'activities') loadActivities();
  }, [activeTab]);

  const loadReports = async () => {
    setLoading(true);
    const { posts } = await getReportedPostsAdmin();
    setReportedPosts(posts);
    setLoading(false);
  };

  const handleResolveReport = async (postId, actionStatus) => {
    const { error } = await resolveReportedPostAdmin(postId, actionStatus);
    if (error) {
      const msg = error.message || 'No se pudo resolver el reporte.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
    } else {
      const actionText = actionStatus === 'ACTIVE' ? 'restaurada' : 'eliminada';
      const msg = `La publicación fue ${actionText} correctamente.`;
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Éxito', msg);
      loadReports();
    }
  };

  const loadActivities = async () => {
    setLoading(true);
    const { activities } = await getAllActivitiesAdmin();
    setActivities(activities);
    setLoading(false);
  };

  const handleToggleActive = async (activityId, currentIsActive) => {
    const { error } = await toggleActivityActiveAdmin(activityId, currentIsActive);
    if (!error) loadActivities();
  };


  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.forbiddenBox}>
          <Ionicons name="lock-closed" size={54} color="#121B22" style={{ marginBottom: 12 }} />
          <Text style={styles.forbiddenTitle}>Acceso Restringido</Text>
          <Text style={styles.forbiddenSubtitle}>
            Esta sección solo está disponible para usuarios con rol de Administrador.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Panel de Administración</Text>
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
            onPress={() => setActiveTab('reports')}
          >
            <Ionicons
              name="flag"
              size={14}
              color={activeTab === 'reports' ? TOKENS.colors.active : TOKENS.colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>
              Reportes ({reportedPosts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'activities' && styles.activeTab]}
            onPress={() => setActiveTab('activities')}
          >
            <Ionicons
              name="flash"
              size={14}
              color={activeTab === 'activities' ? TOKENS.colors.active : TOKENS.colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'activities' && styles.activeTabText]}>
              Actividades
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* PESTAÑA REPORTES */}
        {activeTab === 'reports' && (
          <View>
            {loading && <ActivityIndicator color="#0C8AA6" style={{ marginTop: 20 }} />}
            {!loading && reportedPosts.length === 0 && (
              <View style={styles.emptyCard}>
                <Ionicons name="sparkles" size={40} color="#121B22" style={{ marginBottom: 8 }} />
                <Text style={styles.emptyText}>No hay publicaciones reportadas pendientes de revisión.</Text>
              </View>
            )}

            {reportedPosts.map((post) => {
              const actividad = post.user_activity?.activity;
              return (
              <View key={post.id} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <Text style={styles.reportAuthor}>
                    Post de: <Text style={styles.reportAuthorName}>@{post.author?.username}</Text>
                  </Text>
                  {/* "REVISAR" en vez de "REPORTED": dice qué hacer, no repite
                      el estado que ya implica estar en esta pestaña. */}
                  <View style={styles.alertBadge}>
                    <Text style={styles.alertBadgeText}>REVISAR</Text>
                  </View>
                </View>

                {/* Contexto: a qué actividad correspondía la foto. Sin esto hay
                    que juzgar una imagen suelta sin saber qué se pedía. */}
                {actividad ? (
                  <View style={styles.originalPostPreview}>
                    <View style={styles.categoryRow}>
                      <View style={styles.tagCategory}>
                        <Text style={styles.tagText}>{getCategoryLabel(actividad.category)}</Text>
                      </View>
                      <View style={styles.tagPoints}>
                        <Ionicons name="star" size={10} color={TOKENS.colors.badgePointsText} />
                        <Text style={styles.pointsText}>+{actividad.points_awarded} pts</Text>
                      </View>
                    </View>
                    <Text style={styles.postTitle}>{actividad.title}</Text>
                    <Text style={styles.postSubtitle} numberOfLines={2}>
                      {actividad.description}
                    </Text>
                  </View>
                ) : null}

                {/* La evidencia. Es lo que de verdad se está moderando: sin la
                    imagen no hay forma de decidir si el reporte procede. */}
                <Image source={{ uri: post.image_url }} style={styles.reportImage} />

                {post.reports && post.reports.length > 0 && (
                  <View style={styles.reasonsBox}>
                    <Text style={styles.reasonsLabel}>
                      {post.reports.length > 1 ? 'Motivos del reporte' : 'Motivo del reporte'}
                    </Text>
                    {post.reports.map((r) => (
                      <View key={r.id} style={styles.reasonRow}>
                        <Ionicons name="alert-circle" size={13} color={TOKENS.colors.alertText} />
                        <Text style={styles.reasonText}>
                          <Text style={styles.reasonBold}>{r.reason}</Text>
                          {r.reporter?.username ? ` · por @${r.reporter.username}` : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.reportActions}>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnKeep]}
                    onPress={() => handleResolveReport(post.id, 'ACTIVE')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.btnTextKeep}>Mantener post</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btn, styles.btnDelete]}
                    onPress={() => setPostToDelete(post.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.btnTextDelete}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
              );
            })}
          </View>
        )}

        {/* PESTAÑA ACTIVIDADES */}
        {activeTab === 'activities' && (
          <View>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.createBtnText}>+ Crear Nueva Actividad</Text>
            </TouchableOpacity>

            {loading && <ActivityIndicator color="#0C8AA6" style={{ marginTop: 20 }} />}

            {activities.map((act) => (
              <View key={act.id} style={styles.activityCard}>
                <View style={styles.activityHeader}>
                  <Text style={styles.activityTitle}>{act.title}</Text>
                  <TouchableOpacity
                    style={[styles.statusToggle, act.is_active ? styles.activeToggle : styles.inactiveToggle]}
                    onPress={() => handleToggleActive(act.id, act.is_active)}
                  >
                    <Text
                      style={[
                        styles.statusToggleText,
                        { color: act.is_active ? TOKENS.colors.badgeInfoText : TOKENS.colors.textMuted },
                      ]}
                    >
                      {act.is_active ? 'ACTIVA' : 'INACTIVA'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.activityDesc}>{act.description}</Text>

                {/* Los tres datos como etiquetas sueltas: en una sola línea gris
                    había que leerla entera para encontrar un dato concreto. */}
                <View style={styles.metaRow}>
                  <View style={styles.metaBadge}>
                    <Ionicons name="pricetag-outline" size={11} color={TOKENS.colors.inactiveText} />
                    <Text style={styles.metaBadgeText}>{getCategoryLabel(act.category)}</Text>
                  </View>
                  <View style={styles.metaBadge}>
                    <Ionicons name="star-outline" size={11} color={TOKENS.colors.inactiveText} />
                    <Text style={styles.metaBadgeText}>{act.points_awarded} pts</Text>
                  </View>
                  <View style={styles.metaBadge}>
                    <Ionicons name="person-outline" size={11} color={TOKENS.colors.inactiveText} />
                    <Text style={styles.metaBadgeText}>
                      {act.max_age ? `${act.min_age || 0}-${act.max_age} años` : `${act.min_age || 0}+ años`}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* MODAL DE CREACIÓN DE ACTIVIDAD */}
      {/* CONFIRMACIÓN DE BORRADO.
          Modal propio en lugar de Alert.alert o window.confirm: ninguno de los dos
          deja ordenar los botones, y en web Alert.alert de react-native-web ni
          siquiera se muestra. */}
      <Modal visible={postToDelete !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>¿Eliminar la publicación?</Text>
            <Text style={styles.confirmText}>
              Dejará de verse en el feed y el autor perderá su evidencia. Esta acción no
              se puede deshacer.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={() => {
                  handleResolveReport(postToDelete, 'DELETED');
                  setPostToDelete(null);
                }}
              >
                <Text style={styles.confirmDeleteText}>Sí, eliminar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setPostToDelete(null)}
              >
                <Text style={styles.cancelModalText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Mismo formulario que usa Perfil. `forCatalog` guarda la actividad con
          created_by NULL, para que entre al catálogo general en vez de quedar
          visible solo para el administrador que la creó. */}
      <CreateActivityModal
        visible={showCreateModal}
        forCatalog
        onClose={() => setShowCreateModal(false)}
        onCreated={loadActivities}
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
    padding: 24,
    paddingBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#121B22',
    marginBottom: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: TOKENS.colors.segmentTrack,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  activeTab: {
    // La pastilla activa es BLANCA, no del color de marca: así no compite con
    // el botón "Crear Nueva Actividad", que es la acción principal de la pantalla.
    backgroundColor: TOKENS.colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: TOKENS.colors.textMuted,
  },
  activeTabText: {
    color: TOKENS.colors.active,
    fontWeight: '600',
  },
  content: {
    padding: 24,
    paddingTop: 12,
  },
  forbiddenBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  forbiddenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#121B22',
    marginBottom: 8,
  },
  forbiddenSubtitle: {
    color: '#8A908B',
    textAlign: 'center',
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: '#F0F8FA',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F3F5',
    marginTop: 12,
  },
  emptyText: {
    color: '#121B22',
    fontSize: 14,
    textAlign: 'center',
  },
  reportCard: {
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.inactiveBorder,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportAuthor: {
    fontSize: 14,
    color: TOKENS.colors.inactiveText,
    flexShrink: 1,
  },
  reportAuthorName: {
    fontWeight: '700',
    color: TOKENS.colors.textDark,
  },
  alertBadge: {
    backgroundColor: TOKENS.colors.alertBg,
    borderWidth: 1,
    borderColor: TOKENS.colors.alertBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  alertBadgeText: {
    color: TOKENS.colors.alertText,
    fontSize: 11,
    fontWeight: '700',
  },
  originalPostPreview: {
    backgroundColor: TOKENS.colors.inactiveBg,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.segmentTrack,
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  tagCategory: {
    backgroundColor: TOKENS.colors.inactiveBorder,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 1,
  },
  tagText: {
    fontSize: 11,
    color: TOKENS.colors.inactiveText,
  },
  tagPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: TOKENS.colors.badgePointsBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pointsText: {
    fontSize: 11,
    color: TOKENS.colors.badgePointsText,
    fontWeight: '600',
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TOKENS.colors.textDark,
    marginBottom: 2,
  },
  postSubtitle: {
    fontSize: 12,
    color: TOKENS.colors.textMuted,
    lineHeight: 16,
  },
  reportImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
  reasonsBox: {
    backgroundColor: TOKENS.colors.segmentTrack,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  reasonsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TOKENS.colors.inactiveText,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    color: TOKENS.colors.textDark,
    lineHeight: 18,
  },
  reasonBold: {
    fontWeight: '600',
  },
  reportActions: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnKeep: {
    backgroundColor: TOKENS.colors.inactiveBorder,
  },
  btnDelete: {
    backgroundColor: TOKENS.colors.destructive,
  },
  btnTextKeep: {
    color: TOKENS.colors.inactiveText,
    fontSize: 14,
    fontWeight: '600',
  },
  btnTextDelete: {
    color: TOKENS.colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  createBtn: {
    backgroundColor: TOKENS.colors.active,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  activityCard: {
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.inactiveBorder,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#121B22',
    flex: 1,
    marginRight: 8,
  },
  statusToggle: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeToggle: {
    backgroundColor: TOKENS.colors.badgeInfoBg,
  },
  inactiveToggle: {
    backgroundColor: TOKENS.colors.inactiveBg,
    borderWidth: 1,
    borderColor: TOKENS.colors.inactiveBorder,
  },
  statusToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  activityDesc: {
    fontSize: 13,
    color: TOKENS.colors.inactiveText,
    lineHeight: 18,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: TOKENS.colors.inactiveBg,
    borderWidth: 1,
    borderColor: TOKENS.colors.inactiveBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaBadgeText: {
    fontSize: 12,
    color: TOKENS.colors.inactiveText,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 0,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#121B22',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  confirmText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#8A908B',
    marginBottom: 20,
    marginTop: -8,
  },
  confirmDeleteBtn: {
    flex: 1,
    backgroundColor: '#A94403',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmDeleteText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cancelModalBtn: {
    flex: 1,
    // Cancelar no es destructivo: superficie neutra, como el botón "Mantener".
    backgroundColor: '#F0F3F5',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelModalText: {
    color: '#121B22',
    fontWeight: '600',
  },
});
