import { Platform } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
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
