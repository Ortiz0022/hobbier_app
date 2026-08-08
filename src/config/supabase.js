import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase tomada de variables de entorno o valores predeterminados
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'tu-anon-key-de-supabase';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const isSupabaseConfigured = () => {
  return (
    SUPABASE_URL !== 'https://tu-proyecto.supabase.co' &&
    SUPABASE_ANON_KEY !== 'tu-anon-key-de-supabase'
  );
};
