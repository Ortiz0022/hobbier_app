import React, { useState, useEffect, useCallback } from 'react';
import { View, Image, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../../../components/scaledText';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, fonts } from '../../../theme';
import { useNotify } from '../../../context/NotificationContext';
import { getPostsAdmin, resolveReportedPostAdmin } from '../../../services/adminService';
import { getCategoryLabel } from '../../../utils/category';
import {
  adminStyles,
  ControlSegmentado,
  Insignia,
  TarjetaVacia,
  BotonAccion,
  Paginador,
  fechaCorta,
} from '../adminUI';
import { PostViewerModal } from '../components/PostViewerModal';
import { capitalizarTitulo } from '../../../utils/titleCase';

const ESTADOS = [
  { key: 'ACTIVE', label: 'Visibles', icono: 'eye' },
  { key: 'REPORTED', label: 'Reportadas', icono: 'flag' },
  { key: 'DELETED', label: 'Ocultas', icono: 'eye-off' },
];

const POR_PAGINA = 10;

/**
 * Gestión de publicaciones: todas, no solo las reportadas.
 *
 * El admin puede leer posts en cualquier estado (la política "Ver posts en
 * feed" lleva un OR para el rol ADMIN) y cambiarles el estado ("Admin
 * gestionar posts").
 *
 * En "Reportadas" la tarjeta se abre: foto grande, la actividad que se
 * presumía cumplida y los motivos que escribió quien reportó. Es la revisión
 * que antes vivía en una pestaña aparte; está aquí porque la decisión que se
 * toma es la misma que en el resto de la pantalla, dejar la publicación o
 * quitarla.
 *
 * Tocar cualquier foto la abre en grande: con la miniatura no se puede juzgar
 * si una evidencia vale o no.
 */
export const AdminPosts = () => {
  const { notify, confirm } = useNotify();
  const [estado, setEstado] = useState('ACTIVE');
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  // Publicación abierta en grande. null = visor cerrado.
  const [mirando, setMirando] = useState(null);

  const cargar = useCallback(async (cual, pag) => {
    setCargando(true);
    const { posts: filas, total: cuantas } = await getPostsAdmin(cual, {
      pagina: pag,
      porPagina: POR_PAGINA,
    });
    setPosts(filas);
    setTotal(cuantas);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar(estado, pagina);
  }, [estado, pagina, cargar]);

  // Cambiar de filtro empieza por la primera página: la 3 de "Visibles" no
  // tiene nada que ver con la 3 de "Ocultas".
  const cambiarFiltro = (nuevo) => {
    setPagina(1);
    setEstado(nuevo);
  };

  const cambiarEstado = async (post, nuevo) => {
    const { error } = await resolveReportedPostAdmin(post.id, nuevo);
    if (error) {
      notify('No se pudo actualizar la publicación.', { type: 'error' });
      return;
    }
    notify(nuevo === 'ACTIVE' ? 'Publicación visible de nuevo.' : 'Publicación retirada del feed.', {
      type: 'success',
    });
    setMirando(null);
    // Si era la última de la página, se retrocede: quedarse en una página vacía
    // parece que se ha borrado todo.
    const ultimaDeLaPagina = posts.length === 1 && pagina > 1;
    if (ultimaDeLaPagina) setPagina(pagina - 1);
    else cargar(estado, pagina);
  };

  const ocultar = async (post) => {
    const ok = await confirm({
      title: '¿Ocultar la publicación?',
      message: 'Dejará de verse en el feed. Podrás restaurarla desde "Ocultas".',
      confirmLabel: 'Sí, ocultar',
      destructive: true,
    });
    if (ok) cambiarEstado(post, 'DELETED');
  };

  const eliminar = async (post) => {
    const ok = await confirm({
      title: '¿Eliminar la publicación?',
      message:
        'Dejará de verse en el feed y el autor perderá su evidencia. Podrás restaurarla desde "Ocultas".',
      confirmLabel: 'Sí, eliminar',
      destructive: true,
    });
    if (ok) cambiarEstado(post, 'DELETED');
  };

  const vacios = {
    ACTIVE: 'No hay publicaciones visibles todavía.',
    REPORTED: 'No hay publicaciones reportadas pendientes de revisión.',
    DELETED: 'No hay publicaciones ocultas.',
  };

  return (
    <View>
      <ControlSegmentado opciones={ESTADOS} valor={estado} onChange={cambiarFiltro} />

      <Text style={adminStyles.countLine}>
        {total} {total === 1 ? 'publicación' : 'publicaciones'}
      </Text>

      {cargando && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />}

      {!cargando && posts.length === 0 && (
        <TarjetaVacia
          icono={estado === 'REPORTED' ? 'sparkles' : 'images'}
          texto={vacios[estado]}
        />
      )}

      {/* --- REVISIÓN: publicación reportada --- */}
      {!cargando &&
        estado === 'REPORTED' &&
        posts.map((post) => {
          const actividad = post.user_activity?.activity;
          const motivos = post.reports || [];

          return (
            <View key={post.id} style={adminStyles.reviewCard}>
              <View style={adminStyles.reviewHeader}>
                <Text style={adminStyles.reviewAuthor}>
                  Post de:{' '}
                  <Text style={adminStyles.reviewAuthorName}>@{post.author?.username || 'desconocido'}</Text>
                </Text>
                <Insignia texto="REVISAR" tono="alerta" />
              </View>

              {!!actividad && (
                <View style={estilos.preview}>
                  <View style={estilos.previewTags}>
                    <View style={estilos.tagCategoria}>
                      <Text style={estilos.tagCategoriaText}>{getCategoryLabel(actividad.category)}</Text>
                    </View>
                    <View style={estilos.tagPuntos}>
                      <Ionicons name="star" size={10} color={colors.onPrimary} />
                      <Text style={estilos.tagPuntosText}>+{actividad.points_awarded} pts</Text>
                    </View>
                  </View>
                  <Text style={estilos.previewTitulo}>{capitalizarTitulo(actividad.title)}</Text>
                  {!!actividad.description && (
                    <Text style={estilos.previewDesc} numberOfLines={2}>
                      {actividad.description}
                    </Text>
                  )}
                </View>
              )}

              <TouchableOpacity
                onPress={() => setMirando(post)}
                activeOpacity={0.9}
                accessibilityLabel="Ver la foto en grande"
              >
                <Image source={{ uri: post.image_url }} style={adminStyles.reviewImage} />
                <View style={estilos.lupa}>
                  <Ionicons name="expand" size={14} color={colors.onPrimary} />
                </View>
              </TouchableOpacity>

              {motivos.length > 0 && (
                <View style={adminStyles.reasonsBox}>
                  <Text style={adminStyles.reasonsLabel}>
                    {motivos.length === 1 ? 'Motivo del reporte' : 'Motivos del reporte'}
                  </Text>
                  {motivos.map((r) => (
                    <View key={r.id} style={adminStyles.reasonRow}>
                      <Ionicons name="warning" size={13} color={colors.danger} />
                      <View style={adminStyles.reasonContent}>
                        <Text style={adminStyles.reasonText}>
                          <Text style={adminStyles.reasonBold}>{r.reason}</Text>
                          {!!r.reporter?.username && ` · por @${r.reporter.username}`}
                        </Text>
                        {!!r.details && <Text style={adminStyles.reasonDetails}>"{r.details}"</Text>}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={adminStyles.pairRow}>
                <TouchableOpacity
                  style={[adminStyles.bigBtn, adminStyles.bigBtnKeep]}
                  onPress={() => cambiarEstado(post, 'ACTIVE')}
                  activeOpacity={0.8}
                >
                  <Text style={adminStyles.bigBtnTextKeep}>Mantener post</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[adminStyles.bigBtn, adminStyles.bigBtnDelete]}
                  onPress={() => eliminar(post)}
                  activeOpacity={0.8}
                >
                  <Text style={adminStyles.bigBtnTextDelete}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

      {/* --- LISTA: visibles y ocultas --- */}
      {!cargando &&
        estado !== 'REPORTED' &&
        posts.map((post) => {
          const actividad = post.user_activity?.activity;
          return (
            <View key={post.id} style={adminStyles.listRow}>
              {post.image_url ? (
                <TouchableOpacity
                  onPress={() => setMirando(post)}
                  activeOpacity={0.85}
                  accessibilityLabel="Ver la foto en grande"
                >
                  <Image source={{ uri: post.image_url }} style={estilos.miniatura} />
                </TouchableOpacity>
              ) : (
                <View style={[estilos.miniatura, estilos.miniaturaVacia]}>
                  <Ionicons name="image" size={18} color={colors.textMuted} />
                </View>
              )}

              {/* Toda la fila abre la foto: en el móvil acertar en una
                  miniatura de 56 píxeles cuesta. */}
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => setMirando(post)}
                activeOpacity={0.85}
              >
                <Text style={adminStyles.listTitle} numberOfLines={2}>
                  {actividad?.title ? capitalizarTitulo(actividad.title) : 'Actividad sin título'}
                </Text>
                <Text style={adminStyles.listSubtitle} numberOfLines={1}>
                  @{post.author?.username || 'desconocido'}
                </Text>
                <Text style={adminStyles.listMeta}>
                  Publicada {fechaCorta(post.created_at)}
                  {actividad?.points_awarded ? ` · +${actividad.points_awarded} pts` : ''}
                </Text>
                {post.status === 'DELETED' && (
                  <View style={adminStyles.badgeRow}>
                    <Insignia texto="OCULTA" tono="neutro" />
                  </View>
                )}
              </TouchableOpacity>

              {post.status === 'DELETED' ? (
                <BotonAccion texto="Restaurar" icono="eye" onPress={() => cambiarEstado(post, 'ACTIVE')} />
              ) : (
                <BotonAccion texto="Ocultar" icono="eye-off" tono="rojo" onPress={() => ocultar(post)} />
              )}
            </View>
          );
        })}

      {!cargando && (
        <Paginador pagina={pagina} porPagina={POR_PAGINA} total={total} onCambiar={setPagina} />
      )}

      <PostViewerModal post={mirando} onClose={() => setMirando(null)} />
    </View>
  );
};

const estilos = StyleSheet.create({
  miniatura: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    backgroundColor: colors.surfaceMuted,
  },
  miniaturaVacia: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lupa: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.md + spacing.sm,
    width: 28,
    height: 28,
    borderRadius: radii.round,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    marginBottom: spacing.md,
  },
  previewTags: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 6,
  },
  tagCategoria: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 1,
  },
  tagCategoriaText: {
    fontSize: 11,
    color: colors.textFaint,
  },
  tagPuntos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagPuntosText: {
    fontSize: 11,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  previewTitulo: {
    fontSize: 15,
    fontFamily: fonts.heading,
    color: colors.text,
    marginBottom: 2,
  },
  previewDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
