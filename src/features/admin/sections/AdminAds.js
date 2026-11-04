import { useThemeValues } from '../../../context/ThemeContext';
import { createThemeStyles } from '../../../theme/themeRuntime';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../../components/scaledText';
import { useNotify } from '../../../context/NotificationContext';
import { useLanguage } from '../../../context/LanguageContext';
import { capitalizarTitulo } from '../../../utils/titleCase';
import { spacing, fonts } from "../../../theme";
import { Insignia, BotonAccion, TarjetaVacia, ControlSegmentado, TarjetaDato, getAdminUITheme } from "../adminUI";
import { AdFormModal } from '../components/AdFormModal';
import { AdminAdRequests } from './AdminAdRequests';
import {
  getAdsAdmin,
  toggleAdActiveAdmin,
  deleteAdAdmin,
  estadoAnuncio,
} from '../../../services/adsService';

const fechaLegible = (iso, lang = 'es') =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

const colones = (n) => `₡${Number(n || 0).toLocaleString('es-CR', { maximumFractionDigits: 0 })}`;

/**
 * Anuncios patrocinados: el admin da de alta lo que le pide cada negocio,
 * elige a qué gustos va dirigido y ve cuánta gente lo vio y le dio clic.
 * Esas cifras son lo que se le enseña al anunciante para justificar el precio.
 */
