// ==================================================
// HOBBIER - Edge Function: send-push
//
// Único sitio desde el que salen las notificaciones push. La app NO manda
// títulos ni textos: manda un `tipo` y un poco de contexto (a quién, qué sala,
// qué ticket) y aquí se decide quién la recibe y qué dice.
//
// Se hace así por dos razones:
//   1. Seguridad: si el texto viniera del cliente, cualquiera con el token de
//      un usuario podría enviarle a otro un "Tu cuenta ha sido sancionada".
//      Los tipos que solo puede disparar un administrador se comprueban contra
//      su perfil, no contra lo que diga la petición.
//   2. Coherencia: el mismo aviso se redacta igual venga de donde venga, y
//      cambiar un texto es tocar un archivo, no doce.
//
// Entrega con la API de Expo (https://exp.host/--/api/v2/push/send). Los tokens
// que Expo marca como DeviceNotRegistered se borran: son apps desinstaladas.
// ==================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_URL = "https://exp.host/--/api/v2/push/send";
/** Expo acepta como mucho 100 mensajes por petición. */
const LOTE = 100;

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

/** Un texto largo en una notificación se corta solo; mejor cortarlo bien. */
const recortar = (texto: string, largo = 120) => {
  const limpio = (texto || "").replace(/\s+/g, " ").trim();
  return limpio.length > largo ? `${limpio.slice(0, largo - 1)}…` : limpio;
};

type Contexto = Record<string, unknown>;
type Plantilla = {
  /** Solo un administrador puede disparar este aviso. */
  soloAdmin?: boolean;
  /** Completa el contexto con lo que falte (nombres, etc.) antes de redactar. */
  completar?: (ctx: Contexto, db: ReturnType<typeof createClient>) => Promise<Contexto>;
  /** A quién le llega. Devuelve ids de perfil. */
  destinatarios: (
    ctx: Contexto,
    emisor: { id: string; username: string },
    db: ReturnType<typeof createClient>,
  ) => Promise<string[]>;
  titulo: (ctx: Contexto, emisor: { username: string }) => string;
  cuerpo: (ctx: Contexto, emisor: { username: string }) => string;
};

/** Todos los administradores, para los avisos del panel. */
const administradores = async (db: ReturnType<typeof createClient>) => {
  const { data } = await db.from("profiles").select("id").eq("role", "ADMIN");
  return (data || []).map((fila: { id: string }) => fila.id);
};

const unoSolo = async (ctx: Contexto) => (ctx.para ? [String(ctx.para)] : []);

/** El otro lado de una conversación directa. */
const elOtroDeLaConversacion = async (
  ctx: Contexto,
  emisor: { id: string },
  db: ReturnType<typeof createClient>,
) => {
  if (ctx.para) return [String(ctx.para)];
  if (!ctx.conversacionId) return [];
  const { data } = await db
    .from("direct_conversations")
    .select("user_low, user_high")
    .eq("id", ctx.conversacionId)
    .maybeSingle();
  if (!data) return [];
  return [data.user_low === emisor.id ? data.user_high : data.user_low];
};

/** Quien abrió el ticket de soporte. */
const duenoDelTicket = async (
  ctx: Contexto,
  _emisor: { id: string },
  db: ReturnType<typeof createClient>,
) => {
  if (ctx.para) return [String(ctx.para)];
  if (!ctx.ticketId) return [];
  const { data } = await db
    .from("support_tickets")
    .select("user_id")
    .eq("id", ctx.ticketId)
    .maybeSingle();
  return data?.user_id ? [data.user_id] : [];
};

/** Quien pidió el anuncio. */
const duenoDeLaSolicitud = async (
  ctx: Contexto,
  db: ReturnType<typeof createClient>,
) => {
  if (!ctx.solicitudId) return null;
  const { data } = await db
    .from("ad_requests")
    .select("user_id")
    .eq("id", ctx.solicitudId)
    .maybeSingle();
  return data?.user_id || null;
};

