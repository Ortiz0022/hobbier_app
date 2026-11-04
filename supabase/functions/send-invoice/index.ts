// ==================================================
// HOBBIER - Edge Function: send-invoice
//
// Envía por correo electrónico el comprobante / factura ejecutiva de pago
// cuando un anunciante contrata una campaña publicitaria (CPM o CPC).
// Soporta envío mediante Gmail SMTP (SMTP_USER / SMTP_PASS) o Resend API (RESEND_API_KEY).
// Incluye el logo oficial de Hobbier como recurso inline CID (`cid:hobbier-logo`).
// ==================================================

import nodemailer from "npm:nodemailer@6.9.13";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const payload = await req.json();
    const {
      to,
      subject,
      html,
      logoBase64,
      invoiceNumber,
      transactionId,
    } = payload || {};

    if (!to || !html) {
      return json({ error: "Missing recipient email (to) or HTML body" }, 400);
    }

    const emailSubject =
      subject || `Comprobante de pago ${invoiceNumber || transactionId || ""} · Hobbier Ads`;

    // 1. Intentar con Gmail / SMTP si están configuradas las credenciales SMTP
    const smtpUser = (Deno.env.get("SMTP_USER") || "")
      .replace(/^["']|["']$/g, "")
      .trim();
    const smtpPass = (Deno.env.get("SMTP_PASS") || "")
      .replace(/^["']|["']$/g, "")
      .replace(/\s+/g, "");
    const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
    const smtpPort = Number(Deno.env.get("SMTP_PORT") || 465);

    if (smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const attachments = logoBase64
        ? [
            {
              filename: "hobbier-logo.png",
              content: logoBase64,
              encoding: "base64",
              cid: "hobbier-logo",
              contentDisposition: "inline" as const,
            },
          ]
        : [];

      const info = await transporter.sendMail({
        from: `"Hobbier Facturación" <${smtpUser}>`,
        to,
        subject: emailSubject,
        html,
        attachments,
      });

      return json({ ok: true, provider: "smtp", messageId: info.messageId });
    }

    // 2. Intentar con Resend API si está configurada RESEND_API_KEY
    const resendApiKey = (Deno.env.get("RESEND_API_KEY") || "")
      .replace(/^["']|["']$/g, "")
      .trim();
    const resendFrom =
      Deno.env.get("RESEND_FROM_EMAIL") || "Hobbier Billing <onboarding@resend.dev>";

    if (resendApiKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [to],
          subject: emailSubject,
          html,
          attachments: logoBase64
            ? [
                {
                  filename: "hobbier-logo.png",
                  content: logoBase64,
                  content_id: "hobbier-logo",
                },
              ]
            : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return json({ ok: false, error: data?.message || "Resend error", details: data }, res.status);
      }

      return json({ ok: true, provider: "resend", id: data.id });
    }

    return json(
      {
        ok: false,
        error: "NO_EMAIL_PROVIDER_CONFIGURED",
        message:
          "Configura SMTP_USER y SMTP_PASS (ej. Contraseña de aplicación de Gmail) o RESEND_API_KEY en los Secrets de Supabase.",
      },
      501,
    );
  } catch (err) {
    console.error("Error en send-invoice:", err);
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
