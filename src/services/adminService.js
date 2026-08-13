import { supabase } from '../config/supabase';

export const getReportedPostsAdmin = async () => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        image_url,
        status,
        created_at,
        author:profiles(full_name, username),
        reports(id, reason, details, created_at, reporter:profiles(full_name, username))
      `)
      .eq('status', 'REPORTED')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { posts: data || [], error: null };
  } catch (error) {
    console.error('Error al obtener reportes admin:', error.message);
    return { posts: [], error };
  }
};

export const resolveReportedPostAdmin = async (postId, newStatus) => {
  try {
    if (!['ACTIVE', 'DELETED'].includes(newStatus)) {
      throw new Error('Estado inválido para resolución.');
    }

    const { data, error } = await supabase
      .from('posts')
      .update({ status: newStatus })
      .eq('id', postId)
      .select()
      .single();

    if (error) throw error;
    return { post: data, error: null };
  } catch (error) {
    console.error('Error al resolver reporte admin:', error.message);
    return { post: null, error };
  }
};

export const getAllActivitiesAdmin = async () => {
  try {
    const { data, error } = await supabase
      .from('activities')
      .select(`
        *,
        category:activity_categories(name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { activities: data || [], error: null };
  } catch (error) {
    console.error('Error al obtener actividades admin:', error.message);
    return { activities: [], error };
  }
};

export const createActivityAdmin = async ({
  title,
  description,
  categoryId,
  minAge,
  maxAge,
  pointsAwarded,
  createdBy,
}) => {
  try {
    const { data, error } = await supabase
      .from('activities')
      .insert({
        title,
        description,
        category_id: categoryId || null,
        min_age: minAge ? parseInt(minAge, 10) : null,
        max_age: maxAge ? parseInt(maxAge, 10) : null,
        points_awarded: parseInt(pointsAwarded, 10) || 10,
        is_active: true,
        created_by: createdBy || null,
      })
      .select()
      .single();

    if (error) throw error;
    return { activity: data, error: null };
  } catch (error) {
    console.error('Error al crear actividad:', error.message);
    return { activity: null, error };
  }
};

export const toggleActivityActiveAdmin = async (activityId, currentIsActive) => {
  try {
    const { data, error } = await supabase
      .from('activities')
      .update({ is_active: !currentIsActive, updated_at: new Date().toISOString() })
      .eq('id', activityId)
      .select()
      .single();

    if (error) throw error;
    return { activity: data, error: null };
  } catch (error) {
    console.error('Error al cambiar estado de actividad:', error.message);
    return { activity: null, error };
  }
};