const PLANTILLAS: Record<string, Plantilla> = {
  // ---------- Entre usuarios ----------
  amistad_solicitud: {
    destinatarios: unoSolo,
    titulo: (_c, e) => `@${e.username} quiere ser tu amigo`,
    cuerpo: () => "Entra a Comunidad para aceptar o rechazar la solicitud.",
  },
  amistad_aceptada: {
    destinatarios: unoSolo,
    titulo: (_c, e) => `@${e.username} aceptó tu solicitud`,
    cuerpo: () => "Ya pueden verse el perfil y escribirse.",
  },
  mensaje_directo: {
    destinatarios: elOtroDeLaConversacion,
    titulo: (_c, e) => `@${e.username}`,
    cuerpo: (c) => recortar(String(c.texto || "Te escribió un mensaje.")),
  },
  mensaje_sala: {
    // Todos los miembros de la sala menos quien escribe.
    destinatarios: async (ctx, emisor, db) => {
      if (!ctx.salaId) return [];
      const { data } = await db
        .from("room_members")
        .select("user_id")
        .eq("room_id", ctx.salaId);
      return (data || [])
        .map((fila: { user_id: string }) => fila.user_id)
        .filter((id: string) => id !== emisor.id);
    },
    // El nombre de la sala lo pone el servidor si el cliente no lo mandó.
    completar: async (ctx, db) => {
      if (ctx.salaNombre || !ctx.salaId) return ctx;
      const { data } = await db.from("rooms").select("name").eq("id", ctx.salaId).maybeSingle();
      return { ...ctx, salaNombre: data?.name || "Sala" };
    },
    titulo: (c) => String(c.salaNombre || "Sala"),
    cuerpo: (c, e) => `@${e.username}: ${recortar(String(c.texto || "escribió en la sala"), 90)}`,
  },
  sala_invitacion: {
    destinatarios: unoSolo,
    titulo: (_c, e) => `@${e.username} te invitó a una sala`,
    cuerpo: (c) => `${c.salaNombre || "Una sala"} te espera para completar el reto juntos.`,
  },

  // ---------- Del panel hacia el usuario ----------
  soporte_respuesta: {
    soloAdmin: true,
    destinatarios: duenoDelTicket,
    titulo: () => "Soporte respondió a tu apelación",
    cuerpo: (c) => recortar(String(c.texto || "Entra para leer la respuesta.")),
  },
  cuenta_sancionada: {
    soloAdmin: true,
    destinatarios: unoSolo,
    titulo: () => "Tu cuenta ha sido sancionada",
    cuerpo: (c) =>
      c.motivo
        ? `Motivo: ${recortar(String(c.motivo))}`
        : "Entra a la app para ver el motivo y apelar si crees que es un error.",
  },
  cuenta_reactivada: {
    soloAdmin: true,
    destinatarios: unoSolo,
    titulo: () => "Tu cuenta vuelve a estar activa",
    cuerpo: () => "La sanción fue levantada. Ya puedes usar Hobbier con normalidad.",
  },
  anuncio_estado: {
    soloAdmin: true,
    destinatarios: async (ctx, _emisor, db) => {
      const dueno = ctx.para ? String(ctx.para) : await duenoDeLaSolicitud(ctx, db);
      return dueno ? [dueno] : [];
    },
    titulo: (c) =>
      c.estado === "APPROVED" ? "Tu anuncio fue aprobado" : "Novedades con tu anuncio",
    cuerpo: (c) => recortar(String(c.detalle || "Entra a Perfil para ver los detalles.")),
  },
  anuncio_mensaje: {
    // Si escribe el anunciante, le llega al panel; si escribe el panel, al
    // anunciante. Un solo tipo para las dos direcciones.
    destinatarios: async (ctx, emisor, db) => {
      const dueno = await duenoDeLaSolicitud(ctx, db);
      if (!dueno) return [];
      return dueno === emisor.id ? administradores(db) : [dueno];
    },
    titulo: () => "Mensaje sobre tu anuncio",
    cuerpo: (c) => recortar(String(c.texto || "Tienes un mensaje nuevo sobre tu solicitud.")),
  },

  // ---------- Hacia los administradores ----------
  admin_soporte: {
    destinatarios: (_c, _e, db) => administradores(db),
    titulo: (_c, e) => `@${e.username} escribió a soporte`,
    cuerpo: (c) => recortar(String(c.texto || "Una cuenta sancionada está apelando.")),
  },
  admin_reporte: {
    destinatarios: (_c, _e, db) => administradores(db),
    titulo: (c) =>
      c.clase === "perfil" ? "Reportaron un perfil" : "Reportaron una publicación",
    cuerpo: (c, e) =>
      `@${e.username} reportó${c.motivo ? `: ${recortar(String(c.motivo), 80)}` : " contenido para revisar."}`,
  },
  admin_solicitud_anuncio: {
    destinatarios: (_c, _e, db) => administradores(db),
    titulo: () => "Nueva solicitud de anuncio",
    cuerpo: (_c, e) => `@${e.username} envió un anuncio para revisar.`,
  },
};

