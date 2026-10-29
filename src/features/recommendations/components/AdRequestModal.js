import { useThemeValues } from '../../../context/ThemeContext';
import { createThemeStyles } from '../../../theme/themeRuntime';
import React, { useState } from 'react';
import { View, StyleSheet, Modal, Pressable, ScrollView, TouchableOpacity, Platform, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '../../../components/scaledText';
import { CalendarDateField } from '../../../components/CalendarDateField';
import { LegalDocumentModal } from '../../../legal/LegalDocumentModal';
import { useAuth } from '../../../context/AuthContext';
import { useNotify } from '../../../context/NotificationContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
  submitAdRequest,
  uploadAdRequestImage,
  diasDeVigencia,
  precioSugerido,
  PRECIO_POR_DIA,
} from '../../../services/adsService';
import { radii, spacing, fonts } from '../../../theme';

const colones = (n) => `₡${Number(n || 0).toLocaleString('es-CR', { maximumFractionDigits: 0 })}`;

// El calendario trabaja con "dd/mm/aaaa"; la base, con "aaaa-mm-dd".
const campoAIso = (valor) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor || '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
const isoADate = (iso) => (iso ? new Date(`${iso}T12:00:00`) : undefined);
const enDias = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// Fuera del componente a propósito: definida dentro, se crearía de nuevo en
// cada render y el campo de texto perdería el foco a cada tecla.
const CampoBase = ({ etiqueta, ayuda, error, children }) => {
  const { estilos } = useThemeValues(getAdRequestModalTheme);
  return (<View style={estilos.campo}>
    <Text style={estilos.etiqueta}>{etiqueta}</Text>
    {!!ayuda && <Text style={estilos.ayuda}>{ayuda}</Text>}
    {children}
    {!!error && <Text style={estilos.error}>{error}</Text>}
  </View>);
};

/**
 * Formulario para pedir un anuncio desde Descubre.
 *
 * No publica nada: guarda una solicitud PENDIENTE que el admin revisa en su
 * panel. Solo si la aprueba se crea el anuncio que luego sale en el feed.
 */
