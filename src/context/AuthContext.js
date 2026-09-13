import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, getRedirectUrl } from '../config/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  // El enlace del correo de recuperación abre la app CON sesión iniciada. Sin esta
  // bandera el usuario entraría directo al inicio y nunca vería el formulario para
  // escribir su nueva contraseña.
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  // Obtener perfil del usuario desde Supabase PostgreSQL
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error al obtener perfil:', error.message);
        return null;
      }
      setProfile(data);
      return data;
    } catch (err) {
      console.error('Error inesperado obteniendo perfil:', err);
      return null;
    }
  };

  useEffect(() => {
    // 1. Obtener la sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // 2. Escuchar cambios de estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setPasswordRecovery(true);
        }
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Registrar un nuevo usuario
  const signUp = async ({ email, password, fullName, username, birthDate }) => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanUsername = username.trim().toLowerCase();

      // Registrar en Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            username: cleanUsername,
            birth_date: birthDate.trim(),
            role: 'USER',
          },
        },
      });

      if (error) throw error;

      // Si la confirmación por correo está desactivada o si retornó usuario
      if (data?.user) {
        await fetchProfile(data.user.id);
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Iniciar sesión
  const signIn = async ({ email, password }) => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) throw error;
      if (data?.user) {
        await fetchProfile(data.user.id);
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // ¿Está tomado ese nombre de usuario? La columna es UNIQUE y el trigger
  // handle_new_user falla al insertarlo repetido, así que conviene avisar antes de
  // crear la cuenta. Ante un fallo de red devuelve false: que decida el servidor,
  // en lugar de bloquear un registro que quizá sí era válido.
  const isUsernameTaken = async (username) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.trim().toLowerCase())
        .maybeSingle();

      if (error) throw error;
      return Boolean(data);
    } catch (error) {
      console.warn('No se pudo comprobar el nombre de usuario:', error.message);
      return false;
    }
  };

  // Enviar el correo con el enlace para restablecer la contraseña.
  // No se distingue entre correo registrado y no registrado: Supabase responde igual
  // en ambos casos a propósito, para no revelar qué cuentas existen.
  const resetPassword = async ({ email }) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: getRedirectUrl(),
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  // Guardar la contraseña nueva. Requiere la sesión temporal que crea el enlace
  // del correo, por eso solo tiene sentido llamarla con passwordRecovery en true.
  const updatePassword = async (newPassword) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordRecovery(false);
      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Cerrar sesión
  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      setProfile(null);
      setPasswordRecovery(false);
    } catch (error) {
      console.error('Error al cerrar sesión:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Refrescar el perfil manualmente
  const refreshProfile = async () => {
    if (user?.id) {
      return await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        passwordRecovery,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
        isUsernameTaken,
        refreshProfile,
        isAdmin: profile?.role === 'ADMIN',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
