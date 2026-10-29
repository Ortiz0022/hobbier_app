import { Platform } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { avisar, AVISO } from './pushService';
import { readImageForUpload } from './activityService';

// ============================================================
// ANUNCIOS PATROCINADOS
// ============================================================
// El esquema y las reglas viven en
// supabase/migrations/20261018_sponsored_ads.sql (y 20261021_ads_auto_location.sql). Resumen:
// - El admin crea los anuncios (tabla ads) y elige sus gustos (ad_likes).
// - El usuario NO lee la tabla: pide los suyos con get_my_ads, que cruza en el
//   servidor sus gustos y su ciudad. Así no ve precios ni notas internas.
// - Impresiones y clics van por log_ad_event.

// ---------- Lado del usuario ----------

export const getMyAds = async (limit = 3) => {
  try {
    const { data, error } = await supabase.rpc('get_my_ads', { p_limit: limit });
    if (error) throw error;
    return { ads: data || [], error: null };
  } catch (error) {
    // Sin anuncios la app funciona igual: no se molesta al usuario con el error.
    console.warn('No se pudieron cargar los anuncios:', error.message);
    return { ads: [], error };
  }
};

export const logAdEvent = async (adId, kind) => {
  const { error } = await supabase.rpc('log_ad_event', { p_ad_id: adId, p_kind: kind });
  if (error) console.warn('No se pudo registrar el evento del anuncio:', error.message);
};

// ---------- Solicitudes de anuncio (formulario de Descubre) ----------
// Esquema en supabase/migrations/20261028_ad_requests.sql. La solicitud nace
// PENDIENTE y no sale en el feed: solo el admin, al aprobarla, crea el anuncio.

export const submitAdRequest = async (userId, solicitud) => {
  try {
    const esEvento = solicitud.kind === 'EVENTO';
    const { error } = await supabase.from('ad_requests').insert({
      user_id: userId,
      advertiser_name: solicitud.advertiser_name.trim(),
      // Sin correo ni teléfono: todo se habla en el chat de la solicitud.
      contact: null,
      kind: solicitud.kind,
      title: solicitud.title.trim(),
      body: solicitud.body?.trim() || null,
      link_url: solicitud.link_url?.trim() || null,
      event_date: esEvento ? solicitud.event_date || null : null,
      event_place: esEvento ? solicitud.event_place?.trim() || null : null,
      image_url: solicitud.image_url || null,
      starts_on: solicitud.starts_on,
      ends_on: solicitud.ends_on,
    });
    if (error) throw error;
    avisar(AVISO.ADMIN_SOLICITUD_ANUNCIO, {});
    return { error: null };
  } catch (error) {
    console.error('Error al enviar la solicitud de anuncio:', error.message);
    // El trigger avisa así cuando la persona ya tiene 3 pendientes.
    const limite = /LIMITE_SOLICITUDES/.test(error.message || '');
    return { error, limite };
  }
};

/**
 * Solicitudes de la persona, para "Mis solicitudes". La regla "Usuario ve sus
 * solicitudes de anuncio" solo le deja leer las suyas; aquí se piden solo las
 * columnas que le sirven (no quién la revisó).
 */
