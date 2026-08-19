import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Envía los mensajes del formulario de contacto por Resend.
 *
 * Manda DOS correos:
 *   1. El aviso a la liga, con el mensaje del visitante.
 *   2. Un acuse de recibo al propio visitante.
 *
 * El segundo es "best effort": si falla, la petición se da por buena
 * igualmente. Lo importante es que el mensaje llegue a la liga; que el
 * visitante no reciba su copia es molesto, pero no es motivo para
 * decirle que su mensaje no se envió cuando sí lo hizo.
 *
 * Requiere la variable de entorno RESEND_API_KEY.
 * Opcionales:
 *   CONTACT_FROM  → remitente verificado en Resend
 *   CONTACT_TO    → destino (por defecto pmfllogistica@gmail.com)
 *   SITE_URL      → base para las imágenes del correo
 */

const RESEND_URL = "https://api.resend.com/emails";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Envuelve el contenido en la plantilla de marca de la PMFL. */
function plantilla(sitio: string, titulo: string, cuerpo: string): string {
  return `
  <div style="margin:0;padding:24px 12px;background:#F1F5F9;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"
           style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #E2E8F0">
      <tr>
        <td style="background:#071425;padding:24px;text-align:center">
          <img src="${sitio}/pmfl-logo.png" alt="PMFL" width="150"
               style="display:block;margin:0 auto;width:150px;max-width:60%;height:auto;border:0" />
        </td>
      </tr>
      <tr>
        <td style="padding:28px 28px 8px">
          <h1 style="margin:0 0 14px;font-size:21px;line-height:1.3;color:#0B1F3A">${titulo}</h1>
          ${cuerpo}
        </td>
      </tr>
      <tr>
        <td style="padding:20px 28px 26px;border-top:1px solid #E2E8F0">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#64748B">
            Panama Major Football League · Estadio Emilio Royo, Ciudad Deportiva
            Irving Saladino, Juan Díaz, Panamá<br />
            <a href="${sitio}" style="color:#7A6320;text-decoration:none">pmfl.com.pa</a>
          </p>
        </td>
      </tr>
    </table>
  </div>`;
}

interface Correo {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  reply_to?: string;
}

async function enviar(apiKey: string, correo: Correo) {
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(correo),
  });
  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`${res.status} ${detalle}`);
  }
  return res;
}

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();

    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Por favor escribe tu nombre." },
        { status: 400 },
      );
    }
    if (
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { error: "Por favor escribe un correo válido." },
        { status: 400 },
      );
    }
    if (typeof message !== "string" || message.trim().length < 5) {
      return NextResponse.json(
        { error: "Por favor escribe un mensaje un poco más largo." },
        { status: 400 },
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[PMFL contacto] Falta la variable RESEND_API_KEY");
      return NextResponse.json(
        { error: "El envío de mensajes no está configurado todavía." },
        { status: 500 },
      );
    }

    const from = process.env.CONTACT_FROM || "PMFL Contacto <contacto@pmfl.com.pa>";
    const to = process.env.CONTACT_TO || "pmfllogistica@gmail.com";
    const sitio = (process.env.SITE_URL || "https://www.pmfl.com.pa").replace(/\/$/, "");

    const citado = `<p style="white-space:pre-wrap;margin:0;border-left:3px solid #C8102E;padding-left:12px;color:#334155">${esc(
      message,
    )}</p>`;

    // ---- 1. Aviso a la liga -------------------------------------------
    await enviar(apiKey, {
      from,
      to: [to],
      reply_to: email,
      subject: `Nuevo mensaje de contacto — ${name}`,
      html: plantilla(
        sitio,
        "Nuevo mensaje de contacto",
        `<p style="margin:0 0 6px;font-size:15px;color:#0B1F3A"><strong>Nombre:</strong> ${esc(name)}</p>
         <p style="margin:0 0 6px;font-size:15px;color:#0B1F3A"><strong>Correo:</strong> ${esc(email)}</p>
         <p style="margin:18px 0 8px;font-size:15px;color:#0B1F3A"><strong>Mensaje:</strong></p>
         ${citado}
         <p style="margin:18px 0 0;font-size:13px;color:#64748B">
           Puedes responder directamente a este correo: la respuesta le llegará a ${esc(email)}.
         </p>`,
      ),
      text: `Nuevo mensaje de contacto — PMFL\n\nNombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${message}`,
    });

    // ---- 2. Acuse de recibo al visitante ------------------------------
    try {
      await enviar(apiKey, {
        from,
        to: [email],
        reply_to: to,
        subject: "Recibimos tu mensaje — PMFL",
        html: plantilla(
          sitio,
          `¡Gracias por escribirnos, ${esc(name.trim().split(/\s+/)[0])}!`,
          `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155">
             Hemos recibido tu mensaje y lo estamos revisando. Te responderemos
             lo antes posible desde este mismo correo.
           </p>
           <p style="margin:0 0 8px;font-size:14px;color:#0B1F3A"><strong>Esto fue lo que nos enviaste:</strong></p>
           ${citado}
           <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#334155">
             Mientras tanto puedes ver el
             <a href="${sitio}/schedule" style="color:#7A6320">calendario de la temporada</a>
             o seguirnos en
             <a href="https://www.instagram.com/pmfl507/" style="color:#7A6320">Instagram</a>.
           </p>
           <p style="margin:16px 0 0;font-size:12px;color:#64748B">
             Si no fuiste tú quien escribió, puedes ignorar este mensaje.
           </p>`,
        ),
        text:
          `¡Gracias por escribirnos, ${name.trim().split(/\s+/)[0]}!\n\n` +
          `Hemos recibido tu mensaje y te responderemos lo antes posible.\n\n` +
          `Esto fue lo que nos enviaste:\n${message}\n\n` +
          `Panama Major Football League · ${sitio}`,
      });
    } catch (err) {
      // El mensaje a la liga ya salió: no se convierte en un error para
      // el visitante, solo se deja constancia.
      console.error("[PMFL contacto] No se pudo enviar el acuse de recibo", err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PMFL contacto] Error de Resend", err);
    return NextResponse.json(
      { error: "No se pudo enviar el mensaje. Intenta más tarde." },
      { status: 502 },
    );
  }
}
