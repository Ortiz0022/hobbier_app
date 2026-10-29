import { useThemeValues } from '../../../context/ThemeContext';
import { createThemeStyles } from '../../../theme/themeRuntime';
import React, { useState } from 'react';
import { View, StyleSheet, Modal, Pressable, ScrollView, TouchableOpacity, Platform, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  X,
  ShieldCheck,
  Calendar,
  Briefcase,
  Image as ImageIcon,
  Check,
  ChevronRight,
  ExternalLink,
  MapPin,
  Clock,
} from 'lucide-react-native';
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

const CampoBase = ({ etiqueta, ayuda, error, children }) => {
  const { estilos } = useThemeValues(getAdRequestModalTheme);
  return (
    <View style={estilos.campo}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      {!!ayuda && <Text style={estilos.ayuda}>{ayuda}</Text>}
      {children}
      {!!error && <Text style={estilos.error}>{error}</Text>}
    </View>
  );
};

const STEPS_INFO = [
  { key: 'info', label: 'Datos del anunciante' },
  { key: 'content', label: 'Contenido del anuncio' },
  { key: 'duration', label: 'Vigencia y confirmación' },
];

/**
 * Formulario guiado por pasos (Wizard/Stepper) para solicitar un anuncio.
 * Organizado en 3 pasos cortos para evitar scroll tedioso y permitir
 * navegar hacia adelante y hacia atrás sin perder datos.
 */
