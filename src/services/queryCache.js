// Datos de navegación: solo memoria, sin persistir información privada en disco.
// Los resultados caducan a los 30 s; las pantallas pueden mostrar el último
// resultado durante la recarga (hasta 5 min). Nunca se cachean errores.
const entries = new Map();
const DEFAULT_TTL = 30_000;
const MAX_AGE = 5 * 60_000;
const MAX_ENTRIES = 100;
let sessionUser = null;
let epoch = 0;

export const queryKey = (resource, ...args) => JSON.stringify([sessionUser, resource, ...args]);
export const queryKeys = {
  activities: (userId) => queryKey('activities', userId),
  posts: (userId) => queryKey('posts', userId),
  friends: (userId) => queryKey('friends', userId),
  receivedRequests: (userId) => queryKey('receivedRequests', userId),
  sentRequests: (userId) => queryKey('sentRequests', userId),
  suggestions: (userId) => queryKey('suggestions', userId),
  feed: (userId, limit = 5, page = 0, before = null) => queryKey('feed', userId, limit, page, before),
  rooms: () => queryKey('rooms'),
  roomInvitations: () => queryKey('roomInvitations'),
};

export const clearQueryCache = () => {
  entries.clear();
  epoch += 1;
};

export const setQueryCacheUser = (userId) => {
  const next = userId || null;
  if (next !== sessionUser) {
    clearQueryCache();
    sessionUser = next;
  }
};

export const invalidateQueries = (...tags) => {
  for (const [key, entry] of entries) {
    if (entry.tags.some((tag) => tags.includes(tag))) entries.delete(key);
  }
};

export const peekQuery = (key) => {
  const entry = entries.get(key);
  if (!entry || entry.data === undefined) return undefined;
  if (Date.now() - entry.updatedAt > MAX_AGE) {
    if (!entry.promise) entries.delete(key);
    return undefined;
  }
  return entry.data;
};

const trimCache = () => {
  for (const [key, entry] of entries) {
    if (entries.size <= MAX_ENTRIES) break;
    if (!entry.promise) entries.delete(key);
  }
};

export const fetchQuery = (key, load, { force = false, ttl = DEFAULT_TTL, tags = [] } = {}) => {
  const previous = entries.get(key);
  // Incluso dos recargas simultáneas comparten una única petición.
  if (previous?.promise) return previous.promise;
  if (!force && previous?.data !== undefined && Date.now() - previous.updatedAt < ttl) {
    return Promise.resolve(previous.data);
  }
  const entry = { data: previous?.data, updatedAt: previous?.updatedAt ?? 0, tags, promise: null };
  const startedIn = epoch;
  const restore = () => {
    if (entries.get(key) !== entry) return;
    if (previous?.data !== undefined) entries.set(key, previous);
    else entries.delete(key);
  };
  entry.promise = Promise.resolve().then(load).then((result) => {
    if (startedIn === epoch && entries.get(key) !== entry) {
      // Si una mutación invalidó una lectura todavía en curso, sus consumidores
      // esperan la lectura nueva en vez de recibir el resultado anterior.
      return fetchQuery(key, load, { ttl, tags });
    }
    if (result?.error) {
      restore();
    } else if (entries.get(key) === entry) {
      // Una petición anterior a una mutación/cierre de sesión no puede
      // volver a introducir datos invalidados en la caché.
      entry.data = result;
      entry.updatedAt = Date.now();
      entry.promise = null;
      trimCache();
    }
    return result;
  }, (error) => {
    restore();
    throw error;
  });
  entries.set(key, entry);
  return entry.promise;
};
