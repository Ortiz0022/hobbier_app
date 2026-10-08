import React from 'react';
import { View, StyleSheet, Image, Modal, Pressable, TouchableOpacity } from 'react-native';
import { Text } from '../../../components/scaledText';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, fonts } from '../../../theme';
import { capitalizarTitulo } from '../../../utils/titleCase';
import { fechaCorta } from '../adminUI';

/**
 * La foto de una publicación, en grande.
 *
 * Moderar una evidencia con una miniatura de 56 píxeles es adivinar, y abrir
 * otra pantalla para una foto es demasiado. Es el mismo visor que ya usa el
 * chat de las salas para las evidencias: fondo oscuro, la imagen completa sin
 * recortar y se cierra tocando fuera o con la cruz.
 */
export const PostViewerModal = ({ post, onClose }) => {
  if (!post) return null;

  const actividad = post.user_activity?.activity;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Image source={{ uri: post.image_url }} style={styles.imagen} resizeMode="contain" />

        <TouchableOpacity
          style={styles.cerrar}
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Cerrar la foto"
        >
          <Ionicons name="close" size={22} color={colors.onPrimary} />
        </TouchableOpacity>

        {/* El pie no se cierra al tocarlo: aquí se lee, no se navega. */}
        <Pressable style={styles.pie} onPress={() => {}}>
          <Text style={styles.pieTitulo} numberOfLines={2}>
            {actividad?.title ? capitalizarTitulo(actividad.title) : 'Actividad sin título'}
          </Text>
          <Text style={styles.pieTexto}>
            @{post.author?.username || 'desconocido'} · publicada {fechaCorta(post.created_at)}
            {actividad?.points_awarded ? ` · +${actividad.points_awarded} pts` : ''}
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagen: {
    width: '100%',
    height: '80%',
  },
  cerrar: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: radii.round,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pie: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 36,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radii.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  pieTitulo: {
    fontSize: 15,
    fontFamily: fonts.heading,
    color: colors.onPrimary,
  },
  pieTexto: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
});
