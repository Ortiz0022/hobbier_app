import { useThemeValues } from '../../../context/ThemeContext';
import { createThemeStyles } from '../../../theme/themeRuntime';
import React, { useState, useEffect, useMemo } from 'react';
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
  Eye,
  MousePointerClick,
  Lock,
  TriangleAlert,
} from 'lucide-react-native';
import { Text, TextInput } from '../../../components/scaledText';
import { CalendarDateField } from '../../../components/CalendarDateField';
import { LegalDocumentModal } from '../../../legal/LegalDocumentModal';
import { SimulatedPaymentModal } from '../../../components/SimulatedPaymentModal';
import { useAuth } from '../../../context/AuthContext';
import { useNotify } from '../../../context/NotificationContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
  submitAdRequest,
  uploadAdRequestImage,
  diasDeVigencia,
  precioSugerido,
  PRECIO_POR_DIA,
  TARIFA_CPC,
  TARIFA_CPM,
  calcularPresupuesto,
  calcularCuota,
  PRESETS_PRESUPUESTO,
  contarSolicitudesPendientes,
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
  { key: 'duration', label: 'Objetivo y presupuesto' },
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
  const { t, language } = useLanguage();

  const [step, setStep] = useState(1); // 1 | 2 | 3

  const stepsInfo = useMemo(
    () => [
      { key: 'info', label: t('ad_request.step_advertiser') || 'Datos del anunciante' },
      { key: 'content', label: t('ad_request.step_content') || 'Contenido del anuncio' },
      { key: 'duration', label: t('ad_request.step_pricing') || 'Objetivo y presupuesto' },
    ],
    [t]
  );

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

  // Modelo de cobro estilo Meta Ads (CPM / CPC) y pasarela simulada
  const [billingModel, setBillingModel] = useState('CPM'); // 'CPM' | 'CPC'
  const [targetQuota, setTargetQuota] = useState(1000);
  const [cuotaManual, setCuotaManual] = useState('');
  const [modalPagoVisible, setModalPagoVisible] = useState(false);
  const [pendientesCount, setPendientesCount] = useState(0);

  useEffect(() => {
    if (visible) {
      // Refrescar fechas por defecto al abrir si habían quedado de un día anterior
      const hoyLocalIso = campoAIso(enDias(0));
      const actualDesdeIso = campoAIso(desde);
      if (!actualDesdeIso || (hoyLocalIso && actualDesdeIso < hoyLocalIso)) {
        setDesde(enDias(0));
        setHasta(enDias(6));
      }
      if (user?.id) {
        contarSolicitudesPendientes(user.id).then(setPendientesCount);
      }
    }
  }, [visible, user?.id]);

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
    setBillingModel('CPM');
    setTargetQuota(1000);
    setCuotaManual('');
    setModalPagoVisible(false);
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
  const total = calcularPresupuesto(billingModel, targetQuota);

  const enlaceValido = !form.link_url.trim() || /^https?:\/\/\S+\.\S+/i.test(form.link_url.trim());

  const elegirPreset = (cantidad) => {
    setTargetQuota(cantidad);
    setCuotaManual('');
    if (erroresPaso.cuota) {
      setErroresPaso((prev) => {
        const next = { ...prev };
        delete next.cuota;
        return next;
      });
    }
  };

  const cambiarModelo = (modelo) => {
    setBillingModel(modelo);
    if (modelo === 'CPC') {
      setTargetQuota(50);
    } else {
      setTargetQuota(1000);
    }
    setCuotaManual('');
  };

  const cambiarCuotaManual = (texto) => {
    const num = texto.replace(/\D/g, '');
    setCuotaManual(num);
    const n = Number(num);
    if (n > 0) {
      setTargetQuota(n);
      if (erroresPaso.cuota) {
        setErroresPaso((prev) => {
          const next = { ...prev };
          delete next.cuota;
          return next;
        });
      }
    }
  };

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

  // Valida los datos del paso 3 y abre la pasarela de pago falsa
  const abrirPasarela = async () => {
    const errs = {};
    if (!desdeIso || !hastaIso) {
      errs.fechas = t('ad_request.error_dates_missing') || 'Selecciona las fechas de vigencia';
    } else if (hastaIso < desdeIso) {
      errs.fechas = t('ad_request.error_dates_order') || 'La fecha final no puede ser antes de la fecha inicial';
    } else if (eventoIso && hastaIso > eventoIso) {
      errs.fechas =
        t('ad_request.error_dates_after_event') || 'El anuncio no puede durar después de la fecha del evento';
    }

    if (billingModel === 'CPC' && !form.link_url.trim()) {
      errs.link_url =
        language === 'en'
          ? 'To charge per click, you must provide a destination link (Web or WhatsApp)'
          : 'Para cobrar por clic debes indicar el enlace de destino (Web o WhatsApp)';
    } else if (!enlaceValido) {
      errs.link_url = t('ad_request.error_link') || 'El enlace debe comenzar con http:// o https://';
    }

    if (!targetQuota || targetQuota <= 0) {
      errs.cuota =
        language === 'en'
          ? 'Enter a views or clicks target greater than 0'
          : 'Indica una meta de visualizaciones o clics mayor a 0';
    }

    if (!acepta) {
      errs.acepta = t('ad_request.error_terms') || 'Debes aceptar las condiciones para enviar la solicitud';
    }

    if (Object.keys(errs).length > 0) {
      setErroresPaso(errs);
      return;
    }

    // Verificar si ya alcanzó el límite máximo de solicitudes pendientes
    const pendientes = await contarSolicitudesPendientes(user?.id);
    setPendientesCount(pendientes);
    if (pendientes >= 3) {
      notify(
        'Has alcanzado el límite máximo de 3 solicitudes pendientes. Por favor espera a que el administrador las revise y apruebe antes de enviar una nueva.',
        { type: 'warning', title: 'Límite de solicitudes alcanzado', duration: 7000 }
      );
      return;
    }

    setErroresPaso({});
    setModalPagoVisible(true);
  };

  // Callback cuando la pasarela simulada aprueba la tarjeta
  const handlePaymentSuccess = async (paymentData) => {
    setModalPagoVisible(false);
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

    // Ajustar fechas frente al desfase UTC de Supabase (después de las 6:00 PM en Costa Rica,
    // CURRENT_DATE en el servidor Postgres ya es el día siguiente en UTC).
    const hoyUtcIso = new Date().toISOString().slice(0, 10);
    const startsOnSafe = desdeIso && desdeIso < hoyUtcIso ? hoyUtcIso : desdeIso;
    const endsOnSafe =
      hastaIso && startsOnSafe && hastaIso < startsOnSafe ? startsOnSafe : hastaIso;
    const eventDateSafe =
      eventoIso && endsOnSafe && eventoIso < endsOnSafe ? endsOnSafe : eventoIso;

    const { error, limite } = await submitAdRequest(user.id, {
      ...form,
      image_url,
      event_date: eventDateSafe,
      starts_on: startsOnSafe,
      ends_on: endsOnSafe,
      billing_model: billingModel,
      target_quota: Number(targetQuota),
      payment_status: 'PAGADO',
      transaction_id: paymentData.transactionId,
    });
    setEnviando(false);

    if (error) {
      if (limite) {
        notify(
          'Has alcanzado el límite máximo de 3 solicitudes pendientes. Por favor espera a que el administrador las revise y apruebe antes de enviar una nueva.',
          { type: 'warning', title: 'Límite de solicitudes alcanzado', duration: 7000 }
        );
      } else {
        notify(t('ad_request.error_send'), { type: 'error' });
      }
      return;
    }
    notify('Solicitud pagada y registrada con éxito', {
      type: 'success',
      title: `Comprobante: ${paymentData.transactionId}`,
    });
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
                {language === 'en'
                  ? `Step ${step} of 3 • ${stepsInfo[step - 1].label}`
                  : `Paso ${step} de 3 • ${stepsInfo[step - 1].label}`}
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
            {stepsInfo.map((st, i) => {
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
                      <CalendarDateField
                        value={fechaEvento}
                        onChange={(nuevaFecha) => {
                          setFechaEvento(nuevaFecha);
                          const nuevoEvIso = campoAIso(nuevaFecha);
                          if (nuevoEvIso && hastaIso && hastaIso > nuevoEvIso) {
                            setHasta(nuevaFecha);
                          }
                        }}
                        minDate={new Date()}
                      />
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
                {/* AVISO DE LÍMITE DE SOLICITUDES PENDIENTES */}
                {pendientesCount >= 3 && (
                  <View style={estilos.limiteAvisoBanner}>
                    <TriangleAlert size={18} color="#D97706" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={estilos.limiteAvisoTitulo}>
                        {t('ad_request.limit_reached_title') || 'Límite de solicitudes alcanzado'}
                      </Text>
                      <Text style={estilos.limiteAvisoTexto}>
                        {t('ad_request.limit_reached_banner') ||
                          'Ya tienes 3 solicitudes en revisión. Por favor espera a que el administrador las apruebe o rechace antes de enviar una nueva.'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* OBJETIVO DE CAMPAÑA (ESTILO META ADS) */}
                <CampoBase
                  etiqueta={t('ad_request.campaign_objective') || 'Objetivo de la campaña'}
                  ayuda={
                    t('ad_request.campaign_objective_help') ||
                    'Elige la forma en que deseas optimizar y pagar tu anuncio.'
                  }
                >
                  <View style={estilos.modelosGrid}>
                    <TouchableOpacity
                      style={[
                        estilos.tarjetaModelo,
                        billingModel === 'CPM' && estilos.tarjetaModeloActiva,
                      ]}
                      onPress={() => cambiarModelo('CPM')}
                      activeOpacity={0.8}
                    >
                      <View style={estilos.tarjetaModeloHeader}>
                        <View
                          style={[
                            estilos.iconoModeloWrap,
                            billingModel === 'CPM' && estilos.iconoModeloWrapActivo,
                          ]}
                        >
                          <Eye
                            size={18}
                            color={billingModel === 'CPM' ? '#FFFFFF' : colors.primary}
                          />
                        </View>
                        <Text
                          style={[
                            estilos.tarjetaModeloTitulo,
                            billingModel === 'CPM' && estilos.tarjetaModeloTituloActivo,
                          ]}
                        >
                          {t('ad_request.objective_cpm_title') || 'Reconocimiento (Visualizaciones CPM)'}
                        </Text>
                      </View>
                      <Text style={estilos.tarjetaModeloDesc}>
                        {t('ad_request.objective_cpm_desc') ||
                          `Ideal para eventos y alcance de marca. Pagas ₡${TARIFA_CPM} por visualización en el feed.`}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        estilos.tarjetaModelo,
                        billingModel === 'CPC' && estilos.tarjetaModeloActiva,
                      ]}
                      onPress={() => cambiarModelo('CPC')}
                      activeOpacity={0.8}
                    >
                      <View style={estilos.tarjetaModeloHeader}>
                        <View
                          style={[
                            estilos.iconoModeloWrap,
                            billingModel === 'CPC' && estilos.iconoModeloWrapActivo,
                          ]}
                        >
                          <MousePointerClick
                            size={18}
                            color={billingModel === 'CPC' ? '#FFFFFF' : colors.primary}
                          />
                        </View>
                        <Text
                          style={[
                            estilos.tarjetaModeloTitulo,
                            billingModel === 'CPC' && estilos.tarjetaModeloTituloActivo,
                          ]}
                        >
                          {t('ad_request.objective_cpc_title') || 'Tráfico / Clics (CPC)'}
                        </Text>
                      </View>
                      <Text style={estilos.tarjetaModeloDesc}>
                        {t('ad_request.objective_cpc_desc') ||
                          `Ideal para captar clientes en tu web o WhatsApp. Pagas ₡${TARIFA_CPC} por cada clic garantizado.`}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </CampoBase>

                {/* PAQUETES Y PRESUPUESTO */}
                <CampoBase
                  etiqueta={
                    billingModel === 'CPC'
                      ? t('ad_request.quota_cpc_title') || 'Meta de clics contratados'
                      : t('ad_request.quota_cpm_title') || 'Meta de visualizaciones contratadas'
                  }
                  ayuda={
                    billingModel === 'CPC'
                      ? t('ad_request.quota_cpc_help') ||
                        'El anuncio se detiene automáticamente en el feed al completar los clics.'
                      : t('ad_request.quota_cpm_help') ||
                        'El anuncio se entrega hasta alcanzar el volumen contratado de visualizaciones.'
                  }
                  error={erroresPaso.cuota}
                >
                  <View style={estilos.presetsGrid}>
                    {(billingModel === 'CPC' ? PRESETS_PRESUPUESTO.CPC : PRESETS_PRESUPUESTO.CPM).map(
                      (preset) => {
                        const cantidad = preset.clicks || preset.views;
                        const esSeleccionado = targetQuota === cantidad && !cuotaManual;
                        return (
                          <TouchableOpacity
                            key={preset.label}
                            style={[
                              estilos.presetPill,
                              esSeleccionado && estilos.presetPillActivo,
                            ]}
                            onPress={() => elegirPreset(cantidad)}
                            activeOpacity={0.8}
                          >
                            {preset.popular && (
                              <View style={estilos.popularBadge}>
                                <Text style={estilos.popularBadgeText}>
                                  {t('ad_request.recommended') || 'Recomendado'}
                                </Text>
                              </View>
                            )}
                            <Text
                              style={[
                                estilos.presetPillTitulo,
                                esSeleccionado && estilos.presetPillTituloActivo,
                              ]}
                            >
                              {billingModel === 'CPC'
                                ? t('ad_request.clicks_count', { count: cantidad }) || `${cantidad} clics`
                                : t('ad_request.views_count', {
                                    count: cantidad.toLocaleString(
                                      language === 'en' ? 'en-US' : 'es-CR'
                                    ),
                                  }) || `${cantidad.toLocaleString()} vistas`}
                            </Text>
                            <Text
                              style={[
                                estilos.presetPillPrecio,
                                esSeleccionado && estilos.presetPillPrecioActivo,
                              ]}
                            >
                              {colones(preset.price)}
                            </Text>
                          </TouchableOpacity>
                        );
                      }
                    )}
                  </View>

                  <View style={estilos.customQuotaRow}>
                    <Text style={estilos.customQuotaLabel}>
                      {t('ad_request.custom_quota_label') || 'O ingresa otra meta:'}
                    </Text>
                    <TextInput
                      {...theme.textInputProps}
                      style={estilos.customQuotaInput}
                      placeholder={
                        billingModel === 'CPC'
                          ? t('ad_request.custom_quota_placeholder_cpc') || 'Ej. 75'
                          : t('ad_request.custom_quota_placeholder_cpm') || 'Ej. 3000'
                      }
                      keyboardType="numeric"
                      value={cuotaManual}
                      onChangeText={cambiarCuotaManual}
                    />
                  </View>
                </CampoBase>

                {/* RESUMEN DE INVERSIÓN */}
                <View style={estilos.costo}>
                  <Text style={estilos.costoEtiqueta}>
                    {t('ad_request.total_investment') || 'Inversión total a cancelar'}
                  </Text>
                  <Text style={estilos.costoTotal}>{colones(total)}</Text>
                  <Text style={estilos.costoDetalle}>
                    {billingModel === 'CPC'
                      ? t('ad_request.total_investment_detail_cpc', {
                          count: targetQuota,
                          rate: TARIFA_CPC,
                        }) || `${targetQuota} clics garantizados a ₡${TARIFA_CPC} c/u`
                      : t('ad_request.total_investment_detail_cpm', {
                          count: (targetQuota || 0).toLocaleString(
                            language === 'en' ? 'en-US' : 'es-CR'
                          ),
                          rate: TARIFA_CPM,
                        }) || `${(targetQuota || 0).toLocaleString()} visualizaciones a ₡${TARIFA_CPM} c/u`}
                  </Text>
                  <Text style={estilos.costoNota}>
                    {t('ad_request.total_investment_note') ||
                      'Pago único simulado mediante tarjeta en la siguiente ventana de cobro.'}
                  </Text>
                </View>

                {/* FECHAS DE VIGENCIA */}
                <CampoBase
                  etiqueta={t('ad_request.field_dates')}
                  ayuda={t('ad_request.dates_help') || 'Rango de fechas en el que tu campaña estará activa en el feed.'}
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
                </CampoBase>

                {/* ENLACE DESTINO */}
                <CampoBase
                  etiqueta={
                    billingModel === 'CPC'
                      ? t('ad_request.link_required_cpc') || 'Enlace destino (Requerido para Clics)'
                      : t('ad_request.link_optional_cpm') || t('ad_request.field_link')
                  }
                  ayuda={
                    billingModel === 'CPC'
                      ? t('ad_request.link_required_cpc_help') ||
                        'Dirección web o link de WhatsApp a donde irán los usuarios al hacer clic.'
                      : t('ad_request.link_optional_cpm_help') ||
                        'Opcional si tu anuncio es meramente informativo.'
                  }
                  error={erroresPaso.link_url}
                >
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
                {step === 1 ? t('ad_request.cancel') : t('ad_request.back')}
              </Text>
            </TouchableOpacity>

            {step < 3 ? (
              <TouchableOpacity
                style={estilos.btnEnviar}
                onPress={avanzarPaso}
                activeOpacity={0.85}
              >
                <Text style={estilos.btnEnviarTexto}>{t('ad_request.next')}</Text>
                <ChevronRight size={16} color={theme.color(colors.onPrimary, 'onAccent')} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[estilos.btnEnviar, enviando && { opacity: 0.6 }]}
                onPress={abrirPasarela}
                disabled={enviando}
                activeOpacity={0.85}
              >
                <Lock size={15} color={theme.color(colors.onPrimary, 'onAccent')} style={{ marginRight: 4 }} />
                <Text style={estilos.btnEnviarTexto}>
                  {enviando
                    ? t('ad_request.sending')
                    : t('ad_request.pay_and_submit', { amount: colones(total) })}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Pressable>

      <SimulatedPaymentModal
        visible={modalPagoVisible}
        orderSummary={{
          title: form.title || 'Anuncio en Hobbier',
          advertiserName: form.advertiser_name,
          customerEmail: user?.email || '',
          billingModel,
          targetQuota,
          amount: total,
          startDate: desde,
          endDate: hasta,
        }}
        onClose={() => setModalPagoVisible(false)}
        onPaymentSuccess={handlePaymentSuccess}
      />

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
    // Modelos de Cobro (CPM / CPC) y Presets
    modelosGrid: {
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    tarjetaModelo: {
      backgroundColor: theme.color(colors.surfaceMuted, 'card'),
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.color(colors.border || '#E2E8F0', 'border'),
      padding: spacing.sm + 2,
      gap: 4,
    },
    tarjetaModeloActiva: {
      borderColor: colors.primary,
      backgroundColor: theme.color(colors.primarySoft || '#EAF7FA', 'card'),
    },
    tarjetaModeloHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    iconoModeloWrap: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: theme.color(colors.surface, 'card'),
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconoModeloWrapActivo: {
      backgroundColor: colors.primary,
    },
    tarjetaModeloTitulo: {
      fontFamily: fonts.bold,
      fontSize: 13,
      color: colors.text,
    },
    tarjetaModeloTituloActivo: {
      color: colors.primary,
    },
    tarjetaModeloDesc: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 16,
    },
    presetsGrid: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    presetPill: {
      flex: 1,
      backgroundColor: theme.color(colors.surfaceMuted, 'card'),
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 4,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: theme.color(colors.border || '#E2E8F0', 'border'),
      position: 'relative',
    },
    presetPillActivo: {
      borderColor: colors.primary,
      backgroundColor: theme.color(colors.primarySoft || '#EAF7FA', 'card'),
    },
    popularBadge: {
      position: 'absolute',
      top: -8,
      backgroundColor: colors.accentDark || '#E67A15',
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 999,
    },
    popularBadgeText: {
      fontSize: 8,
      fontFamily: fonts.bold,
      color: '#FFFFFF',
    },
    presetPillTitulo: {
      fontFamily: fonts.bold,
      fontSize: 12,
      color: colors.text,
      textAlign: 'center',
    },
    presetPillTituloActivo: {
      color: colors.primary,
    },
    presetPillPrecio: {
      fontFamily: fonts.medium,
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
    presetPillPrecioActivo: {
      color: colors.primary,
      fontFamily: fonts.bold,
    },
    customQuotaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    customQuotaLabel: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: colors.textMuted,
    },
    customQuotaInput: {
      flex: 1,
      height: 38,
      backgroundColor: theme.color(colors.surfaceMuted, 'card'),
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.color(colors.border || '#E2E8F0', 'border'),
      paddingHorizontal: spacing.sm,
      fontSize: 13,
      fontFamily: fonts.medium,
      color: colors.text,
    },
    limiteAvisoBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      backgroundColor: theme.color('#FEF3C7', 'card'),
      borderWidth: 1,
      borderColor: '#F59E0B',
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    limiteAvisoTitulo: {
      fontFamily: fonts.bold,
      fontSize: 13,
      color: '#92400E',
      marginBottom: 2,
    },
    limiteAvisoTexto: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: '#B45309',
      lineHeight: 16,
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
