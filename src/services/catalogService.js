import { supabase } from '../config/supabase';

// Obtener todos los catálogos base (likes, intereses, recursos)
export const fetchAllCatalogs = async () => {
  try {
    const [likesRes, interestsRes, resourcesRes] = await Promise.all([
      supabase.from('likes').select('*').order('name'),
      supabase.from('interests').select('*').order('name'),
      supabase.from('resources').select('*').order('name'),
    ]);

    if (likesRes.error) throw likesRes.error;
    if (interestsRes.error) throw interestsRes.error;
    if (resourcesRes.error) throw resourcesRes.error;

    return {
      likes: likesRes.data || [],
      interests: interestsRes.data || [],
      resources: resourcesRes.data || [],
      error: null,
    };
  } catch (error) {
    console.error('Error al obtener catálogos:', error.message);
    return { likes: [], interests: [], resources: [], error };
  }
};

// Obtener las selecciones actuales del usuario
export const fetchUserPreferences = async (userId) => {
  try {
    const [userLikesRes, userInterestsRes, userResourcesRes, profileRes] = await Promise.all([
      supabase.from('user_likes').select('like_id').eq('user_id', userId),
      supabase.from('user_interests').select('interest_id').eq('user_id', userId),
      supabase.from('user_resources').select('resource_id').eq('user_id', userId),
      // La fecha decide qué metas son aptas por edad, así que se edita junto al
      // resto de preferencias y no en una pantalla aparte.
      supabase.from('profiles').select('birth_date').eq('id', userId).maybeSingle(),
    ]);

    return {
      userLikes: (userLikesRes.data || []).map((row) => row.like_id),
      userInterests: (userInterestsRes.data || []).map((row) => row.interest_id),
      userResources: (userResourcesRes.data || []).map((row) => row.resource_id),
      birthDate: profileRes.data?.birth_date || null,
      error: null,
    };
  } catch (error) {
    console.error('Error al obtener preferencias del usuario:', error.message);
    return { userLikes: [], userInterests: [], userResources: [], birthDate: null, error };
  }
};

// Guardar las selecciones del usuario (reemplazo seguro de relaciones M:N)
export const saveUserPreferences = async (userId, selectedLikes, selectedInterests, selectedResources) => {
  try {
    // 1. Eliminar selecciones anteriores
    await Promise.all([
      supabase.from('user_likes').delete().eq('user_id', userId),
      supabase.from('user_interests').delete().eq('user_id', userId),
      supabase.from('user_resources').delete().eq('user_id', userId),
    ]);

    // 2. Insertar nuevas selecciones si existen
    const insertPromises = [];

    if (selectedLikes.length > 0) {
      insertPromises.push(
        supabase.from('user_likes').insert(
          selectedLikes.map((like_id) => ({ user_id: userId, like_id }))
        )
      );
    }

    if (selectedInterests.length > 0) {
      insertPromises.push(
        supabase.from('user_interests').insert(
          selectedInterests.map((interest_id) => ({ user_id: userId, interest_id }))
        )
      );
    }

    if (selectedResources.length > 0) {
      insertPromises.push(
        supabase.from('user_resources').insert(
          selectedResources.map((resource_id) => ({ user_id: userId, resource_id }))
        )
      );
    }

    await Promise.all(insertPromises);
    return { success: true, error: null };
  } catch (error) {
    console.error('Error al guardar preferencias:', error.message);
    return { success: false, error };
  }
};

// Guardar la fecha de nacimiento del perfil.
// Se guarda la FECHA, no la edad: un número quedaría desactualizado en cada
// cumpleaños, mientras que la fecha permite recalcular la edad siempre.
// La columna `birth_date` ya existe en `profiles`; esto no altera el esquema.
export const saveUserBirthDate = async (userId, isoBirthDate) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ birth_date: isoBirthDate, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error al guardar la fecha de nacimiento:', error.message);
    return { success: false, error };
  }
};

// Categorías de actividad, para el selector del panel de administración.
// No incluye "Libre": esa es la etiqueta de la interfaz para category_id = null,
// no una fila del catálogo. Ver src/utils/category.js.
export const fetchActivityCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('activity_categories')
      .select('id, name')
      .order('name');

    if (error) throw error;
    return { categories: data || [], error: null };
  } catch (error) {
    console.error('Error al obtener categorías:', error.message);
    return { categories: [], error };
  }
};
