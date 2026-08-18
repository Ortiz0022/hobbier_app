import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../../../components/scaledText';
import Feather from '@expo/vector-icons/Feather';

export const RecommendationModal = ({
  visible,
  loading,
  recommended,
  reason = null,
  onGoToPreferences,
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
                Buscando una actividad basada en tu edad, gustos e insumos...
              </Text>
            </View>
          ) : recommended ? (
            <View>
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalCategoryBadge}>
                  <Feather name="star" size={12} color="#0C8AA6" />
                  <Text style={styles.modalCategoryText}>Recomendación</Text>
                </View>
                <View style={styles.modalPointsBadge}>
                  <Feather name="star" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.modalPointsText}>+{recommended.points_awarded} pts</Text>
                </View>
              </View>

              <View style={styles.centralIconWrapper}>
                <Feather
                  name={recommended.title?.toLowerCase().includes('café') ? 'coffee' : recommended.title?.toLowerCase().includes('deporte') || recommended.title?.toLowerCase().includes('ejercicio') ? 'activity' : 'zap'}
                  size={64}
                  color="#00DBFF"
                />
              </View>

              <Text style={styles.modalActivityTitle}>{recommended.title}</Text>
              <Text style={styles.modalActivityDesc}>{recommended.description}</Text>

              {/* Solo aparece cuando eligió la IA; con el respaldo por afinidad
                  no hay explicación que mostrar y el bloque desaparece. */}
              {reason ? (
                <View style={styles.reasonBox}>
                  <Feather name="zap" size={13} color="#0C8AA6" style={{ marginTop: 2 }} />
                  <Text style={styles.reasonText}>{reason}</Text>
                </View>
              ) : null}

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
                    <Feather name="refresh-cw" size={14} color="#0C8AA6" />
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
              <Feather name="compass" size={26} color="#8A908B" />
              <Text style={styles.modalLoadingText}>
                No se encontraron actividades compatibles. Ajusta tus gustos, intereses o
                recursos en tus preferencias.
              </Text>
              {onGoToPreferences ? (
                <TouchableOpacity
                  style={styles.modalAcceptBtn}
                  onPress={() => {
                    onClose();
                    onGoToPreferences();
                  }}
                >
                  <Text style={styles.modalAcceptBtnText}>Ajustar preferencias</Text>
                </TouchableOpacity>
              ) : null}
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
    borderRadius: 36,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalLoadingBox: {
    padding: 20,
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#121B22',
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
    backgroundColor: '#F0F8FA',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  modalCategoryText: {
    color: '#0C8AA6',
    fontWeight: '600',
    fontSize: 12,
  },
  modalPointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF8F21',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modalPointsText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  centralIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  modalActivityTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#121B22',
    marginBottom: 8,
  },
  modalActivityDesc: {
    fontSize: 14,
    color: '#121B22',
    lineHeight: 20,
    marginBottom: 24,
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EAF7FA',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: -10,
    marginBottom: 22,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#0C8AA6',
  },
  modalActionsRow: {
    gap: 10,
    marginBottom: 12,
  },
  modalAcceptBtn: {
    backgroundColor: '#FF8F21',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalAcceptBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modalReloadBtn: {
    backgroundColor: '#F0F3F5',
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
    color: '#0C8AA6',
    fontSize: 14,
    fontWeight: '600',
  },
  modalCloseBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalCloseText: {
    color: '#121B22',
    fontSize: 13,
    fontWeight: '600',
  },
});
