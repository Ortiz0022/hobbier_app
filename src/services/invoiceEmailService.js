
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';
import { TARIFA_CPC, TARIFA_CPM } from './adsService';
import { HOBBIER_LOGO_BASE64 } from '../assets/hobbierLogoBase64';

const formatoColones = (n) =>
  `₡${Number(n || 0).toLocaleString('es-CR', { maximumFractionDigits: 0 })}`;

const LOGO_DATA_URI = `data:image/png;base64,${HOBBIER_LOGO_BASE64}`;

/**
 * Genera el HTML ejecutivo y corporativo de la factura de Hobbier Ads.
 * Diseño sobrio estilo Stripe / Banca Digital con la paleta oficial de Hobbier (#053E4A y #0C8AA6).
 */
export const generarHtmlFacturaHobbier = ({
  invoiceNumber,
  transactionId,
  paidAt,
  advertiserName,
  customerEmail,
  campaignTitle,
  billingModel = 'CPM',
  targetQuota = 1000,
  amount = 0,
  cardBrand = 'Visa',
  cardLast4 = '4242',
  startDate = '',
  endDate = '',
  language = 'es',
  logoSrc = LOGO_DATA_URI,
}) => {
  const isEn = language === 'en';
  const fechaObj = paidAt ? new Date(paidAt) : new Date();
  const fechaFormateada = fechaObj.toLocaleDateString(isEn ? 'en-US' : 'es-CR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const tarifaUnitaria = billingModel === 'CPC' ? TARIFA_CPC : TARIFA_CPM;
  const descripcionServicio =
    billingModel === 'CPC'
      ? isEn
        ? `Sponsored Campaign — Traffic & Clicks (CPC)`
        : `Campaña Publicitaria Patrocinada — Tráfico y Clics (CPC)`
      : isEn
        ? `Sponsored Campaign — Brand Reach & Impressions (CPM)`
        : `Campaña Publicitaria Patrocinada — Alcance y Visualizaciones (CPM)`;

  const detalleVolumen =
    billingModel === 'CPC'
      ? isEn
        ? `${Number(targetQuota).toLocaleString('en-US')} guaranteed clicks × ₡${tarifaUnitaria} per click`
        : `${Number(targetQuota).toLocaleString('es-CR')} clics garantizados × ₡${tarifaUnitaria} c/u`
      : isEn
        ? `${Number(targetQuota).toLocaleString('en-US')} contracted impressions × ₡${tarifaUnitaria} per view`
        : `${Number(targetQuota).toLocaleString('es-CR')} visualizaciones contratadas × ₡${tarifaUnitaria} c/u`;

  const vigenciaTexto =
    startDate && endDate ? `${startDate} — ${endDate}` : isEn ? 'Upon approval' : 'Según vigencia solicitada';

  return `<!DOCTYPE html>
<html lang="${isEn ? 'en' : 'es'}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${isEn ? 'Simulated payment receipt' : 'Comprobante de pago simulado'} · ${invoiceNumber}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#F1F5F9;padding:36px 16px;">
    <tr>
      <td align="center">
        <!-- Contenedor Principal -->
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 4px 20px rgba(15,23,42,0.06);">
          
          <!-- Encabezado Corporativo Hobbier -->
          <tr>
            <td style="background:linear-gradient(135deg,#053E4A 0%,#0C8AA6 100%);padding:32px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="left" valign="middle">
                    <table cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td valign="middle" style="padding-right:14px;">
                          <img src="${logoSrc}" alt="Hobbier" width="48" height="48" style="display:block;width:48px;height:48px;border-radius:12px;border:1px solid rgba(255,255,255,0.22);box-shadow:0 3px 10px rgba(0,0,0,0.25);" />
                        </td>
                        <td valign="middle">
                          <div style="font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;line-height:1.1;">
                            hobbier<span style="color:#FF8F21;">.</span>
                          </div>
                          <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.78);text-transform:uppercase;letter-spacing:1.4px;margin-top:4px;">
                            ${isEn ? 'Advertising & Billing Services' : 'Servicios de Publicidad y Facturación'}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display:inline-block;background-color:rgba(16,185,129,0.2);border:1px solid rgba(16,185,129,0.55);color:#A7F3D0;font-size:11px;font-weight:700;padding:5px 12px;border-radius:999px;letter-spacing:0.8px;text-transform:uppercase;">
                      ✓ ${isEn ? 'PAID' : 'PAGADO'}
                    </span>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:26px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.14);">
                <tr>
                  <td align="left">
                    <div style="font-size:11px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.8px;">
                      ${isEn ? 'Total Amount Paid' : 'Monto Total Cancelado'}
                    </div>
                    <div style="font-size:30px;font-weight:700;color:#FFFFFF;margin-top:4px;letter-spacing:-0.5px;">
                      ${formatoColones(amount)} <span style="font-size:13px;font-weight:500;color:rgba(255,255,255,0.75);">CRC</span>
                    </div>
                  </td>
                  <td align="right" valign="bottom">
                    <div style="font-size:12px;color:rgba(255,255,255,0.85);font-weight:600;">
                      ${isEn ? 'Simulated receipt' : 'Comprobante simulado'} #${invoiceNumber}
                    </div>
                    <div style="font-size:11px;color:rgba(255,255,255,0.68);margin-top:3px;">
                      ${fechaFormateada}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Cuerpo de la Factura -->
          <tr>
            <td style="padding:32px 36px;">
              
              <!-- Resumen de Entidades -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px 20px;">
                <tr>
                  <td width="50%" valign="top" style="padding-right:12px;">
                    <div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">
                      ${isEn ? 'Issued to' : 'Emitido a'}
                    </div>
                    <div style="font-size:14px;font-weight:600;color:#0F172A;">
                      ${advertiserName || (isEn ? 'Hobbier Advertiser' : 'Anunciante Hobbier')}
                    </div>
                    <div style="font-size:12px;color:#475569;margin-top:2px;">
                      ${customerEmail || ''}
                    </div>
                  </td>
                  <td width="50%" valign="top" style="padding-left:12px;border-left:1px solid #E2E8F0;">
                    <div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">
                      ${isEn ? 'Payment Method' : 'Método de Pago'}
                    </div>
                    <div style="font-size:14px;font-weight:600;color:#0F172A;">
                      ${cardBrand} •••• ${cardLast4}
                    </div>
                    <div style="font-size:11px;color:#64748B;margin-top:3px;font-family:monospace;">
                      Ref: ${transactionId}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Tabla de Desglose del Servicio -->
              <div style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">
                ${isEn ? 'Campaign & Billing Summary' : 'Detalle de la Contratación Publicitaria'}
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-top:2px solid #053E4A;border-bottom:1px solid #CBD5E1;">
                <thead>
                  <tr style="background-color:#F8FAFC;border-bottom:1px solid #E2E8F0;">
                    <th align="left" style="padding:10px 12px;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;">
                      ${isEn ? 'Description' : 'Concepto'}
                    </th>
                    <th align="right" style="padding:10px 12px;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;">
                      ${isEn ? 'Amount' : 'Importe'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding:16px 12px;vertical-align:top;">
                      <div style="font-size:14px;font-weight:600;color:#0F172A;">
                        ${campaignTitle || (isEn ? 'Sponsored Ad on Hobbier' : 'Anuncio Patrocinado en Hobbier')}
                      </div>
                      <div style="font-size:12px;color:#475569;margin-top:4px;">
                        ${descripcionServicio}
                      </div>
                      <div style="font-size:12px;color:#0C8AA6;font-weight:600;margin-top:4px;">
                        ${detalleVolumen}
                      </div>
                      <div style="font-size:11px;color:#64748B;margin-top:4px;">
                        ${isEn ? 'Scheduled period:' : 'Periodo programado:'} ${vigenciaTexto}
                      </div>
                    </td>
                    <td align="right" style="padding:16px 12px;vertical-align:top;font-size:14px;font-weight:600;color:#0F172A;white-space:nowrap;">
                      ${formatoColones(amount)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <!-- Totales -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:14px;">
                <tr>
                  <td width="60%"></td>
                  <td width="40%">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td align="left" style="padding:4px 0;font-size:12px;color:#64748B;">
                          ${isEn ? 'Subtotal' : 'Subtotal'}
                        </td>
                        <td align="right" style="padding:4px 0;font-size:12px;color:#0F172A;font-weight:500;">
                          ${formatoColones(amount)}
                        </td>
                      </tr>
                      <tr>
                        <td align="left" style="padding:4px 0;font-size:12px;color:#64748B;">
                          ${isEn ? 'Taxes (Included)' : 'Impuestos (Incluidos)'}
                        </td>
                        <td align="right" style="padding:4px 0;font-size:12px;color:#0F172A;font-weight:500;">
                          ₡0
                        </td>
                      </tr>
                      <tr>
                        <td align="left" style="padding:10px 0 4px 0;border-top:1px solid #E2E8F0;font-size:14px;font-weight:700;color:#053E4A;">
                          ${isEn ? 'Total Paid' : 'Total Cancelado'}
                        </td>
                        <td align="right" style="padding:10px 0 4px 0;border-top:1px solid #E2E8F0;font-size:16px;font-weight:700;color:#0C8AA6;">
                          ${formatoColones(amount)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Nota Informativa de Revisión -->
              <div style="margin-top:26px;padding:14px 16px;background-color:#F0F8FA;border-left:3px solid #0C8AA6;border-radius:4px;font-size:12px;line-height:1.5;color:#334155;">
                <strong>${isEn ? 'Next steps:' : 'Próximos pasos:'}</strong>
                ${
                  isEn
                    ? 'Your payment has been registered and your ad request is under review by the Hobbier administration team. Once approved, delivery will start automatically and stop upon reaching the contracted quota.'
                    : 'Tu pago ha sido registrado exitosamente y tu anuncio se encuentra en revisión por el equipo administrativo de Hobbier. Una vez aprobado, la entrega iniciará en las fechas indicadas y se detendrá automáticamente al cumplir la cuota contratada.'
                }
              </div>

            </td>
          </tr>

          <!-- Pie Legal -->
          <tr>
            <td style="background-color:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 36px;text-align:center;">
              <img src="${logoSrc}" alt="Hobbier" width="26" height="26" style="display:inline-block;width:26px;height:26px;border-radius:7px;margin-bottom:6px;opacity:0.9;" />
              <div style="font-size:11px;color:#64748B;line-height:1.6;">
                <strong>Hobbier Platform · Costa Rica</strong><br />
                ${
                  isEn
                    ? 'Electronic payment receipt generated automatically. Keep this document for your accounting records.'
                    : 'Comprobante electrónico generado automáticamente. Conserva este documento para tus registros contables.'
                }
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Envía la factura por correo electrónico invocando la Edge Function `send-invoice`
 * o EmailJS si está configurado en variables de entorno.
 */
export const enviarFacturaPorCorreo = async (datosFactura) => {
  const destinatario = (datosFactura.customerEmail || '').trim();
  if (!destinatario || !destinatario.includes('@')) {
    return { ok: false, reason: 'NO_EMAIL' };
  }

  const invoiceNumber =
    datosFactura.invoiceNumber ||
    `FAC-${ (datosFactura.transactionId || 'HBR').replace(/^TXN-/, '') }`;

  // HTML con data URI para vista previa local / EmailJS
  const html = generarHtmlFacturaHobbier({
    ...datosFactura,
    invoiceNumber,
    logoSrc: LOGO_DATA_URI,
  });

  // HTML con CID inline para clientes de correo (Gmail bloquea data:image pero permite cid: inline)
  const htmlCid = generarHtmlFacturaHobbier({
    ...datosFactura,
    invoiceNumber,
    logoSrc: 'cid:hobbier-logo',
  });

  const subject =
    datosFactura.language === 'en'
      ? `Simulated receipt ${invoiceNumber} · Hobbier Ads`
      : `Comprobante simulado ${invoiceNumber} · Hobbier Ads`;

  // 1. Si hay credenciales de EmailJS en variables públicas (.env), permite envío directo desde cliente/web
  const emailJsServiceId = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID;
  const emailJsTemplateId = process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID;
  const emailJsPublicKey = process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY;

  if (emailJsServiceId && emailJsTemplateId && emailJsPublicKey) {
    try {
      const resp = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: emailJsServiceId,
          template_id: emailJsTemplateId,
          user_id: emailJsPublicKey,
          template_params: {
            to_email: destinatario,
            subject,
            invoice_number: invoiceNumber,
            transaction_id: datosFactura.transactionId,
            advertiser_name: datosFactura.advertiserName,
            campaign_title: datosFactura.campaignTitle,
            total_amount: formatoColones(datosFactura.amount),
            html_invoice: html,
          },
        }),
      });
      if (resp.ok) {
        return { ok: true, provider: 'emailjs', invoiceNumber };
      }
    } catch (err) {
      console.warn('Fallo envío EmailJS, intentando Edge Function:', err);
    }
  }

  // 2. Invocar Edge Function de Supabase `send-invoice`
  try {
    const { data, error } = await supabase.functions.invoke('send-invoice', {
      body: {
        to: destinatario,
        subject,
        html: htmlCid,
        logoBase64: HOBBIER_LOGO_BASE64,
        invoiceNumber,
        transactionId: datosFactura.transactionId,
      },
    });

    if (error) {
      console.warn('Detalle de respuesta de send-invoice:', error);
      return { ok: false, error: error.message || String(error), invoiceNumber, html };
    }

    return { ok: Boolean(data?.ok), data, invoiceNumber, html };
  } catch (err) {
    console.warn('Error al conectar con send-invoice:', err);
    return { ok: false, error: err?.message || String(err), invoiceNumber, html };
  }
};

/**
 * Abre la factura ejecutiva en una nueva ventana lista para guardar como PDF o imprimir (Web).
 */
export const abrirFacturaImprimible = (datosFactura) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;

  const invoiceNumber =
    datosFactura.invoiceNumber ||
    `FAC-${(datosFactura.transactionId || 'HBR').replace(/^TXN-/, '')}`;

  const html = generarHtmlFacturaHobbier({
    ...datosFactura,
    invoiceNumber,
  });

  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
};

