import { useThemeValues } from '../../../context/ThemeContext';
import { createThemeStyles } from '../../../theme/themeRuntime';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Text } from '../../../components/scaledText';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { useNotify } from '../../../context/NotificationContext';
import { supportService } from '../../../services/supportService';
import { radii, spacing, fonts } from "../../../theme";
import { Insignia, BotonAccion, BarraBusqueda, getAdminUITheme } from "../adminUI";

export const AdminSupport = ({ initialUserId = null }) => {
  const { theme, colors, adminStyles, styles } = useThemeValues(getAdminSupportTheme);

  const { user: currentAdmin } = useAuth();
  const { notify, confirm } = useNotify();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('OPEN'); // 'OPEN' | 'RESOLVED' | 'ALL'
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Mensajes del ticket seleccionado
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [sanctioning, setSanctioning] = useState(false);

  const listRef = useRef(null);

  const cargarTickets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await supportService.adminGetTickets({
        status: filter,
        search,
      });
      setTickets(data);

      // Si venía un initialUserId, autoseleccionar ese ticket
      if (initialUserId && !selectedTicket) {
        const found = data.find((t) => t.user_id === initialUserId);
        if (found) setSelectedTicket(found);
      }
    } catch (err) {
      console.warn('Error cargando tickets de soporte admin:', err.message);
      notify('No se pudieron cargar los tickets de soporte.', { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filter, search, initialUserId, selectedTicket, notify]);

  useEffect(() => {
    cargarTickets();
  }, [cargarTickets]);

  // Suscripción a cambios de tickets en tiempo real
  useEffect(() => {
    const unsubscribe = supportService.subscribeToAdminTickets(() => {
      cargarTickets();
    });
    return unsubscribe;
  }, [cargarTickets]);

  // Cargar mensajes al seleccionar un ticket
  useEffect(() => {
    if (!selectedTicket?.id) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setLoadingMessages(true);

    supportService
      .getTicketMessages(selectedTicket.id)
      .then((msgs) => {
        if (isMounted) {
          setMessages(msgs);
          supportService.markTicketRead(selectedTicket.id, true);
        }
      })
      .catch((err) => {
        console.warn('Error al cargar mensajes del ticket:', err.message);
      })
      .finally(() => {
        if (isMounted) setLoadingMessages(false);
      });

    // Suscripción en tiempo real a los mensajes de este ticket
    const unsubscribe = supportService.subscribeToTicketMessages(selectedTicket.id, (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [newMsg, ...prev];
      });
      supportService.markTicketRead(selectedTicket.id, true);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [selectedTicket?.id]);

  const handleSendReply = async () => {
    const text = replyText.trim();
    if (!text || !selectedTicket?.id || sending) return;

    setReplyText('');
    setSending(true);

    try {
      const sentMsg = await supportService.sendSupportMessage(
        selectedTicket.id,
        text,
        'ADMIN'
      );
      setMessages((prev) => {
        if (prev.some((m) => m.id === sentMsg.id)) return prev;
        return [sentMsg, ...prev];
      });
    } catch (err) {
      notify('Error al enviar la respuesta.', { type: 'error' });
      setReplyText(text);
    } finally {
      setSending(false);
    }
  };

  const handleReactivateUser = async () => {
    if (!selectedTicket?.user_id) return;
    const targetUser = selectedTicket.user;

    const ok = await confirm({
      title: 'Reactivar cuenta',
      message: `¿Estás seguro de levantar la sanción permanente a @${targetUser?.username || 'este usuario'}? Podrá volver a acceder normalmente a Hobbier.`,
      confirmLabel: 'Sí, reactivar',
      destructive: false,
    });

    if (!ok) return;

    setReactivating(true);
    try {
      const { success, error } = await supportService.adminReactivateAccount(
        selectedTicket.user_id,
        selectedTicket.id
      );

      if (error || !success) throw error || new Error('Fallo al reactivar.');

      notify(`Cuenta de @${targetUser?.username} reactivada con éxito.`, { type: 'success' });

      // Actualizar estado local
      setSelectedTicket((prev) => ({
        ...prev,
        status: 'RESOLVED',
        user: { ...prev.user, status: 'ACTIVE' },
      }));

      cargarTickets();
    } catch (err) {
      console.error('Error al reactivar cuenta:', err);
      notify('No se pudo reactivar la cuenta. Inténtalo de nuevo.', { type: 'error' });
    } finally {
      setReactivating(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedTicket?.user_id) return;
    const targetUser = selectedTicket.user;

    const ok = await confirm({
      title: 'Sanción permanente',
      message: `¿Estás seguro de mantener la sanción permanente a @${targetUser?.username || 'este usuario'}? No podrá volver a acceder a Hobbier.`,
      confirmLabel: 'Sí, sancionar',
      destructive: true,
    });

    if (!ok) return;

    setSanctioning(true);
    try {
      const { success, error } = await supportService.adminBanAccount(
        selectedTicket.user_id,
        selectedTicket.id
      );

      if (error || !success) throw error || new Error('Fallo al sancionar.');

      notify(`Cuenta de @${targetUser?.username} sancionada permanentemente.`, { type: 'error' });

      setSelectedTicket((prev) => ({
        ...prev,
        status: 'RESOLVED',
        user: { ...prev.user, status: 'BANNED' },
      }));

      cargarTickets();
    } catch (err) {
      console.error('Error al sancionar cuenta:', err);
      notify('No se pudo sancionar la cuenta. Inténtalo de nuevo.', { type: 'error' });
    } finally {
      setSanctioning(false);
    }
  };

  // ----------------------------------------------------
  // VISTA DE CONVERSACIÓN (CHAT CON EL USUARIO SANCIONADO)
  // ----------------------------------------------------
  const renderChatDetail = () => {
    if (!selectedTicket) {
      return (
        <View style={styles.emptyDetailContainer}>
          <Feather name="message-square" size={48} color={colors.textMuted} />
          <Text style={styles.emptyDetailTitle}>Selecciona una conversación</Text>
          <Text style={styles.emptyDetailSubtitle}>
            Elige un ticket de la lista para ver la apelación y responder al usuario.
          </Text>
        </View>
      );
    }

    const targetUser = selectedTicket.user;
    const isBanned = targetUser?.status === 'BANNED';

    return (
      <View style={styles.detailContainer}>
        {/* Cabecera del chat en admin */}
        <View style={styles.detailHeader}>
        <View style={styles.detailHeaderTop}>
          {!isDesktop && (
            <TouchableOpacity
              style={styles.backButtonMobile}
              onPress={() => setSelectedTicket(null)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
          )}

          {targetUser?.avatar_url ? (
            <Image source={{ uri: targetUser.avatar_url }} style={styles.avatarMini} />
          ) : (
            <View style={styles.avatarPlaceholderMini}>
              <Text style={styles.avatarTextMini}>
                {targetUser?.username?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}

          <View style={[styles.detailHeaderInfo, !isDesktop && styles.detailHeaderInfoMobile]}>
            <Text style={styles.detailUserName} numberOfLines={1}>
              {targetUser?.full_name || targetUser?.username}
            </Text>
            <Text style={styles.detailUserHandle} numberOfLines={1}>
              @{targetUser?.username}
            </Text>
          </View>

          {/* En escritorio, las acciones van inline a la derecha */}
          {isDesktop && isBanned && (
            <View style={styles.detailHeaderActionsRow}>
              {/* Opción 1: mantener la sanción permanente */}
              <TouchableOpacity
                style={[styles.sanctionButton, sanctioning && { opacity: 0.7 }]}
                onPress={handleBanUser}
                disabled={sanctioning || reactivating}
                activeOpacity={0.8}
              >
                {sanctioning ? (
                  <ActivityIndicator size="small" color={colors.danger} />
                ) : (
                  <>
                    <Feather name="slash" size={14} color={colors.danger} />
                    <Text style={styles.sanctionButtonText}>Sanción permanente</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Opción 2: reactivar cuenta */}
              <TouchableOpacity
                style={[styles.reactivateButton, reactivating && { opacity: 0.7 }]}
                onPress={handleReactivateUser}
                disabled={reactivating || sanctioning}
                activeOpacity={0.8}
              >
                {reactivating ? (
                  <ActivityIndicator size="small" color={theme.color("#FFF", 'text')} />
                ) : (
                  <>
                    <Feather name="check-circle" size={14} color={theme.color("#FFF", 'text')} />
                    <Text style={styles.reactivateButtonText}>Reactivar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
          {isDesktop && !isBanned && <Insignia texto="ACTIVO" tono="exito" />}
        </View>

        {/* En móvil, la fila de acciones va debajo para no aplastar el nombre */}
        {!isDesktop && isBanned && (
          <View style={styles.detailHeaderActions}>
            <Insignia texto="SANCIÓN" tono="alerta" />
            <View style={styles.detailHeaderActionsRow}>
              <TouchableOpacity
                style={[styles.sanctionButtonSmall, sanctioning && { opacity: 0.7 }]}
                onPress={handleBanUser}
                disabled={sanctioning || reactivating}
                activeOpacity={0.8}
              >
                {sanctioning ? (
                  <ActivityIndicator size="small" color={colors.danger} />
                ) : (
                  <>
                    <Feather name="slash" size={12} color={colors.danger} />
                    <Text style={styles.sanctionButtonTextSmall}>Sancionar</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reactivateButton, reactivating && { opacity: 0.7 }]}
                onPress={handleReactivateUser}
                disabled={reactivating || sanctioning}
                activeOpacity={0.8}
              >
                {reactivating ? (
                  <ActivityIndicator size="small" color={theme.color("#FFF", 'text')} />
                ) : (
                  <>
                    <Feather name="check-circle" size={13} color={theme.color("#FFF", 'text')} />
                    <Text style={styles.reactivateButtonText}>Reactivar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
        {!isDesktop && !isBanned && (
          <View style={styles.detailHeaderActions}>
            <Insignia texto="ACTIVO" tono="exito" />
            <View style={styles.reactivatedBadge}>
              <Feather name="check" size={12} color={colors.success} />
              <Text style={styles.reactivatedBadgeText}>Reactivado</Text>
            </View>
          </View>
        )}
      </View>

        {/* Lista de mensajes */}
        {loadingMessages ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            inverted
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            renderItem={({ item }) => {
              const isAdmin = item.sender_role === 'ADMIN';
              const isSystem = item.sender_role === 'SYSTEM';

              if (isSystem) {
                return (
                  <View style={styles.systemMessageWrap}>
                    <Text style={styles.systemMessageText}>{item.content}</Text>
                  </View>
                );
              }

              return (
                <View
                  style={[
                    styles.msgRow,
                    isAdmin ? styles.msgRowRight : styles.msgRowLeft,
                  ]}
                >
                  <View
                    style={[
                      styles.msgBubble,
                      isAdmin ? styles.msgBubbleAdmin : styles.msgBubbleUser,
                    ]}
                  >
                    {!isAdmin && (
                      <Text style={styles.msgSenderName}>
                        @{targetUser?.username || 'Usuario'}
                      </Text>
                    )}
                    <Text style={[styles.msgText, isAdmin && { color: theme.color('#FFF', 'text') }]}>
                      {item.content}
                    </Text>
                    <Text
                      style={[
                        styles.msgTime,
                        isAdmin ? { color: theme.color('rgba(255,255,255,0.7)', 'text') } : { color: colors.textMuted },
                      ]}
                    >
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

        {/* Entrada de respuesta */}
        <View style={styles.replyBar}>
          <TextInput {...theme.textInputProps}
            style={styles.replyInput}
            value={replyText}
            onChangeText={setReplyText}
            placeholder="Escribe una respuesta para el usuario..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={1000}
            editable={!sending}
          />
          <TouchableOpacity
            style={[
              styles.sendReplyBtn,
              (!replyText.trim() || sending) && styles.sendReplyBtnDisabled,
            ]}
            onPress={handleSendReply}
            disabled={!replyText.trim() || sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color={theme.color("#FFF", 'text')} />
            ) : (
              <Feather name="send" size={18} color={theme.color("#FFF", 'text')} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ----------------------------------------------------
  // LISTA DE TICKETS
  // ----------------------------------------------------
  const renderTicketsList = () => (
    <View style={[styles.listWrapper, isDesktop && styles.listWrapperDesktop]}>
      {/* Filtros de estado */}
      <View style={styles.filtersRow}>
        {[
          { key: 'OPEN', label: 'Pendientes' },
          { key: 'RESOLVED', label: 'Resueltos' },
          { key: 'ALL', label: 'Todos' },
        ].map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Buscador */}
      <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.sm }}>
        <BarraBusqueda
          valor={search}
          alCambiar={setSearch}
          alLimpiar={() => setSearch('')}
          placeholder="Buscar por @usuario o nombre..."
        />
      </View>

      {/* Lista */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : tickets.length === 0 ? (
        <View style={styles.emptyList}>
          <Feather name="inbox" size={36} color={colors.textMuted} style={{ marginBottom: 8 }} />
          <Text style={styles.emptyListTitle}>No hay apelaciones</Text>
          <Text style={styles.emptyListSubtitle}>
            {filter === 'OPEN'
              ? 'No hay solicitudes de apelación pendientes.'
              : 'No se encontraron tickets con los filtros actuales.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = selectedTicket?.id === item.id;
            const user = item.user;
            const hasUnread = !!item.unread_admin;
            const isBanned = user?.status === 'BANNED';

            return (
              <TouchableOpacity
                style={[
                  styles.ticketCard,
                  isSelected && styles.ticketCardSelected,
                  hasUnread && styles.ticketCardUnread,
                ]}
                onPress={() => setSelectedTicket(item)}
                activeOpacity={0.7}
              >
                <View style={styles.ticketCardTop}>
                  {user?.avatar_url ? (
                    <Image source={{ uri: user.avatar_url }} style={styles.ticketAvatar} />
                  ) : (
                    <View style={styles.ticketAvatarPlaceholder}>
                      <Text style={styles.ticketAvatarText}>
                        {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}

                  <View style={styles.ticketHeaderCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={styles.ticketName} numberOfLines={1}>
                        {user?.full_name || user?.username}
                      </Text>
                      {hasUnread && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.ticketUsername}>@{user?.username}</Text>
                  </View>
                </View>

                <View style={styles.ticketCardBottom}>
                  <Insignia
                    texto={isBanned ? 'SANCIÓN PERMANENTE' : 'REACTIVADO'}
                    tono={isBanned ? 'alerta' : 'exito'}
                  />
                  <Text style={styles.ticketTime}>
                    {item.last_message_at
                      ? new Date(item.last_message_at).toLocaleDateString('es-ES', {
                          month: 'short',
                          day: 'numeric',
                        })
                      : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      {isDesktop ? (
        <View style={styles.splitLayout}>
          {renderTicketsList()}
          <View style={styles.chatPane}>{renderChatDetail()}</View>
        </View>
      ) : selectedTicket ? (
        renderChatDetail()
      ) : (
        renderTicketsList()
      )}
    </View>
  );
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getAdminSupportTheme = createThemeStyles((theme) => {
const { colors } = theme;
const { adminStyles } = getAdminUITheme(theme);
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color('#FFFFFF', 'background'),
  },
  splitLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  listWrapper: {
    flex: 1,
    backgroundColor: theme.color('#FAFAFA', 'card'),
    borderRightWidth: 1,
    borderRightColor: theme.color(colors.surfaceMuted, 'border'),
  },
  listWrapperDesktop: {
    maxWidth: 360,
  },
  chatPane: {
    flex: 1,
    backgroundColor: theme.color('#FFFFFF', 'card'),
  },
  filtersRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radii.round,
    backgroundColor: theme.color('#E2E8F0', 'card'),
  },
  filterChipActive: {
    backgroundColor: theme.color(colors.primary, 'selected'),
  },
  filterChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.text,
  },
  filterChipTextActive: {
    color: theme.color('#FFFFFF', 'text'),
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xxl,
  },
  emptyListTitle: {
    fontSize: 16,
    fontFamily: fonts.heading,
    fontWeight: '700',
    color: colors.text,
  },
  emptyListSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  ticketCard: {
    backgroundColor: theme.color('#FFFFFF', 'card'),
    marginHorizontal: spacing.md,
    marginVertical: 4,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: theme.color(colors.surfaceMuted, 'border'),
  },
  ticketCardSelected: {
    borderColor: theme.color(colors.primary, "primary"),
    backgroundColor: theme.color(colors.surfaceAccent, 'selected'),
  },
  ticketCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: theme.color(colors.accent, 'border'),
  },
  ticketCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  ticketAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  ticketAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  ticketHeaderCol: {
    flex: 1,
  },
  ticketName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  ticketUsername: {
    fontSize: 12,
    color: colors.textFaint,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  ticketCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  ticketTime: {
    fontSize: 11,
    color: colors.textMuted,
  },

  // Detalle de chat
  detailContainer: {
    flex: 1,
    backgroundColor: theme.color('#FFFFFF', 'card'),
  },
  emptyDetailContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyDetailTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyDetailSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 320,
  },
  detailHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.color(colors.surfaceMuted, 'border'),
    backgroundColor: theme.color('#FFFFFF', 'card'),
  },
  detailHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingLeft: 44, // alinea con el nombre (24 avatar + 20 gap)
  },
  backButtonMobile: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  avatarMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: spacing.sm,
  },
  avatarPlaceholderMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  avatarTextMini: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  detailHeaderInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  detailHeaderInfoMobile: {
    marginRight: 0,
  },
  detailUserName: {
    fontSize: 15,
    fontFamily: fonts.heading,
    fontWeight: '700',
    color: colors.text,
  },
  detailUserHandle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  reactivateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radii.round,
    gap: 6,
  },
  detailHeaderActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  sanctionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.color(colors.danger, 'border'),
    backgroundColor: 'transparent',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.round,
    gap: 6,
  },
  sanctionButtonText: {
    color: colors.danger,
    fontSize: 12.5,
    fontWeight: '700',
  },
  sanctionButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.color(colors.danger, 'border'),
    backgroundColor: 'transparent',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radii.round,
    gap: 5,
  },
  sanctionButtonTextSmall: {
    color: colors.danger,
    fontSize: 11.5,
    fontWeight: '700',
  },
  reactivateButtonText: {
    color: theme.color('#FFFFFF', 'onAccent'),
    fontSize: 12.5,
    fontWeight: '700',
  },
  reactivatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radii.round,
    backgroundColor: theme.color('#E8F5E9', 'card'),
  },
  reactivatedBadgeText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  messagesList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  msgRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  msgRowRight: {
    justifyContent: 'flex-end',
  },
  msgRowLeft: {
    justifyContent: 'flex-start',
  },
  msgBubble: {
    maxWidth: '82%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.card,
  },
  msgBubbleAdmin: {
    backgroundColor: theme.color(colors.primary, 'selected'),
    borderBottomRightRadius: 4,
  },
  msgBubbleUser: {
    backgroundColor: colors.surfaceMuted,
    borderBottomLeftRadius: 4,
  },
  msgSenderName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 2,
  },
  msgText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 19,
  },
  msgTime: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  systemMessageWrap: {
    alignSelf: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    marginVertical: spacing.lg,
    maxWidth: '92%',
  },
  systemMessageText: {
    fontSize: 12.5,
    color: colors.primaryDark,
    textAlign: 'center',
    lineHeight: 19,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.color(colors.surfaceMuted, 'border'),
    backgroundColor: theme.color('#FFFFFF', 'card'),
    gap: spacing.sm,
  },
  replyInput: {
    flex: 1,
    backgroundColor: theme.color(colors.surfaceMuted, 'secondary'),
    borderRadius: radii.input,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    color: colors.text,
    maxHeight: 90,
  },
  sendReplyBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.round,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendReplyBtnDisabled: {
    backgroundColor: theme.color('#CBD5E1', 'secondary'),
  },
});
  return { theme, colors, adminStyles, styles };
});
