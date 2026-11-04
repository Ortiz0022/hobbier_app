import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  X,
  CreditCard,
  Lock,
  Sparkles,
  ShieldCheck,
  CircleCheckBig,
  Check,
  Wifi,
  Mail,
  FileText,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Path,
  Circle,
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  G,
} from 'react-native-svg';
import { Text, TextInput } from './scaledText';
import { useThemeValues } from '../context/ThemeContext';
import { createThemeStyles } from '../theme/themeRuntime';
import { radii, spacing, fonts } from '../theme';
import { useLanguage } from '../context/LanguageContext';
import {
  enviarFacturaPorCorreo,
  abrirFacturaImprimible,
} from '../services/invoiceEmailService';

const colones = (n) => `₡${Number(n || 0).toLocaleString('es-CR', { maximumFractionDigits: 0 })}`;

const detectarMarca = (numero = '') => {
  const limpio = numero.replace(/\D/g, '');
  if (limpio.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(limpio) || /^2[2-7]/.test(limpio)) return 'Mastercard';
  if (/^3[47]/.test(limpio)) return 'Amex';
  return 'Tarjeta';
};

const formatearNumeroTarjeta = (texto = '') => {
  const limpio = texto.replace(/\D/g, '').slice(0, 16);
  return limpio.replace(/(\d{4})(?=\d)/g, '$1 ');
};

const formatearExpiracion = (texto = '') => {
  const limpio = texto.replace(/\D/g, '').slice(0, 4);
  if (limpio.length >= 2) {
    return `${limpio.slice(0, 2)}/${limpio.slice(2)}`;
  }
  return limpio;
};

/**
 * Pasarela de pago simulada (Mock Payment Gateway estilo Stripe/Meta Ads)
 *
 * Permite simular una compra de publicidad (CPM o CPC) de forma visual,
 * rápida y creíble para demostraciones académicas.
 */
