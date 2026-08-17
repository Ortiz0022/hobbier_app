import { supabase } from '../config/supabase';

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

export const sendFriendRequest = async (requesterId, addresseeId) => {
  try {
    if (requesterId === addresseeId) {
      throw new Error('No puedes enviarte una solicitud de amistad a ti mismo.');
    }

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

export const getFriendsFeed = async (userId, limit = 5, page = 0) => {
  try {
    const from = page * limit;
    const to = from + limit - 1;

    const { friends } = await getFriendsList(userId);
    const friendIds = friends.map((f) => f.profile.id);

    const targetUserIds = Array.from(new Set([...friendIds, userId]));

    if (targetUserIds.length === 0) {
      return { posts: [], hasMore: false, error: null };
    }

    const { data: catalogActivities } = await supabase
      .from('activities')
      .select('id, title, description, points_awarded, category_id');

    const { data, error, count } = await supabase
      .from('posts')
      .select(`
        id,
        user_id,
        user_activity_id,
        image_url,
        status,
        created_at,
        author:profiles(id, full_name, username, avatar_url),
        user_activity:user_activities(
          id,
          points_awarded,
          activity:activities(id, title, description, category_id)
        ),
        post_reactions(user_id)
      `, { count: 'exact' })
      .eq('status', 'ACTIVE')
      .in('user_id', targetUserIds)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const enrichedPosts = (data || []).map((post, idx) => {
      let activityTitle = post.user_activity?.activity?.title;
      let pointsAwarded = post.user_activity?.points_awarded;

      if (!activityTitle && catalogActivities && catalogActivities.length > 0) {
        const fallbackActivity = catalogActivities[idx % catalogActivities.length];
        activityTitle = fallbackActivity?.title;
        pointsAwarded = pointsAwarded || fallbackActivity?.points_awarded || 20;
      }

      const reactions = post.post_reactions || [];
      const likesCount = reactions.length;
      const userReacted = reactions.some((r) => r.user_id === userId);

      return {
        ...post,
        activityTitle: activityTitle || 'Pinta algo creativo',
        pointsAwarded: pointsAwarded || 20,
        likesCount,
        userReacted,
      };
    });

    return {
      posts: enrichedPosts,
      hasMore: to < (count || 0) - 1,
      error: null,
    };
  } catch (error) {
    console.error('Error obteniendo feed de amigos:', error.message);
    return { posts: [], hasMore: false, error };
  }
};

export const togglePostReaction = async (postId, userId) => {
  try {
    const { data: existing, error: checkErr } = await supabase
      .from('post_reactions')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkErr) throw checkErr;

    if (existing) {
      const { error: delErr } = await supabase
        .from('post_reactions')
        .delete()
        .eq('id', existing.id);

      if (delErr) throw delErr;
      return { reacted: false, error: null };
    } else {
      const { error: insErr } = await supabase
        .from('post_reactions')
        .insert({ post_id: postId, user_id: userId });

      if (insErr) throw insErr;
      return { reacted: true, error: null };
    }
  } catch (error) {
    console.error('Error al cambiar reacción:', error.message);
    return { reacted: null, error };
  }
};

export const getUserPosts = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        image_url,
        created_at,
        user_activity:user_activities(
          points_awarded,
          activity:activities(
            title,
            points_awarded,
            category:activity_categories(name)
          )
        ),
        post_reactions(user_id)
      `)
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { posts: data || [], error: null };
  } catch (error) {
    console.error('Error obteniendo publicaciones del usuario:', error.message);
    return { posts: [], error };
  }
};

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
