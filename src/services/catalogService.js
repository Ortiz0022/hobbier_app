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

// Solo el catálogo de recursos. Son 9 opciones fijas que la pantalla muestra
// enteras; gustos e intereses ya no se descargan completos (ver CatalogPicker).
export const fetchResourcesCatalog = async () => {
  try {
    const { data, error } = await supabase.from('resources').select('*').order('name');
    if (error) throw error;
    return { resources: data || [], error: null };
  } catch (error) {
    console.error('Error al obtener recursos:', error.message);
    return { resources: [], error };
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

/**
 * Guarda las tres listas de preferencias del usuario.
 *
 * Una sola RPC transaccional en vez de las 4-6 llamadas sueltas de antes: si
 * fallaba una después de los DELETE, el usuario se quedaba SIN preferencias.
 * El usuario sale de auth.uid() dentro de la función, no de este parámetro.
 *
 * Requiere supabase/rpc_preferencias.sql aplicado.
 *
 * `userId` se mantiene en la firma para no tocar las llamadas existentes, pero
 * la base lo ignora a propósito.
 */
export const saveUserPreferences = async (userId, selectedLikes, selectedInterests, selectedResources) => {
  try {
    const { error } = await supabase.rpc('guardar_preferencias', {
      p_likes: selectedLikes || [],
      p_interests: selectedInterests || [],
      p_resources: selectedResources || [],
    });

    if (error) throw error;
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

// ==================================================
// CATÁLOGOS CON BÚSQUEDA (gustos e intereses)
// ==================================================
// El filtrado ocurre en Postgres, no en el dispositivo: la pantalla pide unas
// pocas opciones y luego busca, en vez de descargarse el catálogo entero.

/** Tablas que admiten búsqueda. Evita interpolar un nombre de tabla arbitrario. */
const CATALOGOS_BUSCABLES = ['likes', 'interests'];

const validarCatalogo = (tabla) => {
  if (!CATALOGOS_BUSCABLES.includes(tabla)) {
    throw new Error(`Catálogo no buscable: ${tabla}`);
  }
};

/** Primeras opciones que ve el usuario al abrir la pantalla. */
export const fetchCatalogoInicial = async (tabla, limite = 5) => {
  validarCatalogo(tabla);
  const { data, error } = await supabase
    .from(tabla)
    .select('id, name, icon')
    .order('name')
    .limit(limite);

  if (error) throw error;
  return data || [];
};

/**
 * Busca por nombre, sin distinguir mayúsculas ni tildes.
 *
 * Compara contra `name_normalizado`, la columna generada que crea
 * supabase/rpc_preferencias.sql. Si ese script todavía no se ha aplicado, la
 * columna no existe (código 42703) y se cae a una búsqueda normal por `name`,
 * que distingue tildes pero deja la pantalla utilizable.
 */
export const buscarEnCatalogo = async (tabla, texto, limite = 20) => {
  validarCatalogo(tabla);
  const termino = (texto || '').trim();
  if (!termino) return [];

  const normalizado = termino.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

  const { data, error } = await supabase
    .from(tabla)
    .select('id, name, icon')
    .ilike('name_normalizado', `%${normalizado}%`)
    .order('name')
    .limit(limite);

  if (!error) return data || [];

  if (error.code === '42703') {
    const respaldo = await supabase
      .from(tabla)
      .select('id, name, icon')
      .ilike('name', `%${termino}%`)
      .order('name')
      .limit(limite);
    if (respaldo.error) throw respaldo.error;
    return respaldo.data || [];
  }

  throw error;
};

/**
 * Filas concretas por id. Hace falta para pintar lo ya elegido: sus opciones
 * pueden no estar entre las iniciales ni entre los resultados de la búsqueda.
 */
export const fetchCatalogoPorIds = async (tabla, ids) => {
  validarCatalogo(tabla);
  if (!ids || ids.length === 0) return [];
  const { data, error } = await supabase
    .from(tabla)
    .select('id, name, icon')
    .in('id', ids)
    .order('name');

  if (error) throw error;
  return data || [];
};
