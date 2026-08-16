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
  buttonText = 'Completar actividad',
  placeholderText = 'Sube una foto de tu creación',
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.uploadWrapper}>
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
                  <Feather name="camera" size={28} color="#08333D" />
                </View>
                <View style={styles.plusIconBadge}>
                  <Feather name="plus-circle" size={18} color="#FF5A00" />
                </View>
              </View>
              <Text style={styles.uploadText}>{placeholderText}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* BOTÓN REGISTRAR / COMPLETAR ACTIVIDAD */}
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
            {buttonText}
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
    borderTopColor: '#F0F3F5',
  },
  uploadWrapper: {
    marginBottom: 12,
  },
  dashedDropzone: {
    height: 165,
    backgroundColor: 'rgba(0, 201, 253, 0.05)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 201, 253, 0.35)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  placeholderContent: {
    alignItems: 'center',
    padding: 16,
  },
  cameraIconContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  cameraCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#08333D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  plusIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#08333D',
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  completeBtn: {
    backgroundColor: '#FF5A00',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5A00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  completeBtnDisabled: {
    backgroundColor: '#F1F3F5',
    shadowOpacity: 0,
    elevation: 0,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  completeBtnTextDisabled: {
    color: '#9AA0A6',
    fontWeight: '600',
  },
});
