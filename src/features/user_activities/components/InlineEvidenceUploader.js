import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

export const InlineEvidenceUploader = ({
  imageUri,
  completing,
  onPickImage,
  onComplete,
}) => {
  return (
    <View style={styles.container}>
      {/* CONTENEDOR CON PUNTITOS Y DECORACIÓN DE ESCARCHA */}
      <View style={styles.uploadWrapper}>
        {/* ELIMINADOS LOS PUNTOS DECORATIVOS PARA LIMPIEZA VISUAL */}

        <TouchableOpacity
          style={styles.dashedDropzone}
          onPress={onPickImage}
          activeOpacity={0.85}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.placeholderContent}>
              <View style={styles.cameraIconContainer}>
                <View style={styles.cameraCircle}>
                  <Feather name="camera" size={26} color="#0C8AA6" />
                </View>
                <View style={styles.plusIconBadge}>
                  <Feather name="plus-circle" size={16} color="#FF8F21" />
                </View>
              </View>
              <Text style={styles.uploadText}>Sube una foto de tu</Text>
              <Text style={styles.uploadTextSub}>creación</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* BOTÓN MENTA COMPLETAR ACTIVIDAD */}
      <TouchableOpacity
        style={[styles.completeBtn, !imageUri && styles.completeBtnDisabled]}
        onPress={onComplete}
        disabled={!imageUri || completing}
        activeOpacity={0.88}
      >
        {completing ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={[styles.completeBtnText, !imageUri && styles.completeBtnTextDisabled]}>
            Completar actividad
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EFEEEA',
  },
  uploadWrapper: {
    position: 'relative',
    marginBottom: 14,
  },
  dashedDropzone: {
    height: 140,
    backgroundColor: '#F5FCFF',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(0, 201, 253, 0.2)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    zIndex: 2,
  },
  placeholderContent: {
    alignItems: 'center',
    padding: 16,
  },
  cameraIconContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  cameraCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  plusIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 1,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#121B22',
    textAlign: 'center',
  },
  uploadTextSub: {
    fontSize: 14,
    fontWeight: '400',
    color: '#121B22',
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  // PUNTOS PASTEL DE FONDO (ESCARCHA Y CONFETI)
  decorDot: {
    position: 'absolute',
    borderRadius: 10,
    zIndex: 1,
  },
  dot1: {
    top: 15,
    left: -8,
    width: 7,
    height: 7,
    backgroundColor: '#BEE0D0',
  },
  dot2: {
    top: 35,
    right: -6,
    width: 9,
    height: 9,
    backgroundColor: '#E7A396',
  },
  dot3: {
    bottom: 25,
    left: -6,
    width: 8,
    height: 8,
    backgroundColor: '#BDD4F6',
  },
  dot4: {
    bottom: 12,
    right: -8,
    width: 6,
    height: 6,
    backgroundColor: '#FFCCC2',
  },
  dot5: {
    top: 100,
    right: -10,
    width: 5,
    height: 5,
    backgroundColor: '#386756',
    opacity: 0.5,
  },
  completeBtn: {
    backgroundColor: '#FF8F21',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  completeBtnDisabled: {
    backgroundColor: 'rgba(255, 143, 33, 0.4)',
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  completeBtnTextDisabled: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
