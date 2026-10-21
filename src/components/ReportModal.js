import { useThemeValues } from '../context/ThemeContext';
import { createThemeStyles } from '../theme/themeRuntime';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Text, TextInput } from './scaledText';
import Feather from '@expo/vector-icons/Feather';
import { capitalizarTitulo } from '../utils/titleCase';


// Razón que pide al usuario escribir el motivo con sus propias palabras
const OTHER_REASON = 'Otro';
const MAX_DETAILS_LENGTH = 300;

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
  const { theme, TOKENS, styles } = useThemeValues(getReportModalTheme);

  const [selectedReason, setSelectedReason] = useState(null);
  const [otherDetails, setOtherDetails] = useState('');

  // Reiniciar la selección al abrir el modal
  useEffect(() => {
    if (visible) {
      setSelectedReason(null);
      setOtherDetails('');
    }
  }, [visible]);

  const isOther = selectedReason === OTHER_REASON;
  // Con "Otro" el motivo escrito es obligatorio: sin él el admin no sabe qué revisar
  const canSubmit = !!selectedReason && (!isOther || otherDetails.trim().length > 0);

  const handleSubmit = () => {
    if (canSubmit && onSubmit) {
      onSubmit(selectedReason, isOther ? otherDetails.trim() : '');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.keyboardWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Pressable>
          <View style={styles.sheetContainer}>
            {/* Indicador de arrastre superior */}
            <View style={styles.handleBar} />

            {/* Encabezado con título y botón de cierre */}
            <View style={styles.headerRow}>
              <Text style={styles.title}>{capitalizarTitulo(title)}</Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.closeBtn}
              >
                <Feather name="x" size={20} color={theme.color("#121B22", 'text')} />
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

            {/* Campo libre para explicar el motivo cuando se elige "Otro" */}
            {isOther && (
              <View style={styles.detailsWrapper}>
                <TextInput {...theme.textInputProps}
                  style={styles.detailsInput}
                  value={otherDetails}
                  onChangeText={setOtherDetails}
                  placeholder="Cuéntanos el motivo del reporte"
                  placeholderTextColor={theme.color("#94A3B8", "muted")}
                  multiline
                  autoFocus
                  maxLength={MAX_DETAILS_LENGTH}
                  textAlignVertical="top"
                />
                <Text style={styles.detailsCounter}>
                  {otherDetails.length}/{MAX_DETAILS_LENGTH}
                </Text>
              </View>
            )}

            {/* Línea divisora previa al botón de acción */}
            <View style={styles.divider} />

            {/* Botón enviar reporte */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                !canSubmit ? styles.submitBtnDisabled : styles.submitBtnActive,
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit || submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color={canSubmit ? theme.color('#FFFFFF', 'text') : theme.color('#94A3B8', "muted")} />
              ) : (
                <Text
                  style={[
                    styles.submitBtnText,
                    !canSubmit ? styles.submitBtnTextDisabled : styles.submitBtnTextActive,
                  ]}
                >
                  Enviar reporte
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getReportModalTheme = createThemeStyles((theme) => {
const { TOKENS } = theme;
const styles = StyleSheet.create({
  keyboardWrapper: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: theme.color('#FFFFFF', 'card'),
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    elevation: 20,
    boxShadow: '0px -4px 12px rgba(0,0,0,0.1)',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.color('#E2E8F0', 'card'),
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
    color: theme.color('#121B22', 'text'),
    letterSpacing: -0.2,
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.color('#64748B', "muted"),
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
    borderColor: theme.color('#CBD5E1', 'border'),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  radioCircleSelected: {
    borderColor: theme.color(TOKENS.colors.primary, "primary"),
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: TOKENS.colors.primary,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '400',
    color: theme.color('#1E293B', 'text'),
  },
  optionTextSelected: {
    fontWeight: '600',
    color: theme.color('#121B22', 'text'),
  },
  detailsWrapper: {
    marginTop: 4,
  },
  detailsInput: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: theme.color(TOKENS.colors.inactiveBorder, 'border'),
    backgroundColor: theme.color(TOKENS.colors.inactiveBg, 'secondary'),
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    color: TOKENS.colors.textDark,
  },
  detailsCounter: {
    alignSelf: 'flex-end',
    marginTop: 4,
    fontSize: 11,
    color: TOKENS.colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: theme.color('#F1F5F9', "border"),
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
    backgroundColor: theme.color('#F1F5F9', 'secondary'),
  },
  submitBtnActive: {
    backgroundColor: theme.color(TOKENS.colors.primary, 'selected'),
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  submitBtnTextDisabled: {
    color: theme.color('#94A3B8', "muted"),
  },
  submitBtnTextActive: {
    color: theme.color('#FFFFFF', 'onAccent'),
  },
});
  return { theme, TOKENS, styles };
});
