import { useThemeValues } from '../context/ThemeContext';
import { createThemeStyles } from '../theme/themeRuntime';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from './scaledText';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import { getAdRequestMessages, sendAdRequestMessage, marcarChatAnuncioVisto } from '../services/adsService';
import { spacing, fonts } from '../theme';

/**
 * Chat de una solicitud de anuncio entre el anunciante y el equipo. Es la
 * única vía de contacto: el formulario ya no pide correo ni teléfono.
 *
 * Lo usan las dos partes:
 * - viewer="advertiser": desde Perfil → Mis solicitudes de anuncio.
 * - viewer="team": desde el panel de admin.
 *
 * Los mensajes se cargan al abrir, al enviar y con el botón de recargar.
 */
export const AdRequestChatModal = ({ visible, request, viewer = 'advertiser', onClose, onChanged }) => {
  const { theme, colors, estilos } = useThemeValues(getAdRequestChatModalTheme);
  const { user } = useAuth();
  const { notify } = useNotify();
  const { t, language } = useLanguage();
  const scrollRef = useRef(null);

  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    if (!request?.id) return;
    setCargando(true);
    const { messages, error } = await getAdRequestMessages(request.id);
    setCargando(false);
    if (error) {
      notify(t('ad_request.chat_error_load'), { type: 'error' });
      return;
    }
    setMensajes(messages);
    // Lo que se acaba de ver deja de contar como no leído en la bandeja.
    if (viewer === 'advertiser') marcarChatAnuncioVisto(request.id, messages[messages.length - 1]?.created_at);
  }, [request?.id, viewer, notify, t]);

  useEffect(() => {
    if (visible) cargar();
    else setTexto('');
  }, [visible, cargar]);

  const enviar = async () => {
    const cuerpo = texto.trim();
    if (!cuerpo || enviando || !request?.id) return;
    setEnviando(true);
    const { message, error } = await sendAdRequestMessage(request.id, user?.id, cuerpo);
    setEnviando(false);
    if (error) {
      notify(t('ad_request.chat_error_send'), { type: 'error' });
      return;
    }
    setTexto('');
    setMensajes((m) => [...m, message]);
    onChanged?.();
  };

  const esMio = (m) => (viewer === 'team' ? m.from_team : !m.from_team);
  const autor = (m) => {
    if (esMio(m)) return t('ad_request.chat_you');
    return m.from_team ? t('ad_request.chat_team') : request?.advertiser_name;
  };
  const hora = (iso) =>
    new Date(iso).toLocaleString(language === 'en' ? 'en-US' : 'es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={estilos.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={estilos.contenedor}
        >
          <Pressable style={estilos.panel} onPress={() => {}}>
            <View style={estilos.cabecera}>
              <View style={{ flex: 1 }}>
                <Text style={estilos.titulo}>{t('ad_request.chat_title')}</Text>
                <Text style={estilos.subtitulo} numberOfLines={1}>{request?.title}</Text>
              </View>
              <TouchableOpacity onPress={cargar} accessibilityLabel={t('ad_request.chat_refresh')} hitSlop={10}>
                <Ionicons name="refresh" size={20} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} accessibilityLabel={t('ad_request.close')} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollRef}
              contentContainerStyle={estilos.cuerpo}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            >
              {cargando && mensajes.length === 0 && <ActivityIndicator color={colors.primary} />}
              {!cargando && mensajes.length === 0 && (
                <Text style={estilos.vacio}>
                  {viewer === 'team' ? t('ad_request.chat_empty_team') : t('ad_request.chat_empty_advertiser')}
                </Text>
              )}
              {mensajes.map((m) => {
                const mio = esMio(m);
                return (
                  <View key={m.id} style={[estilos.burbujaFila, mio && estilos.burbujaFilaMia]}>
                    <View style={[estilos.burbuja, mio ? estilos.burbujaMia : estilos.burbujaOtra]}>
                      <Text style={[estilos.autor, mio && estilos.textoMio]}>{autor(m)}</Text>
                      <Text style={[estilos.mensaje, mio && estilos.textoMio]}>{m.body}</Text>
                      <Text style={[estilos.hora, mio && estilos.textoMio]}>{hora(m.created_at)}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View style={estilos.pie}>
              <View style={estilos.input}>
                <TextInput {...theme.textInputProps}
                  style={estilos.inputTexto}
                  value={texto}
                  onChangeText={setTexto}
                  placeholder={t('ad_request.chat_placeholder')}
                  placeholderTextColor={colors.textMuted}
                  maxLength={1000}
                  multiline
                />
              </View>
              <TouchableOpacity
                style={[estilos.btnEnviar, (!texto.trim() || enviando) && { opacity: 0.5 }]}
                onPress={enviar}
                disabled={!texto.trim() || enviando}
                accessibilityLabel={t('ad_request.chat_send')}
              >
                <Ionicons name="send" size={18} color={theme.color(colors.onPrimary, 'onAccent')} />
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getAdRequestChatModalTheme = createThemeStyles((theme) => {
const { colors, input } = theme;
const estilos = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  // Alto fijo (y no según el contenido) para que la caja de escribir no salte
  // a medida que llegan mensajes.
  contenedor: {
    width: '100%',
    maxWidth: 640,
    height: '85%',
  },
  panel: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.color(colors.surfaceMuted, 'border'),
  },
  titulo: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  subtitulo: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  cuerpo: {
    padding: spacing.lg,
    gap: spacing.sm,
    flexGrow: 1,
  },
  vacio: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  burbujaFila: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  burbujaFilaMia: {
    justifyContent: 'flex-end',
  },
  burbuja: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  burbujaMia: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  burbujaOtra: {
    backgroundColor: colors.surfaceMuted,
    borderBottomLeftRadius: 4,
  },
  autor: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textFaint,
    marginBottom: 2,
  },
  mensaje: {
    fontSize: 14,
    lineHeight: 19,
    color: colors.text,
  },
  hora: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  textoMio: {
    color: theme.color(colors.onPrimary, 'onAccent'),
  },
  pie: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 32 : spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.color(colors.surfaceMuted, 'border'),
  },
  input: {
    ...input,
    flex: 1,
  },
  inputTexto: {
    flex: 1,
    maxHeight: 110,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    fontSize: 14,
    color: colors.text,
    ...Platform.select({ web: { outlineStyle: 'none' }, default: {} }),
  },
  btnEnviar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
  return { theme, colors, estilos };
});
