import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase tomada de variables de entorno o valores predeterminados
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'tu-anon-key-de-supabase';

const isWeb = Platform.OS === 'web';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // En web debe estar activo: el enlace de recuperación de contraseña vuelve a la
    // app con el token en la URL, y sin esto el cliente nunca lo lee y el evento
    // PASSWORD_RECOVERY jamás se dispara.
    detectSessionInUrl: isWeb,
  },
});

/**
 * URL pública a la que Supabase debe devolver al usuario tras pulsar el enlace del
 * correo de recuperación. Debe estar dada de alta en Redirect URLs del dashboard.
 */
export const getRedirectUrl = () => {
  // En web manda el ORIGEN ACTUAL, no la variable de entorno. El correo de
  // recuperación debe devolverte al mismo sitio desde el que lo pediste: si lo
  // pides desde localhost y se fija el dominio de producción, acabas en el build
  // desplegado en vez de en el que estás desarrollando, y el flujo parece roto.
  // Ambos orígenes tienen que estar dados de alta en Redirect URLs del dashboard.
  if (isWeb && typeof window !== 'undefined') return window.location.origin;

  // En nativo no hay origen que consultar, así que se usa la URL pública.
  const fromEnv = process.env.EXPO_PUBLIC_APP_URL;
  return fromEnv ? fromEnv.replace(/\/+$/, '') : undefined;
};

export const isSupabaseConfigured = () => {
  return (
    SUPABASE_URL !== 'https://tu-proyecto.supabase.co' &&
    SUPABASE_ANON_KEY !== 'tu-anon-key-de-supabase'
  );
};
