// POST /api/admin/refresh — invalida el caché de la galería para que las
// fotos recién subidas aparezcan de inmediato en /gallery.

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { COOKIE_NAME, hasAccess } from "@/lib/admin-session";
import { ALBUMS_TAG } from "@/lib/cloudinary-server";

export async function POST() {
  if (!hasAccess(cookies().get(COOKIE_NAME)?.value, "foto")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  revalidateTag(ALBUMS_TAG);
  revalidatePath("/gallery");
  // El home y las estadísticas muestran los retratos del pódium, así que
  // también hay que refrescarlos tras subir fotos de jugadores.
  revalidatePath("/stats");
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
