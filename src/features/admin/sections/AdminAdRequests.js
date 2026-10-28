import { useThemeValues } from '../../../context/ThemeContext';
import { createThemeStyles } from '../../../theme/themeRuntime';
import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Platform, Image } from 'react-native';
import { Text, TextInput } from '../../../components/scaledText';
import { useAuth } from '../../../context/AuthContext';
import { useNotify } from '../../../context/NotificationContext';
import { spacing, fonts } from '../../../theme';
import { Insignia, BotonAccion, TarjetaVacia, ControlSegmentado, fechaCorta, getAdminUITheme } from '../adminUI';
import { AdFormModal } from '../components/AdFormModal';
import { AdRequestChatModal } from '../../../components/AdRequestChatModal';
import {
  getAdRequestsAdmin,
  approveAdRequestAdmin,
  rejectAdRequestAdmin,
  vigenciaSugerida,
  diasDeVigencia,
  precioSugerido,
} from '../../../services/adsService';

const colones = (n) => `₡${Number(n || 0).toLocaleString('es-CR', { maximumFractionDigits: 0 })}`;

const TONO_ESTADO = {
  PENDIENTE: 'acento',
  APROBADA: 'marca',
  RECHAZADA: 'alerta',
};

const FILTROS = [
  { key: 'PENDIENTE', label: 'Pendientes', icono: 'time-outline' },
  { key: 'historial', label: 'Revisadas', icono: 'checkmark-done-outline' },
];

const fechaLegible = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Solicitudes que llegan desde el formulario de Descubre.
 *
 * Nada de esto sale en el feed. Aprobar abre el formulario de anuncio de
 * siempre ya relleno con lo que mandó el negocio: el admin pone fechas, precio
 * y gustos, y solo al guardar se crea el anuncio y la solicitud queda APROBADA.
 *
 * Con el anunciante se habla solo por el chat de cada solicitud ("Mensajes"):
 * el formulario ya no pide correo ni teléfono.
 */
