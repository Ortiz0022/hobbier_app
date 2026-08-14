import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../config/supabase';
import {
  validateEmail,
  validateNewPassword,
  validateLoginPassword,
  validateFullName,
  validateUsername,
  validateBirthDate,
  describeAuthError,
} from './validation';

// react-native-web no tiene driver nativo; pedirlo deja la animación a medio camino.
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export const AuthScreen = () => {
  const { signIn, signUp, resetPassword, isUsernameTaken, loading } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [sendingReset, setSendingReset] = useState(false);
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
        birthDate: birth.error,
      };

      if (Object.values(errors).some(Boolean)) {
        setFieldErrors(errors);
        return;
      }

      // El usuario es UNIQUE en profiles y el trigger handle_new_user revienta al
      // insertarlo repetido. Se comprueba antes para dar un mensaje claro en el
      // campo, en vez de un error de Postgres al final de todo el registro.
      const taken = await isUsernameTaken(username);
      if (taken) {
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
        setErrorMessage(describeAuthError(error));
      } else {
        if (!data?.session) {
          const msg = '¡Registro recibido! Si en Supabase tienes activada la confirmación por correo, revisa tu bandeja de entrada o desactiva "Confirm email" en tu dashboard de Supabase (Authentication -> Providers -> Email).';
          setErrorMessage(msg);
          if (Platform.OS === 'web') {
            alert(msg);
          } else {
            Alert.alert('Registro en proceso', msg);
          }
        } else {
          if (Platform.OS === 'web') {
            alert('¡Registro exitoso! Ya puedes usar la aplicación.');
          } else {
            Alert.alert('¡Éxito!', 'Cuenta creada correctamente.');
          }
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
                color="#FF8F21"
                style={styles.registerSparkle}
              />
            </View>
            <Text style={styles.subtitle}>Descubre, crea y comparte tus aficiones.</Text>
          </Animated.View>
        )}

        {!configured && (
          <View style={styles.warningBox}>
            <View style={styles.warningRow}>
              <Ionicons name="warning" size={16} color="#E67A15" style={{marginRight: 6}} />
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
                  <MaterialCommunityIcons name="palette" size={30} color="#0C8AA6" />
                </View>
                <View style={styles.iconBadge}>
                  <Ionicons name="star" size={12} color="#ffffff" />
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
              <Ionicons name="alert-circle" size={16} color="#A94403" style={{marginRight: 6}} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {infoMessage ? (
            <View style={styles.infoBox}>
              <Ionicons name="mail-open-outline" size={16} color="#0C8AA6" style={{marginRight: 6}} />
              <Text style={styles.infoText}>{infoMessage}</Text>
            </View>
          ) : null}

          {isRegister && !isForgot && (
            <>
              <Text style={[styles.label, { marginTop: 0 }]}>Name</Text>
              <View style={[styles.inputRow, fieldErrors.fullName && styles.inputRowInvalid]}>
                <Ionicons name="person-outline" size={18} color="#8A908B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Tu nombre completo"
                  placeholderTextColor="#8A908B"
                  value={fullName}
                  onChangeText={editField(setFullName, 'fullName')}
                />
              </View>
              {fieldErrors.fullName ? (
                <Text style={styles.fieldError}>{fieldErrors.fullName}</Text>
              ) : null}

              <Text style={styles.label}>Username</Text>
              <View style={[styles.inputRow, fieldErrors.username && styles.inputRowInvalid]}>
                <Ionicons name="at" size={18} color="#8A908B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="usuario_hobbier"
                  placeholderTextColor="#8A908B"
                  value={username}
                  onChangeText={editField(setUsername, 'username')}
                  autoCapitalize="none"
                />
              </View>
              {fieldErrors.username ? (
                <Text style={styles.fieldError}>{fieldErrors.username}</Text>
              ) : null}
            </>
          )}

          <Text style={[styles.label, isRegister && !isForgot ? null : { marginTop: 0 }]}>Email</Text>
          <View style={[styles.inputRow, fieldErrors.email && styles.inputRowInvalid]}>
            <Ionicons name="mail-outline" size={18} color="#8A908B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={isRegister ? 'correo@ejemplo.com' : 'tu@email.com'}
              placeholderTextColor="#8A908B"
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
                <Ionicons name="lock-closed-outline" size={18} color="#8A908B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#8A908B"
                  value={password}
                  onChangeText={editField(setPassword, 'password')}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#8A908B" />
                </TouchableOpacity>
              </View>
              {fieldErrors.password ? (
                <Text style={styles.fieldError}>{fieldErrors.password}</Text>
              ) : null}
            </>
          )}

          {/* La fecha va al final en el registro, según el diseño */}
          {isRegister && !isForgot && (
            <>
              <Text style={styles.label}>Date of Birth</Text>
              <View style={[styles.inputRow, fieldErrors.birthDate && styles.inputRowInvalid]}>
                <Ionicons name="calendar-outline" size={18} color="#8A908B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="dd/mm/aaaa"
                  placeholderTextColor="#8A908B"
                  value={birthDate}
                  onChangeText={editField(setBirthDate, 'birthDate')}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              {fieldErrors.birthDate ? (
                <Text style={styles.fieldError}>{fieldErrors.birthDate}</Text>
              ) : null}
            </>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, isRegister && !isForgot && styles.registerButton]}
            onPress={isForgot ? handleForgotPassword : handleSubmit}
            disabled={loading || sendingReset}
          >
            {loading || sendingReset ? (
              <ActivityIndicator color="#FFFFFF" />
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F3F5',
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
    color: '#0C8AA6',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  registerSparkle: {
    marginLeft: 2,
    marginTop: -10,
  },
  registerButton: {
    backgroundColor: '#0C8AA6',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 18,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#F0F8FA',
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
    backgroundColor: '#FF8F21',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    color: '#121B22',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#8A908B',
    marginTop: 6,
    textAlign: 'center',
  },
  warningBox: {
    backgroundColor: '#F0F3F5',
    borderColor: '#FFAA55',
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
    color: '#E67A15',
    fontWeight: 'bold',
    fontSize: 14,
  },
  warningText: {
    color: '#E67A15',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F3F5',
    paddingHorizontal: 24,
    paddingVertical: 34,
  },
  errorBox: {
    backgroundColor: '#F0F3F5',
    borderColor: '#F1C2B8',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  errorText: {
    color: '#A94403',
    fontSize: 13,
    flex: 1,
  },
  infoBox: {
    backgroundColor: '#F0F8FA',
    borderColor: '#F0F3F5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    color: '#0C8AA6',
    fontSize: 13,
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#121B22',
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
    color: '#121B22',
  },
  forgotText: {
    fontSize: 12,
    color: '#0C8AA6',
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F3F5',
    borderWidth: 1,
    borderColor: '#F0F3F5',
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  // Marco rojo cuando el campo falla: el color por sí solo no es accesible, por eso
  // siempre va acompañado del texto explicando qué pasa.
  inputRowInvalid: {
    borderColor: '#A94403',
  },
  fieldError: {
    color: '#A94403',
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
    color: '#121B22',
  },
  eyeBtn: {
    padding: 4,
  },
  primaryButton: {
    backgroundColor: '#0C8AA6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  toggleButton: {
    marginTop: 18,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#8A908B',
    fontSize: 14,
    fontWeight: '500',
  },
  toggleButtonBold: {
    color: '#0C8AA6',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
