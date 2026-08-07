// POST /api/admin/login — entra a un panel privado.
// Body: { password, area?: "foto" | "admin" }

import { NextResponse } from "next/server";
import {
  COOKIE_NAME,
  adminConfigured,
  cookieOptions,
  createToken,
  isHttps,
  photoConfigured,
  resolveRole,
  type Role,
} from "@/lib/admin-session";

export async function POST(req: Request) {
  let password = "";
  let area: Role = "foto";

  try {
    const body = (await req.json()) as { password?: string; area?: string };
    password = String(body.password ?? "");
    area = body.area === "admin" ? "admin" : "foto";
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  const configured = area === "admin" ? adminConfigured : photoConfigured;
  if (!configured) {
    return NextResponse.json(
      {
        error:
          "El panel no está configurado. Define SESSION_SECRET y la contraseña del área en el .env del servidor.",
      },
      { status: 503 },
    );
  }

  const role = resolveRole(area, password);
  if (!role) {
    // Retardo pequeño para que probar contraseñas al azar salga caro.
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json(
      { error: "Contraseña incorrecta" },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true, role });
  res.cookies.set(COOKIE_NAME, createToken(role), cookieOptions(isHttps(req)));
  return res;
}