/** Envía a Expo en lotes y devuelve los tokens que ya no sirven. */
const entregar = async (mensajes: Record<string, unknown>[]) => {
  const caducados: string[] = [];

  for (let i = 0; i < mensajes.length; i += LOTE) {
    const lote = mensajes.slice(i, i + LOTE);
    const respuesta = await fetch(EXPO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(lote),
    });

    if (!respuesta.ok) {
      console.warn("Expo respondió", respuesta.status, (await respuesta.text()).slice(0, 300));
      continue;
    }

    const cuerpo = await respuesta.json();
    (cuerpo?.data || []).forEach((parte: Record<string, any>, indice: number) => {
      if (parte?.status === "error" && parte?.details?.error === "DeviceNotRegistered") {
        caducados.push(String(lote[indice].to));
      }
    });
  }

  return caducados;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authorization = req.headers.get("Authorization") || "";

    // Quién pide el envío. Sin sesión no se manda nada.
    const comoUsuario = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user } } = await comoUsuario.auth.getUser();
    if (!user) return json({ error: "Hace falta iniciar sesión." }, 401);

    const { tipo, contexto = {} } = await req.json();
    const plantilla = PLANTILLAS[tipo];
    if (!plantilla) return json({ error: `Tipo de aviso desconocido: ${tipo}` }, 400);

    const db = createClient(url, serviceKey);

    const { data: perfil } = await db
      .from("profiles")
      .select("id, username, role")
      .eq("id", user.id)
      .maybeSingle();

    if (plantilla.soloAdmin && perfil?.role !== "ADMIN") {
      return json({ error: "Ese aviso solo lo puede enviar un administrador." }, 403);
    }

    const emisor = { id: user.id, username: perfil?.username || "alguien" };
    const ctx = plantilla.completar ? await plantilla.completar(contexto, db) : contexto;
    const destinatarios = (await plantilla.destinatarios(ctx, emisor, db))
      // Nadie se avisa a sí mismo.
      .filter((id) => id && id !== user.id);

    if (destinatarios.length === 0) return json({ enviados: 0, motivo: "sin destinatarios" });

    const { data: tokens } = await db
      .from("user_push_tokens")
      .select("push_token")
      .in("user_id", destinatarios);

    const unicos = [...new Set((tokens || []).map((t: { push_token: string }) => t.push_token))];
    if (unicos.length === 0) return json({ enviados: 0, motivo: "sin dispositivos registrados" });

    const mensajes = unicos.map((token) => ({
      to: token,
      sound: "default",
      title: plantilla.titulo(ctx, emisor),
      body: plantilla.cuerpo(ctx, emisor),
      // Para que al tocar la notificación la app sepa a dónde llevar.
      data: { tipo, ...ctx },
      channelId: "default",
    }));

    const caducados = await entregar(mensajes);
    if (caducados.length > 0) {
      await db.from("user_push_tokens").delete().in("push_token", caducados);
    }

    return json({ enviados: mensajes.length, caducados: caducados.length });
  } catch (error) {
    // Un fallo aquí no puede romper la acción del usuario: quien llama no espera
    // la respuesta, pero conviene dejarlo escrito en los registros.
    console.error("send-push falló:", error instanceof Error ? error.message : error);
    return json({ error: "No se pudo enviar el aviso." }, 500);
  }
});
