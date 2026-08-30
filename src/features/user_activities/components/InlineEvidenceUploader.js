import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '../../../theme';

export const InlineEvidenceUploader = ({
  imageUri,
  completing,
  onPickImage,
  onTakePhoto,
  onComplete,
  buttonText = 'Superar misión',
}) => (
  <View style={styles.container}>
    {imageUri ? (
      <View style={styles.readyCard}>
        <View style={styles.readyIcon}>
          <Feather name="check" size={24} color={colors.success} />
        </View>
        <View style={styles.readyCopy}>
          <Text style={styles.readyTitle}>Evidencia lista</Text>
          <Text style={styles.readyText}>
            La foto está preparada. La encontrarás en tu Perfil al completar.
          </Text>
        </View>
      </View>
    ) : (
      <View style={styles.introCard}>
        <View style={styles.introIcon}>
          <Feather name="camera" size={25} color={colors.primary} />
        </View>
        <Text style={styles.introTitle}>Guarda este momento</Text>
        <Text style={styles.introText}>
          Necesitamos una foto como evidencia, pero no la mostraremos en Actividad.
        </Text>
      </View>
    )}

    <View style={styles.sourceRow}>
      <TouchableOpacity
        style={styles.sourceButton}
        onPress={onTakePhoto}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <Feather name="camera" size={18} color={colors.primaryDark} />
        <Text style={styles.sourceButtonText}>Cámara</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.sourceButton}
        onPress={onPickImage}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <Feather name="image" size={18} color={colors.primaryDark} />
        <Text style={styles.sourceButtonText}>Galería</Text>
      </TouchableOpacity>
    </View>

    <TouchableOpacity
      style={[styles.completeButton, !imageUri && styles.completeButtonDisabled]}
      onPress={onComplete}
      disabled={!imageUri || completing}
      activeOpacity={0.9}
      accessibilityRole="button"
    >
      {completing ? (
        <ActivityIndicator color={colors.onPrimary} />
      ) : (
        <>
          <Text style={[styles.completeText, !imageUri && styles.completeTextDisabled]}>
            {buttonText}
          </Text>
          <Feather
            name="arrow-right"
            size={17}
            color={imageUri ? colors.onPrimary : colors.textMuted}
          />
        </>
      )}
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { marginTop: 18 },
  introCard: {
    alignItems: 'center', backgroundColor: colors.primarySoft,
    borderRadius: 22, paddingHorizontal: 20, paddingVertical: 22,
  },
  introIcon: {
    width: 54, height: 54, borderRadius: 18,
    backgroundColor: colors.onPrimary, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  introTitle: { color: colors.text, fontSize: 16, fontWeight: '500' },
  introText: {
    color: colors.textMuted, fontSize: 12, lineHeight: 18,
    textAlign: 'center', marginTop: 5, maxWidth: 280,
  },
  readyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    backgroundColor: '#EDF7F1', borderRadius: 22, padding: 17,
  },
  readyIcon: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: colors.onPrimary, alignItems: 'center', justifyContent: 'center',
  },
  readyCopy: { flex: 1 },
  readyTitle: { color: colors.text, fontSize: 15, fontWeight: '500' },
  readyText: { color: colors.textFaint, fontSize: 11, lineHeight: 16, marginTop: 3 },
  sourceRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  sourceButton: {
    flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
  },
  sourceButtonText: { color: colors.primaryDark, fontSize: 12, fontWeight: '500' },
  completeButton: {
    minHeight: 53, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 9, backgroundColor: colors.accent,
    borderRadius: 18, marginTop: 12,
  },
  completeButtonDisabled: { backgroundColor: colors.surfaceMuted },
  completeText: { color: colors.onPrimary, fontSize: 14, fontWeight: '600' },
  completeTextDisabled: { color: colors.textMuted },
});
