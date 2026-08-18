// Galería — Server Component. Los álbumes se leen EN VIVO desde Cloudinary
// (una subcarpeta por álbum: pmfl/combine-2026, pmfl/jornada-1…), así que
// lo que sube el fotógrafo en /admin aparece aquí sin tocar código.
//
// Si Cloudinary no responde, se cae a data/gallery.json (ver lib/albums.ts).

import { getAlbums } from "@/lib/albums";
import { PLAYERS_ALBUM } from "@/lib/player-photos";
import { SPONSORS_ALBUM } from "@/lib/sponsors";
import GalleryAccordion from "@/components/GalleryAccordion";

export const revalidate = 60;

export const metadata = {
  title: "Galería · PMFL",
  description:
    "Fotos oficiales de la Panama Major Football League: Combine, jornadas y playoffs.",
};

export default async function GalleryPage() {
  // Hay dos carpetas de servicio que no son galerías de evento: los
  // retratos que alimentan el pódium y los logos de patrocinadores.
  //
  // Se comparan normalizadas y no por igualdad exacta: la carpeta de
  // Cloudinary puede llamarse "Patrocinadores" o llevar tilde, y con una
  // comparación estricta se colaba en la galería pública.
  const normalizar = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");

  const OCULTOS = new Set([PLAYERS_ALBUM, SPONSORS_ALBUM].map(normalizar));
  const albums = (await getAlbums(60)).filter(
    (a) => !OCULTOS.has(normalizar(a.slug)) && !OCULTOS.has(normalizar(a.title)),
  );
  const total = albums.reduce((n, a) => n + a.photos.length, 0);

  return (
    <div className="container-page py-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-brand-gold-700 dark:text-brand-gold-300">
          Visuales
        </p>
        <h1 className="h-display text-4xl text-brand-navy dark:text-white md:text-5xl">Galería</h1>
        <p className="mt-2 max-w-2xl text-brand-navy/70 dark:text-white/70">
          {total > 0
            ? "Fotos del Combine y de cada jornada de la PMFL. Toca el nombre de un álbum para ver u ocultar sus fotos."
            : "Las fotos de cada jornada se publicarán aquí durante la temporada."}
        </p>
      </header>

      <GalleryAccordion albums={albums} />
    </div>
  );
}