export const AdRequestModal = ({ visible, onClose, onSent }) => {
  const { theme, colors, estilos } = useThemeValues(getAdRequestModalTheme);
  const { user } = useAuth();
  const { notify } = useNotify();
  const { t } = useLanguage();

  const vacio = () => ({
    advertiser_name: '',
    kind: 'EVENTO',
    title: '',
    body: '',
    link_url: '',
    event_place: '',
  });
  const [form, setForm] = useState(vacio);
  const [fechaEvento, setFechaEvento] = useState('');
  // Arranca con una semana (hoy y los 6 días siguientes) para que el total se
  // vea desde el principio; el anunciante lo cambia a su gusto.
  const [desde, setDesde] = useState(enDias(0));
  const [hasta, setHasta] = useState(enDias(6));
  const [imagenLocal, setImagenLocal] = useState(null);
  const [acepta, setAcepta] = useState(false);
  const [verCondiciones, setVerCondiciones] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [intentado, setIntentado] = useState(false);

  const set = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const cerrar = () => {
    setForm(vacio());
    setFechaEvento('');
    setDesde(enDias(0));
    setHasta(enDias(6));
    setImagenLocal(null);
    setAcepta(false);
    setIntentado(false);
    onClose?.();
  };

  const elegirImagen = async () => {
    try {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        notify(t('ad_request.error_photo_permission'), { type: 'warning' });
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!res.canceled && res.assets?.length) setImagenLocal(res.assets[0].uri);
    } catch (err) {
      console.error('Error al elegir la imagen de la solicitud:', err);
    }
  };

  const esEvento = form.kind === 'EVENTO';
  const desdeIso = campoAIso(desde);
  const hastaIso = campoAIso(hasta);
  const eventoIso = esEvento ? campoAIso(fechaEvento) : null;
  // Total a pagar con la tarifa por día, para que el anunciante lo sepa antes
  // de enviar. El pago se acuerda con el equipo, fuera de la app.
  const dias = diasDeVigencia(desdeIso, hastaIso);
  const total = precioSugerido(desdeIso, hastaIso);

  const enlaceValido = !form.link_url.trim() || /^https?:\/\/\S+\.\S+/i.test(form.link_url.trim());
  const errores = {
    advertiser_name: !form.advertiser_name.trim() && t('ad_request.error_name'),
    title: !form.title.trim() && t('ad_request.error_title'),
    link_url: !enlaceValido && t('ad_request.error_link'),
    fechas:
      !desdeIso || !hastaIso
        ? t('ad_request.error_dates_missing')
        : hastaIso < desdeIso
          ? t('ad_request.error_dates_order')
          : eventoIso && hastaIso > eventoIso
            ? t('ad_request.error_dates_after_event')
            : null,
    acepta: !acepta && t('ad_request.error_terms'),
  };
  const hayErrores = Object.values(errores).some(Boolean);
  // Los errores solo se enseñan después del primer intento de enviar.
  const visibles = intentado ? errores : {};

  const enviar = async () => {
    setIntentado(true);
    if (hayErrores || !user?.id) return;

    setEnviando(true);
    let image_url = null;
    if (imagenLocal) {
      const subida = await uploadAdRequestImage(user.id, imagenLocal);
      if (subida.error) {
        setEnviando(false);
        notify(t('ad_request.error_photo_upload'), { type: 'error' });
        return;
      }
      image_url = subida.publicUrl;
    }

    const { error, limite } = await submitAdRequest(user.id, {
      ...form,
      image_url,
      event_date: eventoIso,
      starts_on: desdeIso,
      ends_on: hastaIso,
    });
    setEnviando(false);

    if (error) {
      notify(limite ? t('ad_request.error_limit') : t('ad_request.error_send'), { type: 'error' });
      return;
    }
    notify(t('ad_request.sent'), { type: 'success', title: t('ad_request.sent_title') });
    onSent?.();
    cerrar();
  };

  const entrada = (campo, props = {}) => (
    <View style={[estilos.input, props.multiline && estilos.inputMulti]}>
      <TextInput {...theme.textInputProps}
        style={[estilos.inputTexto, props.multiline && { minHeight: 64, textAlignVertical: 'top' }]}
        value={form[campo]}
        onChangeText={set(campo)}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
    </View>
  );

  const TIPOS = [
    { key: 'EVENTO', label: t('ad_request.kind_event'), icono: 'calendar-outline' },
    { key: 'SERVICIO', label: t('ad_request.kind_service'), icono: 'briefcase-outline' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={cerrar}>
      <Pressable style={estilos.overlay} onPress={cerrar}>
        <Pressable style={estilos.panel} onPress={() => {}}>
          <View style={estilos.cabecera}>
            <Text style={estilos.titulo}>{t('ad_request.form_title')}</Text>
            <TouchableOpacity onPress={cerrar} accessibilityLabel={t('ad_request.cancel')} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={estilos.cuerpo} keyboardShouldPersistTaps="handled">
            <View style={estilos.aviso}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
              <Text style={estilos.avisoTexto}>{t('ad_request.review_notice')}</Text>
            </View>

            <CampoBase etiqueta={t('ad_request.field_name')} error={visibles.advertiser_name}>
              {entrada('advertiser_name', { placeholder: t('ad_request.placeholder_name'), maxLength: 60 })}
            </CampoBase>

            <CampoBase etiqueta={t('ad_request.field_kind')}>
              <View style={estilos.tipos}>
                {TIPOS.map((tipo) => {
                  const activo = form.kind === tipo.key;
                  return (
                    <TouchableOpacity
                      key={tipo.key}
                      style={[estilos.tipo, activo && estilos.tipoActivo]}
                      onPress={() => set('kind')(tipo.key)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: activo }}
                    >
                      <Ionicons name={tipo.icono} size={16} color={activo ? colors.primary : colors.textMuted} />
                      <Text style={[estilos.tipoTexto, activo && estilos.tipoTextoActivo]}>{tipo.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </CampoBase>

            <CampoBase etiqueta={t('ad_request.field_title')} error={visibles.title}>
              {entrada('title', { placeholder: t('ad_request.placeholder_title'), maxLength: 80 })}
            </CampoBase>
            <CampoBase etiqueta={t('ad_request.field_body')}>
              {entrada('body', { placeholder: t('ad_request.placeholder_body'), maxLength: 220, multiline: true })}
            </CampoBase>
            <CampoBase etiqueta={t('ad_request.field_photo')} ayuda={t('ad_request.help_photo')}>
              <View style={estilos.imagenFila}>
                {imagenLocal ? (
                  <Image source={{ uri: imagenLocal }} style={estilos.imagen} />
                ) : (
                  <View style={[estilos.imagen, estilos.imagenVacia]}>
                    <Ionicons name="image-outline" size={22} color={colors.textMuted} />
                  </View>
                )}
                <View style={{ gap: 6 }}>
                  <TouchableOpacity style={estilos.btnSecundario} onPress={elegirImagen}>
                    <Text style={estilos.btnSecundarioTexto}>
                      {imagenLocal ? t('ad_request.photo_change') : t('ad_request.photo_pick')}
                    </Text>
                  </TouchableOpacity>
                  {!!imagenLocal && (
                    <TouchableOpacity onPress={() => setImagenLocal(null)}>
                      <Text style={estilos.quitar}>{t('ad_request.photo_remove')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </CampoBase>

            {esEvento && (
              <>
                <CampoBase etiqueta={t('ad_request.field_event_date')}>
                  <CalendarDateField value={fechaEvento} onChange={setFechaEvento} minDate={new Date()} />
                </CampoBase>
                <CampoBase etiqueta={t('ad_request.field_event_place')}>
                  {entrada('event_place', { placeholder: t('ad_request.placeholder_place'), maxLength: 80 })}
                </CampoBase>
              </>
            )}

            <CampoBase
              etiqueta={t('ad_request.field_dates')}
              ayuda={t('ad_request.help_dates', { rate: colones(PRECIO_POR_DIA) })}
              error={visibles.fechas}
            >
              <View style={{ gap: spacing.sm }}>
                <Text style={estilos.ayuda}>{t('ad_request.date_from')}</Text>
                <CalendarDateField
                  value={desde}
                  onChange={setDesde}
                  minDate={new Date()}
                  maxDate={isoADate(eventoIso)}
                />
                <Text style={estilos.ayuda}>{t('ad_request.date_to')}</Text>
                <CalendarDateField
                  value={hasta}
                  onChange={setHasta}
                  minDate={isoADate(desdeIso) || new Date()}
                  maxDate={isoADate(eventoIso)}
                />
              </View>
              {dias > 0 && (
                <View style={estilos.costo}>
                  <Text style={estilos.costoEtiqueta}>{t('ad_request.total_label')}</Text>
                  <Text style={estilos.costoTotal}>{colones(total)}</Text>
                  <Text style={estilos.costoDetalle}>
                    {t(dias === 1 ? 'ad_request.total_detail_one' : 'ad_request.total_detail', {
                      days: dias,
                      rate: colones(PRECIO_POR_DIA),
                    })}
                  </Text>
                  <Text style={estilos.costoNota}>{t('ad_request.total_note')}</Text>
                </View>
              )}
            </CampoBase>

            <CampoBase etiqueta={t('ad_request.field_link')} error={visibles.link_url}>
              {entrada('link_url', { placeholder: 'https://', autoCapitalize: 'none', keyboardType: 'url' })}
            </CampoBase>

            <TouchableOpacity
              style={estilos.aceptar}
              onPress={() => setAcepta((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acepta }}
            >
              <Ionicons
                name={acepta ? 'checkbox' : 'square-outline'}
                size={20}
                color={acepta ? colors.primary : colors.textMuted}
              />
              <Text style={estilos.aceptarTexto}>
                {t('ad_request.terms')}{' '}
                <Text
                  style={estilos.enlace}
                  onPress={() => setVerCondiciones(true)}
                  accessibilityRole="link"
                >
                  {t('ad_request.terms_link')}
                </Text>
                .
              </Text>
            </TouchableOpacity>
            {!!visibles.acepta && <Text style={estilos.error}>{visibles.acepta}</Text>}
          </ScrollView>

          <View style={estilos.pie}>
            <TouchableOpacity
              style={[estilos.btnEnviar, enviando && { opacity: 0.6 }]}
              onPress={enviar}
              disabled={enviando}
              activeOpacity={0.85}
            >
              <Text style={estilos.btnEnviarTexto}>{enviando ? t('ad_request.sending') : t('ad_request.send')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={estilos.btnCancelar} onPress={cerrar} activeOpacity={0.85}>
              <Text style={estilos.btnCancelarTexto}>{t('ad_request.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>

      <LegalDocumentModal doc={verCondiciones ? 'ads' : null} onClose={() => setVerCondiciones(false)} />
    </Modal>
  );
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getAdRequestModalTheme = createThemeStyles((theme) => {
const { colors, input } = theme;
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
  },
  aviso: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: theme.color(colors.primarySoft, 'card'),
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  avisoTexto: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textFaint,
  },
  campo: {
    marginBottom: spacing.md,
  },
  etiqueta: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  ayuda: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 6,
  },
  error: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
  },
  input: {
    ...input,
  },
  inputMulti: {
    alignItems: 'flex-start',
  },
  inputTexto: {
    flex: 1,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    fontSize: 14,
    color: colors.text,
    ...Platform.select({ web: { outlineStyle: 'none' }, default: {} }),
  },
  tipos: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tipo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: theme.color(colors.surfaceMuted, 'border'),
    backgroundColor: colors.surface,
  },
  tipoActivo: {
    borderColor: colors.primary,
    backgroundColor: theme.color(colors.primarySoft, 'selected'),
  },
  tipoTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tipoTextoActivo: {
    color: colors.primary,
  },
  costo: {
    marginTop: spacing.sm,
    backgroundColor: theme.color('#FFF5EA', 'card'),
    borderRadius: 12,
    padding: spacing.md,
  },
  costoEtiqueta: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.accentDark,
  },
  costoTotal: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: colors.text,
    marginTop: 2,
  },
  costoDetalle: {
    fontSize: 13,
    color: colors.textFaint,
    marginTop: 2,
  },
  costoNota: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  imagenFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  imagen: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
  imagenVacia: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecundario: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnSecundarioTexto: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  quitar: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  aceptar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  aceptarTexto: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textFaint,
  },
  enlace: {
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  pie: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.color(colors.surfaceMuted, 'border'),
  },
  btnCancelar: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  btnCancelarTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textFaint,
  },
  btnEnviar: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  btnEnviarTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.color(colors.onPrimary, 'onAccent'),
  },
});
  return { theme, colors, estilos };
});
