// GET  /api/admin/albums — álbumes actuales (frescos, para el panel).
// POST /api/admin/albums — crea un álbum nuevo ("Jornada 1" → pmfl/jornada-1).

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAME, hasAccess } from "@/lib/admin-session";
import {
  cloudinaryConfigured,
  createFolder,
} from "@/lib/cloudinary-server";
import { getAlbums, titleFromSlug } from "@/lib/albums";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

function requireSession(): boolean {
  return hasAccess(cookies().get(COOKIE_NAME)?.value, "foto");
}

export async function GET() {
  if (!requireSession()) return unauthorized();

  // revalidate 0 + includeEmpty: el panel necesita ver el estado real,
  // incluidos los álbumes que aún no tienen fotos.
  const albums = await getAlbums(0, true);
  return NextResponse.json({
    albums: albums.map((a) => ({
      slug: a.slug,
      title: a.title,
      count: a.photos.length,
      latest: a.latest,
      cover: a.photos[0]?.publicId ?? null,
    })),
  });
}

export async function POST(req: Request) {
  if (!requireSession()) return unauthorized();
  if (!cloudinaryConfigured) {
    return NextResponse.json(
      { error: "Cloudinary no está configurado en el servidor" },
      { status: 503 },
    );
  }

  let name = "";
  try {
    const body = (await req.json()) as { name?: string };
    name = String(body.name ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  if (name.length < 2) {
    return NextResponse.json(
      { error: "Escribe un nombre de álbum (mínimo 2 caracteres)" },
      { status: 400 },
    );
  }

  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json(
      { error: "Ese nombre no genera una carpeta válida" },
      { status: 400 },
    );
  }

  try {
    await createFolder(slug);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    slug,
    // El nombre visible se deriva del slug para que coincida con lo que
    // verá la galería (y con lo que se guardará en el context de cada foto).
    title: titleFromSlug(slug),
  });
}
