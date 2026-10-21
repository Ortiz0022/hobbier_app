import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Text } from '../../../components/scaledText';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, fonts } from '../../../theme';
import { MOTIVO_MINIMO } from '../../../services/adminService';
import { capitalizarTitulo } from '../../../utils/titleCase';

/**
 * Sancionar una cuenta explicando por qué.
 *
 * El motivo es obligatorio porque es lo único que la persona sancionada va a
 * leer: se le enseña tal cual en su pantalla y queda escrito en su chat de
 * apelación. Una sanción sin explicación no se puede apelar ni revisar.
 *
 * El aviso de que lo va a leer está a la vista mientras se escribe, para que
 * el motivo se redacte para ella y no como una nota interna.
 */
export const SancionModal = ({ perfil, onCancelar, onConfirmar }) => {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (!perfil) return null;

  const limpio = motivo.trim();
  const falta = Math.max(0, MOTIVO_MINIMO - limpio.length);
  const puedeEnviar = falta === 0 && !enviando;

  const confirmar = async () => {
    if (!puedeEnviar) return;
    setEnviando(true);
    try {
      await onConfirmar(limpio);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancelar}>
      <Pressable style={estilos.overlay} onPress={onCancelar}>
        {/* El panel no se cierra al tocarlo: aquí se escribe. */}
        <Pressable style={estilos.panel} onPress={() => {}}>
          <View style={estilos.cabecera}>
            <View style={{ flex: 1 }}>
              <Text style={estilos.titulo}>Sancionar cuenta</Text>
              <Text style={estilos.subtitulo} numberOfLines={1}>
                {capitalizarTitulo(perfil.full_name || perfil.username)} · @{perfil.username}
              </Text>
            </View>
            <TouchableOpacity onPress={onCancelar} accessibilityLabel="Cancelar" hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={estilos.cuerpo}>
            <View style={estilos.aviso}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={estilos.avisoTexto}>Perderá el acceso hasta su reactivación.</Text>
            </View>

            <Text style={estilos.etiqueta}>Motivo de la sanción</Text>

            <TextInput
              style={estilos.campo}
              value={motivo}
              onChangeText={setMotivo}
              placeholder="Ej.: Contenido ofensivo hacia otros usuarios."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
              editable={!enviando}
              accessibilityLabel="Motivo de la sanción"
            />

            <Text style={estilos.contador}>
              {falta > 0
                ? `Faltan ${falta} ${falta === 1 ? 'carácter' : 'caracteres'}`
                : `${limpio.length} de 500`}
            </Text>
          </View>

          <View style={estilos.pie}>
            <TouchableOpacity
              style={[estilos.btnSancionar, !puedeEnviar && estilos.btnApagado]}
              onPress={confirmar}
              disabled={!puedeEnviar}
              activeOpacity={0.85}
            >
              {enviando ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text style={estilos.btnSancionarTexto}>Sancionar</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={estilos.btnCancelar} onPress={onCancelar} activeOpacity={0.85}>
              <Text style={estilos.btnCancelarTexto}>Cancelar</Text>
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
    paddingBottom: spacing.sm,
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
    alignItems: 'center',
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
  etiqueta: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  ayuda: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.sm,
    lineHeight: 17,
  },
  campo: {
    minHeight: 96,
    borderWidth: 1.5,
    borderColor: colors.danger,
    backgroundColor: 'transparent',
    borderRadius: radii.input,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: 'top',
    ...Platform.select({ web: { outlineStyle: 'none' }, default: {} }),
  },
  contador: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
    textAlign: 'right',
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
  btnSancionar: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
  },
  btnApagado: {
    opacity: 0.5,
  },
  btnSancionarTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
});
