import { useThemeValues } from '../../../context/ThemeContext';
import { createThemeStyles } from '../../../theme/themeRuntime';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Image, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../../../components/scaledText';
import { Ionicons } from '@expo/vector-icons';
import { radii, spacing, fonts } from "../../../theme";
import { useNotify } from '../../../context/NotificationContext';
import { useLanguage } from '../../../context/LanguageContext';
import { getPostsAdmin, resolveReportedPostAdmin } from '../../../services/adminService';
import { getCategoryLabel } from '../../../utils/category';
import { ControlSegmentado, Insignia, TarjetaVacia, BotonAccion, Paginador, fechaCorta, getAdminUITheme } from "../adminUI";
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
export const AdminPosts = ({ refreshKey }) => {
  const { theme, colors, adminStyles, estilos } = useThemeValues(getAdminPostsTheme);
  const { t, language } = useLanguage();

  const estados = useMemo(
    () => [
      { key: 'ACTIVE', label: t('admin.filter_visible') || 'Visibles', icono: 'eye' },
      { key: 'REPORTED', label: t('admin.pending_reports') || 'Reportadas', icono: 'flag' },
      { key: 'DELETED', label: t('admin.filter_deleted') || 'Ocultas', icono: 'eye-off' },
    ],
    [t]
  );
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, pagina, cargar, refreshKey]);

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
      title: t('admin.hide_post_title') || '¿Ocultar la publicación?',
      message: t('admin.hide_post_msg') || 'Dejará de verse en el feed. Podrás restaurarla desde "Ocultas".',
      confirmLabel: t('admin.hide_post_btn') || 'Sí, ocultar',
      destructive: true,
    });
    if (ok) cambiarEstado(post, 'DELETED');
  };

  const eliminar = async (post) => {
    const ok = await confirm({
      title: t('admin.delete_post_title') || '¿Eliminar la publicación?',
      message:
        t('admin.delete_post_msg') || 'Dejará de verse en el feed y el autor perderá su evidencia. Podrás restaurarla desde "Ocultas".',
      confirmLabel: t('admin.delete_post_btn') || 'Sí, eliminar',
      destructive: true,
    });
    if (ok) cambiarEstado(post, 'DELETED');
  };

  const vacios = {
    ACTIVE: t('admin.empty_active_posts') || 'No hay publicaciones visibles todavía.',
    REPORTED: t('admin.empty_reported_posts') || 'No hay publicaciones reportadas pendientes de revisión.',
    DELETED: t('admin.empty_deleted_posts') || 'No hay publicaciones ocultas.',
  };

  const formatReason = (reason) => {
    if (language === 'en') {
      const map = {
        'Violencia': 'Violence',
        'Spam': 'Spam',
        'Contenido inapropiado': 'Inappropriate content',
        'Acoso': 'Harassment',
        'Desinformación': 'Misinformation',
        'Otro': 'Other',
      };
      return map[reason] || reason;
    }
    return reason;
  };

  return (
    <View>
      <ControlSegmentado opciones={estados} valor={estado} onChange={cambiarFiltro} />

      <Text style={adminStyles.countLine}>
        {total} {total === 1 ? (t('admin.posts_count_single') || 'publicación') : (t('admin.posts_count_plural') || 'publicaciones')}
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
                  {t('admin.post_from') || 'Post de:'}{' '}
                  <Text style={adminStyles.reviewAuthorName}>@{post.author?.username || t('admin.unknown_user') || 'desconocido'}</Text>
                </Text>
                <Insignia texto={t('admin.review_badge') || 'REVISAR'} tono="alerta" />
              </View>

              {!!actividad && (
                <View style={estilos.preview}>
                  <View style={estilos.previewTags}>
                    <View style={estilos.tagCategoria}>
                      <Text style={estilos.tagCategoriaText}>{getCategoryLabel(actividad.category, language)}</Text>
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
                accessibilityLabel={t('admin.view_photo') || 'Ver la foto en grande'}
              >
                <Image source={{ uri: post.image_url }} style={adminStyles.reviewImage} />
                <View style={estilos.lupa}>
                  <Ionicons name="expand" size={14} color={theme.color(colors.onPrimary, 'text')} />
                </View>
              </TouchableOpacity>

              {motivos.length > 0 && (
                <View style={adminStyles.reasonsBox}>
                  <Text style={adminStyles.reasonsLabel}>
                    {motivos.length === 1 ? (t('admin.report_reason_single') || 'Motivo del reporte') : (t('admin.report_reason_plural') || 'Motivos del reporte')}
                  </Text>
                  {motivos.map((r) => (
                    <View key={r.id} style={adminStyles.reasonRow}>
                      <Ionicons name="warning" size={13} color={colors.danger} />
                      <View style={adminStyles.reasonContent}>
                        <Text style={adminStyles.reasonText}>
                          <Text style={adminStyles.reasonBold}>{formatReason(r.reason)}</Text>
                          {!!r.reporter?.username && ` · ${t('admin.by_reporter', { username: r.reporter.username }) || `por @${r.reporter.username}`}`}
                        </Text>
                        {!!r.details && (
                          <Text style={adminStyles.reasonDetails}>
                            "{r.details === 'Reportado desde el feed' ? (t('admin.reported_from_feed') || r.details) : r.details}"
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={adminStyles.pairRow}>
                <TouchableOpacity
                  style={[adminStyles.bigBtn, adminStyles.bigBtnDelete]}
                  onPress={() => eliminar(post)}
                  activeOpacity={0.8}
                >
                  <Text style={adminStyles.bigBtnTextDelete}>{t('common.delete') || 'Eliminar'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[adminStyles.bigBtn, adminStyles.bigBtnKeep]}
                  onPress={() => cambiarEstado(post, 'ACTIVE')}
                  activeOpacity={0.8}
                >
                  <Text style={adminStyles.bigBtnTextKeep}>{t('admin.keep_post') || 'Mantener post'}</Text>
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
                  {actividad?.title ? capitalizarTitulo(actividad.title) : (t('admin.untitled_activity') || 'Actividad sin título')}
                </Text>
                <Text style={adminStyles.listSubtitle} numberOfLines={1}>
                  @{post.author?.username || t('admin.unknown_user') || 'desconocido'}
                </Text>
                <Text style={adminStyles.listMeta}>
                  {t('admin.published_on', { time: fechaCorta(post.created_at, language) }) || `Publicada ${fechaCorta(post.created_at, language)}`}
                  {actividad?.points_awarded ? ` · +${actividad.points_awarded} pts` : ''}
                </Text>
                {post.status === 'DELETED' && (
                  <View style={adminStyles.badgeRow}>
                    <Insignia texto={t('admin.hidden_badge') || 'OCULTA'} tono="neutro" />
                  </View>
                )}
              </TouchableOpacity>

              {post.status === 'DELETED' ? (
                <BotonAccion texto={t('admin.restore') || 'Restaurar'} icono="eye" onPress={() => cambiarEstado(post, 'ACTIVE')} />
              ) : (
                <BotonAccion texto={t('admin.hide') || 'Ocultar'} icono="eye-off" tono="rojo" onPress={() => ocultar(post)} />
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



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getAdminPostsTheme = createThemeStyles((theme) => {
const { colors } = theme;
const { adminStyles } = getAdminUITheme(theme);
const estilos = StyleSheet.create({
  miniatura: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.color(colors.surfaceMuted, 'border'),
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
    borderColor: theme.color(colors.surfaceMuted, 'border'),
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
    borderColor: theme.color(colors.surfaceMuted, 'border'),
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
    color: theme.color(colors.onPrimary, "onAccent"),
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
  return { theme, colors, adminStyles, estilos };
});