export const AdRequestModal = ({ visible, onClose, onSent }) => {
  const { theme, colors, estilos } = useThemeValues(getAdRequestModalTheme);
  const { user } = useAuth();
  const { notify } = useNotify();
  const { t } = useLanguage();

  const [step, setStep] = useState(1); // 1 | 2 | 3

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
  const [desde, setDesde] = useState(enDias(0));
  const [hasta, setHasta] = useState(enDias(6));
  const [imagenLocal, setImagenLocal] = useState(null);
  const [acepta, setAcepta] = useState(false);
  const [verCondiciones, setVerCondiciones] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroresPaso, setErroresPaso] = useState({});

  const set = (campo) => (valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    if (erroresPaso[campo]) {
      setErroresPaso((prev) => {
        const next = { ...prev };
        delete next[campo];
        return next;
      });
    }
  };

  const cerrar = () => {
    setStep(1);
    setForm(vacio());
    setFechaEvento('');
    setDesde(enDias(0));
    setHasta(enDias(6));
    setImagenLocal(null);
    setAcepta(false);
    setErroresPaso({});
    onClose?.();
  };

  const elegirImagen = async () => {
    try {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        notify(t('ad_request.error_photo_permission') || 'Se necesita permiso para acceder a tus fotos.', {
          type: 'warning',
        });
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
  const dias = diasDeVigencia(desdeIso, hastaIso);
  const total = precioSugerido(desdeIso, hastaIso);

  const enlaceValido = !form.link_url.trim() || /^https?:\/\/\S+\.\S+/i.test(form.link_url.trim());

  // Navegación hacia adelante con validación por paso
  const avanzarPaso = () => {
    if (step === 1) {
      if (!form.advertiser_name.trim()) {
        setErroresPaso({
          advertiser_name: t('ad_request.error_name') || 'Indica el nombre del negocio o persona',
        });
        return;
      }
      setErroresPaso({});
      setStep(2);
    } else if (step === 2) {
      if (!form.title.trim()) {
        setErroresPaso({
          title: t('ad_request.error_title') || 'Escribe un título para el anuncio',
        });
        return;
      }
      setErroresPaso({});
      setStep(3);
    }
  };

  // Navegación hacia atrás (mantiene todos los datos en el estado)
  const retrocederPaso = () => {
    setErroresPaso({});
    if (step > 1) {
      setStep((s) => s - 1);
    } else {
      cerrar();
    }
  };

  const enviar = async () => {
    const errs = {};
    if (!desdeIso || !hastaIso) {
      errs.fechas = t('ad_request.error_dates_missing') || 'Selecciona las fechas de vigencia';
    } else if (hastaIso < desdeIso) {
      errs.fechas = t('ad_request.error_dates_order') || 'La fecha final no puede ser antes de la fecha inicial';
    } else if (eventoIso && hastaIso > eventoIso) {
      errs.fechas =
        t('ad_request.error_dates_after_event') || 'El anuncio no puede durar después de la fecha del evento';
    }

    if (!enlaceValido) {
      errs.link_url = t('ad_request.error_link') || 'El enlace debe comenzar con http:// o https://';
    }

    if (!acepta) {
      errs.acepta = t('ad_request.error_terms') || 'Debes aceptar las condiciones para enviar la solicitud';
    }

    if (Object.keys(errs).length > 0) {
      setErroresPaso(errs);
      return;
    }

    setEnviando(true);
    let image_url = null;
    if (imagenLocal) {
      const subida = await uploadAdRequestImage(user.id, imagenLocal);
      if (subida.error) {
        setEnviando(false);
        notify(t('ad_request.error_photo_upload') || 'No se pudo subir la foto.', { type: 'error' });
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
      <TextInput
        {...theme.textInputProps}
        style={[estilos.inputTexto, props.multiline && { minHeight: 60, textAlignVertical: 'top' }]}
        value={form[campo]}
        onChangeText={set(campo)}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
    </View>
  );

  const TIPOS = [
    { key: 'EVENTO', label: t('ad_request.kind_event') || 'Evento', icon: Calendar },
    { key: 'SERVICIO', label: t('ad_request.kind_service') || 'Servicio', icon: Briefcase },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={cerrar}>
      <Pressable style={estilos.overlay} onPress={cerrar}>
        <Pressable style={estilos.panel} onPress={() => {}}>
          {/* Manija (Grabber) superior de Bottom Sheet */}
          <View style={estilos.grabber} />

          {/* CABECERA CON NAVEGACIÓN Y TÍTULO */}
          <View style={estilos.cabecera}>
            {step > 1 ? (
              <TouchableOpacity
                onPress={retrocederPaso}
                hitSlop={10}
                style={estilos.btnNavCabecera}
                accessibilityLabel="Paso anterior"
              >
                <ArrowLeft size={20} color={colors.text} />
              </TouchableOpacity>
            ) : (
              <View style={estilos.btnNavCabecera} />
            )}

            <View style={estilos.tituloCentro}>
              <Text style={estilos.titulo}>{t('ad_request.form_title')}</Text>
              <Text style={estilos.subtituloPaso}>
                Paso {step} de 3 • {STEPS_INFO[step - 1].label}
              </Text>
            </View>

            <TouchableOpacity
              onPress={cerrar}
              accessibilityLabel={t('ad_request.cancel')}
              hitSlop={10}
              style={estilos.btnNavCabecera}
            >
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* BARRA DE PROGRESO DE LOS PASOS */}
          <View style={estilos.barraProgreso}>
            {STEPS_INFO.map((st, i) => {
              const num = i + 1;
              const completado = step > num;
              const actual = step === num;
              return (
                <View
                  key={st.key}
                  style={[
                    estilos.segmentoProgreso,
                    (completado || actual) && estilos.segmentoActivo,
                  ]}
                />
              );
            })}
          </View>

          {/* CONTENIDO DEL PASO ACTUAL (SIN SCROLL KILOMÉTRICO) */}
          <ScrollView
            contentContainerStyle={estilos.cuerpo}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ===================== PASO 1 ===================== */}
            {step === 1 && (
              <View style={estilos.stepContainer}>
                {/* AVISO INFORMATIVO DE REVISIÓN */}
                <View style={estilos.aviso}>
                  <ShieldCheck size={20} color={colors.primary} style={{ marginTop: 1 }} />
                  <Text style={estilos.avisoTexto}>
                    {t('ad_request.review_notice') ||
                      'Nada se publica automáticamente. El equipo de Hobbier revisa cada solicitud y te escribirá por mensajes dentro de la app para acordar los detalles antes de aprobarla.'}
                  </Text>
                </View>

                {/* NOMBRE DEL ANUNCIANTE */}
                <CampoBase etiqueta={t('ad_request.field_name')} error={erroresPaso.advertiser_name}>
                  {entrada('advertiser_name', {
                    placeholder: t('ad_request.placeholder_name'),
                    maxLength: 60,
                  })}
                </CampoBase>

                {/* TIPO DE ANUNCIO: EVENTO / SERVICIO */}
                <CampoBase etiqueta={t('ad_request.field_kind')}>
                  <View style={estilos.tipos}>
                    {TIPOS.map((tipo) => {
                      const activo = form.kind === tipo.key;
                      const IconComponent = tipo.icon;
                      return (
                        <TouchableOpacity
                          key={tipo.key}
                          style={[estilos.tipo, activo && estilos.tipoActivo]}
                          onPress={() => set('kind')(tipo.key)}
                          activeOpacity={0.8}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: activo }}
                        >
                          <IconComponent
                            size={18}
                            color={activo ? colors.primary : colors.textMuted}
                          />
                          <Text style={[estilos.tipoTexto, activo && estilos.tipoTextoActivo]}>
                            {tipo.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </CampoBase>
              </View>
            )}

            {/* ===================== PASO 2 ===================== */}
            {step === 2 && (
              <View style={estilos.stepContainer}>
                {/* TÍTULO */}
                <CampoBase etiqueta={t('ad_request.field_title')} error={erroresPaso.title}>
                  {entrada('title', {
                    placeholder: t('ad_request.placeholder_title'),
                    maxLength: 80,
                  })}
                </CampoBase>

                {/* DESCRIPCIÓN */}
                <CampoBase etiqueta={t('ad_request.field_body')}>
                  {entrada('body', {
                    placeholder: t('ad_request.placeholder_body'),
                    maxLength: 220,
                    multiline: true,
                  })}
                </CampoBase>

                {/* FOTO */}
                <CampoBase etiqueta={t('ad_request.field_photo')} ayuda={t('ad_request.help_photo')}>
                  <View style={estilos.imagenFila}>
                    {imagenLocal ? (
                      <Image source={{ uri: imagenLocal }} style={estilos.imagen} />
                    ) : (
                      <View style={[estilos.imagen, estilos.imagenVacia]}>
                        <ImageIcon size={22} color={colors.textMuted} />
                      </View>
                    )}
                    <View style={{ gap: 6, flex: 1 }}>
                      <TouchableOpacity style={estilos.btnSecundario} onPress={elegirImagen} activeOpacity={0.8}>
                        <Text style={estilos.btnSecundarioTexto}>
                          {imagenLocal ? t('ad_request.photo_change') : t('ad_request.photo_pick')}
                        </Text>
                      </TouchableOpacity>
                      {Boolean(imagenLocal) && (
                        <TouchableOpacity onPress={() => setImagenLocal(null)}>
                          <Text style={estilos.quitar}>{t('ad_request.photo_remove')}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </CampoBase>

                {/* CAMPOS ESPECÍFICOS DE EVENTO */}
                {esEvento && (
                  <>
                    <CampoBase etiqueta={t('ad_request.field_event_date')}>
                      <CalendarDateField value={fechaEvento} onChange={setFechaEvento} minDate={new Date()} />
                    </CampoBase>
                    <CampoBase etiqueta={t('ad_request.field_event_place')}>
                      {entrada('event_place', {
                        placeholder: t('ad_request.placeholder_place'),
                        maxLength: 80,
                      })}
                    </CampoBase>
                  </>
                )}
              </View>
            )}

            {/* ===================== PASO 3 ===================== */}
            {step === 3 && (
              <View style={estilos.stepContainer}>
                {/* FECHAS DE VIGENCIA */}
                <CampoBase
                  etiqueta={t('ad_request.field_dates')}
                  ayuda={t('ad_request.help_dates', { rate: colones(PRECIO_POR_DIA) })}
                  error={erroresPaso.fechas}
                >
                  <View style={estilos.fechasGrid}>
                    <View style={estilos.fechaCol}>
                      <Text style={estilos.ayuda}>{t('ad_request.date_from')}</Text>
                      <CalendarDateField
                        value={desde}
                        onChange={setDesde}
                        minDate={new Date()}
                        maxDate={isoADate(eventoIso)}
                      />
                    </View>
                    <View style={estilos.fechaCol}>
                      <Text style={estilos.ayuda}>{t('ad_request.date_to')}</Text>
                      <CalendarDateField
                        value={hasta}
                        onChange={setHasta}
                        minDate={isoADate(desdeIso) || new Date()}
                        maxDate={isoADate(eventoIso)}
                      />
                    </View>
                  </View>

                  {/* CÁLCULO DE COSTO ESTIMADO */}
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

                {/* ENLACE DESTINO */}
                <CampoBase etiqueta={t('ad_request.field_link')} error={erroresPaso.link_url}>
                  {entrada('link_url', {
                    placeholder: 'https://',
                    autoCapitalize: 'none',
                    keyboardType: 'url',
                  })}
                </CampoBase>

                {/* TÉRMINOS Y CONDICIONES */}
                <TouchableOpacity
                  style={estilos.aceptar}
                  onPress={() => {
                    setAcepta((v) => !v);
                    if (erroresPaso.acepta) {
                      setErroresPaso((prev) => {
                        const next = { ...prev };
                        delete next.acepta;
                        return next;
                      });
                    }
                  }}
                  activeOpacity={0.8}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: acepta }}
                >
                  <View style={[estilos.checkWrap, acepta && estilos.checkWrapActivo]}>
                    {acepta && <Check size={14} color="#FFFFFF" />}
                  </View>
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
                {Boolean(erroresPaso.acepta) && <Text style={estilos.error}>{erroresPaso.acepta}</Text>}
              </View>
            )}
          </ScrollView>

          {/* PIE DE NAVEGACIÓN ENTRE PASOS */}
          <View style={estilos.pie}>
            <TouchableOpacity
              style={estilos.btnCancelar}
              onPress={retrocederPaso}
              activeOpacity={0.85}
            >
              <Text style={estilos.btnCancelarTexto}>
                {step === 1 ? t('ad_request.cancel') : 'Atrás'}
              </Text>
            </TouchableOpacity>

            {step < 3 ? (
              <TouchableOpacity
                style={estilos.btnEnviar}
                onPress={avanzarPaso}
                activeOpacity={0.85}
              >
                <Text style={estilos.btnEnviarTexto}>Siguiente</Text>
                <ChevronRight size={16} color={theme.color(colors.onPrimary, 'onAccent')} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[estilos.btnEnviar, enviando && { opacity: 0.6 }]}
                onPress={enviar}
                disabled={enviando}
                activeOpacity={0.85}
              >
                <Text style={estilos.btnEnviarTexto}>
                  {enviando ? t('ad_request.sending') : t('ad_request.send')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Pressable>

      <LegalDocumentModal doc={verCondiciones ? 'ads' : null} onClose={() => setVerCondiciones(false)} />
    </Modal>
  );
};

export const getAdRequestModalTheme = createThemeStyles((theme) => {
  const { colors, input } = theme;
  const isDark = theme.isDark;

  const estilos = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    panel: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      width: '100%',
      maxWidth: 580,
      maxHeight: '90%',
      paddingTop: 10,
      ...Platform.select({
        web: {
          boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.25)',
        },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.2,
          shadowRadius: 16,
          elevation: 12,
        },
      }),
    },
    grabber: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? '#3A3A3C' : '#CBD5E1',
      alignSelf: 'center',
      marginBottom: 8,
    },
    cabecera: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
      paddingBottom: spacing.sm,
    },
    btnNavCabecera: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tituloCentro: {
      alignItems: 'center',
    },
    titulo: {
      fontSize: 18,
      fontWeight: '700',
      fontFamily: fonts.heading,
      color: colors.text,
      letterSpacing: -0.2,
    },
    subtituloPaso: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    barraProgreso: {
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.md,
      marginTop: spacing.xs,
    },
    segmentoProgreso: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? '#2C2C2E' : '#E2E8F0',
    },
    segmentoActivo: {
      backgroundColor: colors.primary,
    },
    cuerpo: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.md,
      paddingTop: spacing.xs,
    },
    stepContainer: {
      width: '100%',
    },
    aviso: {
      flexDirection: 'row',
      gap: spacing.sm,
      backgroundColor: theme.color(colors.primarySoft, 'card'),
      borderRadius: 14,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    avisoTexto: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      color: colors.textFaint,
    },
    campo: {
      marginBottom: spacing.md,
    },
    etiqueta: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 5,
    },
    ayuda: {
      fontSize: 11,
      color: colors.textMuted,
      marginBottom: 5,
    },
    error: {
      fontSize: 12,
      color: colors.danger,
      marginTop: 4,
    },
    input: {
      ...input,
      borderRadius: 12,
      paddingHorizontal: 12,
    },
    inputMulti: {
      alignItems: 'flex-start',
      minHeight: 68,
    },
    inputTexto: {
      flex: 1,
      paddingVertical: Platform.OS === 'web' ? 10 : 8,
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
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.color(colors.surfaceMuted, 'border'),
      backgroundColor: colors.surface,
    },
    tipoActivo: {
      borderColor: colors.primary,
      backgroundColor: theme.color(colors.primarySoft, 'selected'),
    },
    tipoTexto: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
    },
    tipoTextoActivo: {
      color: colors.primary,
    },
    imagenFila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    imagen: {
      width: 72,
      height: 72,
      borderRadius: 14,
      backgroundColor: colors.surfaceMuted,
    },
    imagenVacia: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.color(colors.surfaceMuted, 'border'),
      borderStyle: 'dashed',
    },
    btnSecundario: {
      backgroundColor: colors.primarySoft,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnSecundarioTexto: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: 13,
    },
    quitar: {
      color: colors.danger,
      fontSize: 12,
      fontWeight: '600',
      paddingHorizontal: 4,
    },
    fechasGrid: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    fechaCol: {
      flex: 1,
    },
    costo: {
      marginTop: spacing.sm,
      backgroundColor: theme.color('#FFF5EA', 'card'),
      borderRadius: 14,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: theme.color('rgba(255, 179, 0, 0.25)', 'border'),
    },
    costoEtiqueta: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: colors.accentDark,
    },
    costoTotal: {
      fontSize: 22,
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
      marginTop: spacing.xs,
    },
    aceptar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: spacing.md,
    },
    checkWrap: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.textMuted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkWrapActivo: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    aceptarTexto: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textFaint,
    },
    enlace: {
      color: colors.primary,
      fontWeight: '600',
      textDecorationLine: 'underline',
    },
    pie: {
      flexDirection: 'row',
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.color(colors.surfaceMuted, 'border'),
    },
    btnCancelar: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: radii.input,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    btnCancelarTexto: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textFaint,
    },
    btnEnviar: {
      flex: 2,
      flexDirection: 'row',
      gap: 6,
      paddingVertical: 12,
      borderRadius: radii.input,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    btnEnviarTexto: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.color(colors.onPrimary, 'onAccent'),
    },
  });

  return { theme, colors, estilos };
});
