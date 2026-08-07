// POST /api/admin/logout — cierra la sesión del panel.

import { NextResponse } from "next/server";
import { COOKIE_NAME, cookieOptions, isHttps } from "@/lib/admin-session";

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", cookieOptions(isHttps(req), 0));
  return res;
}
