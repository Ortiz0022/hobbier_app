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
        reports(id, reason, details, created_at, reporter:profiles(full_name, username)),
        user_activity:user_activities(
          activity:activities(
            title,
            description,
            points_awarded,
            category:activity_categories(name)
          )
        )
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

    // Decidida la publicación, sus reportes dejan de estar pendientes: si no,
    // el contador de "reportes pendientes" del resumen no bajaría nunca y
    // seguiría pidiendo revisar algo ya revisado. Mismo criterio que
    // resolveProfileAdmin con profile_reports.
    const { error: errorReportes } = await supabase
      .from('reports')
      .update({ status: 'RESOLVED' })
      .eq('post_id', postId)
      .eq('status', 'PENDING');

    if (errorReportes) {
      console.error('La publicación se resolvió pero sus reportes siguen pendientes:', errorReportes.message);
    }

    return { post: data, error: null };
  } catch (error) {
    console.error('Error al resolver reporte admin:', error.message);
    return { post: null, error };
  }
};

/**
 * Catálogo completo, de una página en una.
 *
 * `count: 'exact'` devuelve cuántas hay en total sin traerlas: es lo que
 * necesita el paginador para saber cuántas páginas hay, y `range` trae solo
 * las de la página pedida en vez de todo el catálogo.
 */
