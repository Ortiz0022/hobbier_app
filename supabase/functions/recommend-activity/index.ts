// ==================================================
// HOBBIER - Edge Function: recommend-activity
//
// Cascada de tres pasos, en este orden:
//   1. ELEGIR    - SQL filtra y puntúa; Groq escoge de entre los candidatos.
//   2. CREAR     - si no queda ninguno, Groq inventa una actividad nueva a partir
//                  de las preferencias del usuario y se guarda en el catálogo.
//   3. REPETIR   - si tampoco se pudo crear, se vuelve a consultar permitiendo
//                  actividades ya completadas.
// Así el usuario nunca se queda sin recomendación.
// ==================================================
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const CANDIDATE_LIMIT = 10;
const GROQ_TIMEOUT_MS = 8000; // el usuario está esperando: mejor respaldo que colgarse
const MAX_REASON = 140;

// Tope de actividades que la IA puede crear por usuario y día. Sin esto, alguien
// pulsando "Sorpréndeme" en bucle dispararía llamadas ilimitadas a Groq.
const MAX_GENERATED_PER_DAY = 3;

const MAX_TITLE = 60;
const MAX_DESCRIPTION = 200;
const MIN_POINTS = 10;
const MAX_POINTS = 30;

type Candidate = {
  id: string;
  title: string;
  description: string;
  category_name: string | null;
  points_awarded: number;
  source: string;
  matched_likes: string[];
  matched_interests: string[];
  match_score: number;
};

type Tag = { id: string; name: string };
type Preferences = { likes: Tag[]; interests: Tag[]; resources: string[] };

// Llamada desde el navegador: antes del POST se manda un OPTIONS de sondeo, porque
// enviamos la cabecera Authorization. Si esa respuesta no trae permisos CORS y un
// estado OK, el navegador bloquea la petición real y ni siquiera llega aquí.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

const utcTodayStart = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
};

