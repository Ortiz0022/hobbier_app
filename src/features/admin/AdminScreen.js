import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Text } from '../../components/scaledText';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useNotify } from '../../context/NotificationContext';
import { getCategoryLabel } from '../../utils/category';
import { capitalizarTitulo } from '../../utils/titleCase';
import { colors, radii, spacing, fonts, card } from '../../theme';
import { CreateActivityModal } from '../../components/CreateActivityModal';
import { AdminOverview } from './sections/AdminOverview';
import { AdminUsers } from './sections/AdminUsers';
import { AdminPosts } from './sections/AdminPosts';
import { Paginador, Insignia, BotonAccion, adminStyles } from './adminUI';
import { ActivityTagsModal } from './components/ActivityTagsModal';
import {
  getAllActivitiesAdmin,
  toggleActivityActiveAdmin,
  getActivityTagsAdmin,
} from '../../services/adminService';

/**
 * Panel de administración.
 *
 * La sección activa NO vive aquí: la elige la barra de navegación de abajo,
 * que en modo admin cambia sus opciones por las del panel (App.js). Así el
 * admin navega el panel igual que navega la app, y cada sección conserva su
 * salida: el botón "Volver a la app" de la cabecera.
 *
 * Los colores, radios y tipografías salen de src/theme, los mismos que el
 * resto de la aplicación. El panel tenía antes una paleta propia y por eso
 * parecía otra app.
 */
const POR_PAGINA_CATALOGO = 10;