export const getAllActivitiesAdmin = async ({ pagina = 1, porPagina = 10 } = {}) => {
  try {
    const desde = (pagina - 1) * porPagina;
    const { data, count, error } = await supabase
      .from('activities')
      .select(
        `
        *,
        category:activity_categories(name)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(desde, desde + porPagina - 1);

    if (error) throw error;
    return { activities: data || [], total: count || 0, error: null };
  } catch (error) {
    console.error('Error al obtener actividades admin:', error.message);
    return { activities: [], total: 0, error };
  }
};

export const createActivityAdmin = async ({
  title,
  description,
  categoryId,
  // Gusto con el que se etiqueta la actividad. Es lo que la hace recomendable:
  // sin ninguna etiqueta, get_recommended_activity la trata como comodín y se la
  // ofrece a cualquier perfil, sin importar qué marcó el usuario.
  likeId,
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

    // La relación va aparte porque activity_likes necesita el id que Postgres
    // acaba de generar. Si fallara, la actividad ya existe: se avisa por consola
    // en vez de dejar al admin creyendo que no se creó nada.
    if (likeId) {
      const { error: likeError } = await supabase
        .from('activity_likes')
        .insert({ activity_id: data.id, like_id: likeId });

      if (likeError) {
        console.error('La actividad se creó pero no se pudo etiquetar:', likeError.message);
      }
    }

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

export const getReportedProfilesAdmin = async () => {
  try {
    // 1. Get profiles with reported posts
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select(`
        id,
        user_id,
        status,
        author:profiles!posts_user_id_fkey(id, full_name, username, avatar_url, status)
      `)
      .eq('status', 'REPORTED');
      
    if (postsError) throw postsError;

    // 2. Get profile reports (if the table exists)
    let profileReportsData = [];
    try {
      const { data, error } = await supabase
        .from('profile_reports')
        .select(`
          id,
          reason,
          details,
          reported_profile:profiles!profile_reports_reported_profile_id_fkey(id, full_name, username, avatar_url, status)
        `)
        .eq('status', 'PENDING');
      if (!error && data) {
        profileReportsData = data;
      }
    } catch (e) {
      console.log('profile_reports table might not exist yet', e);
    }

    // Combine and aggregate by profile
    const profileMap = new Map();

    (postsData || []).forEach(post => {
      const author = post.author;
      if (!author) return;
      if (!profileMap.has(author.id)) {
        profileMap.set(author.id, {
          profile: author,
          reportedPostsCount: 0,
          profileReportsCount: 0,
          reasons: new Set()
        });
      }
      profileMap.get(author.id).reportedPostsCount += 1;
    });

    (profileReportsData || []).forEach(report => {
      const profile = report.reported_profile;
      if (!profile) return;
      if (!profileMap.has(profile.id)) {
        profileMap.set(profile.id, {
          profile: profile,
          reportedPostsCount: 0,
          profileReportsCount: 0,
          reasons: new Set()
        });
      }
      const entry = profileMap.get(profile.id);
      entry.profileReportsCount += 1;
      if (report.reason) entry.reasons.add(report.reason);
    });

    const results = Array.from(profileMap.values()).map(p => ({
      ...p,
      reasons: Array.from(p.reasons)
    }));

    return { profiles: results, error: null };
  } catch (error) {
    console.error('Error al obtener perfiles reportados admin:', error.message);
    return { profiles: [], error };
  }
};

/**
 * Suspende o reactiva un perfil.
 *
 * La suspensión tiene que escribir TAMBIÉN suspended_until: el bloqueo del
 * login (AuthContext.checkSuspension) solo frena a quien tiene status 'BANNED'
 * *y* una fecha futura, igual que hace el trigger de perfiles reportados. Con
 * status a secas la cuenta quedaba marcada pero el usuario seguía entrando.
 */
export const resolveProfileAdmin = async (profileId, newStatus, dias = 15) => {
  try {
    if (!['ACTIVE', 'BANNED'].includes(newStatus)) {
      throw new Error('Estado inválido para resolución de perfil.');
    }

    const cambios =
      newStatus === 'BANNED'
        ? {
            status: 'BANNED',
            suspended_until: new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString(),
          }
        : { status: 'ACTIVE', suspended_until: null };

    let { data, error } = await supabase
      .from('profiles')
      .update(cambios)
      .eq('id', profileId)
      .select()
      .single();

    if (faltaColumnaSuspension(error)) {
      console.warn(
        'La base no tiene profiles.suspended_until: se suspende sin fecha. ' +
          'Aplica supabase/suspension_cuentas.sql para que el bloqueo al entrar funcione.'
      );
      const reintento = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', profileId)
        .select()
        .single();
      data = reintento.data;
      error = reintento.error;
    }

    if (error) throw error;
    
    // Resolve pending profile reports if they exist
    try {
      await supabase
        .from('profile_reports')
        .update({ status: 'RESOLVED' })
        .eq('reported_profile_id', profileId)
        .eq('status', 'PENDING');
    } catch (e) {
      console.log('Ignored profile_reports update error', e);
    }

    return { profile: data, error: null };
  } catch (error) {
    console.error('Error al resolver perfil admin:', error.message);
    return { profile: null, error };
  }
};


// ============================================================
// PANEL DE ADMINISTRACIÓN: DATOS GENERALES DEL SISTEMA
// ============================================================
// Todo lo de abajo se apoya en las políticas que ya existen en schema.sql: el
// ADMIN puede leer todos los perfiles ("Ver perfiles" USING true), todas las
// publicaciones sea cual sea su estado ("Ver posts en feed" incluye el OR de
// admin) y todas las actividades. No hace falta ninguna RPC nueva.
//
// Lo que NO se puede contar desde aquí: user_activities (su política solo deja
// ver las propias y las completadas de amigos) y rooms (solo las del usuario).
// Por eso el resumen no habla de misiones ni de salas.

/**
 * ¿El error es "esa columna no existe"?
 *
 * La columna suspended_until llega con el lote supabase/suspension_cuentas.sql.
 * Mientras no se aplique, PostgREST responde 42703 al leerla y PGRST204 al
 * escribirla. Moderar no puede depender de eso: suspender a alguien es más
 * importante que apuntar hasta cuándo.
 */
const faltaColumnaSuspension = (error) =>
  !!error &&
  (error.code === '42703' ||
    error.code === 'PGRST204' ||
    /suspended_until/.test(error.message || ''));

const HACE_UNA_SEMANA = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

// Cuenta filas sin traérselas: head + count exacto.
const contar = async (tabla, aplicarFiltros = (q) => q) => {
  const { count, error } = await aplicarFiltros(
    supabase.from(tabla).select('id', { count: 'exact', head: true })
  );
  if (error) throw error;
  return count || 0;
};

/**
 * Cifras para la pantalla principal del panel. Van en paralelo porque son
 * nueve consultas independientes y en serie se notaría la espera.
 */
export const getSystemStatsAdmin = async () => {
  try {
    const semana = HACE_UNA_SEMANA();

    const [
      usuarios,
      usuariosNuevos,
      usuariosSuspendidos,
      postsActivos,
      postsReportados,
      postsOcultos,
      postsSemana,
      actividades,
      actividadesActivas,
      reportesPendientes,
      reportesPerfilPendientes,
    ] = await Promise.all([
      contar('profiles'),
      contar('profiles', (q) => q.gte('created_at', semana)),
      contar('profiles', (q) => q.eq('status', 'BANNED')),
      contar('posts', (q) => q.eq('status', 'ACTIVE')),
      contar('posts', (q) => q.eq('status', 'REPORTED')),
      contar('posts', (q) => q.eq('status', 'DELETED')),
      contar('posts', (q) => q.gte('created_at', semana)),
      contar('activities'),
      contar('activities', (q) => q.eq('is_active', true)),
      contar('reports', (q) => q.eq('status', 'PENDING')),
      contar('profile_reports', (q) => q.eq('status', 'PENDING')),
    ]);

    // Una actividad sin ningún gusto asociado no la recomienda nunca
    // get_recommended_activity salvo como comodín: es contenido que está en el
    // catálogo pero nadie va a ver. Vale la pena que el admin lo sepa.
    let actividadesSinGusto = null;
    try {
      const [{ data: ids }, { data: etiquetadas }] = await Promise.all([
        supabase.from('activities').select('id').eq('is_active', true),
        supabase.from('activity_likes').select('activity_id'),
      ]);
      if (ids) {
        const conGusto = new Set((etiquetadas || []).map((fila) => fila.activity_id));
        actividadesSinGusto = ids.filter((fila) => !conGusto.has(fila.id)).length;
      }
    } catch (e) {
      console.log('No se pudo calcular las actividades sin gusto:', e?.message);
    }

    return {
      stats: {
        usuarios,
        usuariosNuevos,
        usuariosSuspendidos,
        postsActivos,
        postsReportados,
        postsOcultos,
        postsSemana,
        actividades,
        actividadesActivas,
        actividadesSinGusto,
        reportesPendientes,
        reportesPerfilPendientes,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error al obtener estadísticas admin:', error.message);
    return { stats: null, error };
  }
};

/**
 * Da o quita el rol de administrador.
 *
 * Es el mismo campo que lee AuthContext (profiles.role) para decidir si
 * alguien ve el panel, y la tabla solo acepta 'USER' o 'ADMIN' por CHECK: un
 * valor inventado lo rechaza Postgres, no la app.
 */
export const setProfileRoleAdmin = async (profileId, newRole) => {
  try {
    if (!['USER', 'ADMIN'].includes(newRole)) {
      throw new Error('Rol inválido.');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profileId)
      .select()
      .single();

    if (error) throw error;
    return { profile: data, error: null };
  } catch (error) {
    console.error('Error al cambiar el rol:', error.message);
    return { profile: null, error };
  }
};

/**
 * Todos los usuarios del sistema. Quién está EN LÍNEA no sale de aquí: eso lo
 * sabe el canal de Presence (PresenceContext), que es tiempo real.
 */
export const getAllUsersAdmin = async () => {
  const columnas = 'id, full_name, username, avatar_url, points, role, status, created_at, suspended_until';
  try {
    let { data, error } = await supabase
      .from('profiles')
      .select(columnas)
      .order('created_at', { ascending: false });

    // Si la base todavía no tiene la columna de suspensión, mejor la lista sin
    // esa columna que una pantalla vacía.
    if (faltaColumnaSuspension(error)) {
      const reintento = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, points, role, status, created_at')
        .order('created_at', { ascending: false });
      data = reintento.data;
      error = reintento.error;
    }

    if (error) throw error;
    return { users: data || [], error: null };
  } catch (error) {
    console.error('Error al obtener usuarios admin:', error.message);
    return { users: [], error };
  }
};

/**
 * Publicaciones por estado, de una página en una.
 *
 * Antes traía las 50 más recientes y las pintaba de golpe, así que lo más
 * viejo no había manera de verlo. Ahora el tope es la página.
 */
export const getPostsAdmin = async (status = 'ACTIVE', { pagina = 1, porPagina = 10 } = {}) => {
  try {
    const desde = (pagina - 1) * porPagina;
    const { data, count, error } = await supabase
      .from('posts')
      .select(`
        id,
        image_url,
        status,
        created_at,
        author:profiles!posts_user_id_fkey(id, full_name, username, avatar_url),
        reports(id, reason, details, created_at, reporter:profiles(full_name, username)),
        user_activity:user_activities(
          activity:activities(
            title,
            description,
            points_awarded,
            category:activity_categories(name)
          )
        )
      `, { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(desde, desde + porPagina - 1);

    if (error) throw error;
    return { posts: data || [], total: count || 0, error: null };
  } catch (error) {
    console.error('Error al obtener publicaciones admin:', error.message);
    return { posts: [], total: 0, error };
  }
};

// ============================================================
// ETIQUETAS DE UNA ACTIVIDAD (GUSTOS E INTERESES)
// ============================================================
// Son las que deciden a quién se le recomienda: get_recommended_activity cruza
// activity_likes con los gustos del usuario. Una actividad sin ningún gusto no
// le toca a nadie en concreto, solo sale como comodín, así que poder
// etiquetarla después de crearla no es un adorno.
//
// Las dos tablas tienen política de admin FOR ALL en schema.sql; para leerlas
// basta la pública de lectura.

const TABLAS_ETIQUETA = {
  likes: { tabla: 'activity_likes', columna: 'like_id', catalogo: 'likes' },
  interests: { tabla: 'activity_interests', columna: 'interest_id', catalogo: 'interests' },
};

/**
 * Gustos e intereses de varias actividades a la vez, para pintarlos en la
 * lista del catálogo sin una consulta por tarjeta.
 *
 * Devuelve { [activityId]: { likes: [{id, name}], interests: [{id, name}] } }.
 */
export const getActivityTagsAdmin = async (activityIds = []) => {
  if (!activityIds.length) return { tags: {}, error: null };

  try {
    const [gustos, intereses] = await Promise.all([
      supabase
        .from('activity_likes')
        .select('activity_id, like:likes(id, name)')
        .in('activity_id', activityIds),
      supabase
        .from('activity_interests')
        .select('activity_id, interest:interests(id, name)')
        .in('activity_id', activityIds),
    ]);

    if (gustos.error) throw gustos.error;
    if (intereses.error) throw intereses.error;

    const tags = {};
    const hueco = (id) => {
      if (!tags[id]) tags[id] = { likes: [], interests: [] };
      return tags[id];
    };

    (gustos.data || []).forEach((fila) => {
      if (fila.like) hueco(fila.activity_id).likes.push(fila.like);
    });
    (intereses.data || []).forEach((fila) => {
      if (fila.interest) hueco(fila.activity_id).interests.push(fila.interest);
    });

    return { tags, error: null };
  } catch (error) {
    console.error('Error al obtener las etiquetas de las actividades:', error.message);
    return { tags: {}, error };
  }
};

/**
 * Deja las etiquetas de una actividad como dice la selección.
 *
 * Compara con lo que hay guardado AHORA (no con lo que creía la pantalla) y
 * solo inserta lo que falta y borra lo que sobra: así dos administradores
 * editando a la vez no se pisan el trabajo entero, y volver a guardar sin
 * cambios no escribe nada.
 */
export const updateActivityTagsAdmin = async (activityId, { likeIds = [], interestIds = [] }) => {
  try {
    const deseados = { likes: likeIds, interests: interestIds };

    for (const clave of Object.keys(TABLAS_ETIQUETA)) {
      const { tabla, columna } = TABLAS_ETIQUETA[clave];

      const { data: filas, error: errorLectura } = await supabase
        .from(tabla)
        .select(columna)
        .eq('activity_id', activityId);
      if (errorLectura) throw errorLectura;

      const actuales = (filas || []).map((fila) => fila[columna]);
      const quieren = new Set(deseados[clave]);
      const hay = new Set(actuales);

      const aInsertar = deseados[clave]
        .filter((id) => !hay.has(id))
        .map((id) => ({ activity_id: activityId, [columna]: id }));
      const aBorrar = actuales.filter((id) => !quieren.has(id));

      if (aInsertar.length) {
        const { error } = await supabase.from(tabla).insert(aInsertar);
        if (error) throw error;
      }
      if (aBorrar.length) {
        const { error } = await supabase
          .from(tabla)
          .delete()
          .eq('activity_id', activityId)
          .in(columna, aBorrar);
        if (error) throw error;
      }
    }

    return { error: null };
  } catch (error) {
    console.error('Error al guardar las etiquetas de la actividad:', error.message);
    return { error };
  }
};

/**
 * Reportes hechos DIRECTAMENTE contra un perfil, sin resolver.
 *
 * A diferencia de getReportedProfilesAdmin, esta no mezcla a quien tiene una
 * publicación reportada: una foto que alguien marcó no es una denuncia contra
 * la persona, y juntarlas hacía que "usuarios reportados" enseñara gente a la
 * que nadie había reportado. Las publicaciones se revisan en su propia
 * sección, con la foto y el motivo delante.
 *
 * Devuelve { [profileId]: { cuenta, motivos: [] } }.
 */
export const getPendingProfileReportsAdmin = async () => {
  try {
    const { data, error } = await supabase
      .from('profile_reports')
      .select('id, reason, details, created_at, reported_profile_id')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const reportes = {};
    (data || []).forEach((fila) => {
      const id = fila.reported_profile_id;
      if (!id) return;
      if (!reportes[id]) reportes[id] = { cuenta: 0, motivos: [] };
      reportes[id].cuenta += 1;
      if (fila.reason && !reportes[id].motivos.includes(fila.reason)) {
        reportes[id].motivos.push(fila.reason);
      }
    });

    return { reportes, error: null };
  } catch (error) {
    console.error('Error al obtener los reportes de perfil:', error.message);
    return { reportes: {}, error };
  }
};
