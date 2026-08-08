import { supabase } from '../config/supabase';

// 1. Buscar usuarios por username
export const searchUsersByUsername = async (query, currentUserId) => {
  try {
    if (!query.trim()) return { users: [], error: null };

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .ilike('username', `%${query.trim()}%`)
      .neq('id', currentUserId)
      .limit(10);

    if (error) throw error;
    return { users: data || [], error: null };
  } catch (error) {
    console.error('Error buscando usuarios:', error.message);
    return { users: [], error };
  }
};

// 2. Enviar solicitud de amistad
export const sendFriendRequest = async (requesterId, addresseeId) => {
  try {
    if (requesterId === addresseeId) {
      throw new Error('No puedes enviarte una solicitud de amistad a ti mismo.');
    }

    // Verificar si ya existe alguna solicitud o amistad activa
    const { data: existing } = await supabase
      .from('friendships')
      .select('*')
      .or(
        `and(requester_id.eq.${requesterId},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${requesterId})`
      )
      .maybeSingle();

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new Error('Ya son amigos.');
      }
      if (existing.status === 'PENDING') {
        throw new Error('Ya existe una solicitud de amistad pendiente entre ustedes.');
      }
      // Si fue rechazada previamente, reactivarla como PENDING
      const { data: updated, error: updateErr } = await supabase
        .from('friendships')
        .update({
          requester_id: requesterId,
          addressee_id: addresseeId,
          status: 'PENDING',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      return { friendship: updated, error: null };
    }

    const { data, error } = await supabase
      .from('friendships')
      .insert({
        requester_id: requesterId,
        addressee_id: addresseeId,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) throw error;
    return { friendship: data, error: null };
  } catch (error) {
    console.error('Error enviando solicitud de amistad:', error.message);
    return { friendship: null, error };
  }
};

// 3. Obtener solicitudes recibidas pendientes
export const getReceivedFriendRequests = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        created_at,
        requester:profiles!friendships_requester_id_fkey(id, full_name, username, avatar_url)
      `)
      .eq('addressee_id', userId)
      .eq('status', 'PENDING');

    if (error) throw error;
    return { requests: data || [], error: null };
  } catch (error) {
    console.error('Error al obtener solicitudes:', error.message);
    return { requests: [], error };
  }
};

// 4. Aceptar o rechazar solicitud de amistad
export const respondToFriendRequest = async (friendshipId, status) => {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', friendshipId)
      .select()
      .single();

    if (error) throw error;
    return { friendship: data, error: null };
  } catch (error) {
    console.error('Error al responder solicitud:', error.message);
    return { friendship: null, error };
  }
};

// 5. Obtener lista de amigos aceptados
export const getFriendsList = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        requester_id,
        addressee_id,
        requester:profiles!friendships_requester_id_fkey(id, full_name, username, avatar_url),
        addressee:profiles!friendships_addressee_id_fkey(id, full_name, username, avatar_url)
      `)
      .eq('status', 'ACCEPTED')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (error) throw error;

    const friends = (data || []).map((row) => {
      const isRequester = row.requester_id === userId;
      const friendProfile = isRequester ? row.addressee : row.requester;
      return {
        friendshipId: row.id,
        profile: friendProfile,
      };
    });

    return { friends, error: null };
  } catch (error) {
    console.error('Error al obtener lista de amigos:', error.message);
    return { friends: [], error };
  }
};

// 6. Eliminar amistad
export const removeFriendship = async (friendshipId) => {
  try {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error eliminando amistad:', error.message);
    return { success: false, error };
  }
};

// 7. Feed de amigos con paginación
export const getFriendsFeed = async (userId, limit = 5, page = 0) => {
  try {
    const from = page * limit;
    const to = from + limit - 1;

    // Primero obtener IDs de amigos aceptados
    const { friends } = await getFriendsList(userId);
    const friendIds = friends.map((f) => f.profile.id);

    if (friendIds.length === 0) {
      return { posts: [], hasMore: false, error: null };
    }

    const { data, error, count } = await supabase
      .from('posts')
      .select(`
        id,
        image_url,
        status,
        created_at,
        author:profiles(id, full_name, username, avatar_url),
        user_activity:user_activities(
          points_awarded,
          activity:activities(title, description, category_id)
        )
      `, { count: 'exact' })
      .eq('status', 'ACTIVE')
      .in('user_id', friendIds)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      posts: data || [],
      hasMore: to < (count || 0) - 1,
      error: null,
    };
  } catch (error) {
    console.error('Error obteniendo feed de amigos:', error.message);
    return { posts: [], hasMore: false, error };
  }
};

// 8. Reportar publicación (vía RPC seguro report_post)
export const reportPost = async (postId, reporterId, reason, details = '') => {
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('report_post', {
      p_post_id: postId,
      p_reason: reason,
      p_details: details || '',
    });

    if (!rpcError) {
      return { report: rpcData, error: null };
    }

    // Fallback a inserción directa
    const { data, error } = await supabase
      .from('reports')
      .insert({
        post_id: postId,
        reporter_id: reporterId,
        reason,
        details,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) throw rpcError || error;
    return { report: data, error: null };
  } catch (error) {
    console.error('Error al reportar publicación:', error.message);
    return { report: null, error };
  }
};
