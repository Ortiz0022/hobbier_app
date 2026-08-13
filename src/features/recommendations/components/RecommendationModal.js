import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

export const RecommendationModal = ({
  visible,
  loading,
  recommended,
  accepting,
  onAccept,
  onReload,
  onClose,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {loading ? (
            <View style={styles.modalLoadingBox}>
              <ActivityIndicator size="large" color="#DF9C8E" />
              <Text style={styles.modalLoadingText}>
                Buscando en Supabase una actividad basada en tu edad, gustos e insumos...
              </Text>
            </View>
          ) : recommended ? (
            <View>
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalCategoryBadge}>
                  <Feather name="star" size={12} color="#8A4234" />
                  <Text style={styles.modalCategoryText}>Recomendación</Text>
                </View>
                <View style={styles.modalPointsBadge}>
                  <Text style={styles.modalPointsText}>+{recommended.points_awarded} pts</Text>
                </View>
              </View>

              <Text style={styles.modalActivityTitle}>{recommended.title}</Text>
              <Text style={styles.modalActivityDesc}>{recommended.description}</Text>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalAcceptBtn}
                  onPress={onAccept}
                  disabled={accepting}
                >
                  {accepting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.modalAcceptBtnText}>Aceptar Actividad</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalReloadBtn}
                  onPress={onReload}
                  disabled={accepting}
                >
                  <View style={styles.reloadBtnContent}>
                    <Feather name="refresh-cw" size={14} color="#434744" />
                    <Text style={styles.modalReloadBtnText}>Otra Opción</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
                <Text style={styles.modalCloseText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.modalLoadingBox}>
              <Text style={styles.modalLoadingText}>
                No se encontraron actividades compatibles. Modifica tus gustos o recursos en tu Perfil.
              </Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
                <Text style={styles.modalCloseText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
  },
  modalLoadingBox: {
    padding: 20,
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#5C615D',
    textAlign: 'center',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5DCD5',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  modalCategoryText: {
    color: '#8A4234',
    fontWeight: '500',
    fontSize: 12,
  },
  modalPointsBadge: {
    backgroundColor: '#ECF4EE',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modalPointsText: {
    color: '#2A6347',
    fontWeight: '600',
    fontSize: 13,
  },
  modalActivityTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C201D',
    marginBottom: 8,
  },
  modalActivityDesc: {
    fontSize: 14,
    color: '#5C615D',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActionsRow: {
    gap: 10,
    marginBottom: 12,
  },
  modalAcceptBtn: {
    backgroundColor: '#1C3A30',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalAcceptBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modalReloadBtn: {
    backgroundColor: '#EFEFEA',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reloadBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalReloadBtnText: {
    color: '#434744',
    fontSize: 14,
    fontWeight: '500',
  },
  modalCloseBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalCloseText: {
    color: '#8A908B',
    fontSize: 13,
    fontWeight: '400',
  },
});
