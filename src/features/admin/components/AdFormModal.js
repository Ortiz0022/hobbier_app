import { useThemeValues } from '../../../context/ThemeContext';
import { createThemeStyles } from '../../../theme/themeRuntime';
import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '../../../components/scaledText';
import { CalendarDateField } from '../../../components/CalendarDateField';
import { CatalogPicker } from '../../onboarding/components/CatalogPicker';
import { useAuth } from '../../../context/AuthContext';
import { useNotify } from '../../../context/NotificationContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
  saveAdAdmin,
  uploadAdImage,
  diasDeVigencia,
  precioSugerido,
  PRECIO_POR_DIA,
} from '../../../services/adsService';

import { radii, spacing, fonts } from '../../../theme';

const colones = (n) => `₡${Number(n || 0).toLocaleString('es-CR', { maximumFractionDigits: 0 })}`;

// El calendario trabaja con "dd/mm/aaaa"; la base, con "aaaa-mm-dd".
const isoACampo = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};
const campoAIso = (valor) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor || '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
const enDias = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// Componente para agrupar campos con su etiqueta y mensaje de error
const CampoBase = ({ etiqueta, ayuda, error, children }) => {
  const { estilos } = useThemeValues(getAdFormModalTheme);
  return (
    <View style={estilos.campo}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      {!!ayuda && <Text style={estilos.ayuda}>{ayuda}</Text>}
      {children}
      {!!error && <Text style={estilos.error}>{error}</Text>}
    </View>
  );
};

/**
 * Alta y edición de un anuncio patrocinado con flujo guiado por pasos (Wizard/Stepper),
 * consistente con el diseño de solicitud de anuncios del usuario.
 */
