import { useThemeValues } from '../../context/ThemeContext';
import { createThemeStyles } from '../../theme/themeRuntime';
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Text, TextInput } from '../../components/scaledText';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useNotify } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { isSupabaseConfigured } from '../../config/supabase';
import { LegalDocumentModal } from '../../legal/LegalDocumentModal';
import {
  validateEmail,
  validateNewPassword,
  validateLoginPassword,
  validateFullName,
  validateUsername,
  validatePasswordConfirmation,
  validateBirthDate,
  describeAuthError,
  MIN_AGE,
} from './validation';
import { CalendarDateField } from '../../components/CalendarDateField';

// El calendario de nacimiento abre unos 20 años atrás: empezar en el mes
// actual obligaría a casi todo el mundo a ir a la lista de años.
const BIRTH_CALENDAR_START = new Date(new Date().getFullYear() - 20, 0, 1);

// Fecha más reciente elegible: hoy hace MIN_AGE años. Las posteriores salen
// deshabilitadas en el calendario, así que un menor no puede ni elegirlas.
const latestAllowedBirthDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - MIN_AGE);
  return d;
};

// react-native-web no tiene driver nativo; pedirlo deja la animación a medio camino.
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export const AuthScreen = () => {
  const { theme, styles } = useThemeValues(getAuthScreenTheme);

  const { signIn, signUp, resetPassword, isUsernameTaken, loading } = useAuth();
  const { notify } = useNotify();
  const { t } = useLanguage();
  const [isRegister, setIsRegister] = useState(false);
  // Aceptación explícita de Términos y Privacidad: casilla sin marcar por
  // defecto, como exige el consentimiento informado (GDPR / Ley 8968).
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  // Documento legal abierto: 'privacy' | 'terms' | null
  const [legalDoc, setLegalDoc] = useState(null);
  const [isForgot, setIsForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Se escribe dos veces: una errata en una contraseña oculta deja al usuario
  // fuera de su propia cuenta recién creada, sin forma de saber qué escribió.
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  // Disponibilidad del usuario mientras se escribe:
  // 'idle' | 'checking' | 'available' | 'taken'
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const [birthDate, setBirthDate] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [sendingReset, setSendingReset] = useState(false);
  // Indicador del envío del formulario (login o registro), local a esta pantalla.
  // El `loading` del contexto remonta toda la app; este solo cambia el botón y así
  // un intento fallido NO borra los mensajes de error ni lo que escribió el usuario.
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Al escribir se borra el error de ESE campo. Mantenerlo mientras el usuario
  // corrige es lo que hace que un formulario se sienta hostil.
  const editField = (setter, field) => (value) => {
    setter(value);
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: null } : prev));
  };

  // Entra desvaneciéndose y subiendo, justo cuando el splash termina de irse hacia
  // arriba: los dos gestos se encadenan y el salto entre pantallas desaparece.
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, []);

  // Cambiar de modo no reemplaza el contenido de golpe: se desvanece, se cambia el
  // estado con el formulario ya invisible (que es cuando la tarjeta cambia de alto
  // sin que se note) y se vuelve a mostrar.
  const switchMode = (apply) => {
    Animated.timing(enter, {
      toValue: 0,
      duration: 130,
      easing: Easing.in(Easing.quad),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start(() => {
      apply();
      setErrorMessage('');
      setInfoMessage('');
      Animated.timing(enter, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
    });
  };

  // Comprobación del usuario mientras se escribe.
  //
  // Espera a que el usuario deje de teclear (400 ms) en vez de consultar en cada
  // letra, y solo pregunta a la base si el formato ya es válido: de nada sirve
  // preguntar por "ab" si de todos modos lo rechazan las reglas locales.
  //
  // Cada consulta lleva número de orden: si una lenta contesta después de otra
  // más reciente, se descarta en lugar de pintar un resultado que ya no es el
  // del texto que hay en pantalla.
  const comprobacionRef = useRef(0);
  // `isUsernameTaken` llega del contexto y se vuelve a crear en cada render suyo.
  // Si fuera dependencia del efecto, este se reiniciaría constantemente.
  const isUsernameTakenRef = useRef(isUsernameTaken);
  isUsernameTakenRef.current = isUsernameTaken;

  useEffect(() => {
    if (!isRegister || isForgot) return undefined;

    const nombre = username.trim();
    if (!nombre || validateUsername(nombre)) {
      comprobacionRef.current += 1; // invalida cualquier respuesta en vuelo
      setUsernameStatus('idle');
      return undefined;
    }

    setUsernameStatus('checking');
    const temporizador = setTimeout(async () => {
      const comprobacion = ++comprobacionRef.current;
      const taken = await isUsernameTakenRef.current(nombre);
      if (comprobacion !== comprobacionRef.current) return;
      setUsernameStatus(taken ? 'taken' : 'available');
    }, 400);

    return () => clearTimeout(temporizador);
  }, [username, isRegister, isForgot]);

  // Live password confirmation validation
  useEffect(() => {
    if (!isRegister || isForgot) return;

    if (passwordConfirm.length > 0) {
      const error = validatePasswordConfirmation(password, passwordConfirm);
      if (error) {
        setFieldErrors((prev) => ({ ...prev, passwordConfirm: error }));
      } else {
        setFieldErrors((prev) => {
          if (!prev.passwordConfirm) return prev;
          const { passwordConfirm: _, ...rest } = prev;
          return rest;
        });
      }
    } else {
      setFieldErrors((prev) => {
        if (!prev.passwordConfirm) return prev;
        const { passwordConfirm: _, ...rest } = prev;
        return rest;
      });
    }
  }, [password, passwordConfirm, isRegister, isForgot]);

  const animatedStyle = {
    opacity: enter,
    transform: [
      { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
    ],
  };

  // Enviar el correo con el enlace de recuperación. El mensaje de confirmación es
  // deliberadamente ambiguo: decir "ese correo no existe" revelaría qué cuentas
  // hay registradas a cualquiera que pruebe direcciones.
  const handleForgotPassword = async () => {
    setErrorMessage('');
    setInfoMessage('');
    setFieldErrors({});

    const emailError = validateEmail(email);
    if (emailError) {
      setFieldErrors({ email: emailError });
      return;
    }

    setSendingReset(true);
    const { error } = await resetPassword({ email });
    setSendingReset(false);

    if (error) {
      setErrorMessage(describeAuthError(error));
      return;
    }

    setInfoMessage(
      `Si ${email.trim().toLowerCase()} tiene una cuenta, te enviamos un enlace para crear una contraseña nueva. Revisa tu bandeja y la carpeta de spam.`,
    );
  };

  const handleSubmit = async () => {
    setErrorMessage('');
    setInfoMessage('');
    setFieldErrors({});

    if (isRegister) {
      // Se recogen TODOS los errores antes de cortar, para que el usuario los vea
      // de una vez y no descubra uno nuevo en cada intento.
      const birth = validateBirthDate(birthDate);
      const errors = {
        fullName: validateFullName(fullName),
        username: validateUsername(username),
        email: validateEmail(email),
        password: validateNewPassword(password),
        passwordConfirm: validatePasswordConfirmation(password, passwordConfirm),
        birthDate: birth.error,
        legal: acceptedLegal ? null : t('legal.accept_required'),
      };

      if (Object.values(errors).some(Boolean)) {
        setFieldErrors(errors);
        return;
      }

      // El usuario es UNIQUE en profiles y el trigger handle_new_user revienta al
      // insertarlo repetido. Se comprueba antes para dar un mensaje claro en el
      // campo, en vez de un error de Postgres al final de todo el registro.
      // Se vuelve a comprobar aquí aunque la pantalla ya lo diga: entre que se
      // comprobó y se pulsa Crear cuenta, alguien puede haber tomado ese nombre.
      const taken = usernameStatus === 'taken' || (await isUsernameTaken(username));
      if (taken) {
        setUsernameStatus('taken');
        setFieldErrors({ username: 'Ese nombre de usuario ya está en uso.' });
        return;
      }

      const { data, error } = await signUp({
        email,
        password,
        fullName,
        username,
        birthDate: birth.isoDate,
      });

      if (error) {
        // Si el trigger handle_new_user falla, Supabase solo dice "Database error
        // saving new user", sin la causa. Lo más probable es que alguien haya
        // tomado el nombre en el último instante: se comprueba para poder
        // señalar el campo en vez de mostrar un error genérico.
        if (/Database error saving new user/i.test(error.message || '') && (await isUsernameTaken(username))) {
          setUsernameStatus('taken');
          setFieldErrors({ username: 'Ese nombre de usuario ya está en uso.' });
        } else {
          setErrorMessage(describeAuthError(error));
        }
      } else {
        if (!data?.session) {
          const msg = '¡Registro recibido! Si en Supabase tienes activada la confirmación por correo, revisa tu bandeja de entrada o desactiva "Confirm email" en tu dashboard de Supabase (Authentication -> Providers -> Email).';
          setErrorMessage(msg);
          notify(msg, { type: 'info', title: 'Registro en proceso', duration: 6000 });
        } else {
          notify('Cuenta creada correctamente.', { type: 'success', title: '¡Éxito!' });
        }
      }
    } else {
      // En el inicio de sesión NO se valida el formato de la contraseña, solo que
      // no esté vacía: una cuenta creada antes de estas reglas tiene una más corta
      // y sigue siendo la correcta; exigirle el formato nuevo le impediría entrar.
      const errors = {
        email: validateEmail(email),
        password: validateLoginPassword(password),
      };

      if (Object.values(errors).some(Boolean)) {
        setFieldErrors(errors);
        return;
      }

      const { error } = await signIn({ email, password });
      if (error) {
        setErrorMessage(describeAuthError(error));
      }
    }
  };

  // Envolvente del envío en modos LOGIN y REGISTRO: activa el indicador local
  // alrededor del intento y SIEMPRE lo apaga al terminar, haya fallado o no.
  const runSubmit = async () => {
    setSubmitting(true);
    try {
      await handleSubmit();
    } finally {
      setSubmitting(false);
    }
  };

  const configured = isSupabaseConfigured();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">

        {/* REGISTRO: encabezado FUERA de la tarjeta, con destello en vez de logo */}
        {isRegister && (
          <Animated.View style={[styles.registerHeader, animatedStyle]}>
            <View style={styles.registerTitleRow}>
              <Text style={styles.registerTitle}>Únete a Hobbier</Text>
              <Ionicons
                name="sparkles"
                size={24}
                color={theme.color("#FF8F21", 'accent')}
                style={styles.registerSparkle}
              />
            </View>
            <Text style={styles.subtitle}>Descubre, crea y comparte tus aficiones.</Text>
          </Animated.View>
        )}

        {!configured && (
          <View style={styles.warningBox}>
            <View style={styles.warningRow}>
              <Ionicons name="warning" size={16} color={theme.color("#E67A15", 'accent')} style={{marginRight: 6}} />
              <Text style={styles.warningTitle}>Supabase no configurado</Text>
            </View>
            <Text style={styles.warningText}>
              Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en tu archivo .env o en src/config/supabase.js
            </Text>
          </View>
        )}

        {/* CARD DE FORMULARIO */}
        <Animated.View style={[styles.card, animatedStyle]}>

          {/* LOGIN Y RECUPERACIÓN: header con logo, DENTRO de la tarjeta.
              El registro no lo usa: lleva el suyo propio por fuera. */}
          {!isRegister && (
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <View style={styles.iconBox}>
                  <MaterialCommunityIcons name="palette" size={30} color={theme.color("#0C8AA6", 'primary')} />
                </View>
                <View style={styles.iconBadge}>
                  <Ionicons name="star" size={12} color={theme.color("#ffffff", 'text')} />
                </View>
              </View>

              <Text style={styles.title}>
                {isForgot ? 'Recupera tu acceso' : '¡Qué bueno verte!'}
              </Text>
              <Text style={styles.subtitle}>
                {isForgot
                  ? 'Te enviamos un enlace para crear una contraseña nueva'
                  : 'Ingresa a tu espacio creativo'}
              </Text>
            </View>
          )}

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={theme.color("#A94403", 'danger')} style={{marginRight: 6}} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {infoMessage ? (
            <View style={styles.infoBox}>
              <Ionicons name="mail-open-outline" size={16} color={theme.color("#0C8AA6", 'primary')} style={{marginRight: 6}} />
              <Text style={styles.infoText}>{infoMessage}</Text>
            </View>
          ) : null}

          {isRegister && !isForgot && (
            <>
              <Text style={[styles.label, { marginTop: 0 }]}>Name</Text>
              <View style={[styles.inputRow, fieldErrors.fullName && styles.inputRowInvalid]}>
                <Ionicons name="person-outline" size={18} color={theme.color("#8A908B", 'muted')} style={styles.inputIcon} />
                <TextInput {...theme.textInputProps}
                  style={styles.input}
                  placeholder="Tu nombre completo"
                  placeholderTextColor={theme.color("#8A908B", 'muted')}
                  value={fullName}
                  onChangeText={editField(setFullName, 'fullName')}
                />
              </View>
              {fieldErrors.fullName ? (
                <Text style={styles.fieldError}>{fieldErrors.fullName}</Text>
              ) : null}

              <Text style={styles.label}>Username</Text>
              <View
                style={[
                  styles.inputRow,
                  (fieldErrors.username || usernameStatus === 'taken') && styles.inputRowInvalid,
                  !fieldErrors.username && usernameStatus === 'available' && styles.inputRowValid,
                ]}
              >
                <Ionicons
                  name="at"
                  size={18}
                  color={!fieldErrors.username && usernameStatus === 'available' ? theme.color('#2A6347', 'success') : theme.color('#8A908B', 'muted')}
                  style={styles.inputIcon}
                />
                <TextInput {...theme.textInputProps}
                  style={styles.input}
                  placeholder="usuario_hobbier"
                  placeholderTextColor={theme.color("#8A908B", 'muted')}
                  value={username}
                  onChangeText={editField(setUsername, 'username')}
                  autoCapitalize="none"
                />
                {usernameStatus === 'checking' ? (
                  <ActivityIndicator size="small" color={theme.color("#8A908B", 'muted')} />
                ) : !fieldErrors.username && usernameStatus === 'available' ? (
                  <Ionicons name="checkmark-circle" size={20} color={theme.color("#2A6347", 'success')} />
                ) : null}
              </View>
              {/* El color por sí solo no basta: siempre va con icono y con texto,
                  para quien no distingue el verde del rojo. */}
              {fieldErrors.username ? (
                <Text style={styles.fieldError}>{fieldErrors.username}</Text>
              ) : usernameStatus === 'taken' ? (
                <Text style={styles.fieldError}>Ese nombre de usuario ya está en uso.</Text>
              ) : usernameStatus === 'available' ? (
                <Text style={styles.fieldOk}>¡Disponible! Este nombre es tuyo.</Text>
              ) : usernameStatus === 'checking' ? (
                <Text style={styles.fieldHint}>Comprobando disponibilidad...</Text>
              ) : null}
            </>
          )}

          <Text style={[styles.label, isRegister && !isForgot ? null : { marginTop: 0 }]}>Email</Text>
          <View style={[styles.inputRow, fieldErrors.email && styles.inputRowInvalid]}>
            <Ionicons name="mail-outline" size={18} color={theme.color("#8A908B", 'muted')} style={styles.inputIcon} />
            <TextInput {...theme.textInputProps}
              style={styles.input}
              placeholder={isRegister ? 'correo@ejemplo.com' : 'tu@email.com'}
              placeholderTextColor={theme.color("#8A908B", 'muted')}
              value={email}
              onChangeText={editField(setEmail, 'email')}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          {fieldErrors.email ? (
            <Text style={styles.fieldError}>{fieldErrors.email}</Text>
          ) : null}

          {!isForgot && (
            <>
              <View style={styles.labelRow}>
                <Text style={styles.labelInRow}>{isRegister ? 'Password' : 'Contraseña'}</Text>
                {!isRegister && (
                  <TouchableOpacity onPress={() => switchMode(() => setIsForgot(true))}>
                    <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={[styles.inputRow, fieldErrors.password && styles.inputRowInvalid]}>
                <Ionicons name="lock-closed-outline" size={18} color={theme.color("#8A908B", 'muted')} style={styles.inputIcon} />
                <TextInput {...theme.textInputProps}
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={theme.color("#8A908B", 'muted')}
                  value={password}
                  onChangeText={editField(setPassword, 'password')}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={theme.color("#8A908B", 'muted')} />
                </TouchableOpacity>
              </View>
              {fieldErrors.password ? (
                <Text style={styles.fieldError}>{fieldErrors.password}</Text>
              ) : null}

              {isRegister && (
                <>
                  <Text style={styles.label}>Confirmar contraseña</Text>
                  <View style={[styles.inputRow, fieldErrors.passwordConfirm && styles.inputRowInvalid]}>
                    <Ionicons name="lock-closed-outline" size={18} color={theme.color("#8A908B", 'muted')} style={styles.inputIcon} />
                    <TextInput {...theme.textInputProps}
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor={theme.color("#8A908B", 'muted')}
                      value={passwordConfirm}
                      onChangeText={editField(setPasswordConfirm, 'passwordConfirm')}
                      // Comparte el ojo con la contraseña: si una se ve, la otra
                      // también, que es justo lo que se necesita para compararlas.
                      secureTextEntry={!showPassword}
                    />
                  </View>
                  {fieldErrors.passwordConfirm ? (
                    <Text style={styles.fieldError}>{fieldErrors.passwordConfirm}</Text>
                  ) : null}
                </>
              )}
            </>
          )}

          {/* La fecha va al final en el registro, según el diseño */}
          {isRegister && !isForgot && (
            <>
              <Text style={styles.label}>Date of Birth</Text>
              <CalendarDateField
                value={birthDate}
                onChange={editField(setBirthDate, 'birthDate')}
                invalid={!!fieldErrors.birthDate}
                maxDate={latestAllowedBirthDate()}
                initialDate={BIRTH_CALENDAR_START}
              />
              {fieldErrors.birthDate ? (
                <Text style={styles.fieldError}>{fieldErrors.birthDate}</Text>
              ) : (
                <Text style={styles.fieldHint}>Debes tener al menos {MIN_AGE} años para registrarte.</Text>
              )}

              {/* Aceptación de Términos y Privacidad (pilar legal) */}
              <View style={styles.legalRow}>
                <TouchableOpacity
                  onPress={() => {
                    setAcceptedLegal((v) => !v);
                    setFieldErrors((prev) => (prev.legal ? { ...prev, legal: null } : prev));
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: acceptedLegal }}
                  style={[
                    styles.checkbox,
                    acceptedLegal && styles.checkboxChecked,
                    fieldErrors.legal && styles.checkboxInvalid,
                  ]}
                >
                  {acceptedLegal && <Ionicons name="checkmark" size={14} color={theme.color("#FFFFFF", 'text')} />}
                </TouchableOpacity>
                <Text style={styles.legalText}>
                  {t('legal.accept_prefix')}
                  <Text style={styles.legalLink} onPress={() => setLegalDoc('terms')}>
                    {t('legal.terms_of_use')}
                  </Text>
                  {t('legal.accept_and')}
                  <Text style={styles.legalLink} onPress={() => setLegalDoc('privacy')}>
                    {t('legal.privacy_policy')}
                  </Text>
                  .
                </Text>
              </View>
              {fieldErrors.legal ? (
                <Text style={styles.fieldError}>{fieldErrors.legal}</Text>
              ) : null}
            </>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, isRegister && !isForgot && styles.registerButton]}
            onPress={isForgot ? handleForgotPassword : runSubmit}
            disabled={loading || sendingReset || submitting}
          >
            {loading || sendingReset || submitting ? (
              <ActivityIndicator color={theme.color("#FFFFFF", 'text')} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isForgot ? 'Enviar enlace  →' : isRegister ? 'Crear cuenta  →' : 'Iniciar sesión  →'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() =>
              switchMode(() => {
                // Al cambiar de modo, lo propio del registro se limpia: si no, al
                // volver aparecería un "¡Disponible!" de un nombre ya olvidado.
                setPasswordConfirm('');
                setAcceptedLegal(false);
                setUsernameStatus('idle');
                setFieldErrors({});
                if (isForgot) {
                  setIsForgot(false);
                } else {
                  setIsRegister(!isRegister);
                }
              })
            }
          >
            <Text style={styles.toggleButtonText}>
              {isForgot
                ? '¿Ya la recordaste? '
                : isRegister
                  ? '¿Ya tienes cuenta? '
                  : '¿No tienes una cuenta? '}
              <Text style={styles.toggleButtonBold}>
                {isForgot ? 'Volver a iniciar sesión' : isRegister ? 'Inicia sesión' : 'Crear una cuenta'}
              </Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Enlaces legales siempre visibles, también en el inicio de sesión */}
        <View style={styles.legalFooter}>
          <Text style={styles.legalFooterLink} onPress={() => setLegalDoc('privacy')}>
            {t('legal.privacy_policy')}
          </Text>
          <Text style={styles.legalFooterDot}>·</Text>
          <Text style={styles.legalFooterLink} onPress={() => setLegalDoc('terms')}>
            {t('legal.terms_of_use')}
          </Text>
        </View>
      </ScrollView>

      <LegalDocumentModal doc={legalDoc} onClose={() => setLegalDoc(null)} />
    </SafeAreaView>
  );
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getAuthScreenTheme = createThemeStyles((theme) => {
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color('#F0F3F5', 'background'),
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  // Encabezado propio del registro: vive FUERA de la tarjeta, sobre el fondo beige
  registerHeader: {
    alignItems: 'center',
    marginBottom: 22,
  },
  registerTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  registerTitle: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    color: theme.color('#0C8AA6', 'primary'),
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  registerSparkle: {
    marginLeft: 2,
    marginTop: -10,
  },
  registerButton: {
    backgroundColor: theme.color('#0C8AA6', 'primary'),
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 18,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: theme.color('#F0F8FA', 'card'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.color('#FF8F21', 'accent'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    color: theme.color('#121B22', 'text'),
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: theme.color('#8A908B', 'muted'),
    marginTop: 6,
    textAlign: 'center',
  },
  warningBox: {
    backgroundColor: theme.color('#F0F3F5', 'card'),
    borderColor: theme.color('#FFAA55', 'border'),
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  warningTitle: {
    color: theme.color('#E67A15', 'accent'),
    fontWeight: 'bold',
    fontSize: 14,
  },
  warningText: {
    color: theme.color('#E67A15', 'accent'),
    fontSize: 12,
  },
  card: {
    backgroundColor: theme.color('#FFFFFF', 'card'),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.color('#F0F3F5', 'border'),
    paddingHorizontal: 24,
    paddingVertical: 34,
  },
  errorBox: {
    backgroundColor: theme.color('#F0F3F5', 'card'),
    borderColor: theme.color('#F1C2B8', "danger"),
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  errorText: {
    color: theme.color('#A94403', 'danger'),
    fontSize: 13,
    flex: 1,
  },
  infoBox: {
    backgroundColor: theme.color('#F0F8FA', 'card'),
    borderColor: theme.color('#F0F3F5', 'border'),
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    color: theme.color('#0C8AA6', 'primary'),
    fontSize: 13,
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.color('#121B22', 'text'),
    marginBottom: 6,
    marginTop: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  labelInRow: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.color('#121B22', 'text'),
  },
  forgotText: {
    fontSize: 12,
    color: theme.color('#0C8AA6', 'primary'),
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color('#F0F3F5', 'secondary'),
    borderWidth: 1,
    borderColor: theme.color('#F0F3F5', 'border'),
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  // Marco rojo cuando el campo falla: el color por sí solo no es accesible, por eso
  // siempre va acompañado del texto explicando qué pasa.
  inputRowInvalid: {
    borderColor: theme.color('#A94403', "danger"),
  },
  fieldError: {
    color: theme.color('#A94403', 'danger'),
    fontSize: 12,
    marginTop: 5,
  },
  // Marco verde cuando el nombre de usuario está libre. Igual que el rojo, nunca
  // va solo: lo acompañan el tilde dentro del campo y el texto de abajo.
  inputRowValid: {
    borderColor: theme.color('#2A6347', 'border'),
  },
  fieldOk: {
    color: theme.color('#2A6347', 'success'),
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  fieldHint: {
    color: theme.color('#8A908B', 'muted'),
    fontSize: 12,
    marginTop: 5,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: theme.color('#121B22', 'text'),
  },
  eyeBtn: {
    padding: 4,
  },
  primaryButton: {
    backgroundColor: theme.color('#0C8AA6', 'primary'),
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryButtonText: {
    color: theme.color('#FFFFFF', "onAccent"),
    fontSize: 16,
    fontWeight: '700',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 18,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.color('#8A908B', 'border'),
    backgroundColor: theme.color('#FFFFFF', 'card'),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: theme.color('#0C8AA6', 'primary'),
    borderColor: theme.color('#0C8AA6', "primary"),
  },
  checkboxInvalid: {
    borderColor: theme.color('#A94403', "danger"),
  },
  legalText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: theme.color('#4A5568', 'muted'),
  },
  legalLink: {
    color: theme.color('#0C8AA6', 'primary'),
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  legalFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    gap: 8,
  },
  legalFooterLink: {
    fontSize: 12,
    color: theme.color('#8A908B', 'muted'),
    textDecorationLine: 'underline',
  },
  legalFooterDot: {
    fontSize: 12,
    color: theme.color('#8A908B', 'muted'),
  },
  toggleButton: {
    marginTop: 18,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: theme.color('#8A908B', 'muted'),
    fontSize: 14,
    fontWeight: '500',
  },
  toggleButtonBold: {
    color: theme.color('#0C8AA6', 'primary'),
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
  return { theme, styles };
});
