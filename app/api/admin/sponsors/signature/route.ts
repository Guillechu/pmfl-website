// POST /api/admin/sponsors/signature
//
// Firma la subida del logo de un patrocinador nuevo. El navegador sube el
// archivo directo a Cloudinary; los datos (nombre, categoría, enlace y
// orden) viajan firmados en el `context`, así quedan guardados junto al
// logo y no hace falta ninguna base de datos.

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAME, hasAccess } from "@/lib/admin-session";
import {
  ROOT_FOLDER,
  cloudinaryConfigured,
  publicConfig,
  signUpload,
} from "@/lib/cloudinary-server";
import { SPONSORS_ALBUM, SPONSOR_CATEGORIES } from "@/lib/sponsors";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!hasAccess(cookies().get(COOKIE_NAME)?.value, "admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!cloudinaryConfigured) {
    return NextResponse.json(
      { error: "Cloudinary no está configurado en el servidor" },
      { status: 503 },
    );
  }

  let body: {
    name?: string;
    category?: string;
    url?: string;
    order?: number | string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  if (name.length < 2) {
    return NextResponse.json(
      { error: "Escribe el nombre del patrocinador" },
      { status: 400 },
    );
  }

  const category = SPONSOR_CATEGORIES.includes(body.category as never)
    ? String(body.category)
    : "Patrocinadores";
  const order = Number(body.order);

  const folder = `${ROOT_FOLDER}/${SPONSORS_ALBUM}`;
  const timestamp = Math.round(Date.now() / 1000);

  // | y = separan los pares del context: no pueden aparecer en los valores.
  const clean = (v: string) => v.replace(/[|=]/g, " ");
  const context = [
    `name=${clean(name)}`,
    `category=${clean(category)}`,
    `url=${clean(String(body.url ?? "").trim() || "#")}`,
    `order=${Number.isFinite(order) ? order : 100}`,
  ].join("|");

  // Conservamos el nombre del archivo para que el public_id sea legible
  // ("pmfl/patrocinadores/gatorade") en vez de una cadena aleatoria.
  const params: Record<string, string | number> = {
    context,
    folder,
    timestamp,
    use_filename: "true",
    unique_filename: "true", // evita pisar el logo de otro patrocinador
  };

  const signature = signUpload(params);
  const { cloudName, apiKey } = publicConfig();

  return NextResponse.json({
    cloudName,
    apiKey,
    signature,
    timestamp,
    folder,
    context,
    extra: {
      use_filename: "true",
      unique_filename: "true",
    },
  });
}
