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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useNotify } from '../../context/NotificationContext';
import {
  validateNewPassword,
  validatePasswordConfirmation,
  describeAuthError,
} from './validation';

// react-native-web no tiene driver nativo; pedirlo deja la animación a medio camino.
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

// Se muestra cuando el usuario llega desde el enlace del correo de recuperación.
// En ese momento ya tiene sesión iniciada, así que basta con guardar la contraseña
// nueva; no se le vuelve a pedir la anterior.
export const ResetPasswordScreen = () => {
  const { theme, styles } = useThemeValues(getResetPasswordScreenTheme);

  const { updatePassword, signOut, loading } = useAuth();
  const { notify } = useNotify();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Al escribir se borra el error de ESE campo, y también el de la confirmación:
  // cambiar la contraseña de arriba invalida la comparación de abajo.
  const editField = (setter, field) => (value) => {
    setter(value);
    setFieldErrors((prev) => ({ ...prev, [field]: null, confirmPassword: null }));
  };

  // Misma entrada que el login: esta pantalla aparece de golpe al volver del correo,
  // así que conviene que se presente con el mismo gesto y no de sopetón.
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, []);

  const animatedStyle = {
    opacity: enter,
    transform: [
      { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
    ],
  };

  const handleSubmit = async () => {
    setErrorMessage('');
    setFieldErrors({});

    // Mismas reglas que en el registro: es una contraseña nueva, no una existente.
    const errors = {
      password: validateNewPassword(password),
      confirmPassword: validatePasswordConfirmation(password, confirmPassword),
    };

    if (Object.values(errors).some(Boolean)) {
      setFieldErrors(errors);
      return;
    }

    const { error } = await updatePassword(password);

    if (error) {
      setErrorMessage(describeAuthError(error));
      return;
    }

    notify('Contraseña actualizada. Ya puedes seguir usando la app.', { type: 'success', title: '¡Listo!' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Animated.View style={[styles.card, animatedStyle]}>

          {/* HEADER DENTRO DE LA TARJETA, igual que en el login.
              Mismo tratamiento de icono: cuadro verde claro con insignia de
              estrella. El icono de dentro sí cambia, para que se entienda de un
              vistazo en qué paso está el usuario. */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <View style={styles.iconBox}>
                <Ionicons name="key-outline" size={30} color={theme.color("#0C8AA6", 'primary')} />
              </View>
              <View style={styles.iconBadge}>
                <Ionicons name="star" size={12} color={theme.color("#ffffff", 'text')} />
              </View>
            </View>

            <Text style={styles.title}>Crea una Contraseña Nueva</Text>
            <Text style={styles.subtitle}>
              Escríbela dos veces para confirmar que no hay erratas.
            </Text>
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={theme.color("#A94403", 'danger')} style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Text style={[styles.label, { marginTop: 0 }]}>Nueva contraseña</Text>
          <View style={[styles.inputRow, fieldErrors.password && styles.inputRowInvalid]}>
            <Ionicons name="lock-closed-outline" size={18} color={theme.color("#8A908B", 'muted')} style={styles.inputIcon} />
            <TextInput {...theme.textInputProps}
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={theme.color("#8A908B", 'muted')}
              value={password}
              onChangeText={editField(setPassword, 'password')}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={theme.color("#8A908B", 'muted')} />
            </TouchableOpacity>
          </View>
          {fieldErrors.password ? (
            <Text style={styles.fieldError}>{fieldErrors.password}</Text>
          ) : null}

          <Text style={styles.label}>Repite la contraseña</Text>
          <View style={[styles.inputRow, fieldErrors.confirmPassword && styles.inputRowInvalid]}>
            <Ionicons name="lock-closed-outline" size={18} color={theme.color("#8A908B", 'muted')} style={styles.inputIcon} />
            <TextInput {...theme.textInputProps}
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={theme.color("#8A908B", 'muted')}
              value={confirmPassword}
              onChangeText={editField(setConfirmPassword, 'confirmPassword')}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
          </View>
          {fieldErrors.confirmPassword ? (
            <Text style={styles.fieldError}>{fieldErrors.confirmPassword}</Text>
          ) : null}

          <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={theme.color("#121B22", 'text')} />
            ) : (
              <Text style={styles.primaryButtonText}>Guardar contraseña  →</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.toggleButton} onPress={signOut}>
            <Text style={styles.toggleButtonText}>
              Mejor no, <Text style={styles.toggleButtonBold}>cancelar y salir</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};



// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getResetPasswordScreenTheme = createThemeStyles((theme) => {
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
    fontWeight: '800',
    color: theme.color('#121B22', 'text'),
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: theme.color('#8A908B', 'muted'),
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.color('#ffffff', 'card'),
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 34,
    borderWidth: 0,
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
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.color('#121B22', 'text'),
    marginBottom: 6,
    marginTop: 12,
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
  inputRowInvalid: {
    borderColor: theme.color('#A94403', "danger"),
  },
  fieldError: {
    color: theme.color('#A94403', 'danger'),
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
    color: theme.color('#121B22', "onAccent"),
    fontSize: 16,
    fontWeight: '700',
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
