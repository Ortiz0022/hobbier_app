import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { supabase, getRedirectUrl } from '../config/supabase';
import { LEGAL_VERSION } from '../legal/legalContent';

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
  // { status, suspended_until } cuando la cuenta está suspendida (BANNED con
  // fecha futura). La app entera se sustituye por la pantalla de aviso.
  const [suspension, setSuspension] = useState(null);
  // El aviso tiene que SOBREVIVIR al cierre de sesión: al detectar la
  // suspensión se cierra la sesión, y sin esta bandera el propio
  // onAuthStateChange borraría el aviso antes de que el usuario lo leyera.
  const suspensionRef = useRef(null);
  // ¿Existe get_my_suspension en la base? Si no (404 / PGRST202), no tiene
  // sentido preguntar cada dos minutos: se apaga la vigilancia y la app sigue
  // funcionando con normalidad hasta que se aplique suspension_cuentas.sql.
  const [puedeConsultarSuspension, setPuedeConsultarSuspension] = useState(true);

  const aplicarSuspension = (fila) => {
    suspensionRef.current = fila;
    setSuspension(fila);
  };

  /** Lo pulsa el usuario al leer el aviso: vuelve a la pantalla de entrar. */
  const descartarSuspension = () => aplicarSuspension(null);

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

  // Comprueba si la cuenta del usuario está suspendida/sancionada de forma permanente (BANNED).
  // Usa la función get_my_suspension (SECURITY DEFINER) para no depender de las
  // políticas de lectura de profiles. Devuelve el objeto de suspensión o null.
  const checkSuspension = async (userId) => {
    try {
      const { data, error } = await supabase.rpc('get_my_suspension');
      if (error) {
        // La RPC no existe aún (404 / PGRST202)
        const isRpcMissing =
          error.code === 'PGRST202' ||
          /could not find the function/i.test(error.message || '');

        if (isRpcMissing && !puedeConsultarSuspension) {
          // Ya sabíamos que la RPC no está: no insistir.
          return null;
        }

        if (isRpcMissing) {
          console.warn(
            'La base no tiene get_my_suspension: no se comprobarán las suspensiones. Aplica supabase/suspension_cuentas.sql en el SQL Editor.'
          );
          setPuedeConsultarSuspension(false);
        }

        // Fallback directo consultando profiles sin depender de suspended_until
        if (userId) {
          try {
            // Se pide también el motivo; si la base todavía no tiene esa
            // columna, la consulta falla y se reintenta solo con el estado.
            let { data: prof } = await supabase
              .from('profiles')
              .select('status, ban_reason, banned_at')
              .eq('id', userId)
              .maybeSingle();
            if (!prof) {
              const soloEstado = await supabase
                .from('profiles')
                .select('status')
                .eq('id', userId)
                .maybeSingle();
              prof = soloEstado.data;
            }
            if (prof && prof.status === 'BANNED') {
              const row = {
                status: 'BANNED',
                suspended_until: null,
                ban_reason: prof.ban_reason || null,
                banned_at: prof.banned_at || null,
              };
              aplicarSuspension(row);
              return row;
            }
          } catch (_fallbackErr) {
            // Si tampoco se puede consultar status, simplemente no bloqueamos.
          }
        }
        return null;
      }

      // La RPC respondió correctamente
      const row = Array.isArray(data) ? data[0] : data;
      // Sanción permanente: status es 'BANNED'
      const active =
        row &&
        row.status === 'BANNED' &&
        (!row.suspended_until || new Date(row.suspended_until) > new Date());
      aplicarSuspension(active ? row : null);
      return active ? row : null;
    } catch (err) {
      console.warn('Error comprobando suspensión:', err);
      return null;
    }
  };

  /**
   * Vuelve a consultar el estado de la cuenta (usado al reactivar desde soporte).
   */
  const recheckSuspension = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const targetId = user?.id || session?.user?.id;
    if (!targetId) return false;

    const sus = await checkSuspension(targetId);
    if (!sus) {
      aplicarSuspension(null);
      await fetchProfile(targetId);
      return true; // reactivada con éxito
    }
    return false;
  };

  useEffect(() => {
    // 1. Obtener la sesión inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const sus = await checkSuspension(session.user.id);
        setUser(session.user);
        await fetchProfile(session.user.id);
        if (sus) {
          // La cuenta está sancionada. Mantenemos la sesión para que el usuario
          // pueda acceder de forma autenticada al chat de soporte con el admin.
          // App.js se encarga de mostrar exclusivamente SuspendedScreen.
          aplicarSuspension(sus);
        }
      } else {
        setUser(null);
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
        if (session?.user) {
          const sus = await checkSuspension(session.user.id);
          setUser(session.user);
          await fetchProfile(session.user.id);
          if (sus) {
            aplicarSuspension(sus);
          }
        } else {
          setUser(null);
          setProfile(null);
          if (!suspensionRef.current) setSuspension(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Suspensión declarada a mitad de sesión.
   *
   * Un administrador puede sancionar una cuenta mientras su dueño está usando la app.
   * Se comprueba periódicamente y al volver a primer plano. Al detectarse, se marca
   * la suspensión manteniendo la sesión para que pueda ingresar al chat de apelación.
   */
  const vigilarSuspension = useCallback(async (userId) => {
    const sus = await checkSuspension(userId);
    if (!sus) return;
    aplicarSuspension(sus);
  }, []);

  useEffect(() => {
    if (!user?.id || suspension || !puedeConsultarSuspension) return undefined;

    const intervalo = setInterval(() => vigilarSuspension(user.id), 2 * 60 * 1000);
    const alVolver = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') vigilarSuspension(user.id);
    });

    return () => {
      clearInterval(intervalo);
      alVolver.remove();
    };
  }, [user?.id, suspension, puedeConsultarSuspension, vigilarSuspension]);

  // Registrar un nuevo usuario.
  // Igual que en signIn: NO toca el `loading` global, que sustituye toda la app
  // por "Cargando..."; un registro fallido remontaría el formulario en blanco y
  // perdería el mensaje de error.
  const signUp = async ({ email, password, fullName, username, birthDate }) => {
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
            // Constancia del consentimiento: qué versión de Términos y
            // Privacidad aceptó y cuándo. Queda en auth.users.raw_user_meta_data.
            legal_version: LEGAL_VERSION,
            legal_accepted_at: new Date().toISOString(),
          },
        },
      });

      if (error) throw error;

      if (data?.user) {
        await fetchProfile(data.user.id);
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };
  // NO toca el `loading` global: ese solo es para restaurar la sesión al arrancar,
  // y la app completa se sustituye por "Cargando..." mientras esté activo. Si
  // encendiéramos aquí, un intento fallido desmontaría el formulario de login y lo
  // remontaría en blanco ("recarga la página"), borrando el mensaje de error.
  const signIn = async ({ email, password }) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) throw error;

      // Cuenta suspendida: MANTENEMOS la sesión activa para que el usuario pueda
      // acceder al chat de soporte/apelación (SuspendedScreen). App.js se encarga
      // de mostrar exclusivamente SuspendedScreen mientras haya suspensión.
      if (data?.user) {
        const sus = await checkSuspension(data.user.id);
        if (sus) {
          setUser(data.user);
          setSession(data.session);
          await fetchProfile(data.user.id);
          aplicarSuspension(sus);
          return { data, error: null, suspendida: true };
        }
        await fetchProfile(data.user.id);
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // ¿Está tomado ese nombre de usuario? La columna es UNIQUE y el trigger
  // handle_new_user falla al insertarlo repetido, así que conviene avisar antes de
  // crear la cuenta. Ante un fallo de red devuelve false: que decida el servidor,
  // en lugar de bloquear un registro que quizá sí era válido.
  //
  // Se compara SIN distinguir mayúsculas: hay perfiles antiguos guardados con
  // mayúsculas ("AngeOrtiz") y un `.eq` en minúsculas no los encontraría.
  // En `ilike` el guion bajo es comodín de un carácter, así que se escapa para
  // que "ana_b" no coincida con "anaxb".
  const isUsernameTaken = async (username) => {
    try {
      const pattern = username.trim().toLowerCase().replace(/[\\%_]/g, '\\$&');
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', pattern)
        .limit(1);

      if (error) throw error;
      return (data || []).length > 0;
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
        suspension,
        descartarSuspension,
        recheckSuspension,
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
