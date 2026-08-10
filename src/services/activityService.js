import { supabase } from '../config/supabase';

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

// 2. Aceptar actividad recomendada (Pasa a estado PENDING)
export const acceptActivity = async (userId, activityId) => {
  try {
    // Comprobar si ya tiene esta actividad PENDING
    const { data: existing } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', userId)
      .eq('activity_id', activityId)
      .eq('status', 'PENDING')
      .maybeSingle();

    if (existing) {
      return { userActivity: existing, error: null };
    }

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
        )
      `)
      .eq('user_id', userId)
      .order('assigned_at', { ascending: false });

    if (error) throw error;
    return { activities: data || [], error: null };
  } catch (error) {
    console.error('Error obteniendo actividades del usuario:', error.message);
    return { activities: [], error };
  }
};

// 4. Subir fotografía de evidencia a Supabase Storage
export const uploadEvidenceImage = async (userId, activityId, imageUri) => {
  try {
    const fileName = `${userId}/${activityId}/${Date.now()}.jpg`;

    // Convertir URI a Blob/ArrayBuffer según plataforma
    let fileBody;
    const response = await fetch(imageUri);
    fileBody = await response.blob();

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

// 5. Completar actividad y otorgar puntos mediante RPC transaccional
export const completeActivityRPC = async (userActivityId, imageUrl) => {
  try {
    const { data, error } = await supabase.rpc('complete_activity', {
      p_user_activity_id: userActivityId,
      p_image_url: imageUrl,
    });

    if (error) throw error;
    return { result: data, error: null };
  } catch (error) {
    console.error('Error en RPC complete_activity:', error.message);
    return { result: null, error };
  }
};

// 6. Subir fotografía de perfil a Supabase Storage
export const uploadAvatarImage = async (userId, imageUri) => {
  try {
    const fileName = `${userId}/avatar_${Date.now()}.jpg`;

    const response = await fetch(imageUri);
    const fileBody = await response.blob();

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
