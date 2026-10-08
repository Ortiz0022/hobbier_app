import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { Text } from '../../../components/scaledText';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, fonts } from '../../../theme';
import { adminStyles, BotonAccion, Insignia } from '../adminUI';
import { capitalizarTitulo } from '../../../utils/titleCase';

/** Con más resultados que esto, la lista deja de ayudar: que afine la búsqueda. */
const TOPE_BUSQUEDA = 8;

/**
 * Quién puede entrar al panel.
 *
 * Vive aparte y no en cada tarjeta de usuario por dos razones: nombrar a un
 * administrador es algo que se hace una vez cada mucho, y tener ese botón
 * repetido en cada fila llenaba la lista de acciones que casi nunca se usan.
 * Aquí, además, se ve de un vistazo cuánta gente tiene acceso, que es la
 * pregunta que de verdad se hace uno.
 */
export const AdminsModal = ({ usuarios, yoId, onCambiarRol, onClose }) => {
  const [busqueda, setBusqueda] = useState('');

  const admins = useMemo(() => usuarios.filter((u) => u.role === 'ADMIN'), [usuarios]);

  const candidatos = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return [];
    return usuarios
      .filter(
        (u) =>
          u.role !== 'ADMIN' &&
          ((u.username || '').toLowerCase().includes(texto) ||
            (u.full_name || '').toLowerCase().includes(texto))
      )
      .slice(0, TOPE_BUSQUEDA);
  }, [usuarios, busqueda]);

  const Fila = ({ perfil, accion }) => (
    <View style={estilos.fila}>
      {perfil.avatar_url ? (
        <Image source={{ uri: perfil.avatar_url }} style={estilos.avatar} />
      ) : (
        <View style={[estilos.avatar, estilos.avatarVacio]}>
          <Text style={estilos.avatarLetra}>
            {(perfil.full_name || perfil.username || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={adminStyles.listTitle} numberOfLines={1}>
          {capitalizarTitulo(perfil.full_name || perfil.username)}
        </Text>
        <Text style={adminStyles.listSubtitle} numberOfLines={1}>
          @{perfil.username}
        </Text>
      </View>
      {accion}
    </View>
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={estilos.overlay} onPress={onClose}>
        {/* El panel no se cierra al tocarlo: dentro se decide, no se sale. */}
        <Pressable style={estilos.panel} onPress={() => {}}>
          <View style={estilos.cabecera}>
            <View style={{ flex: 1 }}>
              <Text style={estilos.titulo}>Administradores</Text>
              <Text style={estilos.subtitulo}>Quién puede entrar a este panel</Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Cerrar" hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={estilos.cuerpo} keyboardShouldPersistTaps="handled">
            <Text style={adminStyles.sectionTitle}>
              Con acceso ahora ({admins.length})
            </Text>

            {admins.map((u) => (
              <Fila
                key={u.id}
                perfil={u}
                accion={
                  u.id === yoId ? (
                    // Quitarse el rol a uno mismo es quedarse fuera del panel
                    // desde el que se está haciendo.
                    <Insignia texto="TÚ" tono="marca" />
                  ) : (
                    <BotonAccion
                      texto="Quitar"
                      icono="shield-outline"
                      onPress={() => onCambiarRol(u, false)}
                    />
                  )
                }
              />
            ))}

            <Text style={[adminStyles.sectionTitle, { marginTop: spacing.lg }]}>
              Nombrar a alguien
            </Text>
            <View style={adminStyles.searchBar}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={adminStyles.searchInput}
                placeholder="Buscar por nombre o usuario"
                placeholderTextColor={colors.textMuted}
                value={busqueda}
                onChangeText={setBusqueda}
                autoCapitalize="none"
              />
              {!!busqueda && (
                <TouchableOpacity onPress={() => setBusqueda('')} accessibilityLabel="Limpiar búsqueda">
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {!busqueda.trim() && (
              <Text style={estilos.pista}>
                Escribe un nombre para encontrar a quien quieras nombrar administrador.
              </Text>
            )}

            {!!busqueda.trim() && candidatos.length === 0 && (
              <Text style={estilos.pista}>Nadie que no sea ya administrador coincide.</Text>
            )}

            {candidatos.map((u) => (
              <Fila
                key={u.id}
                perfil={u}
                accion={
                  <BotonAccion
                    texto="Hacer admin"
                    icono="shield-checkmark"
                    tono="marca"
                    onPress={() => onCambiarRol(u, true)}
                  />
                }
              />
            ))}
          </ScrollView>
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
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  pista: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
  },
  avatarVacio: {
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetra: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: colors.textFaint,
  },
});
