import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import {
  getReportedPostsAdmin,
  resolveReportedPostAdmin,
  getAllActivitiesAdmin,
  createActivityAdmin,
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

  // Campos para crear actividad
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPoints, setNewPoints] = useState('20');
  const [newMinAge, setNewMinAge] = useState('');
  const [newMaxAge, setNewMaxAge] = useState('');
  const [creating, setCreating] = useState(false);

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

  const handleCreateActivity = async () => {
    if (!newTitle.trim() || !newDesc.trim()) {
      const msg = 'Por favor completa el título y la descripción.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Campos requeridos', msg);
      return;
    }

    setCreating(true);
    const { error } = await createActivityAdmin({
      title: newTitle,
      description: newDesc,
      pointsAwarded: newPoints,
      minAge: newMinAge,
      maxAge: newMaxAge,
    });
    setCreating(false);

    if (error) {
      const msg = error.message || 'Error al crear la actividad.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
    } else {
      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      loadActivities();
    }
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
            <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>
              <Ionicons name="flag" size={14} /> Reportes ({reportedPosts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'activities' && styles.activeTab]}
            onPress={() => setActiveTab('activities')}
          >
            <Text style={[styles.tabText, activeTab === 'activities' && styles.activeTabText]}>
              <Ionicons name="flash" size={14} /> Actividades
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

            {reportedPosts.map((post) => (
              <View key={post.id} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <Text style={styles.reportAuthor}>Post de: @{post.author?.username}</Text>
                  <Text style={styles.reportBadge}>REPORTED</Text>
                </View>

                <Image source={{ uri: post.image_url }} style={styles.reportImage} />

                {post.reports && post.reports.length > 0 && (
                  <View style={styles.reasonsBox}>
                    <Text style={styles.reasonsLabel}>Motivo(s) del reporte:</Text>
                    {post.reports.map((r) => (
                      <Text key={r.id} style={styles.reasonText}>
                        • {r.reason} (por @{r.reporter?.username})
                      </Text>
                    ))}
                  </View>
                )}

                <View style={styles.reportActions}>
                  <TouchableOpacity
                    style={styles.restoreBtn}
                    onPress={() => handleResolveReport(post.id, 'ACTIVE')}
                  >
                    <Text style={styles.restoreBtnText}>Mantener</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => setPostToDelete(post.id)}
                  >
                    <Text style={styles.deleteBtnText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
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
                    <Text style={styles.statusToggleText}>
                      {act.is_active ? 'ACTIVA' : 'INACTIVA'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.activityDesc}>{act.description}</Text>
                <Text style={styles.activityMeta}>
                  Puntos: {act.points_awarded} | Edad: {act.min_age || 0} - {act.max_age || 'Sin límite'}
                </Text>
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

      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nueva Actividad</Text>

            <Text style={styles.inputLabel}>Título</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Pinta un cuadro abstracto"
              placeholderTextColor="#8A908B"
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={styles.inputLabel}>Descripción</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Explica detalladamente qué debe hacer el usuario..."
              placeholderTextColor="#8A908B"
              multiline
              value={newDesc}
              onChangeText={setNewDesc}
            />

            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Puntos</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={newPoints}
                  onChangeText={setNewPoints}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Edad Mínima</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. 12"
                  placeholderTextColor="#8A908B"
                  keyboardType="number-pad"
                  value={newMinAge}
                  onChangeText={setNewMinAge}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.submitModalBtn}
                onPress={handleCreateActivity}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitModalText}>Guardar Actividad</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelModalText}>Cancelar</Text>
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F3F5',
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
    backgroundColor: '#F0F8FA',
  },
  tabText: {
    color: '#8A908B',
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#0C8AA6',
    fontWeight: '700',
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
  forbiddenEmoji: {
    fontSize: 54,
    marginBottom: 12,
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
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyText: {
    color: '#121B22',
    fontSize: 14,
    textAlign: 'center',
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F3F5',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  reportAuthor: {
    fontWeight: '700',
    color: '#121B22',
    fontSize: 14,
  },
  reportBadge: {
    backgroundColor: '#FF8F21',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reportImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
  reasonsBox: {
    backgroundColor: '#F0F3F5',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  reasonsLabel: {
    color: '#121B22',
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 4,
  },
  reasonText: {
    color: '#8A908B',
    fontSize: 12,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 10,
  },
  restoreBtn: {
    flex: 1,
    backgroundColor: '#F0F3F5',
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  restoreBtnText: {
    color: '#121B22',
    fontWeight: '700',
    fontSize: 14,
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: '#A94403',
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  createBtn: {
    backgroundColor: '#0C8AA6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F3F5',
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
    backgroundColor: '#0C8AA6',
  },
  inactiveToggle: {
    backgroundColor: '#8A908B',
  },
  statusToggleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  activityDesc: {
    color: '#8A908B',
    fontSize: 13,
    marginBottom: 8,
  },
  activityMeta: {
    color: '#8A908B',
    fontSize: 12,
    fontWeight: '600',
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
  inputLabel: {
    color: '#121B22',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F3F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#121B22',
    fontSize: 14,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
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
  submitModalBtn: {
    flex: 1,
    backgroundColor: '#0C8AA6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitModalText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
