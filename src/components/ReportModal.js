import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

const DEFAULT_REASONS = [
  'Contenido ofensivo',
  'Contenido inapropiado',
  'Violencia',
  'Acoso',
  'Spam',
  'Otro',
];

export const ReportModal = ({
  visible,
  onClose,
  onSubmit,
  submitting = false,
  title = 'Reportar publicación',
  subtitle = '¿Qué ocurre con esta publicación?',
  reasons = DEFAULT_REASONS,
}) => {
  const [selectedReason, setSelectedReason] = useState(null);

  // Reiniciar la selección al abrir el modal
  useEffect(() => {
    if (visible) {
      setSelectedReason(null);
    }
  }, [visible]);

  const handleSubmit = () => {
    if (selectedReason && onSubmit) {
      onSubmit(selectedReason);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableWithoutFeedback>
          <View style={styles.sheetContainer}>
            {/* Indicador de arrastre superior */}
            <View style={styles.handleBar} />

            {/* Encabezado con título y botón de cierre */}
            <View style={styles.headerRow}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.closeBtn}
              >
                <Feather name="x" size={20} color="#121B22" />
              </TouchableOpacity>
            </View>

            {/* Subtítulo informativo */}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

            {/* Lista de razones con botones de radio */}
            <View style={styles.optionsList}>
              {reasons.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    style={styles.optionRow}
                    onPress={() => setSelectedReason(reason)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <View style={styles.radioInnerDot} />}
                    </View>
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Línea divisora previa al botón de acción */}
            <View style={styles.divider} />

            {/* Botón enviar reporte */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                !selectedReason ? styles.submitBtnDisabled : styles.submitBtnActive,
              ]}
              onPress={handleSubmit}
              disabled={!selectedReason || submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color={selectedReason ? '#FFFFFF' : '#94A3B8'} />
              ) : (
                <Text
                  style={[
                    styles.submitBtnText,
                    !selectedReason ? styles.submitBtnTextDisabled : styles.submitBtnTextActive,
                  ]}
                >
                  Enviar reporte
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#121B22',
    letterSpacing: -0.2,
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  optionsList: {
    marginVertical: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  radioCircleSelected: {
    borderColor: '#121B22',
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#121B22',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#1E293B',
  },
  optionTextSelected: {
    fontWeight: '600',
    color: '#121B22',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginTop: 12,
    marginBottom: 16,
  },
  submitBtn: {
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#F1F5F9',
  },
  submitBtnActive: {
    backgroundColor: '#121B22',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  submitBtnTextDisabled: {
    color: '#94A3B8',
  },
  submitBtnTextActive: {
    color: '#FFFFFF',
  },
});