export const SimulatedPaymentModal = ({
  visible,
  orderSummary = /** @type {any} */ ({}),
  onClose,
  onPaymentSuccess,
}) => {
  const { theme, colors, estilos } = useThemeValues(getSimulatedPaymentModalTheme);
  const { t, language } = useLanguage();

  // 'form' | 'processing' | 'success'
  const [paso, setPaso] = useState('form');
  const [mensajeProceso, setMensajeProceso] = useState('');

  // Datos del formulario de tarjeta
  const [numero, setNumero] = useState('');
  const [titular, setTitular] = useState('');
  const [expiracion, setExpiracion] = useState('');
  const [cvv, setCvv] = useState('');
  const [emailFactura, setEmailFactura] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [fechaPago, setFechaPago] = useState(/** @type {Date | null} */ (null));
  const [estadoCorreo, setEstadoCorreo] = useState('idle'); // 'idle' | 'sending' | 'sent' | 'fallback'

  // Reiniciar estado al abrir el modal
  useEffect(() => {
    if (visible) {
      setPaso('form');
      setNumero('');
      setTitular('');
      setExpiracion('');
      setCvv('');
      setEmailFactura(orderSummary.customerEmail || '');
      setTransactionId('');
      setInvoiceNumber('');
      setFechaPago(null);
      setEstadoCorreo('idle');
      setMensajeProceso(
        language === 'en'
          ? 'Contacting secure banking institution...'
          : 'Contactando entidad bancaria segura...'
      );
    }
  }, [visible, language, orderSummary.customerEmail]);

  const marca = useMemo(() => detectarMarca(numero), [numero]);
  const digitosLimpios = numero.replace(/\D/g, '');
  const expLimpia = expiracion.replace(/\D/g, '');

  const esValido =
    digitosLimpios.length === 16 &&
    titular.trim().length >= 3 &&
    expLimpia.length === 4 &&
    cvv.replace(/\D/g, '').length >= 3;

  // Relleno mágico de prueba (estilo Stripe test card)
  const rellenarTarjetaPrueba = () => {
    setNumero('4242 4242 4242 4242');
    setTitular('Juanito Pérez');
    setExpiracion('12/28');
    setCvv('123');
    if (!emailFactura && orderSummary.customerEmail) {
      setEmailFactura(orderSummary.customerEmail);
    }
  };

  const construirDatosFactura = (txnId, numFac, fecha) => ({
    invoiceNumber: numFac,
    transactionId: txnId,
    paidAt: (fecha || fechaPago || new Date()).toISOString(),
    advertiserName: orderSummary.advertiserName || titular.trim(),
    customerEmail: (emailFactura || orderSummary.customerEmail || '').trim(),
    campaignTitle: orderSummary.title || 'Anuncio en Hobbier',
    billingModel: orderSummary.billingModel || 'CPM',
    targetQuota: orderSummary.targetQuota || 1000,
    amount: orderSummary.amount || 0,
    cardBrand: marca,
    cardLast4: digitosLimpios.slice(-4) || '4242',
    startDate: orderSummary.startDate || '',
    endDate: orderSummary.endDate || '',
    language,
  });

  const dispararEnvioFactura = async (txnId, numFac, fecha) => {
    const correoDestino = (emailFactura || orderSummary.customerEmail || '').trim();
    if (!correoDestino || !correoDestino.includes('@')) return;
    setEstadoCorreo('sending');
    const res = await enviarFacturaPorCorreo(construirDatosFactura(txnId, numFac, fecha));
    setEstadoCorreo(res.ok ? 'sent' : 'fallback');
  };

  const handlePagar = () => {
    if (!esValido) return;
    setPaso('processing');
    setMensajeProceso(
      language === 'en'
        ? 'Contacting secure banking institution...'
        : 'Contactando entidad bancaria segura...'
    );

    setTimeout(() => {
      setMensajeProceso(
        language === 'en'
          ? 'Verifying funds and encryption...'
          : 'Verificando fondos y cifrado...'
      );
    }, 800);

    setTimeout(() => {
      setMensajeProceso(
        language === 'en'
          ? 'Generating electronic invoice & receipt...'
          : 'Generando factura electrónica y comprobante...'
      );
    }, 1400);

    setTimeout(() => {
      const codigoRandom = Math.floor(100000 + Math.random() * 900000);
      const nuevoTxn = `TXN-HBR-${codigoRandom}`;
      const nuevaFac = `FAC-HBR-${codigoRandom}`;
      const ahora = new Date();
      setTransactionId(nuevoTxn);
      setInvoiceNumber(nuevaFac);
      setFechaPago(ahora);
      setPaso('success');
      dispararEnvioFactura(nuevoTxn, nuevaFac, ahora);
    }, 2000);
  };

  const handleFinalizar = () => {
    onPaymentSuccess?.({
      transactionId,
      billingModel: orderSummary.billingModel || 'CPM',
      targetQuota: orderSummary.targetQuota || null,
      amount: orderSummary.amount || 0,
      paymentStatus: 'PAGADO',
      paidAt: fechaPago?.toISOString() || new Date().toISOString(),
      cardLast4: digitosLimpios.slice(-4) || '4242',
      cardBrand: marca,
    });
  };

  const textoObjetivo =
    orderSummary.billingModel === 'CPC'
      ? `${t('ad_request.clicks_count', { count: orderSummary.targetQuota || 0 })} (CPC)`
      : `${t('ad_request.views_count', {
          count: (orderSummary.targetQuota || 0).toLocaleString(
            language === 'en' ? 'en-US' : 'es-CR'
          ),
        })} (CPM)`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={estilos.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={estilos.backdrop} onPress={paso === 'processing' ? null : onClose} />

        <View style={estilos.sheet}>
          {/* Encabezado */}
          <View style={estilos.header}>
            <View style={estilos.headerTituloCont}>
              <View style={estilos.lockIconBadge}>
                <Lock size={15} color={colors.primary} />
              </View>
              <Text style={estilos.headerTitulo}>
                {paso === 'success'
                  ? t('ad_request.payment_receipt_title') || 'Comprobante de Pago'
                  : t('ad_request.payment_title') || 'Pasarela de Pago Segura'}
              </Text>
            </View>
            {paso !== 'processing' && (
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={estilos.closeBtn}
              >
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            contentContainerStyle={estilos.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ================================================= */}
            {/* PASO 1: FORMULARIO Y TARJETA VISUAL */}
            {/* ================================================= */}
            {paso === 'form' && (
              <>
                {/* Resumen del Pedido */}
                <View style={estilos.orderSummaryBox}>
                  <View style={estilos.orderSummaryRow}>
                    <Text style={estilos.orderSummaryLabel}>
                      {t('ad_request.payment_campaign') || 'Campaña'}
                    </Text>
                    <Text style={estilos.orderSummaryValue} numberOfLines={1}>
                      {orderSummary.title || 'Anuncio en Hobbier'}
                    </Text>
                  </View>
                  <View style={estilos.orderSummaryRow}>
                    <Text style={estilos.orderSummaryLabel}>
                      {t('ad_request.payment_objective') || 'Objetivo'}
                    </Text>
                    <Text style={estilos.orderSummaryValue}>{textoObjetivo}</Text>
                  </View>
                  <View style={[estilos.orderSummaryRow, estilos.orderSummaryTotalRow]}>
                    <Text style={estilos.orderSummaryTotalLabel}>
                      {t('ad_request.payment_total') || 'Total a pagar'}
                    </Text>
                    <Text style={estilos.orderSummaryTotalValue}>
                      {colones(orderSummary.amount || 0)}
                    </Text>
                  </View>
                </View>

                {/* Tarjeta Visual Plástica Realista (Estilo Tarjeta Virtual Bancaria) */}
                <View style={estilos.creditCardOuterGlow}>
                  <LinearGradient
                    colors={['#05091C', '#0A112E', '#111A42']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={estilos.creditCardVisual}
                  >
                    {/* Arte decorativo de ondas/nubes violetas en esquina inferior derecha + reflejo */}
                    <View style={StyleSheet.absoluteFill} pointerEvents="none">
                      <Svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMaxYMax slice">
                        <Defs>
                          <SvgLinearGradient id="purpleWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor="#7C3AED" stopOpacity="0.92" />
                            <Stop offset="50%" stopColor="#5B21B6" stopOpacity="0.95" />
                            <Stop offset="100%" stopColor="#3B0764" stopOpacity="0.98" />
                          </SvgLinearGradient>
                          <SvgLinearGradient id="glassSheen" x1="0%" y1="0%" x2="80%" y2="100%">
                            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.08" />
                            <Stop offset="45%" stopColor="#38BDF8" stopOpacity="0.03" />
                            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                          </SvgLinearGradient>
                        </Defs>

                        {/* Brillo diagonal tipo cristal */}
                        <Path d="M0,0 L230,0 L110,220 L0,220 Z" fill="url(#glassSheen)" />

                        {/* Silueta de nubes/ondas moradas estilo tarjeta virtual LAFISE */}
                        <G fill="url(#purpleWaveGrad)">
                          <Circle cx="155" cy="225" r="36" />
                          <Circle cx="195" cy="205" r="38" />
                          <Circle cx="238" cy="185" r="40" />
                          <Circle cx="282" cy="162" r="42" />
                          <Circle cx="325" cy="138" r="44" />
                          <Circle cx="360" cy="115" r="42" />
                          <Path d="M130,220 L360,105 L360,220 Z" />
                        </G>
                      </Svg>
                    </View>

                    {/* Fila Superior: Logo Banco + Chip EMV + Etiqueta "Virtual" */}
                    <View style={estilos.cardTopRow}>
                      <View style={estilos.bankBrandRow}>
                        <View style={estilos.bankEmblemBox}>
                          <Svg width="24" height="24" viewBox="0 0 24 24">
                            <Rect x="2" y="2" width="20" height="20" rx="4" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
                            <Path d="M2,9 L22,9 M2,15 L22,15 M9,2 L9,22 M15,2 L15,22" stroke="rgba(56,189,248,0.55)" strokeWidth="0.8" />
                            <Circle cx="12" cy="12" r="5" fill="none" stroke="#FFFFFF" strokeWidth="1.2" />
                          </Svg>
                        </View>
                        <View>
                          <Text style={estilos.bankSubText}>Banco</Text>
                          <Text style={estilos.bankMainText}>HOBBIER</Text>
                        </View>
                      </View>

                      <View style={estilos.virtualRightGroup}>
                        <Text style={estilos.virtualTagText}>Virtual</Text>
                        <Wifi
                          size={16}
                          color="rgba(255,255,255,0.65)"
                          style={{ transform: [{ rotate: '90deg' }] }}
                        />
                      </View>
                    </View>

                    {/* Chip EMV Metálico + Número de Tarjeta */}
                    <View style={estilos.cardMiddleSection}>
                      <View style={estilos.chipAndLabelRow}>
                        {/* Chip dorado realista */}
                        <LinearGradient
                          colors={['#FDE68A', '#F59E0B', '#D97706']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={estilos.cardChip}
                        >
                          <View style={estilos.chipLineH} />
                          <View style={estilos.chipLineV} />
                          <View style={estilos.chipCenterBox} />
                        </LinearGradient>

                        <Text style={estilos.cardNumberLabel}>
                          {language === 'en' ? 'Card number' : 'Número de tarjeta'}
                        </Text>
                      </View>

                      <Text style={estilos.cardNumberText} numberOfLines={1} adjustsFontSizeToFit>
                        {numero ? formatearNumeroTarjeta(numero) : '4576   5479   5487   7986'}
                      </Text>
                    </View>

                    {/* Fila Inferior: Vencimiento, CVV, Titular y Logo Franquicia */}
                    <View style={estilos.cardBottomRow}>
                      <View style={estilos.cardMetaLeft}>
                        <View style={estilos.cardMetaBlock}>
                          <Text style={estilos.cardFieldLabel}>
                            {language === 'en' ? 'Expiration\ndate' : 'Fecha de\nvencimiento'}
                          </Text>
                          <Text style={estilos.cardFieldValue}>
                            {expiracion || '12/28'}
                          </Text>
                        </View>

                        <View style={estilos.cardMetaBlock}>
                          <Text style={estilos.cardFieldLabel}>CVV</Text>
                          <Text style={estilos.cardCvvValue}>
                            {cvv ? cvv.split('').join(' ') : '1 2 3'}
                          </Text>
                        </View>

                        <View style={[estilos.cardMetaBlock, { flex: 1, minWidth: 85 }]}>
                          <Text style={estilos.cardFieldLabel}>
                            {language === 'en' ? 'Cardholder' : 'Titular'}
                          </Text>
                          <Text style={estilos.cardHolderValue} numberOfLines={1}>
                            {titular
                              ? titular.toUpperCase()
                              : language === 'en'
                                ? 'FULL NAME'
                                : 'JUANITO PÉREZ'}
                          </Text>
                        </View>
                      </View>

                      {/* Logo de marca (Visa / Mastercard / Amex) */}
                      <View style={estilos.brandLogoContainer}>
                        {marca === 'Mastercard' ? (
                          <View style={estilos.mcContainer}>
                            <View style={estilos.mcCircles}>
                              <View style={[estilos.mcCircle, { backgroundColor: '#EB001B' }]} />
                              <View
                                style={[
                                  estilos.mcCircle,
                                  { backgroundColor: '#F79E1B', marginLeft: -10, opacity: 0.92 },
                                ]}
                              />
                            </View>
                            <Text style={estilos.mcText}>mastercard</Text>
                          </View>
                        ) : marca === 'Amex' ? (
                          <View style={estilos.amexBadge}>
                            <Text style={estilos.amexText}>AMEX</Text>
                          </View>
                        ) : (
                          <Text style={estilos.visaLogoText}>VISA</Text>
                        )}
                      </View>
                    </View>
                  </LinearGradient>
                </View>

                {/* Botón Mágico: Rellenar con tarjeta de demo */}
                <TouchableOpacity
                  style={estilos.magicFillBtn}
                  onPress={rellenarTarjetaPrueba}
                  activeOpacity={0.8}
                >
                  <Sparkles size={16} color={colors.accentDark || '#E67A15'} />
                  <Text style={estilos.magicFillText}>
                    {t('ad_request.payment_magic_btn') || 'Rellenar tarjeta de prueba (Modo Demo)'}
                  </Text>
                </TouchableOpacity>

                {/* Campos del Formulario */}
                <View style={estilos.formFields}>
                  <View style={estilos.inputGroup}>
                    <Text style={estilos.inputLabel}>
                      {t('ad_request.payment_card_number') || 'Número de tarjeta'}
                    </Text>
                    <View style={estilos.inputWrapper}>
                      <CreditCard size={18} color={colors.textMuted} style={estilos.inputIcon} />
                      <TextInput
                        {...theme.textInputProps}
                        style={estilos.textInput}
                        placeholder="1234 5678 9012 3456"
                        keyboardType="numeric"
                        maxLength={19}
                        value={numero}
                        onChangeText={(txt) => setNumero(formatearNumeroTarjeta(txt))}
                      />
                    </View>
                  </View>

                  <View style={estilos.inputGroup}>
                    <Text style={estilos.inputLabel}>
                      {t('ad_request.payment_cardholder') || 'Nombre del titular'}
                    </Text>
                    <View style={estilos.inputWrapper}>
                      <TextInput
                        {...theme.textInputProps}
                        style={estilos.textInput}
                        placeholder={
                          t('ad_request.payment_cardholder_placeholder') ||
                          'Como aparece en la tarjeta'
                        }
                        autoCapitalize="words"
                        value={titular}
                        onChangeText={setTitular}
                      />
                    </View>
                  </View>

                  <View style={estilos.inputRow}>
                    <View style={[estilos.inputGroup, { flex: 1 }]}>
                      <Text style={estilos.inputLabel}>
                        {t('ad_request.payment_expiry') || 'Expiración'}
                      </Text>
                      <View style={estilos.inputWrapper}>
                        <TextInput
                          {...theme.textInputProps}
                          style={estilos.textInput}
                          placeholder="MM/AA"
                          keyboardType="numeric"
                          maxLength={5}
                          value={expiracion}
                          onChangeText={(txt) => setExpiracion(formatearExpiracion(txt))}
                        />
                      </View>
                    </View>

                    <View style={[estilos.inputGroup, { flex: 1 }]}>
                      <Text style={estilos.inputLabel}>
                        {t('ad_request.payment_cvv') || 'CVV / CVC'}
                      </Text>
                      <View style={estilos.inputWrapper}>
                        <TextInput
                          {...theme.textInputProps}
                          style={estilos.textInput}
                          placeholder="123"
                          keyboardType="numeric"
                          maxLength={4}
                          secureTextEntry
                          value={cvv}
                          onChangeText={(txt) => setCvv(txt.replace(/\D/g, ''))}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={estilos.inputGroup}>
                    <Text style={estilos.inputLabel}>
                      {language === 'en'
                        ? 'Email for electronic invoice'
                        : 'Correo para envío de factura'}
                    </Text>
                    <View style={estilos.inputWrapper}>
                      <Mail size={17} color={colors.textMuted} style={estilos.inputIcon} />
                      <TextInput
                        {...theme.textInputProps}
                        style={estilos.textInput}
                        placeholder={
                          language === 'en'
                            ? 'billing@company.com'
                            : 'correo@ejemplo.com'
                        }
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={emailFactura}
                        onChangeText={setEmailFactura}
                      />
                    </View>
                  </View>
                </View>

                {/* Badge de seguridad */}
                <View style={estilos.sslBadge}>
                  <ShieldCheck size={15} color={colors.textMuted} />
                  <Text style={estilos.sslText}>
                    {t('ad_request.payment_ssl_note') ||
                      'Pago protegido con cifrado SSL de 256 bits · Simulación de entorno seguro'}
                  </Text>
                </View>

                {/* Botón de Pagar */}
                <TouchableOpacity
                  style={[estilos.payBtn, !esValido && estilos.payBtnDisabled]}
                  disabled={!esValido}
                  onPress={handlePagar}
                  activeOpacity={0.85}
                >
                  <Lock size={16} color="#FFFFFF" />
                  <Text style={estilos.payBtnText}>
                    {t('ad_request.payment_pay_btn', {
                      amount: colones(orderSummary.amount || 0),
                    }) || `Pagar ${colones(orderSummary.amount || 0)}`}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* ================================================= */}
            {/* PASO 2: PROCESANDO PAGO */}
            {/* ================================================= */}
            {paso === 'processing' && (
              <View style={estilos.processingContainer}>
                <View style={estilos.processingSpinnerCont}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
                <Text style={estilos.processingTitle}>
                  {t('ad_request.payment_processing_title') || 'Procesando transacción'}
                </Text>
                <Text style={estilos.processingSubtitle}>{mensajeProceso}</Text>
                <Text style={estilos.processingNote}>
                  {t('ad_request.payment_processing_note') || 'Por favor, no cierres esta ventana.'}
                </Text>
              </View>
            )}

            {/* ================================================= */}
            {/* PASO 3: ÉXITO Y COMPROBANTE DIGITAL */}
            {/* ================================================= */}
            {paso === 'success' && (
              <View style={estilos.successContainer}>
                <View style={estilos.successIconCircle}>
                  <CircleCheckBig size={52} color="#10B981" />
                </View>
                <Text style={estilos.successTitle}>
                  {t('ad_request.payment_success_title') || '¡Pago Aprobado!'}
                </Text>
                <Text style={estilos.successSubtitle}>
                  {t('ad_request.payment_success_subtitle') ||
                    'Tu pago fue procesado correctamente y la solicitud está lista para enviarse.'}
                </Text>

                {/* Voucher digital */}
                <View style={estilos.voucherCard}>
                  <View style={estilos.voucherHeader}>
                    <Text style={estilos.voucherHeaderTitle}>
                      {t('ad_request.payment_voucher_header') || 'COMPROBANTE DE PAGO'}
                    </Text>
                    <View style={estilos.voucherStatusBadge}>
                      <Check size={12} color="#10B981" />
                      <Text style={estilos.voucherStatusText}>
                        {t('ad_request.payment_voucher_paid') || 'PAGADO'}
                      </Text>
                    </View>
                  </View>

                  <View style={estilos.voucherRow}>
                    <Text style={estilos.voucherLabel}>
                      {t('ad_request.payment_voucher_txn') || 'ID de Transacción'}
                    </Text>
                    <Text style={[estilos.voucherValue, estilos.voucherMonospace]}>
                      {transactionId}
                    </Text>
                  </View>

                  <View style={estilos.voucherRow}>
                    <Text style={estilos.voucherLabel}>
                      {t('ad_request.payment_voucher_method') || 'Método'}
                    </Text>
                    <Text style={estilos.voucherValue}>
                      {marca} •••• {digitosLimpios.slice(-4) || '4242'}
                    </Text>
                  </View>

                  <View style={estilos.voucherRow}>
                    <Text style={estilos.voucherLabel}>
                      {t('ad_request.payment_voucher_objective') || 'Objetivo publicitario'}
                    </Text>
                    <Text style={estilos.voucherValue}>{textoObjetivo}</Text>
                  </View>

                  <View style={estilos.voucherRow}>
                    <Text style={estilos.voucherLabel}>
                      {t('ad_request.payment_voucher_date') || 'Fecha y hora'}
                    </Text>
                    <Text style={estilos.voucherValue}>
                      {fechaPago?.toLocaleDateString(language === 'en' ? 'en-US' : 'es-CR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) || (language === 'en' ? 'Today' : 'Hoy')}
                    </Text>
                  </View>

                  <View style={[estilos.voucherRow, estilos.voucherTotalRow]}>
                    <Text style={estilos.voucherTotalLabel}>
                      {t('ad_request.payment_voucher_total') || 'Monto total cancelado'}
                    </Text>
                    <Text style={estilos.voucherTotalValue}>
                      {colones(orderSummary.amount || 0)}
                    </Text>
                  </View>
                </View>

                {/* Estado de envío de factura por correo y vista previa ejecutiva */}
                <View style={estilos.invoiceActionsBox}>
                  {Boolean(emailFactura.trim()) && (
                    <View style={estilos.invoiceEmailStatusRow}>
                      <Mail size={15} color={colors.primary} />
                      <Text style={estilos.invoiceEmailStatusText} numberOfLines={2}>
                        {estadoCorreo === 'sending'
                          ? language === 'en'
                            ? `Sending electronic invoice to ${emailFactura.trim()}...`
                            : `Enviando factura electrónica a ${emailFactura.trim()}...`
                          : estadoCorreo === 'sent'
                            ? language === 'en'
                              ? `Electronic invoice sent to ${emailFactura.trim()}`
                              : `Factura electrónica enviada a ${emailFactura.trim()}`
                            : language === 'en'
                              ? `Electronic invoice generated for ${emailFactura.trim()}`
                              : `Factura electrónica generada para ${emailFactura.trim()}`}
                      </Text>
                    </View>
                  )}

                  {Platform.OS === 'web' && (
                    <TouchableOpacity
                      style={estilos.viewInvoiceBtn}
                      onPress={() =>
                        abrirFacturaImprimible(
                          construirDatosFactura(
                            transactionId,
                            invoiceNumber || `FAC-${transactionId.replace(/^TXN-/, '')}`,
                            fechaPago
                          )
                        )
                      }
                      activeOpacity={0.8}
                    >
                      <FileText size={16} color={colors.primary} />
                      <Text style={estilos.viewInvoiceBtnText}>
                        {language === 'en'
                          ? 'View / Download Official Invoice (PDF)'
                          : 'Ver / Descargar Factura Ejecutiva (PDF)'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Botón para completar solicitud */}
                <TouchableOpacity
                  style={estilos.finishBtn}
                  onPress={handleFinalizar}
                  activeOpacity={0.85}
                >
                  <Text style={estilos.finishBtnText}>
                    {t('ad_request.payment_finish_btn') || 'Continuar y Enviar Solicitud'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export const getSimulatedPaymentModalTheme = createThemeStyles((theme) => {
  const { colors, input } = theme;
  const estilos = StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
    },
    sheet: {
      width: '100%',
      maxWidth: 480,
      backgroundColor: colors.surface || colors.background || '#FFFFFF',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      maxHeight: '92%',
      paddingBottom: Platform.OS === 'ios' ? 34 : 20,
      ...Platform.select({
        web: {
          boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.35)',
        },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
          elevation: 12,
        },
      }),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceMuted || '#E2E8F0',
    },
    headerTituloCont: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    lockIconBadge: {
      width: 26,
      height: 26,
      borderRadius: radii.round || 999,
      backgroundColor: colors.primarySoft || '#EAF7FA',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitulo: {
      fontFamily: fonts.semiBold,
      fontSize: 16,
      color: colors.text,
    },
    closeBtn: {
      padding: spacing.xs,
    },
    scrollContent: {
      padding: spacing.lg,
    },

    // Resumen
    orderSummaryBox: {
      backgroundColor: colors.surfaceMuted || '#F1F5F9',
      borderRadius: radii.card || 16,
      padding: spacing.md,
      marginBottom: spacing.md,
      gap: 6,
    },
    orderSummaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    orderSummaryLabel: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.textMuted,
    },
    orderSummaryValue: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: colors.text,
      maxWidth: '65%',
      textAlign: 'right',
    },
    orderSummaryTotalRow: {
      marginTop: spacing.xs,
      paddingTop: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.border || '#CBD5E1',
    },
    orderSummaryTotalLabel: {
      fontFamily: fonts.bold,
      fontSize: 14,
      color: colors.text,
    },
    orderSummaryTotalValue: {
      fontFamily: fonts.bold,
      fontSize: 17,
      color: colors.primary,
    },

    // Tarjeta visual plástica realista (Estilo Tarjeta Virtual LAFISE / Hobbier)
    creditCardOuterGlow: {
      width: '100%',
      maxWidth: 350,
      alignSelf: 'center',
      borderRadius: 18,
      marginBottom: spacing.md,
      borderTopWidth: 2,
      borderLeftWidth: 2,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: '#00D4FF',
      borderLeftColor: '#00D4FF',
      borderRightColor: '#4F46E5',
      borderBottomColor: '#5B21B6',
      shadowColor: '#020617',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.38,
      shadowRadius: 16,
      elevation: 8,
      overflow: 'hidden',
    },
    creditCardVisual: {
      minHeight: 210,
      paddingHorizontal: 22,
      paddingVertical: 18,
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden',
    },
    cardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    bankBrandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    bankEmblemBox: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bankSubText: {
      fontFamily: fonts.regular,
      fontSize: 10,
      color: 'rgba(255,255,255,0.75)',
      lineHeight: 11,
      letterSpacing: 0.3,
    },
    bankMainText: {
      fontFamily: fonts.bold,
      fontSize: 14,
      color: '#FFFFFF',
      letterSpacing: 1.2,
      lineHeight: 16,
    },
    virtualRightGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    virtualTagText: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: 'rgba(255,255,255,0.88)',
      letterSpacing: 0.5,
    },
    cardMiddleSection: {
      marginVertical: 6,
    },
    chipAndLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 6,
    },
    cardChip: {
      width: 34,
      height: 24,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: '#B45309',
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    chipLineH: {
      position: 'absolute',
      width: '100%',
      height: 1,
      backgroundColor: 'rgba(120, 53, 15, 0.45)',
    },
    chipLineV: {
      position: 'absolute',
      width: 1,
      height: '100%',
      backgroundColor: 'rgba(120, 53, 15, 0.45)',
    },
    chipCenterBox: {
      width: 12,
      height: 10,
      borderRadius: 2,
      borderWidth: 1,
      borderColor: 'rgba(120, 53, 15, 0.5)',
      backgroundColor: 'rgba(254, 243, 199, 0.35)',
    },
    cardNumberLabel: {
      fontFamily: fonts.regular,
      fontSize: 11,
      color: 'rgba(255,255,255,0.75)',
      letterSpacing: 0.4,
    },
    cardNumberText: {
      fontFamily: fonts.bold,
      fontSize: 21,
      color: '#FFFFFF',
      letterSpacing: 2.8,
      textShadowColor: 'rgba(0, 0, 0, 0.55)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    cardBottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginTop: 10,
    },
    cardMetaLeft: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 16,
      flex: 1,
      paddingRight: 8,
    },
    cardMetaBlock: {
      justifyContent: 'flex-end',
    },
    cardFieldLabel: {
      fontFamily: fonts.regular,
      fontSize: 9,
      color: 'rgba(255,255,255,0.78)',
      lineHeight: 11,
      marginBottom: 2,
    },
    cardFieldValue: {
      fontFamily: fonts.bold,
      fontSize: 13,
      color: '#FFFFFF',
      letterSpacing: 0.8,
    },
    cardCvvValue: {
      fontFamily: fonts.bold,
      fontSize: 13,
      color: '#FFFFFF',
      letterSpacing: 2,
    },
    cardHolderValue: {
      fontFamily: fonts.semiBold,
      fontSize: 11,
      color: '#F8FAFC',
      letterSpacing: 0.6,
    },
    brandLogoContainer: {
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
    },
    visaLogoText: {
      fontFamily: fonts.bold,
      fontSize: 22,
      fontStyle: 'italic',
      color: '#FFFFFF',
      letterSpacing: 1,
      textShadowColor: 'rgba(0, 0, 0, 0.35)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    mcContainer: {
      alignItems: 'center',
    },
    mcCircles: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    mcCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
    },
    mcText: {
      fontFamily: fonts.bold,
      fontSize: 8,
      color: '#FFFFFF',
      marginTop: 1,
      letterSpacing: 0.4,
    },
    amexBadge: {
      backgroundColor: '#0284C7',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: '#BAE6FD',
    },
    amexText: {
      fontFamily: fonts.bold,
      fontSize: 12,
      color: '#FFFFFF',
      letterSpacing: 1,
    },

    // Botón mágico demo
    magicFillBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: colors.accentSoft ? colors.accentSoft + '30' : '#FFF7ED',
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
      borderRadius: radii.input || 12,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.accent || '#F97316',
      borderStyle: 'dashed',
    },
    magicFillText: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: colors.accentDark || '#C2410C',
    },

    // Formulario
    formFields: {
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    inputGroup: {
      gap: 4,
    },
    inputRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    inputLabel: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: colors.text,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceMuted || '#F8FAFC',
      borderWidth: 1,
      borderColor: colors.border || '#E2E8F0',
      borderRadius: radii.input || 12,
      paddingHorizontal: spacing.sm,
    },
    inputIcon: {
      marginRight: spacing.xs,
    },
    textInput: {
      flex: 1,
      height: 44,
      fontFamily: fonts.regular,
      fontSize: 14,
      color: colors.text,
    },

    // SSL Badge
    sslBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.sm,
    },
    sslText: {
      fontFamily: fonts.regular,
      fontSize: 11,
      color: colors.textMuted,
      textAlign: 'center',
      flex: 1,
    },

    // Botón pagar
    payBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: colors.primary,
      height: 50,
      borderRadius: radii.input || 14,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
      elevation: 3,
    },
    payBtnDisabled: {
      opacity: 0.5,
    },
    payBtnText: {
      fontFamily: fonts.bold,
      fontSize: 15,
      color: '#FFFFFF',
    },

    // Procesando
    processingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl * 1.5,
    },
    processingSpinnerCont: {
      width: 72,
      height: 72,
      borderRadius: radii.round || 999,
      backgroundColor: colors.primarySoft || '#EAF7FA',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    processingTitle: {
      fontFamily: fonts.bold,
      fontSize: 18,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    processingSubtitle: {
      fontFamily: fonts.medium,
      fontSize: 14,
      color: colors.primary,
      marginBottom: spacing.sm,
    },
    processingNote: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.textMuted,
    },

    // Éxito y voucher
    successContainer: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    successIconCircle: {
      width: 68,
      height: 68,
      borderRadius: radii.round || 999,
      backgroundColor: '#DCFCE7',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    successTitle: {
      fontFamily: fonts.bold,
      fontSize: 20,
      color: colors.text,
      marginBottom: 4,
    },
    successSubtitle: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: spacing.md,
      paddingHorizontal: spacing.md,
    },
    voucherCard: {
      width: '100%',
      backgroundColor: colors.surfaceMuted || '#F8FAFC',
      borderRadius: radii.card || 16,
      borderWidth: 1,
      borderColor: colors.border || '#E2E8F0',
      padding: spacing.md,
      gap: 10,
      marginBottom: spacing.lg,
    },
    voucherHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: colors.border || '#E2E8F0',
    },
    voucherHeaderTitle: {
      fontFamily: fonts.semiBold,
      fontSize: 12,
      color: colors.textMuted,
      letterSpacing: 1,
    },
    voucherStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#DCFCE7',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radii.round || 999,
    },
    voucherStatusText: {
      fontFamily: fonts.bold,
      fontSize: 11,
      color: '#166534',
    },
    voucherRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    voucherLabel: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.textMuted,
    },
    voucherValue: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: colors.text,
    },
    voucherMonospace: {
      fontFamily: fonts.bold,
      letterSpacing: 0.8,
      color: colors.primary,
    },
    voucherTotalRow: {
      marginTop: 4,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border || '#E2E8F0',
    },
    voucherTotalLabel: {
      fontFamily: fonts.bold,
      fontSize: 14,
      color: colors.text,
    },
    voucherTotalValue: {
      fontFamily: fonts.bold,
      fontSize: 17,
      color: colors.primary,
    },
    finishBtn: {
      width: '100%',
      backgroundColor: colors.primary,
      height: 50,
      borderRadius: radii.input || 14,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
      elevation: 3,
    },
    finishBtnText: {
      fontFamily: fonts.bold,
      fontSize: 15,
      color: '#FFFFFF',
    },
    invoiceActionsBox: {
      width: '100%',
      gap: 10,
      marginBottom: spacing.md,
    },
    invoiceEmailStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.primarySoft || '#F0F8FA',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primary + '35',
    },
    invoiceEmailStatusText: {
      flex: 1,
      fontFamily: fonts.medium,
      fontSize: 12,
      color: colors.text,
    },
    viewInvoiceBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      width: '100%',
      height: 44,
      borderRadius: radii.input || 12,
      borderWidth: 1.5,
      borderColor: colors.primary,
      backgroundColor: 'transparent',
    },
    viewInvoiceBtnText: {
      fontFamily: fonts.bold,
      fontSize: 13,
      color: colors.primary,
    },
  });
  return { theme, colors, estilos };
});
