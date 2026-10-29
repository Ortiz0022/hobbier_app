import { useThemeValues } from '../../../context/ThemeContext';
import { createThemeStyles } from '../../../theme/themeRuntime';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Text } from '../../../components/scaledText';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useNotify } from '../../../context/NotificationContext';
import { getAdRequestMessages, sendAdRequestMessage, marcarChatAnuncioVisto } from '../../../services/adsService';
import { ChatThread } from '../../rooms/components/ChatThread';
import { spacing, fonts, radii } from "../../../theme";

// Cada cuánto se buscan mensajes nuevos con el chat abierto. La tabla no está
// en realtime como los mensajes directos; para un chat de soporte basta.
const INTERVALO_RECARGA_MS = 15000;

/**
 * Chat de una solicitud de anuncio con el equipo, abierto desde la bandeja de
 * Mensajes. Por fuera es igual que DirectChatScreen (misma cabecera y mismo
 * ChatThread); por dentro lee y escribe en ad_request_messages.
 */
export const AdRequestChatScreen = ({ request, onBack }) => {
  const { colors, styles } = useThemeValues(getAdRequestChatScreenTheme);

  const { user } = useAuth();
  const { t } = useLanguage();
  const { notify } = useNotify();
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  // Los envíos pendientes se guardan aparte para que una recarga no los borre.
  const [pendientes, setPendientes] = useState([]);
  const tempId = useRef(0);

  const equipo = { id: 'equipo', username: t('ad_request.chat_team') };
  const yo = { id: user?.id, username: t('ad_request.chat_you') };
  // ChatThread espera el formato de los mensajes de salas, el más nuevo primero.
  const aBurbuja = (m) => ({
    id: m.id,
    content: m.body,
    created_at: m.created_at,
    sender: m.from_team ? equipo : yo,
  });

  const cargar = useCallback(async () => {
    if (!request?.id) return;
    const { messages, error } = await getAdRequestMessages(request.id);
    setCargando(false);
    if (error) return;
    setMensajes(messages);
    marcarChatAnuncioVisto(request.id, messages[messages.length - 1]?.created_at);
  }, [request?.id]);

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, INTERVALO_RECARGA_MS);
    return () => clearInterval(intervalo);
  }, [cargar]);

  const enviar = async (texto, idPendiente) => {
    const cuerpo = texto.trim();
    if (!cuerpo) return;
    const id = idPendiente || `tmp-${++tempId.current}`;
    setPendientes((p) => [
      ...p.filter((m) => m.id !== id),
      { id, content: cuerpo, created_at: new Date().toISOString(), sender: yo, _status: 'sending' },
    ]);
    const { message, error } = await sendAdRequestMessage(request.id, user?.id, cuerpo);
    if (error) {
      setPendientes((p) => p.map((m) => (m.id === id ? { ...m, _status: 'failed' } : m)));
      notify(t('ad_request.chat_error_send'), { type: 'error' });
      return;
    }
    setPendientes((p) => p.filter((m) => m.id !== id));
    setMensajes((m) => (m.some((x) => x.id === message.id) ? m : [...m, message]));
    marcarChatAnuncioVisto(request.id, message.created_at);
  };

  const reintentar = (id) => {
    const m = pendientes.find((x) => x.id === id);
    if (m) enviar(m.content, id);
  };
  const descartar = (id) => setPendientes((p) => p.filter((m) => m.id !== id));

  const burbujas = [...mensajes.map(aBurbuja), ...pendientes].reverse();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerAvatar}>
          <Feather name="volume-2" size={18} color={colors.primary} />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.headerName} numberOfLines={1}>{t('ad_request.chat_team')}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{request?.title}</Text>
        </View>
      </View>

      <ChatThread
        messages={burbujas}
        loading={cargando}
        currentUserId={user?.id}
        onSend={(texto) => enviar(texto)}
        onRetry={reintentar}
        onDiscard={descartar}
        allowReply={false}
        showSenderName={false}
        emptyIcon="volume-2"
        emptyTitle={t('ad_request.chat_team')}
        emptySubtitle={t('ad_request.chat_empty_advertiser')}
      />
    </View>
  );
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getAdRequestChatScreenTheme = createThemeStyles((theme) => {
const { colors } = theme;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color(colors.background, 'background'),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.color(colors.surfaceMuted, 'border'),
  },
  backBtn: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: radii.round,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  headerName: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: colors.textMuted,
  },
});
  return { colors, styles };
});