const callGroq = async (apiKey: string, system: string, user: string) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: GROQ_MODEL,
        response_format: { type: "json_object" },
        temperature: 0.7,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Groq respondió ${response.status}: ${body.slice(0, 300)}`);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("Groq devolvió una respuesta sin contenido.");
    return JSON.parse(content) as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
};

/** Preferencias del usuario con id y nombre: el id hace falta para etiquetar. */
const fetchPreferences = async (client: SupabaseClient): Promise<Preferences> => {
  const [likesRes, interestsRes, resourcesRes] = await Promise.all([
    client.from("user_likes").select("likes(id, name)"),
    client.from("user_interests").select("interests(id, name)"),
    client.from("user_resources").select("resources(name)"),
  ]);

  const tags = (rows: unknown[] | null, key: string): Tag[] =>
    (rows ?? [])
      .map((row) => (row as Record<string, Tag | null>)[key])
      .filter((tag): tag is Tag => Boolean(tag?.id && tag?.name));

  return {
    likes: tags(likesRes.data, "likes"),
    interests: tags(interestsRes.data, "interests"),
    resources: (resourcesRes.data ?? [])
      .map((row) => (row as { resources?: { name?: string } | null }).resources?.name)
      .filter((name): name is string => Boolean(name)),
  };
};

// --------------------------------------------------
// PASO 1: elegir entre los candidatos
// --------------------------------------------------
const buildPickPrompt = (prefs: Preferences, candidates: Candidate[]): string => {
  const list = (values: string[], fallback: string) =>
    values.length > 0 ? values.join(", ") : fallback;

  // Las etiquetas se presentan como PISTA, no como veredicto: el panel de admin
  // crea las actividades sin etiquetar, y darlas por "no compatibles" dejaría
  // fuera a casi todo el catálogo real.
  const options = candidates
    .map((c, i) => {
      const categoria = c.category_name ? ` [categoría: ${c.category_name}]` : "";
      const etiquetas = [...c.matched_likes, ...c.matched_interests];
      const pista = etiquetas.length > 0 ? ` (ya etiquetada con: ${etiquetas.join(", ")})` : "";
      return `${i + 1}. ${c.title}${categoria} — ${c.description}${pista}`;
    })
    .join("\n");

  const likeNames = prefs.likes.map((t) => t.name);
  const interestNames = prefs.interests.map((t) => t.name);
  const sinPreferencias = likeNames.length === 0 && interestNames.length === 0;

  return [
    `Gustos de la persona: ${list(likeNames, "no ha registrado ninguno")}.`,
    `Intereses de la persona: ${list(interestNames, "no ha registrado ninguno")}.`,
    "",
    "Actividades disponibles:",
    options,
    "",
    sinPreferencias
      ? `Esta persona todavía no registró preferencias: elige la actividad más accesible y atractiva para empezar, y responde con su número (1-${candidates.length}).`
      : `Decide cuál encaja mejor leyendo el título y la descripción de cada actividad ` +
        `y comparándolos con sus gustos e intereses. Que una actividad no traiga ` +
        `etiquetas NO significa que no encaje: júzgala por su contenido. ` +
        `Responde con su número (1-${candidates.length}).`,
  ].join("\n");
};

const pickWithGroq = async (apiKey: string, prefs: Preferences, candidates: Candidate[]) => {
  const parsed = await callGroq(
    apiKey,
    "Eres un recomendador de actividades. Recibes los gustos e intereses de una persona y " +
      "una lista numerada de actividades ya filtradas. Elige UNA. Deduces la afinidad LEYENDO " +
      "el título y la descripción: las etiquetas que a veces se incluyen son solo una pista, y " +
      "su ausencia no dice nada sobre si encaja. Responde ÚNICAMENTE con un objeto JSON con las " +
      "claves: option (integer, el número elegido) y reason (string en español, máx 140 " +
      "caracteres, de tú, nombrando el gusto o interés concreto por el que se la recomiendas). " +
      "No inventes actividades fuera de la lista. No agregues texto fuera del JSON.",
    buildPickPrompt(prefs, candidates),
  );

  // Nunca se confía en la salida: el índice debe existir en la lista enviada.
  const option = Number(parsed.option);
  if (!Number.isInteger(option) || option < 1 || option > candidates.length) {
    throw new Error(`Groq eligió una opción inválida: ${JSON.stringify(parsed.option)}`);
  }

  const reason = typeof parsed.reason === "string" ? parsed.reason.trim().slice(0, MAX_REASON) : "";
  return { index: option - 1, reason };
};

// --------------------------------------------------
// PASO 2: crear una actividad nueva
// --------------------------------------------------
const buildCreatePrompt = (prefs: Preferences, existingTitles: string[]): string => {
  const list = (values: string[], fallback: string) =>
    values.length > 0 ? values.join(", ") : fallback;

  const likeNames = prefs.likes.map((t) => t.name);
  const interestNames = prefs.interests.map((t) => t.name);

  return [
    `Gustos: ${list(likeNames, "ninguno registrado")}.`,
    `Intereses: ${list(interestNames, "ninguno registrado")}.`,
    `Objetos de los que dispone: ${list(prefs.resources, "ninguno declarado")}.`,
    `Actividades que ya existen y NO debes repetir ni versionar: ${list(existingTitles, "ninguna")}.`,
    "",
    "Inventa UNA actividad nueva, concreta y realizable hoy, que solo requiera los objetos " +
      "de los que dispone.",
    likeNames.length > 0 || interestNames.length > 0
      ? `En "likes" e "interests" copia EXACTAMENTE los nombres de la lista de gustos e ` +
        `intereses de arriba que apliquen a la actividad. No inventes nombres nuevos.`
      : `Deja "likes" e "interests" como listas vacías.`,
  ].join("\n");
};

const generateActivity = async (
  apiKey: string,
  admin: SupabaseClient,
  prefs: Preferences,
  existingTitles: string[],
  userId: string,
  categories: Map<string, string>,
) => {
  const parsed = await callGroq(
    apiKey,
    "Eres un generador de actividades breves y accionables para una app de hobbies. " +
      "Responde ÚNICAMENTE con un objeto JSON con las claves: title (string, máx 60 " +
      "caracteres), description (string, 1-2 oraciones, máx 200 caracteres), category " +
      "(string, una palabra), points (integer entre 10 y 30), likes (array de strings), " +
      "interests (array de strings). No agregues texto fuera del JSON.",
    buildCreatePrompt(prefs, existingTitles),
  );

  const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
  if (!title) throw new Error("La actividad generada no trae título.");

  const description = typeof parsed.description === "string" ? parsed.description.trim() : "";
  if (!description) throw new Error("La actividad generada no trae descripción.");

  const rawPoints = Number(parsed.points);
  const points = Number.isFinite(rawPoints)
    ? Math.min(MAX_POINTS, Math.max(MIN_POINTS, Math.round(rawPoints)))
    : MIN_POINTS;

  const categoryName = typeof parsed.category === "string" ? parsed.category.trim().toLowerCase() : "";
  const categoryId = categoryName ? categories.get(categoryName) ?? null : null;

  // Solo se aceptan etiquetas que EXISTEN entre las preferencias del usuario: si el
  // modelo se inventa un gusto, se descarta en vez de crear catálogo basura.
  const matchNames = (value: unknown, available: Tag[]): string[] => {
    if (!Array.isArray(value)) return [];
    const wanted = new Set(
      value.filter((v): v is string => typeof v === "string").map((v) => v.trim().toLowerCase()),
    );
    return available.filter((tag) => wanted.has(tag.name.toLowerCase())).map((tag) => tag.id);
  };

  const likeIds = matchNames(parsed.likes, prefs.likes);
  const interestIds = matchNames(parsed.interests, prefs.interests);

  // El insert necesita service_role: RLS solo deja crear actividades a un ADMIN.
  const { data: activity, error } = await admin
    .from("activities")
    .insert({
      title: title.slice(0, MAX_TITLE),
      description: description.slice(0, MAX_DESCRIPTION),
      category_id: categoryId,
      points_awarded: points,
      is_active: true,
      source: "ai_generated",
      generated_for_user_id: userId,
    })
    .select()
    .single();

  if (error) throw error;

  // Etiquetar es lo que permite que esta actividad se recomiende bien MÁS ADELANTE,
  // tanto a esta persona como a otras con gustos parecidos.
  const tagRows = [
    ...likeIds.map((like_id) => ({ activity_id: activity.id, like_id })),
    ...interestIds.map((interest_id) => ({ activity_id: activity.id, interest_id })),
  ];

  if (likeIds.length > 0) {
    await admin
      .from("activity_likes")
      .insert(likeIds.map((like_id) => ({ activity_id: activity.id, like_id })));
  }
  if (interestIds.length > 0) {
    await admin
      .from("activity_interests")
      .insert(interestIds.map((interest_id) => ({ activity_id: activity.id, interest_id })));
  }

  console.log(
    `Actividad generada para ${userId}: "${activity.title}" con ${tagRows.length} etiquetas.`,
  );

  return activity;
};

// --------------------------------------------------
// Handler
// --------------------------------------------------
Deno.serve(async (req) => {
  // El sondeo va PRIMERO: llega sin token, así que cualquier comprobación previa
  // lo rechazaría y el navegador cancelaría la petición real.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const groqApiKey = Deno.env.get("GROQ_API_KEY");

  if (!supabaseUrl || !anonKey) {
    console.error("Faltan SUPABASE_URL / SUPABASE_ANON_KEY.");
    return json({ error: "Configuración incompleta en el servidor." }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "No autenticado." }, 401);

  // Cliente con el JWT de quien llama: auth.uid() resuelve dentro del RPC y RLS
  // sigue aplicando. El service_role solo se usa para crear la actividad.
  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData?.user) return json({ error: "No autenticado." }, 401);
  const userId = userData.user.id;

  let exclude: string[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body?.exclude)) {
      exclude = body.exclude.filter((id: unknown) => typeof id === "string").slice(0, 50);
    }
  } catch {
    // Sin cuerpo o cuerpo inválido: se recomienda sin exclusiones.
  }

  const getCandidates = async (includeDone: boolean) => {
    const { data, error } = await client.rpc("get_recommendation_candidates", {
      p_limit: CANDIDATE_LIMIT,
      p_exclude: exclude,
      p_include_done: includeDone,
    });
    if (error) throw error;
    return (data ?? []) as Candidate[];
  };

  let candidates: Candidate[];
  try {
    candidates = await getCandidates(false);
  } catch (err) {
    console.error("Error obteniendo candidatos:", err instanceof Error ? err.message : err);
    return json({ error: "No se pudieron obtener candidatos." }, 500);
  }

  // ---------- PASO 1: elegir ----------
  if (candidates.length > 0) {
    if (candidates.length === 1 || !groqApiKey) {
      if (!groqApiKey) console.warn("GROQ_API_KEY ausente: se devuelve el mejor match_score.");
      return json({ activity: candidates[0], reason: null, ranked_by: "score" });
    }

    try {
      const prefs = await fetchPreferences(client);
      const { index, reason } = await pickWithGroq(groqApiKey, prefs, candidates);
      return json({ activity: candidates[index], reason: reason || null, ranked_by: "ai" });
    } catch (err) {
      console.error("Ranking con IA fallido, se usa match_score:", err instanceof Error ? err.message : err);
      return json({ activity: candidates[0], reason: null, ranked_by: "score" });
    }
  }

  // ---------- PASO 2: crear ----------
  if (groqApiKey && serviceRoleKey) {
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    try {
      const { count } = await admin
        .from("activities")
        .select("id", { count: "exact", head: true })
        .eq("source", "ai_generated")
        .eq("generated_for_user_id", userId)
        .gte("created_at", utcTodayStart());

      if ((count ?? 0) >= MAX_GENERATED_PER_DAY) {
        console.log(`Tope diario alcanzado para ${userId}: se pasa a repetir.`);
      } else {
        const [prefs, { data: titleRows }, { data: categoryRows }] = await Promise.all([
          fetchPreferences(client),
          admin.from("activities").select("title").limit(60),
          client.from("activity_categories").select("id, name"),
        ]);

        const categories = new Map<string, string>(
          (categoryRows ?? []).map(
            (row: { id: string; name: string }) =>
              [row.name.trim().toLowerCase(), row.id] as [string, string],
          ),
        );

        const activity = await generateActivity(
          groqApiKey,
          admin,
          prefs,
          (titleRows ?? []).map((row: { title: string }) => row.title),
          userId,
          categories,
        );

        return json({
          activity,
          reason: "La creamos para ti a partir de tus gustos e intereses.",
          ranked_by: "generated",
        });
      }
    } catch (err) {
      console.error("No se pudo generar actividad:", err instanceof Error ? err.message : err);
    }
  }

  // ---------- PASO 3: repetir ----------
  try {
    const repeatable = await getCandidates(true);
    if (repeatable.length > 0) {
      return json({ activity: repeatable[0], reason: null, ranked_by: "repeat" });
    }
  } catch (err) {
    console.error("Error al buscar repetibles:", err instanceof Error ? err.message : err);
  }

  return json({ activity: null, reason: null, ranked_by: "empty" });
});
