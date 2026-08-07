// Gestión de patrocinadores (área "admin" de la liga).
//
//   GET    /api/admin/sponsors            → listado fresco
//   PATCH  /api/admin/sponsors            → editar datos de uno
//   DELETE /api/admin/sponsors?publicId=… → borrarlo
//
// La subida del logo se firma en /api/admin/sponsors/signature.

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { COOKIE_NAME, hasAccess } from "@/lib/admin-session";
import {
  ALBUMS_TAG,
  ROOT_FOLDER,
  cloudinaryConfigured,
  deleteAsset,
  updateAssetContext,
} from "@/lib/cloudinary-server";
import { SPONSORS_ALBUM, getSponsors, SPONSOR_CATEGORIES } from "@/lib/sponsors";

export const dynamic = "force-dynamic";

function guard(): NextResponse | null {
  if (!hasAccess(cookies().get(COOKIE_NAME)?.value, "admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!cloudinaryConfigured) {
    return NextResponse.json(
      { error: "Cloudinary no está configurado en el servidor" },
      { status: 503 },
    );
  }
  return null;
}

/** Solo se puede tocar lo que vive en la carpeta de patrocinadores. */
function belongsHere(publicId: string): boolean {
  return publicId.startsWith(`${ROOT_FOLDER}/${SPONSORS_ALBUM}/`);
}

/** Refresca las páginas donde salen los patrocinadores. */
function refreshSite() {
  revalidateTag(ALBUMS_TAG);
  revalidatePath("/sponsors");
  revalidatePath("/");
}

export async function GET() {
  const bad = guard();
  if (bad) return bad;

  const sponsors = await getSponsors(0);
  return NextResponse.json({ sponsors, categories: SPONSOR_CATEGORIES });
}

export async function PATCH(req: Request) {
  const bad = guard();
  if (bad) return bad;

  let body: {
    publicId?: string;
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

  const publicId = String(body.publicId ?? "");
  if (!belongsHere(publicId)) {
    return NextResponse.json(
      { error: "Ese logo no pertenece a los patrocinadores de PMFL" },
      { status: 400 },
    );
  }

  const name = String(body.name ?? "").trim();
  if (name.length < 2) {
    return NextResponse.json(
      { error: "El nombre debe tener al menos 2 caracteres" },
      { status: 400 },
    );
  }

  const category = SPONSOR_CATEGORIES.includes(body.category as never)
    ? String(body.category)
    : "Patrocinadores";
  const order = Number(body.order);

  try {
    await updateAssetContext(publicId, {
      name,
      category,
      url: String(body.url ?? "").trim() || "#",
      order: String(Number.isFinite(order) ? order : 100),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  refreshSite();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const bad = guard();
  if (bad) return bad;

  const publicId = new URL(req.url).searchParams.get("publicId") ?? "";
  if (!belongsHere(publicId)) {
    return NextResponse.json(
      { error: "Ese logo no pertenece a los patrocinadores de PMFL" },
      { status: 400 },
    );
  }

  try {
    await deleteAsset(publicId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  refreshSite();
  return NextResponse.json({ ok: true });
}
