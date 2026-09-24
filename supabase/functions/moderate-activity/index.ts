import { createClient } from "jsr:@supabase/supabase-js@2";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b";
const GROQ_TIMEOUT_MS = 8000;

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
        temperature: 0.1,
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const groqApiKey = Deno.env.get("GROQ_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Faltan variables de entorno en Supabase (URL o ANON KEY).");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Usuario no encontrado" }, 401);

    const { title, description } = await req.json();
    if (!title) return json({ error: "Falta el título" }, 400);

    let isSafe = true;
    let reason = "";

    if (groqApiKey) {
      const systemPrompt = `
Eres un moderador de contenido estricto para una aplicación familiar llamada Hobbier.
Tu tarea es analizar el título y la descripción de una actividad propuesta por un usuario y determinar si contiene algo inapropiado.
Debes rechazar actividades que promuevan o contengan explícita o implícitamente:
- Drogas ilegales o abuso de sustancias
- Consumo excesivo de alcohol
- Sexo, pornografía o contenido NSFW
- Violencia, autolesiones o suicidio
- Odio, discriminación o insultos

Responde ÚNICAMENTE con un objeto JSON con dos propiedades:
- "is_safe": booleano (true si es segura, false si es inapropiada)
- "reason": string (si es false, explica brevemente por qué fue rechazada en español. Si es true, deja vacío "")
`;

      const userPrompt = `Título: ${title}\nDescripción: ${description || "Sin descripción"}`;

      const groqResponse = await callGroq(groqApiKey, systemPrompt, userPrompt);
      isSafe = Boolean(groqResponse.is_safe ?? true);
      reason = groqResponse.reason ? String(groqResponse.reason) : "";
    } else {
      // Fallback local básico si no hay llave de Groq
      const textToScan = `${title} ${description}`.toLowerCase();
      const badWords = [
        "cigarro", "cigarros", "fumar", "vape", "droga", "drogas", "marihuana", "cocaina",
        "alcohol", "borracho", "sexo", "porno", "nudes", "matar", "suicidio", "puta", "mierda"
      ];
      const hasBadWords = badWords.some((word) => textToScan.includes(word));
      
      if (hasBadWords) {
        isSafe = false;
        reason = "El contenido contiene palabras no permitidas por nuestras reglas comunitarias.";
      }
    }

    return json({ is_safe: isSafe, reason });

  } catch (err: any) {
    console.error("Error en moderate-activity:", err);
    return json({ is_safe: false, reason: "Error interno: " + (err.message || "desconocido") }, 200);
  }
});
