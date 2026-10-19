import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../../components/scaledText';
import { useNotify } from '../../../context/NotificationContext';
import { capitalizarTitulo } from '../../../utils/titleCase';
import { colors, spacing, fonts } from '../../../theme';
import {
  adminStyles,
  Insignia,
  BotonAccion,
  TarjetaVacia,
  ControlSegmentado,
  TarjetaDato,
} from '../adminUI';
import { AdFormModal } from '../components/AdFormModal';
import {
  getAdsAdmin,
  toggleAdActiveAdmin,
  deleteAdAdmin,
  estadoAnuncio,
} from '../../../services/adsService';

const TONO_ESTADO = {
  ACTIVO: 'marca',
  PROGRAMADO: 'acento',
  PAUSADO: 'neutro',
  VENCIDO: 'alerta',
};

const FILTROS = [
  { key: 'vigentes', label: 'Vigentes', icono: 'radio-outline' },
  { key: 'todos', label: 'Todos', icono: 'albums-outline' },
];

const fechaLegible = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

const colones = (n) => `₡${Number(n || 0).toLocaleString('es-CR', { maximumFractionDigits: 0 })}`;

/**
 * Anuncios patrocinados: el admin da de alta lo que le pide cada negocio,
 * elige a qué gustos va dirigido y ve cuánta gente lo vio y le dio clic.
 * Esas cifras son lo que se le enseña al anunciante para justificar el precio.
 */
export const AdminAds = () => {
  const { notify, confirm } = useNotify();
  const [ads, setAds] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('vigentes');
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

  const pausarOActivar = async (ad) => {
    const { error } = await toggleAdActiveAdmin(ad.id, ad.is_active);
    if (error) {
      notify('No se pudo cambiar el estado del anuncio.', { type: 'error' });
      return;
    }
    cargar();
  };

  const eliminar = async (ad) => {
    const ok = await confirm({
      title: 'Eliminar anuncio',
      message: `Se borrará "${ad.title}" junto con sus cifras de impresiones y clics. Si solo quieres que deje de salir, mejor páusalo.`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    const { error } = await deleteAdAdmin(ad.id);
    if (error) {
      notify('No se pudo eliminar el anuncio.', { type: 'error' });
      return;
    }
    notify('Anuncio eliminado.', { type: 'success' });
    cargar();
  };

  const conEstado = ads.map((ad) => ({ ...ad, estado: estadoAnuncio(ad) }));
  const visibles =
    filtro === 'vigentes' ? conEstado.filter((ad) => ['ACTIVO', 'PROGRAMADO'].includes(ad.estado)) : conEstado;

  const activos = conEstado.filter((ad) => ad.estado === 'ACTIVO').length;
  const ingresos = conEstado.reduce((suma, ad) => suma + Number(ad.price_paid || 0), 0);

  return (
    <View>
      <TouchableOpacity style={estilos.crearBtn} onPress={() => setEditando(null)} activeOpacity={0.85}>
        <Text style={estilos.crearBtnTexto}>+ Nuevo anuncio</Text>
      </TouchableOpacity>

      <View style={adminStyles.statGrid}>
        <TarjetaDato icono="megaphone-outline" valor={activos} etiqueta="Anuncios activos hoy" />
        <TarjetaDato icono="cash-outline" valor={colones(ingresos)} etiqueta="Ingresos registrados" tono="acento" />
      </View>

      <ControlSegmentado opciones={FILTROS} valor={filtro} onChange={setFiltro} />

      {cargando && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />}

      {!cargando && visibles.length === 0 && (
        <TarjetaVacia
          icono="megaphone-outline"
          texto={
            filtro === 'vigentes'
              ? 'No hay anuncios vigentes. Cuando un negocio te pida anunciarse, créalo con "+ Nuevo anuncio".'
              : 'Todavía no se ha creado ningún anuncio.'
          }
        />
      )}

      {!cargando &&
        visibles.map((ad) => {
          const ctr = ad.impressions ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : '0.0';
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
                    <Insignia texto={ad.estado} tono={TONO_ESTADO[ad.estado]} />
                  </View>
                  <Text style={estilos.titulo} numberOfLines={2}>
                    {ad.title}
                  </Text>
                  <Text style={adminStyles.listMeta}>
                    {fechaLegible(ad.starts_on)} → {fechaLegible(ad.ends_on)}
                    {ad.city ? ` · ${ad.city}` : ' · Todas las ciudades'}
                    {ad.price_paid != null ? ` · ${colones(ad.price_paid)}` : ''}
                  </Text>
                </View>
              </View>

              <View style={adminStyles.badgeRow}>
                {ad.likes.length === 0 ? (
                  <Insignia texto="Para todos" tono="neutro" />
                ) : (
                  ad.likes.map((g) => <Insignia key={g.id} texto={capitalizarTitulo(g.name)} tono="marca" />)
                )}
              </View>

              <View style={estilos.cifras}>
                <Cifra valor={ad.impressions} etiqueta="Impresiones" />
                <Cifra valor={ad.people} etiqueta="Personas" />
                <Cifra valor={ad.clicks} etiqueta="Clics" />
                <Cifra valor={`${ctr}%`} etiqueta="CTR" />
              </View>

              <View style={estilos.acciones}>
                <BotonAccion texto="Editar" icono="create-outline" onPress={() => setEditando(ad)} />
                <BotonAccion
                  texto={ad.is_active ? 'Pausar' : 'Reanudar'}
                  icono={ad.is_active ? 'pause' : 'play'}
                  tono={ad.is_active ? 'neutro' : 'marca'}
                  onPress={() => pausarOActivar(ad)}
                />
                <BotonAccion texto="Eliminar" icono="trash-outline" tono="rojo" onPress={() => eliminar(ad)} />
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

const Cifra = ({ valor, etiqueta }) => (
  <View style={estilos.cifra}>
    <Text style={estilos.cifraValor}>{valor}</Text>
    <Text style={estilos.cifraEtiqueta}>{etiqueta}</Text>
  </View>
);

const estilos = StyleSheet.create({
  crearBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.md + 4,
  },
  crearBtnTexto: {
    color: colors.onPrimary,
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
    borderTopColor: colors.surfaceMuted,
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
  acciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
