import { Platform } from 'react-native';
import { supabase } from '../config/supabase';
import { File } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

/**
 * Prepara una imagen local para subirla a Storage.
 *
 * Hay que separar por plataforma porque cada una falla con el método de la otra:
 * - En web, `expo-file-system` no está soportado (es una librería nativa), pero
 *   `fetch(uri).blob()` funciona sin problema con las URIs del selector.
 * - En Android/iOS ocurre al revés: ese mismo fetch sobre una URI `file://`
 *   revienta con "Network request failed", así que se lee el archivo y se
 *   convierte a ArrayBuffer.
 *
 * `readAsStringAsync` quedó deprecado en SDK 54; aquí se usa la clase `File`,
 * que es la API actual.
 */
const readImageForUpload = async (imageUri) => {
  if (Platform.OS === 'web') {
    const response = await fetch(imageUri);
    return await response.blob();
  }

  const base64 = await new File(imageUri).base64();
  return decode(base64);
};

// 1. Obtener actividad recomendada usando la función RPC en PostgreSQL
export const getRecommendedActivity = async (userId) => {
  try {
    const { data, error } = await supabase.rpc('get_recommended_activity', {
      p_user_id: userId,
    });

    if (error) throw error;
    return { activity: data && data.length > 0 ? data[0] : null, error: null };
  } catch (error) {
    console.error('Error obteniendo recomendación:', error.message);
    return { activity: null, error };
  }
};

// 1.b Recomendación elegida por IA según las preferencias del usuario.
// El SQL filtra por edad, recursos y actividades ya hechas; Groq escoge entre los
// candidatos el que mejor encaja con sus gustos e intereses y explica por qué.
// `excludeIds` evita repetir lo que ya se está mostrando al pedir otra.
export const getAiRecommendation = async (excludeIds = []) => {
  try {
    const { data, error } = await supabase.functions.invoke('recommend-activity', {
      body: { exclude: excludeIds },
    });

    if (error) throw error;

    // Deja ver en consola quién eligió de verdad: 'ai' (Groq), 'score' (respaldo
    // por afinidad) o 'empty'. Sin esto es imposible saber si la IA participó.
    console.log(
      `[Hobbier] Recomendación por: ${data?.ranked_by} -> ${data?.activity?.title ?? 'sin candidatos'}`
    );

    return {
      activity: data?.activity || null,
      reason: data?.reason || null,
      rankedBy: data?.ranked_by || null,
      error: null,
    };
  } catch (error) {
    // Se devuelve el error para que la pantalla pueda caer al RPC de siempre.
    console.warn('Recomendación con IA no disponible:', error.message);
    return { activity: null, reason: null, rankedBy: null, error };
  }
};

// 2. Aceptar actividad recomendada (Pasa a estado PENDING reutilizando registro si ya existía)
export const acceptActivity = async (userId, activityId) => {
  try {
    // 1. Comprobar si ya existe un registro para este usuario y actividad
    const { data: existing } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', userId)
      .eq('activity_id', activityId)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'PENDING') {
        return { userActivity: existing, error: null };
      }

      // Si ya estaba COMPLETED, la reactivamos a PENDING con nueva fecha de asignación
      // manteniendo el mismo ID para unificar todo el historial de fotos
      const { data: updated, error: updateErr } = await supabase
        .from('user_activities')
        .update({
          status: 'PENDING',
          assigned_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      return { userActivity: updated, error: null };
    }

    // 2. Si no existía previamente, crear el registro por primera vez
    const { data, error } = await supabase
      .from('user_activities')
      .insert({
        user_id: userId,
        activity_id: activityId,
        status: 'PENDING',
        assigned_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { userActivity: data, error: null };
  } catch (error) {
    console.error('Error al aceptar actividad:', error.message);
    return { userActivity: null, error };
  }
};

// 3. Obtener actividades del usuario (PENDING y COMPLETED)
export const getUserActivities = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_activities')
      .select(`
        *,
        activity:activities(
          title, 
          description, 
          points_awarded, 
          category_id,
          category:activity_categories(name, icon)
        ),
        posts:posts(
          id,
          image_url,
          created_at,
          status,
          post_reactions(user_id)
        )
      `)
      .eq('user_id', userId)
      .order('assigned_at', { ascending: false });

    if (error) throw error;

    // Ordenar posts de cada actividad por fecha descendente y filtrar solo los ACTIVE
    const formattedData = (data || []).map((item) => {
      const activePosts = (item.posts || [])
        .filter((p) => p.status === 'ACTIVE')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return {
        ...item,
        posts: activePosts,
      };
    });

    return { activities: formattedData, error: null };
  } catch (error) {
    console.error('Error obteniendo actividades del usuario:', error.message);
    return { activities: [], error };
  }
};

// 4. Subir fotografía de evidencia a Supabase Storage
export const uploadEvidenceImage = async (userId, activityId, imageUri) => {
  try {
    const fileName = `${userId}/${activityId}/${Date.now()}.jpg`;
    const fileBody = await readImageForUpload(imageUri);

    const { data, error } = await supabase.storage
      .from('activity-evidence')
      .upload(fileName, fileBody, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) throw error;

    // Obtener URL pública
    const { data: publicUrlData } = supabase.storage
      .from('activity-evidence')
      .getPublicUrl(fileName);

    return { publicUrl: publicUrlData.publicUrl, error: null };
  } catch (error) {
    console.error('Error al subir imagen de evidencia:', error.message);
    return { publicUrl: null, error };
  }
};

// 5. Completar actividad / Registrar avance y otorgar puntos mediante RPC transaccional
export const completeActivityRPC = async (userActivityId, imageUrl) => {
  try {
    const { data, error } = await supabase.rpc('log_activity_progress', {
      p_user_activity_id: userActivityId,
      p_image_url: imageUrl,
    });

    if (error) {
      // Fallback a complete_activity por compatibilidad
      const { data: fallbackData, error: fallbackError } = await supabase.rpc('complete_activity', {
        p_user_activity_id: userActivityId,
        p_image_url: imageUrl,
      });
      if (fallbackError) throw fallbackError;
      return { result: fallbackData, error: null };
    }

    return { result: data, error: null };
  } catch (error) {
    console.error('Error en RPC de registro de actividad:', error.message);
    return { result: null, error };
  }
};

export const logActivityProgressRPC = completeActivityRPC;

// 6. Subir fotografía de perfil a Supabase Storage
export const uploadAvatarImage = async (userId, imageUri) => {
  try {
    const fileName = `${userId}/avatar_${Date.now()}.jpg`;
    // Mismo tratamiento que la evidencia: sin esto, la foto de perfil seguiría
    // fallando en el móvil con "Network request failed".
    const fileBody = await readImageForUpload(imageUri);

    const { data, error } = await supabase.storage
      .from('activity-evidence')
      .upload(fileName, fileBody, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('activity-evidence')
      .getPublicUrl(fileName);

    return { publicUrl: publicUrlData.publicUrl, error: null };
  } catch (error) {
    console.error('Error al subir foto de perfil:', error.message);
    return { publicUrl: null, error };
  }
};
