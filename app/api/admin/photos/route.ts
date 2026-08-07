// DELETE /api/admin/photos?publicId=... — borra una foto del álbum.
// Pensado para deshacer una subida equivocada desde el propio panel.

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { COOKIE_NAME, hasAccess } from "@/lib/admin-session";
import {
  ALBUMS_TAG,
  ROOT_FOLDER,
  cloudinaryConfigured,
  deleteAsset,
} from "@/lib/cloudinary-server";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request) {
  if (!hasAccess(cookies().get(COOKIE_NAME)?.value, "foto")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!cloudinaryConfigured) {
    return NextResponse.json(
      { error: "Cloudinary no está configurado en el servidor" },
      { status: 503 },
    );
  }

  const publicId = new URL(req.url).searchParams.get("publicId") ?? "";

  // Salvaguarda: solo se pueden borrar fotos de la carpeta de PMFL, nunca
  // de otros proyectos que compartan la misma cuenta de Cloudinary.
  if (!publicId.startsWith(`${ROOT_FOLDER}/`)) {
    return NextResponse.json(
      { error: "Esa foto no pertenece a la galería de PMFL" },
      { status: 400 },
    );
  }

  try {
    await deleteAsset(publicId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  revalidateTag(ALBUMS_TAG);
  revalidatePath("/gallery");
  return NextResponse.json({ ok: true });
}
