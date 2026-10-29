import { useThemeValues } from '../../../context/ThemeContext';
import { createThemeStyles } from '../../../theme/themeRuntime';
import React, { useState } from 'react';
import { View, StyleSheet, Modal, Pressable, ScrollView, TouchableOpacity, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../../components/scaledText';
import { AdRequestChatModal } from '../../../components/AdRequestChatModal';
import { useLanguage } from '../../../context/LanguageContext';
import { diasDeVigencia, precioSugerido } from '../../../services/adsService';
import { radii, spacing, fonts } from '../../../theme';

const colones = (n) => `₡${Number(n || 0).toLocaleString('es-CR', { maximumFractionDigits: 0 })}`;

const ESTADOS = {
  PENDIENTE: { icono: 'time-outline', clave: 'status_pending', detalle: 'status_pending_detail' },
  APROBADA: { icono: 'checkmark-circle-outline', clave: 'status_approved', detalle: 'status_approved_detail' },
  RECHAZADA: { icono: 'close-circle-outline', clave: 'status_rejected', detalle: 'status_rejected_detail' },
};

/**
 * "Mis solicitudes": el anunciante ve en qué quedó cada solicitud que envió
 * desde Descubre y, si se rechazó, el motivo que escribió el admin. Desde cada
 * una abre el chat con el equipo, que es la única vía de contacto.
 */
export const MyAdRequestsModal = ({ visible, requests = [], onClose, onNewRequest, onChanged }) => {
  const { colors, estilos, tonos } = useThemeValues(getMyAdRequestsModalTheme);
  const { t, language } = useLanguage();
  // Solicitud con el chat abierto. null = cerrado.
  const [chat, setChat] = useState(null);

  const fecha = (iso) =>
    new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', {
      day: 'numeric',
      month: 'short',
    });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={estilos.overlay} onPress={onClose}>
        <Pressable style={estilos.panel} onPress={() => {}}>
          <View style={estilos.cabecera}>
            <Text style={estilos.titulo}>{t('ad_request.my_requests_title')}</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel={t('ad_request.close')} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={estilos.cuerpo}>
            {requests.length === 0 && <Text style={estilos.vacio}>{t('ad_request.my_requests_empty')}</Text>}

            {requests.map((sol) => {
              const estado = ESTADOS[sol.status] || ESTADOS.PENDIENTE;
              const tono = tonos[sol.status] || tonos.PENDIENTE;
              const dias = diasDeVigencia(sol.starts_on, sol.ends_on);
              return (
                <View key={sol.id} style={estilos.tarjeta}>
                  <View style={estilos.fila}>
                    {sol.image_url ? (
                      <Image source={{ uri: sol.image_url }} style={estilos.miniatura} />
                    ) : (
                      <View style={[estilos.miniatura, estilos.miniaturaVacia]}>
                        <Ionicons name="megaphone-outline" size={18} color={colors.textMuted} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={estilos.anunciante} numberOfLines={1}>{sol.advertiser_name}</Text>
                      <Text style={estilos.tituloSolicitud} numberOfLines={2}>{sol.title}</Text>
                      {dias > 0 && (
                        <Text style={estilos.meta}>
                          {fecha(sol.starts_on)} → {fecha(sol.ends_on)} · {colones(precioSugerido(sol.starts_on, sol.ends_on))}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={[estilos.estado, { backgroundColor: tono.fondo }]}>
                    <Ionicons name={estado.icono} size={16} color={tono.texto} />
                    <View style={{ flex: 1 }}>
                      <Text style={[estilos.estadoTitulo, { color: tono.texto }]}>{t(`ad_request.${estado.clave}`)}</Text>
                      <Text style={estilos.estadoDetalle}>{t(`ad_request.${estado.detalle}`)}</Text>
                      {sol.status === 'RECHAZADA' && (
                        <Text style={estilos.motivo}>
                          {sol.reject_reason
                            ? t('ad_request.reject_reason', { reason: sol.reject_reason })
                            : t('ad_request.reject_no_reason')}
                        </Text>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[estilos.chatFila, sol.lastMessage?.from_team && estilos.chatFilaNueva]}
                    onPress={() => setChat(sol)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                  >
                    <Ionicons name="chatbubbles-outline" size={16} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={estilos.chatTitulo}>
                        {t('ad_request.chat_open', { count: sol.messageCount || 0 })}
                      </Text>
                      {!!sol.lastMessage && (
                        <Text style={estilos.chatUltimo} numberOfLines={1}>
                          {sol.lastMessage.from_team ? t('ad_request.chat_team') : t('ad_request.chat_you')}:{' '}
                          {sol.lastMessage.body}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                  </TouchableOpacity>

                  <Text style={estilos.enviada}>{t('ad_request.sent_on', { date: fecha(sol.created_at) })}</Text>
                </View>
              );
            })}
          </ScrollView>

          <View style={estilos.pie}>
            <TouchableOpacity style={estilos.btnNueva} onPress={onNewRequest} activeOpacity={0.85}>
              <Text style={estilos.btnNuevaTexto}>{t('ad_request.new_request')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>

      <AdRequestChatModal
        visible={!!chat}
        request={chat}
        viewer="advertiser"
        onClose={() => {
          setChat(null);
          // Al cerrar se recarga la lista para que el último mensaje se vea.
          onChanged?.();
        }}
      />
    </Modal>
  );
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getMyAdRequestsModalTheme = createThemeStyles((theme) => {
const { colors } = theme;
const tonos = {
  PENDIENTE: { fondo: theme.color('#FFF5EA', 'card'), texto: colors.accentDark },
  APROBADA: { fondo: theme.color(colors.primarySoft, 'card'), texto: colors.primary },
  RECHAZADA: { fondo: theme.color('#FDECEC', 'card'), texto: colors.danger },
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
    maxWidth: 640,
    maxHeight: '92%',
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  titulo: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  cuerpo: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  vacio: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  tarjeta: {
    borderWidth: 1,
    borderColor: theme.color(colors.surfaceMuted, 'border'),
    borderRadius: 16,
    padding: spacing.md,
  },
  fila: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  miniatura: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
  miniaturaVacia: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  anunciante: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textFaint,
  },
  tituloSolicitud: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 1,
  },
  meta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
  },
  estado: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  estadoTitulo: {
    fontSize: 13,
    fontWeight: '700',
  },
  estadoDetalle: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textFaint,
    marginTop: 2,
  },
  motivo: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.text,
    marginTop: 6,
    fontWeight: '600',
  },
  chatFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.color(colors.surfaceMuted, 'border'),
  },
  // Si lo último lo escribió el equipo, se resalta: hay algo que leer.
  chatFilaNueva: {
    borderColor: colors.primary,
    backgroundColor: theme.color(colors.primarySoft, 'selected'),
  },
  chatTitulo: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  chatUltimo: {
    fontSize: 12,
    color: colors.textFaint,
    marginTop: 1,
  },
  enviada: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  pie: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.color(colors.surfaceMuted, 'border'),
  },
  btnNueva: {
    paddingVertical: 14,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  btnNuevaTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.color(colors.onPrimary, 'onAccent'),
  },
});
  return { theme, colors, estilos, tonos };
});
