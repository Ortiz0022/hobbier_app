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
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const groqApiKey = Deno.env.get("GROQ_API_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Faltan variables de entorno en Supabase.");
    }

    // Usamos el Service Role para poder actualizar mensajes de cualquier usuario de forma segura
    // en background
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Y un cliente normal para verificar auth
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Usuario no encontrado" }, 401);

    const { text } = await req.json();
    if (!text) return json({ error: "Faltan parámetros" }, 400);

    let isToxic = false;

    if (groqApiKey) {
      const systemPrompt = `
Eres un moderador de chat para una aplicación familiar.
Debes analizar el siguiente mensaje y determinar si contiene contenido nocivo, acoso, spam, insultos graves, amenazas, violencia o contenido sexual.
Responde ÚNICAMENTE con un objeto JSON con la propiedad "is_toxic" booleana (true si es nocivo, false si es seguro).
`;
      const groqResponse = await callGroq(groqApiKey, systemPrompt, `Mensaje: ${text}`);
      isToxic = Boolean(groqResponse.is_toxic ?? false);
    } else {
      // Fallback local
      const textToScan = text.toLowerCase();
      const badWords = ["matar", "suicidio", "droga", "drogas", "porno", "puta", "mierda"];
      isToxic = badWords.some((word) => textToScan.includes(word));
    }

    return json({ is_toxic: isToxic });

  } catch (err: any) {
    console.error("Error en moderate-message:", err);
    return json({ error: "Error interno: " + (err.message || "desconocido") }, 500);
  }
});
