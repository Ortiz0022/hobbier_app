import { supabase } from '../config/supabase';
import { readImageForUpload } from './activityService';

// ============================================================
// ANUNCIOS PATROCINADOS
// ============================================================
// El esquema y las reglas viven en
// supabase/migrations/20261018_sponsored_ads.sql. Resumen:
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

export const updateAdPreferences = async (userId, { personalized, city }) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        ads_personalized: personalized,
        ads_city: city?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error al guardar las preferencias de anuncios:', error.message);
    return { error };
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
