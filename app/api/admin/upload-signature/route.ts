// POST /api/admin/upload-signature
//
// Devuelve una firma de un solo uso para que el navegador suba la foto
// DIRECTO a Cloudinary (sin pasar el archivo por este servidor, que en
// Next tiene límite de tamaño de body). La api_secret nunca se envía.

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAME, hasAccess } from "@/lib/admin-session";
import {
  ROOT_FOLDER,
  cloudinaryConfigured,
  publicConfig,
  signUpload,
} from "@/lib/cloudinary-server";
import { titleFromSlug } from "@/lib/albums";
import { PLAYERS_ALBUM } from "@/lib/player-photos";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!hasAccess(cookies().get(COOKIE_NAME)?.value, "foto")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!cloudinaryConfigured) {
    return NextResponse.json(
      { error: "Cloudinary no está configurado en el servidor" },
      { status: 503 },
    );
  }

  let album = "";
  try {
    const body = (await req.json()) as { album?: string };
    album = String(body.album ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  const slug = slugify(album);
  if (!slug) {
    return NextResponse.json(
      { error: "Elige un álbum antes de subir" },
      { status: 400 },
    );
  }

  const folder = `${ROOT_FOLDER}/${slug}`;
  const timestamp = Math.round(Date.now() / 1000);
  // El nombre del álbum viaja en el context de cada foto: así la galería
  // lo puede mostrar tal cual, sin depender de un JSON aparte.
  // Los caracteres | y = son separadores del formato context: fuera.
  const context = `album=${titleFromSlug(slug).replace(/[|=]/g, " ")}`;

  const params: Record<string, string | number> = { context, folder, timestamp };

  // Álbum de retratos: aquí el nombre del archivo SÍ importa, porque es
  // lo que empareja la foto con el jugador ("rafael-borges.jpg" →
  // "Rafael Borges"). En los álbumes normales dejamos que Cloudinary
  // ponga un nombre único, para que dos IMG_1234.jpg no se pisen.
  if (slug === PLAYERS_ALBUM) {
    params.use_filename = "true";
    params.unique_filename = "false";
    params.overwrite = "true"; // volver a subir reemplaza el retrato
  }

  // OJO: todo parámetro que se manda al subir (menos file, api_key,
  // resource_type y cloud_name) tiene que ir dentro de la firma.
  const signature = signUpload(params);

  const { cloudName, apiKey } = publicConfig();
  return NextResponse.json({
    cloudName,
    apiKey,
    signature,
    timestamp,
    folder,
    context,
    // Parámetros extra que el navegador debe reenviar tal cual: van
    // firmados, así que cambiarlos invalida la subida.
    extra: Object.fromEntries(
      Object.entries(params)
        .filter(([k]) => k !== "context" && k !== "folder" && k !== "timestamp")
        .map(([k, v]) => [k, String(v)]),
    ),
  });
}
