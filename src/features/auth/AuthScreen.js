import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../config/supabase';

export const AuthScreen = () => {
  const { signIn, signUp, loading } = useAuth();
  const [isRegister, setIsRegister] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [birthDate, setBirthDate] = useState('2000-01-01');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor ingresa correo y contraseña.');
      return;
    }

    if (isRegister) {
      if (!fullName.trim() || !username.trim() || !birthDate.trim()) {
        setErrorMessage('Por favor completa todos los campos del registro.');
        return;
      }

      // Validar formato de fecha YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(birthDate)) {
        setErrorMessage('La fecha de nacimiento debe tener formato YYYY-MM-DD.');
        return;
      }

      const { data, error } = await signUp({
        email,
        password,
        fullName,
        username,
        birthDate,
      });

      if (error) {
        let msg = error.message;
        if (msg.includes('User already registered')) {
          msg = 'Este correo electrónico ya está registrado. Intenta iniciar sesión.';
        }
        setErrorMessage(msg);
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
      const { error } = await signIn({ email, password });
      if (error) {
        let msg = error.message;
        if (msg.includes('Email not confirmed')) {
          msg = 'Tu correo electrónico aún no ha sido confirmado. Revisa tu email o desactiva "Confirm email" en Supabase Auth Settings.';
        } else if (msg.includes('Invalid login credentials')) {
          msg = 'Credenciales inválidas. Verifica tu correo y contraseña, o que la confirmación por correo esté completada/desactivada en Supabase.';
        }
        setErrorMessage(msg);
      }
    }
  };

  const configured = isSupabaseConfigured();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.logoEmoji}>🌟</Text>
          <Text style={styles.title}>Hobbier</Text>
          <Text style={styles.subtitle}>
            Descubre actividades personalizadas para ti
          </Text>
        </View>

        {!configured && (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>⚠️ Supabase no configurado</Text>
            <Text style={styles.warningText}>
              Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en tu archivo .env o en src/config/supabase.js
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isRegister ? 'Crear Nueva Cuenta' : 'Iniciar Sesión'}
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {isRegister && (
            <>
              <Text style={styles.label}>Nombre Completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. María García"
                placeholderTextColor="#94a3b8"
                value={fullName}
                onChangeText={setFullName}
              />

              <Text style={styles.label}>Nombre de usuario (username)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. mariag"
                placeholderTextColor="#94a3b8"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />

              <Text style={styles.label}>Fecha de Nacimiento (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="2000-05-15"
                placeholderTextColor="#94a3b8"
                value={birthDate}
                onChangeText={setBirthDate}
              />
            </>
          )}

          <Text style={styles.label}>Correo Electrónico</Text>
          <TextInput
            style={styles.input}
            placeholder="correo@ejemplo.com"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isRegister ? 'Registrarse' : 'Iniciar Sesión'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => {
              setIsRegister(!isRegister);
              setErrorMessage('');
            }}
          >
            <Text style={styles.toggleButtonText}>
              {isRegister
                ? '¿Ya tienes una cuenta? Inicia sesión'
                : '¿No tienes cuenta? Regístrate aquí'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoEmoji: {
    fontSize: 54,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    marginTop: 6,
    textAlign: 'center',
  },
  warningBox: {
    backgroundColor: '#451a03',
    borderColor: '#b45309',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  warningTitle: {
    color: '#fde047',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  warningText: {
    color: '#fef08a',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#450a0a',
    borderColor: '#991b1b',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#f8fafc',
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  toggleButton: {
    marginTop: 18,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#818cf8',
    fontSize: 14,
    fontWeight: '500',
  },
});
