import { NextResponse } from "next/server";

/**
 * Mock contact endpoint. Replace this with a real mailer (Resend, SES, etc.)
 * or forward to a CRM (HubSpot, Mailchimp). For now we just validate and log.
 */
export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();

    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Please provide your name." }, { status: 400 });
    }
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please provide a valid email." }, { status: 400 });
    }
    if (typeof message !== "string" || message.trim().length < 5) {
      return NextResponse.json({ error: "Please write a longer message." }, { status: 400 });
    }

    // eslint-disable-next-line no-console
    console.log("[PMFL contact]", { name, email, message });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
