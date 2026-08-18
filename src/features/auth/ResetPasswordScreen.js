import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Text, TextInput } from '../../components/scaledText';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
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
  const { updatePassword, signOut, loading } = useAuth();

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

    const msg = 'Contraseña actualizada. Ya puedes seguir usando la app.';
    if (Platform.OS === 'web') alert(msg);
    else Alert.alert('¡Listo!', msg);
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
                <Ionicons name="key-outline" size={30} color="#0C8AA6" />
              </View>
              <View style={styles.iconBadge}>
                <Ionicons name="star" size={12} color="#ffffff" />
              </View>
            </View>

            <Text style={styles.title}>Crea una contraseña nueva</Text>
            <Text style={styles.subtitle}>
              Escríbela dos veces para confirmar que no hay erratas.
            </Text>
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#A94403" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Text style={[styles.label, { marginTop: 0 }]}>Nueva contraseña</Text>
          <View style={[styles.inputRow, fieldErrors.password && styles.inputRowInvalid]}>
            <Ionicons name="lock-closed-outline" size={18} color="#8A908B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#8A908B"
              value={password}
              onChangeText={editField(setPassword, 'password')}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#8A908B" />
            </TouchableOpacity>
          </View>
          {fieldErrors.password ? (
            <Text style={styles.fieldError}>{fieldErrors.password}</Text>
          ) : null}

          <Text style={styles.label}>Repite la contraseña</Text>
          <View style={[styles.inputRow, fieldErrors.confirmPassword && styles.inputRowInvalid]}>
            <Ionicons name="lock-closed-outline" size={18} color="#8A908B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#8A908B"
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
              <ActivityIndicator color="#121B22" />
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
    fontWeight: '800',
    color: '#121B22',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#8A908B',
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 34,
    borderWidth: 0,
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
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#121B22',
    marginBottom: 6,
    marginTop: 12,
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
    color: '#121B22',
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
