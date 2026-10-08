import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Text } from '../../../components/scaledText';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, fonts } from '../../../theme';
import { useNotify } from '../../../context/NotificationContext';
import { CatalogPicker } from '../../onboarding/components/CatalogPicker';
import { getActivityTagsAdmin, updateActivityTagsAdmin } from '../../../services/adminService';
import { capitalizarTitulo } from '../../../utils/titleCase';

/**
 * Gustos e intereses de una actividad ya creada.
 *
 * Son las etiquetas con las que get_recommended_activity decide a quién se le
 * ofrece: cruza activity_likes con los gustos que marcó el usuario. Una
 * actividad sin ningún gusto no le toca a nadie en concreto, solo sale como
 * comodín; por eso hace falta poder etiquetarla después, sin borrarla y
 * volverla a crear.
 *
 * El selector es el MISMO que el del asistente de preferencias: pide unas
 * pocas opciones al abrir y busca en Postgres al escribir, en vez de bajarse
 * el catálogo entero. Con cientos de gustos, una lista completa no sirve.
 */
export const ActivityTagsModal = ({ activity, onClose, onSaved }) => {
  const { notify } = useNotify();
  const [gustos, setGustos] = useState([]);
  const [intereses, setIntereses] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    if (!activity?.id) return;
    setCargando(true);
    const { tags } = await getActivityTagsAdmin([activity.id]);
    const suyas = tags[activity.id] || { likes: [], interests: [] };
    setGustos(suyas.likes.map((fila) => fila.id));
    setIntereses(suyas.interests.map((fila) => fila.id));
    setCargando(false);
  }, [activity?.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (!activity) return null;

  const guardar = async () => {
    setGuardando(true);
    const { error } = await updateActivityTagsAdmin(activity.id, {
      likeIds: gustos,
      interestIds: intereses,
    });
    setGuardando(false);

    if (error) {
      notify('No se pudieron guardar las etiquetas.', { type: 'error' });
      return;
    }
    notify('Etiquetas guardadas.', { type: 'success' });
    onSaved?.();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={estilos.overlay} onPress={onClose}>
        {/* El panel no se cierra al tocarlo: dentro se elige, no se sale. */}
        <Pressable style={estilos.panel} onPress={() => {}}>
          <View style={estilos.cabecera}>
            <View style={{ flex: 1 }}>
              <Text style={estilos.titulo}>Gustos e intereses</Text>
              <Text style={estilos.subtitulo} numberOfLines={2}>
                {capitalizarTitulo(activity.title)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Cerrar sin guardar" hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {cargando ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} />
          ) : (
            <ScrollView contentContainerStyle={estilos.cuerpo} keyboardShouldPersistTaps="handled">
              {gustos.length === 0 && (
                <View style={estilos.aviso}>
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <Text style={estilos.avisoTexto}>
                    Sin ningún gusto, esta actividad solo se ofrece como comodín: no le llega a
                    nadie por lo que marcó en sus preferencias.
                  </Text>
                </View>
              )}

              <Text style={estilos.etiquetaSeccion}>
                Gustos {gustos.length > 0 ? `(${gustos.length})` : ''}
              </Text>
              <Text style={estilos.ayuda}>Con estos se decide a quién se le recomienda.</Text>
              <CatalogPicker tabla="likes" selectedIds={gustos} onChange={setGustos} compact />

              <Text style={[estilos.etiquetaSeccion, { marginTop: spacing.lg }]}>
                Intereses {intereses.length > 0 ? `(${intereses.length})` : ''}
              </Text>
              <Text style={estilos.ayuda}>Los objetivos con los que encaja la actividad.</Text>
              <CatalogPicker tabla="interests" selectedIds={intereses} onChange={setIntereses} compact />
            </ScrollView>
          )}

          <View style={estilos.pie}>
            <TouchableOpacity style={estilos.btnCancelar} onPress={onClose} activeOpacity={0.85}>
              <Text style={estilos.btnCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[estilos.btnGuardar, (guardando || cargando) && estilos.btnApagado]}
              onPress={guardar}
              disabled={guardando || cargando}
              activeOpacity={0.85}
            >
              <Text style={estilos.btnGuardarTexto}>
                {guardando ? 'Guardando...' : 'Guardar etiquetas'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const estilos = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    maxHeight: '85%',
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  titulo: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  subtitulo: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  cuerpo: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  avisoTexto: {
    flex: 1,
    fontSize: 12,
    color: colors.danger,
    lineHeight: 17,
  },
  etiquetaSeccion: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  ayuda: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  pie: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  btnCancelar: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  btnCancelarTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textFaint,
  },
  btnGuardar: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  btnApagado: {
    opacity: 0.6,
  },
  btnGuardarTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
});