export const AdminScreen = ({ section = 'overview', onNavigateSection, onExit }) => {
  const { isAdmin } = useAuth();
  const { notify } = useNotify();
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState([]);
  const [totalActividades, setTotalActividades] = useState(0);
  const [paginaCatalogo, setPaginaCatalogo] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  // Gustos e intereses de las actividades de esta página: { [id]: { likes, interests } }
  const [etiquetas, setEtiquetas] = useState({});
  // Actividad cuyas etiquetas se están editando. null = modal cerrado.
  const [etiquetando, setEtiquetando] = useState(null);

  useEffect(() => {
    if (section === 'activities') loadActivities(paginaCatalogo);
  }, [section, paginaCatalogo]);

  // El catálogo tiene cientos de actividades: se piden por página en vez de
  // traerlas todas y dejar al admin bajando sin fin.
  const loadActivities = async (pagina = paginaCatalogo) => {
    setLoading(true);
    const { activities: filas, total } = await getAllActivitiesAdmin({
      pagina,
      porPagina: POR_PAGINA_CATALOGO,
    });
    setActivities(filas);
    setTotalActividades(total);
    setLoading(false);

    // Las etiquetas van en una sola consulta para las diez de la página, no
    // una por tarjeta.
    const { tags } = await getActivityTagsAdmin(filas.map((fila) => fila.id));
    setEtiquetas(tags);
  };

  const handleToggleActive = async (activityId, currentIsActive) => {
    const { error } = await toggleActivityActiveAdmin(activityId, currentIsActive);
    if (error) {
      notify('No se pudo cambiar el estado de la actividad.', { type: 'error' });
      return;
    }
    loadActivities(paginaCatalogo);
  };

  // Un rótulo por sección: el título grande de la cabecera y la línea que
  // explica qué se está mirando.
  const SECCIONES = {
    overview: { titulo: 'Resumen General', subtitulo: 'Cómo va el sistema ahora mismo' },
    users: { titulo: 'Usuarios', subtitulo: 'Quién está registrado, denunciado o suspendido' },
    posts: { titulo: 'Publicaciones', subtitulo: 'Todo lo que la gente publica en el feed' },
    activities: { titulo: 'Actividades', subtitulo: 'El catálogo que se recomienda a los usuarios' },
  };
  const seccion = SECCIONES[section] || SECCIONES.overview;

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.forbiddenBox}>
          <Ionicons name="lock-closed" size={54} color={colors.text} style={{ marginBottom: spacing.md }} />
          <Text style={styles.forbiddenTitle}>Acceso Restringido</Text>
          <Text style={styles.forbiddenSubtitle}>
            Esta sección solo está disponible para usuarios con rol de Administrador.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.kicker}>PANEL DE ADMINISTRACIÓN</Text>
          <TouchableOpacity
            style={styles.exitBtn}
            onPress={onExit}
            activeOpacity={0.8}
            accessibilityLabel="Volver a la aplicación como usuario normal"
          >
            <Ionicons name="arrow-back" size={13} color={colors.textFaint} />
            <Text style={styles.exitBtnText}>Volver a la app</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>{seccion.titulo}</Text>
        <Text style={styles.subtitle}>{seccion.subtitulo}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {section === 'overview' && <AdminOverview onIrASeccion={onNavigateSection} />}

        {section === 'users' && <AdminUsers />}

        {section === 'posts' && <AdminPosts />}

        {/* CATÁLOGO DE ACTIVIDADES */}
        {section === 'activities' && (
          <View>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => setShowCreateModal(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.createBtnText}>+ Crear Nueva Actividad</Text>
            </TouchableOpacity>

            {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />}

            {!loading && (
              <Text style={styles.catalogoTotal}>
                {totalActividades} {totalActividades === 1 ? 'actividad' : 'actividades'} en el catálogo
              </Text>
            )}

            {activities.map((act) => (
              <View key={act.id} style={styles.activityCard}>
                <View style={styles.activityHeader}>
                  <Text style={styles.activityTitle}>{capitalizarTitulo(act.title)}</Text>
                  <TouchableOpacity
                    style={[styles.statusToggle, act.is_active ? styles.activeToggle : styles.inactiveToggle]}
                    onPress={() => handleToggleActive(act.id, act.is_active)}
                  >
                    <Text
                      style={[
                        styles.statusToggleText,
                        { color: act.is_active ? colors.primaryDark : colors.textMuted },
                      ]}
                    >
                      {act.is_active ? 'ACTIVA' : 'INACTIVA'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.activityDesc}>{act.description}</Text>

                {/* Los tres datos como etiquetas sueltas: en una sola línea gris
                    había que leerla entera para encontrar un dato concreto. */}
                <View style={styles.metaRow}>
                  <View style={styles.metaBadge}>
                    <Ionicons name="pricetag-outline" size={11} color={colors.textFaint} />
                    <Text style={styles.metaBadgeText}>{getCategoryLabel(act.category)}</Text>
                  </View>
                  <View style={styles.metaBadge}>
                    <Ionicons name="star-outline" size={11} color={colors.textFaint} />
                    <Text style={styles.metaBadgeText}>{act.points_awarded} pts</Text>
                  </View>
                  <View style={styles.metaBadge}>
                    <Ionicons name="person-outline" size={11} color={colors.textFaint} />
                    <Text style={styles.metaBadgeText}>
                      {act.max_age ? `${act.min_age || 0}-${act.max_age} años` : `${act.min_age || 0}+ años`}
                    </Text>
                  </View>
                </View>

                {/* Con qué gustos e intereses se recomienda. Sin ningún gusto,
                    get_recommended_activity solo la ofrece como comodín: por eso
                    se avisa en la propia tarjeta en vez de esconderlo. */}
                <View style={styles.etiquetasBloque}>
                  {(() => {
                    const suyas = etiquetas[act.id] || { likes: [], interests: [] };
                    const sinGustos = suyas.likes.length === 0;
                    return (
                      <>
                        {sinGustos ? (
                          <Text style={styles.sinEtiquetas}>
                            Sin gustos: solo se ofrece como comodín
                          </Text>
                        ) : (
                          <View style={adminStyles.badgeRow}>
                            {suyas.likes.map((g) => (
                              <Insignia key={g.id} texto={capitalizarTitulo(g.name)} tono="marca" />
                            ))}
                            {suyas.interests.map((i) => (
                              <Insignia key={i.id} texto={capitalizarTitulo(i.name)} tono="neutro" />
                            ))}
                          </View>
                        )}

                        <View style={styles.etiquetasAccion}>
                          <BotonAccion
                            texto={sinGustos ? 'Agregar gustos' : 'Editar etiquetas'}
                            icono="pricetag"
                            tono={sinGustos ? 'marca' : 'neutro'}
                            onPress={() => setEtiquetando(act)}
                          />
                        </View>
                      </>
                    );
                  })()}
                </View>
              </View>
            ))}

            {!loading && (
              <Paginador
                pagina={paginaCatalogo}
                porPagina={POR_PAGINA_CATALOGO}
                total={totalActividades}
                onCambiar={setPaginaCatalogo}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* MODAL DE CREACIÓN DE ACTIVIDAD */}
      {/* Mismo formulario que usa Perfil. `forCatalog` guarda la actividad con
          created_by NULL, para que entre al catálogo general en vez de quedar
          visible solo para el administrador que la creó. */}
      <CreateActivityModal
        visible={showCreateModal}
        forCatalog
        onClose={() => setShowCreateModal(false)}
        onCreated={() => loadActivities(paginaCatalogo)}
      />

      {/* GUSTOS E INTERESES DE UNA ACTIVIDAD YA CREADA */}
      {!!etiquetando && (
        <ActivityTagsModal
          activity={etiquetando}
          onClose={() => setEtiquetando(null)}
          onSaved={() => {
            setEtiquetando(null);
            loadActivities(paginaCatalogo);
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.textMuted,
    flexShrink: 1,
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.round,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
  },
  exitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textFaint,
  },
  title: {
    fontSize: 26,
    fontFamily: fonts.heading,
    color: colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  content: {
    padding: spacing.xl,
    paddingTop: spacing.md,
  },
  forbiddenBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  forbiddenTitle: {
    fontSize: 22,
    fontFamily: fonts.heading,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  forbiddenSubtitle: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 14,
  },

  // --- Catálogo de actividades ---
  catalogoTotal: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  createBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.md + 4,
  },
  createBtnText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  activityCard: {
    ...card,
    padding: spacing.md + 4,
    borderRadius: radii.input,
    marginBottom: spacing.md,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  activityTitle: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusToggle: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  activeToggle: {
    backgroundColor: colors.primarySoft,
  },
  inactiveToggle: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
  },
  statusToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  activityDesc: {
    fontSize: 13,
    color: colors.textFaint,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaBadgeText: {
    fontSize: 12,
    color: colors.textFaint,
    fontWeight: '500',
  },
  etiquetasBloque: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
    gap: spacing.sm,
  },
  sinEtiquetas: {
    fontSize: 12,
    color: colors.danger,
  },
  etiquetasAccion: {
    flexDirection: 'row',
  },
});