export const AdminAdRequests = ({ onAdCreated }) => {
  const { theme, colors, adminStyles, estilos } = useThemeValues(getAdminAdRequestsTheme);

  const { user } = useAuth();
  const { notify } = useNotify();
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('PENDIENTE');
  // Solicitud que se está convirtiendo en anuncio. null = formulario cerrado.
  const [aprobando, setAprobando] = useState(null);
  // Solicitud con el campo de motivo abierto, y lo que lleva escrito.
  const [rechazando, setRechazando] = useState(null);
  const [motivo, setMotivo] = useState('');
  // Solicitud con el chat abierto. null = cerrado.
  const [chat, setChat] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { requests, error } = await getAdRequestsAdmin();
    if (error) notify('No se pudieron cargar las solicitudes. ¿Aplicaste la migración 20261028_ad_requests?', { type: 'error' });
    setSolicitudes(requests);
    setCargando(false);
  }, [notify]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const confirmarRechazo = async (sol) => {
    const { error, fotoBorrada } = await rejectAdRequestAdmin(sol, motivo, user?.id);
    if (error) {
      notify('No se pudo rechazar la solicitud.', { type: 'error' });
      return;
    }
    if (fotoBorrada) {
      notify(sol.image_url ? 'Solicitud rechazada y foto borrada.' : 'Solicitud rechazada.', { type: 'success' });
    } else {
      notify('Solicitud rechazada, pero la foto no se pudo borrar. ¿Aplicaste la migración 20261028d?', { type: 'warning' });
    }
    setRechazando(null);
    setMotivo('');
    cargar();
  };

  const alGuardarAnuncio = async (anuncio) => {
    const sol = aprobando;
    setAprobando(null);
    const { error } = await approveAdRequestAdmin(sol.id, anuncio?.id || null, user?.id);
    if (error) notify('El anuncio se creó, pero la solicitud no se pudo marcar como aprobada.', { type: 'warning' });
    cargar();
    onAdCreated?.();
  };

  const pendientes = solicitudes.filter((s) => s.status === 'PENDIENTE');
  const visibles = filtro === 'PENDIENTE' ? pendientes : solicitudes.filter((s) => s.status !== 'PENDIENTE');
  const opciones = FILTROS.map((f) =>
    f.key === 'PENDIENTE' && pendientes.length ? { ...f, label: `${f.label} (${pendientes.length})` } : f
  );

  return (
    <View>
      <ControlSegmentado opciones={opciones} valor={filtro} onChange={setFiltro} />

      {cargando && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />}

      {!cargando && visibles.length === 0 && (
        <TarjetaVacia
          icono="mail-unread-outline"
          texto={
            filtro === 'PENDIENTE'
              ? 'No hay solicitudes pendientes. Llegan cuando alguien usa "Anúnciate en Hobbier" en Descubre.'
              : 'Todavía no has revisado ninguna solicitud.'
          }
        />
      )}

      {!cargando &&
        visibles.map((sol) => (
          <View key={sol.id} style={adminStyles.card}>
            <View style={adminStyles.rowBetween}>
              <Text style={estilos.anunciante} numberOfLines={1}>
                {sol.advertiser_name}
              </Text>
              <Insignia texto={sol.status} tono={TONO_ESTADO[sol.status]} />
            </View>
            <View style={estilos.fila}>
              {!!sol.image_url && <Image source={{ uri: sol.image_url }} style={estilos.miniatura} />}
              <View style={{ flex: 1 }}>
                <Text style={estilos.titulo}>{sol.title}</Text>
                {!!sol.body && <Text style={estilos.cuerpo}>{sol.body}</Text>}
              </View>
            </View>

            <View style={adminStyles.badgeRow}>
              <Insignia texto={sol.kind === 'EVENTO' ? 'Evento' : 'Servicio'} tono="neutro" />
              {!!sol.event_date && <Insignia texto={fechaLegible(sol.event_date)} tono="neutro" />}
              {!!sol.event_place && <Insignia texto={sol.event_place} tono="neutro" />}
            </View>

            {!!sol.starts_on && !!sol.ends_on && (
              <Text style={estilos.pedido}>
                Pide {fechaLegible(sol.starts_on)} → {fechaLegible(sol.ends_on)} ·{' '}
                {diasDeVigencia(sol.starts_on, sol.ends_on)} días · {colones(precioSugerido(sol.starts_on, sol.ends_on))}
              </Text>
            )}

            {!!sol.link_url && <Text style={adminStyles.listMeta}>{sol.link_url}</Text>}
            <Text style={adminStyles.listMeta}>
              Enviada por @{sol.requester?.username || 'usuario'} · {fechaCorta(sol.created_at)}
            </Text>
            {sol.status === 'RECHAZADA' && !!sol.reject_reason && (
              <Text style={estilos.motivo}>Motivo: {sol.reject_reason}</Text>
            )}

            {/* Revisadas: el chat sigue abierto (dudas sobre el pago, un rechazo...). */}
            {sol.status !== 'PENDIENTE' && (
              <View style={estilos.acciones}>
                <BotonAccion texto="Mensajes" icono="chatbubbles-outline" onPress={() => setChat(sol)} />
              </View>
            )}

            {sol.status === 'PENDIENTE' && rechazando !== sol.id && (
              <View style={estilos.acciones}>
                <BotonAccion texto="Aprobar" icono="checkmark" tono="marca" onPress={() => setAprobando(sol)} />
                <BotonAccion texto="Mensajes" icono="chatbubbles-outline" onPress={() => setChat(sol)} />
                <BotonAccion
                  texto="Rechazar"
                  icono="close"
                  tono="rojo"
                  onPress={() => {
                    setRechazando(sol.id);
                    setMotivo('');
                  }}
                />
              </View>
            )}

            {rechazando === sol.id && (
              <View style={estilos.rechazo}>
                <View style={estilos.input}>
                  <TextInput {...theme.textInputProps}
                    style={estilos.inputTexto}
                    value={motivo}
                    onChangeText={setMotivo}
                    placeholder="Motivo del rechazo (opcional)"
                    placeholderTextColor={colors.textMuted}
                    maxLength={300}
                    multiline
                  />
                </View>
                <View style={estilos.acciones}>
                  <BotonAccion texto="Confirmar rechazo" icono="close" tono="rojo" onPress={() => confirmarRechazo(sol)} />
                  <BotonAccion texto="Cancelar" icono="arrow-undo-outline" onPress={() => setRechazando(null)} />
                </View>
              </View>
            )}
          </View>
        ))}

      <AdRequestChatModal
        visible={!!chat}
        request={chat}
        viewer="team"
        onClose={() => {
          setChat(null);
          cargar();
        }}
      />

      {!!aprobando && (
        <AdFormModal
          // Sin id: es un anuncio nuevo. Las fechas son las que pidió el
          // anunciante, pero el admin puede cambiarlas antes de guardar.
          ad={{
            advertiser_name: aprobando.advertiser_name,
            // Las solicitudes nuevas no traen contacto: se habla por el chat.
            advertiser_contact: aprobando.contact || '',
            title: aprobando.title,
            body: aprobando.body,
            link_url: aprobando.link_url,
            image_url: aprobando.image_url,
            ...vigenciaSugerida(aprobando),
            notes: `Solicitud enviada desde la app por @${aprobando.requester?.username || 'usuario'}.`,
          }}
          onClose={() => setAprobando(null)}
          onSaved={alGuardarAnuncio}
        />
      )}
    </View>
  );
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getAdminAdRequestsTheme = createThemeStyles((theme) => {
const { colors, input } = theme;
const { adminStyles } = getAdminUITheme(theme);
const estilos = StyleSheet.create({
  anunciante: {
    fontSize: 12,
    color: colors.textFaint,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
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
  titulo: {
    fontSize: 15,
    fontFamily: fonts.heading,
    color: colors.text,
    marginTop: 2,
  },
  cuerpo: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textFaint,
    marginTop: 4,
  },
  pedido: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  motivo: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 6,
  },
  acciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  rechazo: {
    marginTop: spacing.md,
  },
  input: {
    ...input,
    alignItems: 'flex-start',
  },
  inputTexto: {
    flex: 1,
    minHeight: 56,
    textAlignVertical: 'top',
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    fontSize: 14,
    color: colors.text,
    ...Platform.select({ web: { outlineStyle: 'none' }, default: {} }),
  },
});
  return { theme, colors, adminStyles, estilos };
});
