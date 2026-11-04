import { useCallback, useEffect, useRef, useState } from 'react';
import { getReceivedLikes } from '../../../services/receivedLikesService';

export const useReceivedLikes = (userId) => {
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [moreError, setMoreError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const generation = useRef(0);
  const cursor = useRef(null);
  const paging = useRef(false);

  const load = useCallback(async (append = false) => {
    if (!userId || (append && (paging.current || !cursor.current))) return;
    const request = append ? generation.current : ++generation.current;
    const before = append ? cursor.current : null;
    if (append) {
      paging.current = true;
      setLoadingMore(true);
      setMoreError(null);
    } else {
      cursor.current = null;
      paging.current = false;
      setLoading(true);
      setError(null);
      setMoreError(null);
    }

    try {
      const result = await getReceivedLikes(userId, { before });
      if (request !== generation.current) return;
      if (result.error) throw result.error;
      setReactions((previous) => {
        if (!append) return result.reactions;
        const ids = new Set(previous.map((reaction) => reaction.id));
        return [...previous, ...result.reactions.filter((reaction) => !ids.has(reaction.id))];
      });
      cursor.current = result.nextCursor;
      setHasMore(result.hasMore);
    } catch (failure) {
      if (request === generation.current) {
        if (append) setMoreError(failure);
        else setError(failure);
      }
    } finally {
      if (request === generation.current) {
        setLoading(false);
        setLoadingMore(false);
        paging.current = false;
      }
    }
  }, [userId]);

  useEffect(() => {
    setReactions([]);
    setHasMore(false);
    setError(null);
    setMoreError(null);
    setLoadingMore(false);
    cursor.current = null;
    paging.current = false;
    if (userId) load();
    else setLoading(false);
    return () => { generation.current += 1; };
  }, [userId, load]);

  const refetch = useCallback(() => load(), [load]);
  const loadMore = useCallback(() => load(true), [load]);
  return { reactions, loading, loadingMore, hasMore, error, moreError, refetch, loadMore };
};
