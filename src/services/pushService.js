import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../config/supabase';

/**
 * Notificaciones push.
 *
 * Dos mitades:
 *   - `registrarDispositivo()` pide permiso una vez por sesión y guarda el
 *     token de Expo en `user_push_tokens`. Sin token, a ese aparato no le llega
 *     nada.
 *   - `avisar(tipo, contexto)` le pide a la Edge Function `send-push` que mande
 *     un aviso. La app NO escribe el texto: manda el tipo y el contexto, y el
 *     servidor redacta y decide quién lo recibe. Así nadie puede falsificar un
 *     "tu cuenta ha sido sancionada" desde un cliente.
 *
 * `avisar` nunca lanza ni bloquea: un aviso que falla no puede tumbar el envío
 * de un mensaje ni una solicitud de amistad.
 *
 * El módulo de notificaciones se carga a mano y entre `try`: hasta que no se
 * corra `npx expo install expo-notifications` no está en el proyecto, y la app
 * tiene que seguir arrancando igual.
 */

let Notifications = null;
try {
  // eslint-disable-next-line global-require
  Notifications = require('expo-notifications');
} catch (_e) {
  Notifications = null;
}

/** ¿Está el módulo disponible? Fuera de web y con la dependencia instalada. */
const hayNotificaciones = () => !!Notifications && Platform.OS !== 'web';

const avisarQueFalta = () => {
  console.warn(
    'expo-notifications no está instalado: las push no se registrarán. ' +
      'Corre "npx expo install expo-notifications" y usa una build de desarrollo ' +
      '(en Expo Go las push remotas no funcionan desde el SDK 53).'
  );
};

/**
 * Qué hacer cuando llega un aviso con la app abierta: enseñarlo igual.
 * Sin esto, en primer plano no se ve nada y parece que no llegó.
 */
export const configurarAvisosEnPrimerPlano = () => {
  if (!hayNotificaciones()) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      // shouldShowAlert quedó obsoleto: ahora son estos dos.
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
};

/**
 * Pide permiso, consigue el token y lo guarda.
 *
 * En Android hay que crear el canal ANTES de pedir el token: sin canal, el
 * sistema no llega a enseñar el diálogo de permiso (Android 13+).
 */
export const registrarDispositivo = async () => {
  if (!hayNotificaciones()) {
    if (Platform.OS !== 'web') avisarQueFalta();
    return null;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Avisos de Hobbier',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const permisos = await Notifications.getPermissionsAsync();
    let concedido = permisos.granted || permisos.ios?.status === 2;

    if (!concedido) {
      const pedido = await Notifications.requestPermissionsAsync();
      concedido = pedido.granted || pedido.ios?.status === 2;
    }

    // Que diga que no es una respuesta válida: no se vuelve a insistir.
    if (!concedido) return null;

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId;

    if (!projectId) {
      console.warn('Sin projectId de EAS en app.json: no se puede pedir el token de Expo.');
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return null;

    const { error } = await supabase.from('user_push_tokens').upsert(
      {
        user_id: userId,
        push_token: token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,push_token' }
    );

    if (error) throw error;
    return token;
  } catch (error) {
    console.warn('No se pudo registrar el dispositivo para avisos:', error.message);
    return null;
  }
};

/** Al cerrar sesión, este aparato deja de recibir avisos de esa cuenta. */
export const olvidarDispositivo = async (userId) => {
  if (!hayNotificaciones() || !userId) return;
  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
    if (!projectId) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return;
    await supabase.from('user_push_tokens').delete().eq('user_id', userId).eq('push_token', token);
  } catch (error) {
    console.warn('No se pudo dar de baja el dispositivo:', error.message);
  }
};

/**
 * Los tipos que entiende la Edge Function. Están aquí para que un error de
 * escritura se vea en el editor y no en silencio, en producción.
 */
export const AVISO = {
  AMISTAD_SOLICITUD: 'amistad_solicitud',
  AMISTAD_ACEPTADA: 'amistad_aceptada',
  MENSAJE_DIRECTO: 'mensaje_directo',
  MENSAJE_SALA: 'mensaje_sala',
  SALA_INVITACION: 'sala_invitacion',
  SOPORTE_RESPUESTA: 'soporte_respuesta',
  CUENTA_SANCIONADA: 'cuenta_sancionada',
  CUENTA_REACTIVADA: 'cuenta_reactivada',
  ANUNCIO_ESTADO: 'anuncio_estado',
  ANUNCIO_MENSAJE: 'anuncio_mensaje',
  ADMIN_SOPORTE: 'admin_soporte',
  ADMIN_REPORTE: 'admin_reporte',
  ADMIN_SOLICITUD_ANUNCIO: 'admin_solicitud_anuncio',
};

/**
 * Manda un aviso. No se espera: quien lo llama sigue con lo suyo.
 *
 * @param {string} tipo    uno de AVISO
 * @param {object} contexto  { para, texto, salaId, salaNombre, motivo, ... }
 */
export const avisar = (tipo, contexto = {}) => {
  try {
    supabase.functions
      .invoke('send-push', { body: { tipo, contexto } })
      .catch((error) => console.warn(`Aviso "${tipo}" no enviado:`, error.message));
  } catch (error) {
    console.warn(`Aviso "${tipo}" no enviado:`, error.message);
  }
};

export const pushService = {
  configurarAvisosEnPrimerPlano,
  registrarDispositivo,
  olvidarDispositivo,
  avisar,
  AVISO,
};
