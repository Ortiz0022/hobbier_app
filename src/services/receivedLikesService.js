import { supabase } from '../config/supabase';

const PAGE_SIZE = 20;

// Se consulta al abrir/actualizar la bandeja: retirar una reacción no deja un aviso obsoleto.
export const getReceivedLikes = async (userId, { before = null } = {}) => {
  const empty = { reactions: [], hasMore: false, nextCursor: null };
  if (!userId) return { ...empty, error: null };

  try {
    let query = supabase
      .from('post_reactions')
      .select(`
        id, created_at,
        liker:profiles!post_reactions_user_id_fkey(id, username, full_name, avatar_url, points),
        post:posts!inner(id, user_id, image_url, status)
      `)
      .eq('post.user_id', userId)
      .eq('post.status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (before) {
      const date = new Date(before.created_at);
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(before.created_at || '') || !Number.isFinite(date.getTime()) || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(before.id || '')) {
        throw new Error('Invalid reaction cursor');
      }
      // Conservar los microsegundos de PostgreSQL: Date.toISOString() los truncaría.
      const timestamp = before.created_at;
      // El id desempata likes con la misma fecha. Los nuevos no desplazan las páginas antiguas.
      query = query.or(`created_at.lt.${timestamp},and(created_at.eq.${timestamp},id.lt.${before.id})`);
    }

    const { data, error } = await query.limit(PAGE_SIZE + 1);
    if (error) throw error;
    const reactions = (data || []).slice(0, PAGE_SIZE);
    const hasMore = (data || []).length > PAGE_SIZE;
    const last = reactions[reactions.length - 1];
    return {
      reactions,
      hasMore,
      nextCursor: hasMore ? { created_at: last.created_at, id: last.id } : null,
      error: null,
    };
  } catch (error) {
    console.error('Error obteniendo likes recibidos:', error.message);
    return { ...empty, error };
  }
};
