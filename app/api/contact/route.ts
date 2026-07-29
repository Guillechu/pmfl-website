import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Envía los mensajes del formulario de contacto por Resend.
 * Requiere la variable de entorno RESEND_API_KEY.
 * Opcionales:
 *   CONTACT_FROM  → remitente verificado en Resend (ej. "PMFL <contacto@pmfl.com.pa>")
 *   CONTACT_TO    → destino (por defecto pmfllogistica@gmail.com)
 */
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

    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111;line-height:1.5">
        <h2 style="margin:0 0 16px">Nuevo mensaje de contacto — PMFL</h2>
        <p style="margin:4px 0"><strong>Nombre:</strong> ${esc(name)}</p>
        <p style="margin:4px 0"><strong>Correo:</strong> ${esc(email)}</p>
        <p style="margin:16px 0 4px"><strong>Mensaje:</strong></p>
        <p style="white-space:pre-wrap;border-left:3px solid #C8102E;padding-left:12px;margin:0">${esc(
          message,
        )}</p>
      </div>`;

    const text = `Nuevo mensaje de contacto — PMFL\n\nNombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${message}`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `Nuevo mensaje de contacto — ${name}`,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[PMFL contacto] Error de Resend", res.status, detail);
      return NextResponse.json(
        { error: "No se pudo enviar el mensaje. Intenta más tarde." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
}