export const AdFormModal = ({ ad, onClose, onSaved }) => {
  const { theme, colors, estilos } = useThemeValues(getAdFormModalTheme);
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { notify } = useNotify();
  const editando = !!ad?.id;

  const [step, setStep] = useState(1); // 1 | 2 | 3
  const [erroresPaso, setErroresPaso] = useState({});

  const STEPS_INFO = useMemo(
    () => [
      { key: 'info', label: t('admin.step_advertiser') || 'Datos del anunciante' },
      { key: 'content', label: t('admin.step_content') || 'Contenido del anuncio' },
      { key: 'pricing', label: t('admin.step_audience_pricing') || 'Audiencia y vigencia' },
    ],
    [t]
  );

  const desdeInicial = ad?.starts_on ? isoACampo(ad.starts_on) : enDias(0);
  const hastaInicial = ad?.ends_on ? isoACampo(ad.ends_on) : enDias(6);
  const precioInicial =
    ad?.price_paid != null
      ? String(ad.price_paid)
      : editando
        ? ''
        : String(precioSugerido(campoAIso(desdeInicial), campoAIso(hastaInicial)));

  const [form, setForm] = useState({
    advertiser_name: ad?.advertiser_name || '',
    advertiser_contact: ad?.advertiser_contact || '',
    title: ad?.title || '',
    body: ad?.body || '',
    link_url: ad?.link_url || '',
    cta_label: ad?.cta_label || '',
    city: ad?.city || '',
    price_paid: precioInicial,
    notes: ad?.notes || '',
  });

  const [desde, setDesde] = useState(desdeInicial);
  const [hasta, setHasta] = useState(hastaInicial);
  const [precioManual, setPrecioManual] = useState(editando && ad?.price_paid != null);
  const [gustos, setGustos] = useState((ad?.likes || []).map((l) => l.id));
  const [imagenLocal, setImagenLocal] = useState(null);
  const [imagenUrl, setImagenUrl] = useState(ad?.image_url || null);
  const [guardando, setGuardando] = useState(false);

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

  const cambiarFechas = (nuevoDesde, nuevoHasta) => {
    setDesde(nuevoDesde);
    setHasta(nuevoHasta);
    if (erroresPaso.fechas) {
      setErroresPaso((prev) => {
        const next = { ...prev };
        delete next.fechas;
        return next;
      });
    }
    if (!precioManual) {
      const precio = precioSugerido(campoAIso(nuevoDesde), campoAIso(nuevoHasta));
      setForm((f) => ({ ...f, price_paid: precio ? String(precio) : '' }));
    }
  };

  const elegirImagen = async () => {
    try {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        notify(t('admin.error_photo_permission') || 'Se requiere permiso para acceder a las fotos.', {
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
      console.error('Error al elegir la imagen del anuncio:', err);
    }
  };

  const enlaceValido = !form.link_url.trim() || /^https?:\/\/\S+\.\S+/i.test(form.link_url.trim());
  const desdeIso = campoAIso(desde);
  const hastaIso = campoAIso(hasta);
  const dias = diasDeVigencia(desdeIso, hastaIso);
  const sugerido = precioSugerido(desdeIso, hastaIso);

  // Navegación guiada con validación paso a paso
  const avanzarPaso = () => {
    if (step === 1) {
      if (!form.advertiser_name.trim()) {
        setErroresPaso({
          advertiser_name: t('admin.error_business_name') || 'Escribe el nombre del negocio.',
        });
        return;
      }
      setErroresPaso({});
      setStep(2);
    } else if (step === 2) {
      const errs = {};
      if (!form.title.trim()) {
        errs.title = t('admin.error_title') || 'El anuncio necesita un título.';
      }
      if (!enlaceValido) {
        errs.link_url = t('admin.error_link') || 'El enlace debe empezar por https://';
      }
      if (Object.keys(errs).length > 0) {
        setErroresPaso(errs);
        return;
      }
      setErroresPaso({});
      setStep(3);
    }
  };

  const retrocederPaso = () => {
    setErroresPaso({});
    if (step > 1) {
      setStep((s) => s - 1);
    } else {
      onClose?.();
    }
  };

  const guardar = async () => {
    const errs = {};
    if (!desdeIso || !hastaIso) {
      errs.fechas = t('admin.error_dates') || 'Elige las dos fechas.';
    } else if (hastaIso < desdeIso) {
      errs.fechas = t('admin.error_dates_order') || 'La fecha final es anterior a la inicial.';
    }

    if (form.price_paid && isNaN(Number(form.price_paid))) {
      errs.price_paid = t('admin.error_price') || 'El precio debe ser un número.';
    }

    if (Object.keys(errs).length > 0) {
      setErroresPaso(errs);
      return;
    }

    setGuardando(true);
    let image_url = imagenUrl;
    if (imagenLocal) {
      const { publicUrl, error } = await uploadAdImage(imagenLocal);
      if (error) {
        setGuardando(false);
        notify(t('admin.error_photo_upload') || 'No se pudo subir la imagen del anuncio.', {
          type: 'error',
        });
        return;
      }
      image_url = publicUrl;
    }

    const { ad: guardado, error } = await saveAdAdmin(
      {
        ...form,
        id: ad?.id,
        image_url,
        starts_on: desdeIso,
        ends_on: hastaIso,
        is_active: ad?.is_active ?? true,
      },
      gustos,
      user?.id
    );
    setGuardando(false);

    if (error) {
      notify(t('admin.error_saving_ad') || 'No se pudo guardar el anuncio.', { type: 'error' });
      return;
    }
    notify(
      editando
        ? t('admin.ad_saved_updated') || 'Anuncio actualizado.'
        : t('admin.ad_saved_created') || 'Anuncio publicado.',
      { type: 'success' }
    );
    onSaved?.(guardado);
  };

  const entrada = (campo, props = {}) => (
    <View style={[estilos.input, props.multiline && estilos.inputMulti]}>
      <TextInput
        {...theme.textInputProps}
        style={[estilos.inputTexto, props.multiline && { minHeight: 64, textAlignVertical: 'top' }]}
        value={form[campo]}
        onChangeText={set(campo)}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
    </View>
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={estilos.overlay} onPress={onClose}>
        <Pressable style={estilos.panel} onPress={() => {}}>
          {/* Manija (Grabber) superior */}
          <View style={estilos.grabber} />

          {/* CABECERA CON NAVEGACIÓN Y TÍTULO */}
          <View style={estilos.cabecera}>
            {step > 1 ? (
              <TouchableOpacity
                onPress={retrocederPaso}
                hitSlop={10}
                style={estilos.btnNavCabecera}
                accessibilityLabel={t('admin.previous_step') || 'Paso anterior'}
              >
                <Ionicons name="arrow-back" size={20} color={colors.text} />
              </TouchableOpacity>
            ) : (
              <View style={estilos.btnNavCabecera} />
            )}

            <View style={estilos.tituloCentro}>
              <Text style={estilos.titulo}>
                {editando
                  ? t('admin.edit_ad') || 'Editar anuncio'
                  : t('admin.new_ad') || 'Nuevo anuncio'}
              </Text>
              <Text style={estilos.subtituloPaso}>
                {t('admin.step_x_of_y', { step, total: 3 }) || `Paso ${step} de 3`} •{' '}
                {STEPS_INFO[step - 1].label}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              accessibilityLabel={t('common.close') || 'Cerrar'}
              hitSlop={10}
              style={estilos.btnNavCabecera}
            >
              <Ionicons name="close" size={22} color={colors.textMuted} />
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

          {/* CUERPO DEL FORMULARIO POR PASO */}
          <ScrollView
            contentContainerStyle={estilos.cuerpo}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ===================== PASO 1: ANUNCIANTE ===================== */}
            {step === 1 && (
              <View style={estilos.stepContainer}>
                <CampoBase
                  etiqueta={t('admin.field_business') || 'Negocio o actividad *'}
                  error={erroresPaso.advertiser_name}
                >
                  {entrada('advertiser_name', {
                    placeholder: t('admin.placeholder_business') || 'Ej. Club de Corredores San José',
                    maxLength: 60,
                  })}
                </CampoBase>

                <CampoBase
                  etiqueta={t('admin.field_contact') || 'Contacto'}
                  ayuda={t('admin.help_contact') || 'Solo lo ve el equipo de administración.'}
                >
                  {entrada('advertiser_contact', {
                    placeholder: t('admin.placeholder_contact') || 'Correo o teléfono',
                    maxLength: 80,
                  })}
                </CampoBase>

                <CampoBase
                  etiqueta={t('admin.field_city') || 'Ciudad'}
                  ayuda={
                    t('admin.help_city') ||
                    'Vacío = todo el país. Con ciudad (o cantón), solo lo ve quien esté ahí según la ubicación del teléfono, y le sale primero.'
                  }
                >
                  {entrada('city', {
                    placeholder: t('admin.placeholder_city') || 'Ej. San José',
                    maxLength: 60,
                  })}
                </CampoBase>
              </View>
            )}

            {/* ===================== PASO 2: CONTENIDO ===================== */}
            {step === 2 && (
              <View style={estilos.stepContainer}>
                <CampoBase
                  etiqueta={t('admin.field_title') || 'Título *'}
                  error={erroresPaso.title}
                >
                  {entrada('title', {
                    placeholder: t('admin.placeholder_title') || 'Ej. Carrera 10K del Parque La Sabana',
                    maxLength: 80,
                  })}
                </CampoBase>

                <CampoBase etiqueta={t('admin.field_desc') || 'Descripción'}>
                  {entrada('body', {
                    placeholder:
                      t('admin.placeholder_desc') ||
                      'Fecha, lugar y lo más importante, en una o dos frases.',
                    maxLength: 220,
                    multiline: true,
                  })}
                </CampoBase>

                <CampoBase etiqueta={t('admin.field_image') || 'Imagen'}>
                  <View style={estilos.imagenFila}>
                    {imagenLocal || imagenUrl ? (
                      <Image source={{ uri: imagenLocal || imagenUrl }} style={estilos.imagen} />
                    ) : (
                      <View style={[estilos.imagen, estilos.imagenVacia]}>
                        <Ionicons name="image-outline" size={24} color={colors.textMuted} />
                      </View>
                    )}
                    <View style={{ gap: 6 }}>
                      <TouchableOpacity style={estilos.btnSecundario} onPress={elegirImagen}>
                        <Text style={estilos.btnSecundarioTexto}>
                          {imagenLocal || imagenUrl
                            ? t('admin.change_image') || 'Cambiar'
                            : t('admin.choose_image') || 'Elegir imagen'}
                        </Text>
                      </TouchableOpacity>
                      {!!(imagenLocal || imagenUrl) && (
                        <TouchableOpacity
                          onPress={() => {
                            setImagenLocal(null);
                            setImagenUrl(null);
                          }}
                        >
                          <Text style={estilos.quitar}>{t('admin.remove_image') || 'Quitar'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </CampoBase>

                <CampoBase
                  etiqueta={t('admin.field_link') || 'Enlace'}
                  ayuda={t('admin.help_link') || 'Web, Instagram o formulario de inscripción.'}
                  error={erroresPaso.link_url}
                >
                  {entrada('link_url', {
                    placeholder: 'https://',
                    autoCapitalize: 'none',
                    keyboardType: 'url',
                  })}
                </CampoBase>

                <CampoBase etiqueta={t('admin.field_cta') || 'Texto del botón'}>
                  {entrada('cta_label', {
                    placeholder: t('admin.placeholder_cta') || 'Más información',
                    maxLength: 24,
                  })}
                </CampoBase>
              </View>
            )}

            {/* ===================== PASO 3: AUDIENCIA, VIGENCIA Y PRECIO ===================== */}
            {step === 3 && (
              <View style={estilos.stepContainer}>
                <CampoBase
                  etiqueta={`${t('admin.field_likes') || 'Gustos'} ${gustos.length ? `(${gustos.length})` : ''}`}
                  ayuda={
                    gustos.length
                      ? t('admin.help_likes_selected') ||
                        'Solo lo verá quien tenga alguno de estos gustos en sus preferencias.'
                      : t('admin.help_likes_all') ||
                        'Sin gustos, el anuncio se muestra a todo el mundo.'
                  }
                >
                  <CatalogPicker tabla="likes" selectedIds={gustos} onChange={setGustos} compact />
                </CampoBase>

                <CampoBase
                  etiqueta={t('admin.field_validity') || 'Vigencia *'}
                  error={erroresPaso.fechas}
                >
                  <View style={estilos.fechasGrid}>
                    <View style={estilos.fechaCol}>
                      <Text style={estilos.ayuda}>{t('admin.date_from') || 'Desde'}</Text>
                      <CalendarDateField
                        value={desde}
                        onChange={(v) => cambiarFechas(v, hasta)}
                      />
                    </View>
                    <View style={estilos.fechaCol}>
                      <Text style={estilos.ayuda}>{t('admin.date_to') || 'Hasta'}</Text>
                      <CalendarDateField
                        value={hasta}
                        onChange={(v) => cambiarFechas(desde, v)}
                        minDate={desdeIso ? new Date(`${desdeIso}T12:00:00`) : undefined}
                      />
                    </View>
                  </View>

                  {dias > 0 && (
                    <View style={estilos.costo}>
                      <Text style={estilos.costoEtiqueta}>
                        {t('admin.total_rate') || 'Total según tarifa'}
                      </Text>
                      <Text style={estilos.costoTotal}>{colones(sugerido)}</Text>
                      <Text style={estilos.costoDetalle}>
                        {t('admin.rate_detail', {
                          days: dias,
                          dayWord: dias === 1 ? (t('admin.day_single') || 'día') : (t('admin.day_plural') || 'días'),
                          rate: colones(PRECIO_POR_DIA),
                        }) || `${dias} ${dias === 1 ? 'día' : 'días'} × ${colones(PRECIO_POR_DIA)}`}
                      </Text>
                    </View>
                  )}
                </CampoBase>

                <CampoBase
                  etiqueta={t('admin.field_price_paid') || 'Precio cobrado (₡)'}
                  ayuda={
                    precioManual
                      ? t('admin.help_price_custom') ||
                        'Precio acordado con el negocio. Ya no sigue a las fechas.'
                      : t('admin.help_price_auto') ||
                        'Sigue al total según tarifa. Escribe otra cifra si acordaste un descuento.'
                  }
                  error={erroresPaso.price_paid}
                >
                  {entrada('price_paid', {
                    placeholder: '0',
                    keyboardType: 'decimal-pad',
                    onChangeText: (v) => {
                      setPrecioManual(true);
                      set('price_paid')(v);
                    },
                  })}
                  {precioManual && !!dias && String(sugerido) !== form.price_paid && (
                    <TouchableOpacity
                      onPress={() => {
                        setPrecioManual(false);
                        set('price_paid')(String(sugerido));
                      }}
                      style={{ marginTop: 6 }}
                    >
                      <Text style={estilos.usarSugerido}>
                        {t('admin.reset_to_rate', { rate: colones(sugerido) }) ||
                          `Volver a la tarifa (${colones(sugerido)})`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </CampoBase>

                <CampoBase etiqueta={t('admin.field_notes') || 'Notas internas'}>
                  {entrada('notes', {
                    placeholder:
                      t('admin.placeholder_notes') || 'Acuerdos con el negocio, factura, etc.',
                    multiline: true,
                  })}
                </CampoBase>
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
                {step === 1
                  ? t('common.cancel') || 'Cancelar'
                  : t('admin.back') || 'Atrás'}
              </Text>
            </TouchableOpacity>

            {step < 3 ? (
              <TouchableOpacity
                style={estilos.btnSiguiente}
                onPress={avanzarPaso}
                activeOpacity={0.85}
              >
                <Text style={estilos.btnSiguienteTexto}>
                  {t('admin.next') || 'Siguiente'}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[estilos.btnGuardar, guardando && { opacity: 0.6 }]}
                onPress={guardar}
                disabled={guardando}
                activeOpacity={0.85}
              >
                <Text style={estilos.btnGuardarTexto}>
                  {guardando
                    ? t('common.saving') || 'Guardando...'
                    : editando
                      ? t('admin.save_changes') || 'Guardar cambios'
                      : t('admin.publish_ad') || 'Publicar anuncio'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export const getAdFormModalTheme = createThemeStyles((theme) => {
  const { colors, input, isDark } = theme;
  const estilos = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    panel: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      width: '100%',
      maxWidth: 580,
      maxHeight: '92%',
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
      paddingBottom: spacing.lg,
      paddingTop: spacing.xs,
    },
    stepContainer: {
      width: '100%',
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
      marginTop: spacing.md,
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
    usarSugerido: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
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
    btnSiguiente: {
      flex: 2,
      flexDirection: 'row',
      gap: 6,
      paddingVertical: 12,
      borderRadius: radii.input,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    btnSiguienteTexto: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    btnGuardar: {
      flex: 2,
      paddingVertical: 12,
      borderRadius: radii.input,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    btnGuardarTexto: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.color(colors.onPrimary, 'onAccent'),
    },
  });

  return { theme, colors, input, estilos };
});