export const AdminAds = () => {
  const { colors, adminStyles, estilos } = useThemeValues(getAdminAdsTheme);
  const { t, language } = useLanguage();

  const { notify, confirm } = useNotify();
  const [ads, setAds] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState('anuncios');
  const [filtro, setFiltro] = useState('vigentes');

  const vistas = useMemo(() => [
    { key: 'anuncios', label: t('admin.nav_ads') || 'Anuncios', icono: 'megaphone-outline' },
    { key: 'solicitudes', label: t('admin.ad_requests') || 'Solicitudes', icono: 'mail-unread-outline' },
  ], [t]);

  const filtros = useMemo(() => [
    { key: 'vigentes', label: t('admin.filter_active_ads') || 'Vigentes', icono: 'radio-outline' },
    { key: 'todos', label: t('admin.nav_all') || 'Todos', icono: 'albums-outline' },
  ], [t]);
  // undefined = formulario cerrado, null = anuncio nuevo, objeto = edición.
  const [editando, setEditando] = useState(undefined);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { ads: filas, error } = await getAdsAdmin();
    if (error) notify('No se pudieron cargar los anuncios. ¿Aplicaste la migración de anuncios?', { type: 'error' });
    setAds(filas);
    setCargando(false);
  }, [notify]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const estadosMap = useMemo(
    () => ({
      ACTIVO: { label: t('admin.ad_status_active') || 'ACTIVO', tono: 'marca' },
      PROGRAMADO: { label: t('admin.ad_status_scheduled') || 'PROGRAMADO', tono: 'acento' },
      PAUSADO: { label: t('admin.ad_status_paused') || 'PAUSADO', tono: 'neutro' },
      VENCIDO: { label: t('admin.ad_status_expired') || 'VENCIDO', tono: 'alerta' },
    }),
    [t]
  );

  const pausarOActivar = async (ad) => {
    const { error } = await toggleAdActiveAdmin(ad.id, ad.is_active);
    if (error) {
      notify(t('admin.error_change_ad_status') || 'No se pudo cambiar el estado del anuncio.', { type: 'error' });
      return;
    }
    cargar();
  };

  const eliminar = async (ad) => {
    const ok = await confirm({
      title: t('admin.delete_ad_title') || 'Eliminar anuncio',
      message:
        t('admin.delete_ad_msg', { title: ad.title }) ||
        `Se borrará "${ad.title}" junto con sus cifras de impresiones y clics. Si solo quieres que deje de salir, mejor páusalo.`,
      confirmLabel: t('admin.delete') || 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    const { error } = await deleteAdAdmin(ad.id);
    if (error) {
      notify(t('admin.error_delete_ad') || 'No se pudo eliminar el anuncio.', { type: 'error' });
      return;
    }
    notify(t('admin.ad_deleted') || 'Anuncio eliminado.', { type: 'success' });
    cargar();
  };

  const conEstado = ads.map((ad) => ({ ...ad, estado: estadoAnuncio(ad) }));
  const visibles =
    filtro === 'vigentes' ? conEstado.filter((ad) => ['ACTIVO', 'PROGRAMADO'].includes(ad.estado)) : conEstado;

  const activos = conEstado.filter((ad) => ad.estado === 'ACTIVO').length;
  const ingresos = conEstado.reduce((suma, ad) => suma + Number(ad.price_paid || 0), 0);

  if (vista === 'solicitudes') {
    return (
      <View>
        <ControlSegmentado opciones={vistas} valor={vista} onChange={setVista} />
        <AdminAdRequests onAdCreated={cargar} />
      </View>
    );
  }

  return (
    <View>
      <ControlSegmentado opciones={vistas} valor={vista} onChange={setVista} />

      <TouchableOpacity style={estilos.crearBtn} onPress={() => setEditando(null)} activeOpacity={0.85}>
        <Text style={estilos.crearBtnTexto}>{t('admin.new_ad_btn') || '+ Nuevo anuncio'}</Text>
      </TouchableOpacity>

      <View style={adminStyles.statGrid}>
        <TarjetaDato icono="megaphone-outline" valor={activos} etiqueta={t('admin.active_ads_today') || 'Anuncios activos hoy'} />
        <TarjetaDato icono="cash-outline" valor={colones(ingresos)} etiqueta={t('admin.registered_revenue') || 'Ingresos registrados'} tono="acento" />
      </View>

      <ControlSegmentado opciones={filtros} valor={filtro} onChange={setFiltro} />

      {cargando && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />}

      {!cargando && visibles.length === 0 && (
        <TarjetaVacia
          icono="megaphone-outline"
          texto={
            filtro === 'vigentes'
              ? (t('admin.empty_active_ads') || 'No hay anuncios vigentes. Cuando un negocio te pida anunciarse, créalo con "+ Nuevo anuncio".')
              : (t('admin.empty_all_ads') || 'Todavía no se ha creado ningún anuncio.')
          }
        />
      )}

      {!cargando &&
        visibles.map((ad) => {
          const ctr = ad.impressions ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : '0.0';
          const infoEstado = estadosMap[ad.estado] || { label: ad.estado, tono: 'neutro' };

          const esCpc = ad.billing_model === 'CPC';
          const consumido = esCpc ? Number(ad.clicks || 0) : Number(ad.impressions || 0);
          const meta = Number(ad.target_quota || 0);
          const pct = meta > 0 ? Math.min(100, Math.round((consumido / meta) * 100)) : 0;
          const agotado = meta > 0 && consumido >= meta;

          return (
            <View key={ad.id} style={adminStyles.card}>
              <View style={estilos.fila}>
                {ad.image_url ? (
                  <Image source={{ uri: ad.image_url }} style={estilos.miniatura} />
                ) : (
                  <View style={[estilos.miniatura, estilos.miniaturaVacia]}>
                    <Ionicons name="megaphone-outline" size={20} color={colors.textMuted} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={adminStyles.rowBetween}>
                    <Text style={estilos.anunciante} numberOfLines={1}>
                      {ad.advertiser_name}
                    </Text>
                    <Insignia texto={infoEstado.label} tono={infoEstado.tono} />
                  </View>
                  <Text style={estilos.titulo} numberOfLines={2}>
                    {ad.title}
                  </Text>
                  <Text style={adminStyles.listMeta}>
                    {fechaLegible(ad.starts_on, language)} → {fechaLegible(ad.ends_on, language)}
                    {ad.city ? ` · ${ad.city}` : ` · ${t('admin.all_cities') || 'Todas las ciudades'}`}
                    {ad.price_paid != null ? ` · ${colones(ad.price_paid)}` : ''}
                  </Text>
                </View>
              </View>

              <View style={adminStyles.badgeRow}>
                <Insignia
                  texto={
                    esCpc
                      ? `CPC · ${meta || 0} clics máx`
                      : `CPM · ${(meta || 0).toLocaleString()} vistas máx`
                  }
                  tono={esCpc ? 'marca' : 'acento'}
                />
                {agotado && <Insignia texto="PRESUPUESTO AGOTADO" tono="alerta" />}
                {ad.likes.length === 0 ? (
                  <Insignia texto={t('admin.for_everyone') || 'Para todos'} tono="neutro" />
                ) : (
                  ad.likes.map((g) => <Insignia key={g.id} texto={capitalizarTitulo(g.name)} tono="marca" />)
                )}
              </View>

              <View style={estilos.cifras}>
                <Cifra valor={ad.impressions} etiqueta={t('admin.impressions') || 'Impresiones'} />
                <Cifra valor={ad.people} etiqueta={t('admin.people') || 'Personas'} />
                <Cifra valor={ad.clicks} etiqueta={t('admin.clicks') || 'Clics'} />
                <Cifra valor={`${ctr}%`} etiqueta={t('admin.ctr') || 'CTR'} />
              </View>

              {meta > 0 && (
                <View style={estilos.progresoCont}>
                  <View style={estilos.progresoHeader}>
                    <Text style={estilos.progresoLabel}>
                      {esCpc ? 'Consumo de Clics (Cap)' : 'Consumo de Visualizaciones (Cap)'}
                    </Text>
                    <Text style={[estilos.progresoValor, agotado && { color: colors.danger || '#DC2626' }]}>
                      {consumido.toLocaleString()} / {meta.toLocaleString()} ({pct}%)
                    </Text>
                  </View>
                  <View style={estilos.barraFondo}>
                    <View
                      style={[
                        estilos.barraRelleno,
                        { width: `${pct}%` },
                        agotado && { backgroundColor: colors.danger || '#DC2626' },
                      ]}
                    />
                  </View>
                </View>
              )}

              <View style={estilos.acciones}>
                <BotonAccion texto={t('admin.edit') || 'Editar'} icono="create-outline" onPress={() => setEditando(ad)} />
                <BotonAccion
                  texto={ad.is_active ? (t('admin.pause') || 'Pausar') : (t('admin.resume') || 'Reanudar')}
                  icono={ad.is_active ? 'pause' : 'play'}
                  tono={ad.is_active ? 'neutro' : 'marca'}
                  onPress={() => pausarOActivar(ad)}
                />
                <BotonAccion texto={t('admin.delete') || 'Eliminar'} icono="trash-outline" tono="rojo" onPress={() => eliminar(ad)} />
              </View>
            </View>
          );
        })}

      {editando !== undefined && (
        <AdFormModal
          ad={editando}
          onClose={() => setEditando(undefined)}
          onSaved={() => {
            setEditando(undefined);
            cargar();
          }}
        />
      )}
    </View>
  );
};

const Cifra = ({ valor, etiqueta }) => {
  const { estilos } = useThemeValues(getAdminAdsTheme);
  return (<View style={estilos.cifra}>
    <Text style={estilos.cifraValor}>{valor}</Text>
    <Text style={estilos.cifraEtiqueta}>{etiqueta}</Text>
  </View>);
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getAdminAdsTheme = createThemeStyles((theme) => {
const { colors } = theme;
const { adminStyles } = getAdminUITheme(theme);
const estilos = StyleSheet.create({
  crearBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.md + 4,
  },
  crearBtnTexto: {
    color: theme.color(colors.onPrimary, 'onAccent'),
    fontSize: 15,
    fontWeight: '700',
  },
  fila: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  miniatura: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
  miniaturaVacia: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  anunciante: {
    fontSize: 12,
    color: colors.textFaint,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  titulo: {
    fontSize: 15,
    fontFamily: fonts.heading,
    color: colors.text,
    marginTop: 2,
  },
  cifras: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.color(colors.surfaceMuted, 'border'),
  },
  cifra: {
    flex: 1,
    alignItems: 'center',
  },
  cifraValor: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  cifraEtiqueta: {
    fontSize: 11,
    color: colors.textMuted,
  },
  progresoCont: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  progresoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progresoLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  progresoValor: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  barraFondo: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  barraRelleno: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  acciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
  return { theme, colors, adminStyles, estilos };
});