export const getMyAdRequests = async (userId) => {
  if (!userId) return { requests: [], error: null };
  try {
    const { data, error } = await supabase
      .from('ad_requests')
      .select(
        'id, advertiser_name, title, kind, image_url, starts_on, ends_on, status, reject_reason, created_at, reviewed_at, ' +
          'messages:ad_request_messages(from_team, body, created_at)'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { requests: (data || []).map(conResumenDeMensajes), error: null };
  } catch (error) {
    console.warn('No se pudieron cargar tus solicitudes de anuncio:', error.message);
    return { requests: [], error };
  }
};

// Cuántos mensajes tiene la solicitud y cuál fue el último, para mostrarlo en
// la tarjeta sin abrir el chat.
const conResumenDeMensajes = ({ messages, ...sol }) => {
  const orden = [...(messages || [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return { ...sol, messageCount: orden.length, lastMessage: orden[orden.length - 1] || null };
};

// ---------- Chat de cada solicitud ----------
// Esquema en 20261028e_ad_request_messages.sql. Solo lo leen y escriben quien
// envió la solicitud y los admins; from_team lo pone el servidor.

export const getAdRequestMessages = async (requestId) => {
  try {
    const { data, error } = await supabase
      .from('ad_request_messages')
      .select('id, from_team, body, created_at')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return { messages: data || [], error: null };
  } catch (error) {
    console.error('Error al cargar los mensajes de la solicitud:', error.message);
    return { messages: [], error };
  }
};

// "No leído" sin tocar la base: se guarda en el dispositivo la hora del último
// mensaje que la persona ya vio en cada chat. Un mensaje del equipo más nuevo
// que eso cuenta como no leído en la bandeja de Mensajes. Si el almacenamiento
// falla, el chat sigue funcionando; solo se pierde el punto de no leído.
const CLAVE_CHAT_VISTO = 'hobbier.chat_anuncio_visto.';

export const marcarChatAnuncioVisto = async (requestId, ultimoIso) => {
  if (!requestId || !ultimoIso) return;
  try {
    await AsyncStorage.setItem(CLAVE_CHAT_VISTO + requestId, ultimoIso);
  } catch {
    // Sin almacenamiento el chat volverá a salir como no leído; no pasa nada.
  }
};

export const chatAnuncioSinLeer = async (solicitud) => {
  const ultimo = solicitud?.lastMessage;
  if (!ultimo?.from_team) return false;
  try {
    const visto = await AsyncStorage.getItem(CLAVE_CHAT_VISTO + solicitud.id);
    return !visto || ultimo.created_at > visto;
  } catch {
    return true;
  }
};

export const sendAdRequestMessage = async (requestId, senderId, body) => {
  const { data, error } = await supabase
    .from('ad_request_messages')
    .insert({ request_id: requestId, sender_id: senderId, body: body.trim() })
    .select('id, from_team, body, created_at')
    .single();
  if (error) console.error('Error al enviar el mensaje:', error.message);
  // Mismo tipo para las dos direcciones: el servidor mira quién escribe.
  if (!error) avisar(AVISO.ANUNCIO_MENSAJE, { solicitudId: requestId, texto: body });
  return { message: data || null, error };
};

// La foto del anunciante va a su propia carpeta: la política de
// 20261028b_ad_requests_image_duration.sql solo le deja subir ahí. Las fechas
// pedidas vienen de 20261028c_ad_requests_dates.sql.
export const uploadAdRequestImage = async (userId, imageUri) => {
  try {
    const fileName = `solicitudes/${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
    const fileBody = await readImageForUpload(imageUri);

    const { error } = await supabase.storage
      .from('ad-images')
      .upload(fileName, fileBody, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;

    const { data } = supabase.storage.from('ad-images').getPublicUrl(fileName);
    return { publicUrl: data.publicUrl, error: null };
  } catch (error) {
    console.error('Error al subir la imagen de la solicitud:', error.message);
    return { publicUrl: null, error };
  }
};

// ---------- Precio ----------
// Tarifa única por día que el anuncio sale en el feed. Es solo la base del
// precio sugerido: el admin puede cobrar otra cosa si lo acuerda con el negocio.
export const PRECIO_POR_DIA = 500;

const isoLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Días que sale un anuncio, contando el primero y el último (como get_my_ads). */
export const diasDeVigencia = (desdeIso, hastaIso) => {
  if (!desdeIso || !hastaIso || hastaIso < desdeIso) return 0;
  const desde = new Date(`${desdeIso}T12:00:00`);
  const hasta = new Date(`${hastaIso}T12:00:00`);
  return Math.round((hasta - desde) / 86400000) + 1;
};

export const precioSugerido = (desdeIso, hastaIso) => diasDeVigencia(desdeIso, hastaIso) * PRECIO_POR_DIA;

/**
 * Fechas con las que se abre el formulario del anuncio al aprobar una
 * solicitud, en "aaaa-mm-dd": las que pidió el anunciante. Si el admin la
 * revisa tarde y el inicio ya pasó, arranca hoy y se conserva el final. El
 * admin puede cambiarlas antes de guardar.
 */
export const vigenciaSugerida = (solicitud) => {
  const hoy = isoLocal(new Date());
  const desde = solicitud.starts_on && solicitud.starts_on > hoy ? solicitud.starts_on : hoy;
  const hasta = solicitud.ends_on && solicitud.ends_on >= desde ? solicitud.ends_on : solicitud.event_date || undefined;
  return { starts_on: desde, ends_on: hasta };
};

export const getAdRequestsAdmin = async () => {
  try {
    const { data, error } = await supabase
      .from('ad_requests')
      .select(
        '*, requester:profiles!ad_requests_user_id_fkey(username, full_name), ' +
          'messages:ad_request_messages(from_team, body, created_at)'
      )
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { requests: (data || []).map(conResumenDeMensajes), error: null };
  } catch (error) {
    console.error('Error al obtener las solicitudes de anuncio:', error.message);
    return { requests: [], error };
  }
};

export const approveAdRequestAdmin = async (requestId, adId, adminId) => {
  const { error } = await supabase
    .from('ad_requests')
    .update({ status: 'APROBADA', ad_id: adId, reviewed_by: adminId, reviewed_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) console.error('Error al aprobar la solicitud:', error.message);
  else {
    avisar(AVISO.ANUNCIO_ESTADO, {
      solicitudId: requestId,
      estado: 'APPROVED',
      detalle: 'Ya se está mostrando en el feed de la gente a la que le encaja.',
    });
  }
  return { error };
};

// Ruta dentro del bucket a partir de la URL pública
// (".../object/public/ad-images/solicitudes/<id>/foto.jpg" → "solicitudes/<id>/foto.jpg").
const rutaEnBucket = (url) => {
  const i = (url || '').indexOf('/ad-images/');
  return i === -1 ? null : decodeURIComponent(url.slice(i + '/ad-images/'.length).split('?')[0]);
};

/**
 * Rechaza la solicitud y borra la foto que adjuntó: el bucket es público y,
 * sin anuncio aprobado, no hay motivo para que siga accesible. Solo se borran
 * fotos de solicitudes/, nunca las de anuncios creados por el admin.
 */
export const rejectAdRequestAdmin = async (solicitud, motivo, adminId) => {
  const ruta = rutaEnBucket(solicitud.image_url);
  let fotoBorrada = !ruta;
  if (ruta?.startsWith('solicitudes/')) {
    // Si las reglas no dejan borrar, Storage no da error: devuelve la lista
    // vacía. Por eso se mira también que haya borrado algo.
    const { data: borrados, error: errorFoto } = await supabase.storage.from('ad-images').remove([ruta]);
    fotoBorrada = !errorFoto && (borrados || []).length > 0;
    if (!fotoBorrada) console.warn('No se pudo borrar la foto de la solicitud:', errorFoto?.message || 'sin permiso');
  }

  const { error } = await supabase
    .from('ad_requests')
    .update({
      status: 'RECHAZADA',
      reject_reason: motivo?.trim() || null,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      // Si la foto no se pudo borrar se conserva el enlace, para poder borrarla a mano.
      ...(fotoBorrada ? { image_url: null } : {}),
    })
    .eq('id', solicitud.id);
  if (error) console.error('Error al rechazar la solicitud:', error.message);
  else {
    avisar(AVISO.ANUNCIO_ESTADO, {
      solicitudId: solicitud.id,
      estado: 'REJECTED',
      detalle: motivo?.trim() || 'Entra a Perfil para ver los detalles.',
    });
  }
  return { error, fotoBorrada };
};

// ---------- Ciudad automática (para anuncios cercanos) ----------
// Se pide el permiso de ubicación una sola vez; con él se saca el cantón o
// ciudad y SOLO eso se guarda en profiles.ads_city (nunca coordenadas). Sin
// permiso, la persona ve solo los anuncios para todo el país. Se hace una vez
// por sesión de la app.
//
// El permiso NO se pide de golpe: antes el feed muestra LocationAskModal
// (explica para qué es) y solo si la persona toca "Activar" sale el aviso del
// navegador o del sistema, que no se puede personalizar. Como en Instagram,
// se pregunta UNA sola vez: si dice "Ahora no", no se le vuelve a insistir.
// Si más adelante activa la ubicación desde los ajustes del teléfono o del
// navegador, syncAdCity lo detecta solo al abrir la app.
let ciudadSincronizada = false;

const CLAVE_YA_PREGUNTADO = 'hobbier.ubicacion_preguntada';

export const necesitaPreguntarUbicacion = async () => {
  try {
    const permiso = await Location.getForegroundPermissionsAsync();
    if (permiso.status !== 'undetermined' || !permiso.canAskAgain) return false;
    return !(await AsyncStorage.getItem(CLAVE_YA_PREGUNTADO));
  } catch {
    return false;
  }
};

export const posponerPreguntaUbicacion = async () => {
  try {
    await AsyncStorage.setItem(CLAVE_YA_PREGUNTADO, '1');
  } catch {
    // Sin almacenamiento se volverá a preguntar la próxima vez; no pasa nada.
  }
};

// En el teléfono el propio sistema traduce coordenadas a lugar. En la web
// expo-location no puede, así que se pregunta a OpenStreetMap (Nominatim).
// Su política pide como mucho 1 petición por segundo: aquí es 1 por sesión.
const ciudadDesdeCoordenadas = async ({ latitude, longitude }) => {
  if (Platform.OS !== 'web') {
    const [d] = await Location.reverseGeocodeAsync({ latitude, longitude });
    return d?.city || d?.subregion || d?.district || '';
  }
  const url =
    'https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=12&accept-language=es' +
    `&lat=${latitude.toFixed(2)}&lon=${longitude.toFixed(2)}`;
  const resp = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!resp.ok) throw new Error(`Nominatim respondió ${resp.status}`);
  const { address: a = {} } = await resp.json();
  // En Costa Rica el cantón viene como county ("Hojancha", "Liberia"). En la
  // capital no viene y city es "Área Metropolitana de San José", así que se usa
  // city_district ("Ciudad de San José") limpio.
  const ciudad = /^área metropolitana/i.test(a.city || '') ? '' : a.city;
  const lugar = a.county || a.town || ciudad || a.city_district || a.municipality || a.village || '';
  return lugar.replace(/^(cant[oó]n|ciudad)\s+(de\s+)?/i, '');
};

// Devuelve true si la ciudad cambió (para volver a pedir los anuncios).
// pedirPermiso: solo cuando la persona tocó "Activar" en LocationAskModal.
export const syncAdCity = async (userId, ciudadActual, { pedirPermiso = false } = {}) => {
  if (!userId || (ciudadSincronizada && !pedirPermiso)) return false;
  ciudadSincronizada = true;
  try {
    let permiso = await Location.getForegroundPermissionsAsync();
    // Sin decidir y sin haber tocado "Activar": no se toca nada todavía.
    if (permiso.status === 'undetermined' && !pedirPermiso) return false;
    if (permiso.status === 'undetermined' && permiso.canAskAgain) {
      permiso = await Location.requestForegroundPermissionsAsync();
    }
    let ciudad = null;
    if (permiso.status === 'granted') {
      // Precisión baja (~3 km): basta para saber el cantón y gasta menos batería.
      const posicion =
        (await Location.getLastKnownPositionAsync({ maxAge: 6 * 60 * 60 * 1000 })) ||
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }));
      ciudad = (await ciudadDesdeCoordenadas(posicion.coords)).trim() || null;
      // Con permiso pero sin nombre de lugar, se conserva la última conocida.
      if (!ciudad) return false;
    }
    // Si quitó el permiso, se borra la ciudad guardada.
    if (ciudad === (ciudadActual || null)) return false;

    const { error } = await supabase
      .from('profiles')
      .update({ ads_city: ciudad, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) throw error;
    return true;
  } catch (error) {
    // Sin ciudad la app funciona igual: solo no habrá anuncios cercanos.
    console.warn('No se pudo detectar la ciudad para los anuncios:', error.message);
    return false;
  }
};

// ---------- Lado del administrador ----------

/**
 * Estado del anuncio HOY, para la insignia del panel. Las fechas se comparan
 * como texto "aaaa-mm-dd", que ordena igual que las fechas.
 */
export const estadoAnuncio = (ad) => {
  const hoy = new Date();
  const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  if (!ad.is_active) return 'PAUSADO';
  if (ad.starts_on > iso) return 'PROGRAMADO';
  if (ad.ends_on < iso) return 'VENCIDO';
  return 'ACTIVO';
};

/** Todos los anuncios con sus gustos y sus cifras, en tres consultas. */
export const getAdsAdmin = async () => {
  try {
    const [anuncios, gustos, cifras] = await Promise.all([
      supabase.from('ads').select('*').order('created_at', { ascending: false }),
      supabase.from('ad_likes').select('ad_id, like:likes(id, name)'),
      supabase.rpc('get_ad_stats_admin'),
    ]);

    if (anuncios.error) throw anuncios.error;
    if (gustos.error) throw gustos.error;
    // Sin cifras el panel sigue sirviendo para crear y pausar anuncios.
    if (cifras.error) console.warn('No se pudieron cargar las cifras de anuncios:', cifras.error.message);

    const gustosPorAnuncio = {};
    (gustos.data || []).forEach((fila) => {
      if (!fila.like) return;
      (gustosPorAnuncio[fila.ad_id] = gustosPorAnuncio[fila.ad_id] || []).push(fila.like);
    });

    const cifrasPorAnuncio = {};
    (cifras.data || []).forEach((fila) => {
      cifrasPorAnuncio[fila.ad_id] = fila;
    });

    const ads = (anuncios.data || []).map((ad) => ({
      ...ad,
      likes: gustosPorAnuncio[ad.id] || [],
      impressions: Number(cifrasPorAnuncio[ad.id]?.impressions || 0),
      clicks: Number(cifrasPorAnuncio[ad.id]?.clicks || 0),
      people: Number(cifrasPorAnuncio[ad.id]?.people || 0),
    }));

    return { ads, error: null };
  } catch (error) {
    console.error('Error al obtener los anuncios:', error.message);
    return { ads: [], error };
  }
};

export const uploadAdImage = async (imageUri) => {
  try {
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
    const fileBody = await readImageForUpload(imageUri);

    const { error } = await supabase.storage
      .from('ad-images')
      .upload(fileName, fileBody, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;

    const { data } = supabase.storage.from('ad-images').getPublicUrl(fileName);
    return { publicUrl: data.publicUrl, error: null };
  } catch (error) {
    console.error('Error al subir la imagen del anuncio:', error.message);
    return { publicUrl: null, error };
  }
};

/**
 * Crea o actualiza un anuncio y deja sus gustos como dice `likeIds`.
 * `ad.id` presente = edición.
 */
export const saveAdAdmin = async (ad, likeIds = [], createdBy = null) => {
  try {
    const fila = {
      advertiser_name: ad.advertiser_name.trim(),
      advertiser_contact: ad.advertiser_contact?.trim() || null,
      title: ad.title.trim(),
      body: ad.body?.trim() || null,
      image_url: ad.image_url || null,
      link_url: ad.link_url?.trim() || null,
      cta_label: ad.cta_label?.trim() || null,
      city: ad.city?.trim() || null,
      starts_on: ad.starts_on,
      ends_on: ad.ends_on,
      is_active: ad.is_active ?? true,
      price_paid: ad.price_paid === '' || ad.price_paid == null ? null : Number(ad.price_paid),
      notes: ad.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const consulta = ad.id
      ? supabase.from('ads').update(fila).eq('id', ad.id)
      : supabase.from('ads').insert({ ...fila, created_by: createdBy });
    const { data, error } = await consulta.select().single();
    if (error) throw error;

    // Mismo criterio que updateActivityTagsAdmin: insertar lo que falta y
    // borrar lo que sobra, comparando con lo guardado ahora.
    const { data: actuales, error: errorLectura } = await supabase
      .from('ad_likes')
      .select('like_id')
      .eq('ad_id', data.id);
    if (errorLectura) throw errorLectura;

    const hay = new Set((actuales || []).map((f) => f.like_id));
    const quieren = new Set(likeIds);
    const aInsertar = likeIds.filter((id) => !hay.has(id)).map((id) => ({ ad_id: data.id, like_id: id }));
    const aBorrar = [...hay].filter((id) => !quieren.has(id));

    if (aInsertar.length) {
      const { error: e } = await supabase.from('ad_likes').insert(aInsertar);
      if (e) throw e;
    }
    if (aBorrar.length) {
      const { error: e } = await supabase.from('ad_likes').delete().eq('ad_id', data.id).in('like_id', aBorrar);
      if (e) throw e;
    }

    return { ad: data, error: null };
  } catch (error) {
    console.error('Error al guardar el anuncio:', error.message);
    return { ad: null, error };
  }
};

export const toggleAdActiveAdmin = async (adId, isActive) => {
  const { error } = await supabase
    .from('ads')
    .update({ is_active: !isActive, updated_at: new Date().toISOString() })
    .eq('id', adId);
  if (error) console.error('Error al pausar/activar el anuncio:', error.message);
  return { error };
};

export const deleteAdAdmin = async (adId) => {
  const { error } = await supabase.from('ads').delete().eq('id', adId);
  if (error) console.error('Error al eliminar el anuncio:', error.message);
  return { error };
};
