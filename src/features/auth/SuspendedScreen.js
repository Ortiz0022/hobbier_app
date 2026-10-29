import { useThemeValues } from '../../context/ThemeContext';
import { createThemeStyles } from '../../theme/themeRuntime';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Text } from '../../components/scaledText';
import Feather from '@expo/vector-icons/Feather';
import { useAuth } from '../../context/AuthContext';
import { supportService, explicarFalloSoporte } from '../../services/supportService';
import { supabase } from '../../config/supabase';
import { radii, spacing, fonts, secondaryButton, secondaryButtonText } from "../../theme";

export const SuspendedScreen = () => {
  const { theme, colors, primaryButton, primaryButtonText, styles } = useThemeValues(getSuspendedScreenTheme);

  const { user, profile, suspension, signOut, descartarSuspension, recheckSuspension, refreshProfile } =
    useAuth();
  // El porqué de la sanción. Viene de get_my_suspension; si la base todavía no
  // lo guarda, no se inventa nada: simplemente no se muestra el recuadro.
  const motivoSancion = (suspension?.ban_reason || profile?.ban_reason || '').trim();
  const [viewMode, setViewMode] = useState('notice'); // 'notice' | 'chat'
  const [ticketId, setTicketId] = useState(null);
  const [ticketData, setTicketData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [sending, setSending] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isReactivated, setIsReactivated] = useState(false);
  // Qué ha fallado al abrir o al usar el canal. Sin esto, cuando el ticket no
  // llega a crearse el botón de enviar no hace absolutamente nada y no hay
  // forma de saber por qué.
  const [errorChat, setErrorChat] = useState(null);

  const listRef = useRef(null);

  // Escuchar en tiempo real si el admin reactiva el perfil
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile_status_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        async (payload) => {
          if (payload.new?.status === 'ACTIVE') {
            setIsReactivated(true);
            await recheckSuspension();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, recheckSuspension]);

  // Cargar o crear el ticket de soporte
  const cargarTicket = useCallback(async () => {
    try {
      setLoadingTicket(true);
      setErrorChat(null);
      const tid = await supportService.getOrCreateMyTicket();
      setTicketId(tid);

      const [ticketInfo, msgList] = await Promise.all([
        supportService.getMyTicket(),
        supportService.getTicketMessages(tid),
      ]);

      setTicketData(ticketInfo);
      setMessages(msgList);

      if (ticketInfo?.user?.status === 'ACTIVE') {
        setIsReactivated(true);
      }

      await supportService.markTicketRead(tid, false);
      return tid;
    } catch (err) {
      console.warn('Error cargando ticket de soporte:', err.message);
      setErrorChat(explicarFalloSoporte(err));
      return null;
    } finally {
      setLoadingTicket(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'chat') {
      cargarTicket();
    }
  }, [viewMode, cargarTicket]);

  // Suscribirse a mensajes en tiempo real dentro del chat de soporte
  useEffect(() => {
    if (!ticketId || viewMode !== 'chat') return;

    const unsubscribe = supportService.subscribeToTicketMessages(ticketId, (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [newMsg, ...prev];
      });

      // Si el mensaje es del sistema confirmando la reactivación
      if (newMsg.sender_role === 'SYSTEM' && newMsg.content?.includes('reactivada')) {
        setIsReactivated(true);
        recheckSuspension();
      }

      supportService.markTicketRead(ticketId, false);
    });

    return unsubscribe;
  }, [ticketId, viewMode, recheckSuspension]);

  const handleSendMessage = async () => {
    const text = textInput.trim();
    if (!text || sending) return;

    setSending(true);
    setTextInput('');

    try {
      // Si el canal no llegó a abrirse, se reintenta ahora: antes el botón
      // simplemente no hacía nada y parecía que la app estaba rota.
      const tid = ticketId || (await cargarTicket());
      if (!tid) {
        setTextInput(text);
        return;
      }

      const sentMsg = await supportService.sendSupportMessage(tid, text, 'USER');
      setMessages((prev) => {
        if (prev.some((m) => m.id === sentMsg.id)) return prev;
        return [sentMsg, ...prev];
      });
      setErrorChat(null);
    } catch (err) {
      console.error('Error al enviar mensaje de soporte:', err);
      // El texto vuelve al campo: lo escrito no se pierde por un fallo de red.
      setTextInput(text);
      setErrorChat(explicarFalloSoporte(err));
    } finally {
      setSending(false);
    }
  };

  const handleEntrarApp = async () => {
    const ok = await recheckSuspension();
    if (ok) {
      await refreshProfile();
      descartarSuspension();
    } else {
      descartarSuspension();
    }
  };

  const handleCerrarSesion = async () => {
    await signOut();
    descartarSuspension();
  };

  // ----------------------------------------------------
  // VISTA 1: AVISO DE SANCIÓN PERMANENTE
  // ----------------------------------------------------
  if (viewMode === 'notice') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <ScrollView
          contentContainerStyle={styles.card}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconWrap}>
            <Feather name="shield-off" size={44} color={colors.danger} />
          </View>

          <Text style={styles.title}>Cuenta Sancionada</Text>

          <View style={styles.badgePermanent}>
            <Feather name="lock" size={14} color={colors.danger} style={{ marginRight: 6 }} />
            <Text style={styles.badgePermanentText}>SANCIÓN PERMANENTE</Text>
          </View>

          <Text style={styles.body}>
            Tu cuenta ha recibido una sanción permanente debido a denuncias recibidas o por
            incumplimiento de las normas de la comunidad de Hobbier.
          </Text>

          {/* Lo que escribió quien sancionó la cuenta, tal cual */}
          {!!motivoSancion && (
            <View style={styles.motivoCaja}>
              <View style={styles.motivoCabecera}>
                <Feather name="message-square" size={13} color={colors.danger} />
                <Text style={styles.motivoEtiqueta}>MOTIVO DE LA SANCIÓN</Text>
              </View>
              <Text style={styles.motivoTexto}>{motivoSancion}</Text>
            </View>
          )}

          <Text style={styles.bodySub}>
            Si consideras que esto se trata de un error o un malentendido, puedes abrir un canal
            directo de soporte con el equipo de administración para apelar y solicitar que reactiven tu
            cuenta.
          </Text>

          {isReactivated ? (
            <View style={styles.reactivatedNotice}>
              <Feather name="check-circle" size={20} color={colors.success} style={{ marginRight: 8 }} />
              <Text style={styles.reactivatedText}>¡Tu cuenta ya ha sido reactivada!</Text>
            </View>
          ) : null}

          {isReactivated ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleEntrarApp}>
              <Feather name="arrow-right-circle" size={18} color={theme.color("#FFF", 'onAccent')} style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Ingresar a Hobbier</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setViewMode('chat')}
              activeOpacity={0.85}
            >
              <Feather name="message-circle" size={18} color={theme.color("#FFF", 'onAccent')} style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Hablar con soporte / Apelar</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.secondaryBtn} onPress={handleCerrarSesion}>
            <Feather name="log-out" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
            <Text style={styles.secondaryBtnText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ----------------------------------------------------
  // VISTA 2: CHAT DE SOPORTE Y APELACIÓN CON EL ADMIN
  // ----------------------------------------------------
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Cabecera del chat */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setViewMode('notice')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Soporte y Apelaciones</Text>
            <Text style={styles.headerSubtitle}>
              {isReactivated ? 'Cuenta Reactivada' : 'Atención directa con administradores'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerLogout}
            onPress={handleCerrarSesion}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="log-out" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Banner de estado reactivado si aplica */}
        {isReactivated && (
          <View style={styles.successBanner}>
            <Feather name="check-circle" size={18} color={colors.success} style={{ marginRight: 8 }} />
            <Text style={styles.successBannerText}>
              ¡Tu sanción ha sido levantada! Ya puedes volver a usar Hobbier.
            </Text>
            <TouchableOpacity style={styles.btnBannerAction} onPress={handleEntrarApp}>
              <Text style={styles.btnBannerActionText}>Entrar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Lista de mensajes */}
        {loadingTicket ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Conectando con el canal de soporte...</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            inverted
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            renderItem={({ item }) => {
              const isMe = item.sender_id === user?.id && item.sender_role === 'USER';
              const isSystem = item.sender_role === 'SYSTEM';
              const isAdmin = item.sender_role === 'ADMIN';

              if (isSystem) {
                return (
                  <View style={styles.systemBubble}>
                    <Feather name="info" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.systemText}>{item.content}</Text>
                  </View>
                );
              }

              return (
                <View
                  style={[
                    styles.messageRow,
                    isMe ? styles.messageRowMe : styles.messageRowOther,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      isMe ? styles.bubbleMe : styles.bubbleAdmin,
                    ]}
                  >
                    {isAdmin && (
                      <View style={styles.adminLabelRow}>
                        <Feather name="shield" size={12} color={colors.primaryDark} style={{ marginRight: 4 }} />
                        <Text style={styles.adminLabel}>ADMINISTRADOR</Text>
                      </View>
                    )}
                    <Text style={[styles.messageText, isMe ? styles.textMe : styles.textAdmin]}>
                      {item.content}
                    </Text>
                    <Text style={[styles.messageTime, isMe ? styles.timeMe : styles.timeAdmin]}>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Qué ha pasado, cuando algo ha pasado */}
        {!!errorChat && (
          <View style={styles.chatError}>
            <Feather name="alert-circle" size={15} color={colors.danger} />
            <Text style={styles.chatErrorText}>{errorChat}</Text>
            <TouchableOpacity
              onPress={cargarTicket}
              disabled={loadingTicket}
              style={styles.chatErrorBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.chatErrorBtnText}>
                {loadingTicket ? 'Probando...' : 'Reintentar'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Barra de entrada de texto */}
        <View style={styles.inputBar}>
          <TextInput {...theme.textInputProps}
            style={styles.textInput}
            value={textInput}
            onChangeText={setTextInput}
            placeholder={
              isReactivated
                ? 'Tu cuenta ya está activa...'
                : 'Escribe tu mensaje para el equipo de administración...'
            }
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={1000}
            editable={!sending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!textInput.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!textInput.trim() || sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color={theme.color("#FFF", 'onAccent')} />
            ) : (
              <Feather name="send" size={18} color={theme.color("#FFF", 'onAccent')} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getSuspendedScreenTheme = createThemeStyles((theme) => {
const { colors, primaryButton, primaryButtonText } = theme;
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.color(colors.background, 'background'),
  },
  container: {
    flex: 1,
    // En una ventana ancha el chat no se estira de borde a borde: se
    // centra con el mismo ancho que usa el resto de la app en escritorio.
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  card: {
    // flexGrow en vez de flex: centra mientras quepa y se desplaza cuando no.
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: radii.round,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.heading,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  badgePermanent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color('#FDE8E8', 'card'),
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.round,
    marginBottom: spacing.lg,
  },
  badgePermanentText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.heading,
    letterSpacing: 0.5,
  },
  body: {
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
    maxWidth: 360,
  },
  bodySub: {
    fontSize: 14,
    color: colors.textFaint,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
    maxWidth: 360,
  },
  primaryBtn: {
    ...primaryButton,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: 28,
    alignSelf: 'stretch',
    maxWidth: 360,
  },
  primaryBtnText: {
    ...primaryButtonText,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  secondaryBtnText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  reactivatedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color('#E8F5E9', 'card'),
    padding: spacing.md,
    borderRadius: radii.card,
    marginBottom: spacing.lg,
  },
  reactivatedText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '700',
  },

  // Estilos del chat
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.color(colors.surfaceMuted, 'border'),
    backgroundColor: theme.color('#FFFFFF', 'card'),
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: fonts.heading,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textFaint,
  },
  headerLogout: {
    padding: spacing.xs,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color('#E8F5E9', 'card'),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.color('#C8E6C9', 'border'),
  },
  successBannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
  },
  btnBannerAction: {
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radii.round,
    marginLeft: 6,
  },
  btnBannerActionText: {
    color: theme.color('#FFF', 'text'),
    fontSize: 12,
    fontWeight: '700',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textFaint,
  },
  messagesList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.card,
  },
  bubbleMe: {
    backgroundColor: theme.color(colors.primary, 'selected'),
    borderBottomRightRadius: 4,
  },
  bubbleAdmin: {
    backgroundColor: colors.surfaceMuted,
    borderBottomLeftRadius: 4,
  },
  adminLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  adminLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: 14.5,
    lineHeight: 20,
  },
  textMe: {
    color: theme.color('#FFFFFF', 'text'),
  },
  textAdmin: {
    color: colors.text,
  },
  messageTime: {
    fontSize: 10.5,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  timeMe: {
    color: theme.color('rgba(255,255,255,0.75)', 'text'),
  },
  timeAdmin: {
    color: colors.textMuted,
  },
  systemBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.card,
    marginVertical: spacing.md,
    maxWidth: '92%',
  },
  systemText: {
    fontSize: 12.5,
    color: colors.primaryDark,
    lineHeight: 17,
    flex: 1,
  },
  motivoCaja: {
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: theme.color(colors.surfaceMuted, 'border'),
    borderLeftWidth: 3,
    borderLeftColor: theme.color(colors.salmon, 'border'),
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  motivoCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  motivoEtiqueta: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textMuted,
  },
  motivoTexto: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  chatError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.input,
  },
  chatErrorText: {
    flex: 1,
    fontSize: 12,
    color: colors.danger,
    lineHeight: 17,
  },
  chatErrorBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  chatErrorBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.color(colors.surfaceMuted, 'border'),
    backgroundColor: theme.color('#FFFFFF', 'secondary'),
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: theme.color(colors.surfaceMuted, 'secondary'),
    borderRadius: radii.input,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: radii.round,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.color('#CBD5E1', 'secondary'),
  },
});
  return { theme, colors, primaryButton, primaryButtonText, styles };
});
