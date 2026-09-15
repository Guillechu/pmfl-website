import MediaSections from "@/components/MediaSections";
import MatchVideos from "@/components/MatchVideos";
import NewsCard from "@/components/NewsCard";
import Badge from "@/components/ui/Badge";
import { weekly } from "@/lib/data";
import { getMatchVideosByYear } from "@/lib/youtube";

export const metadata = {
  title: "Media · PMFL",
  description:
    "Los mejores momentos, noticias, jugadas destacadas y contenido exclusivo de la PMFL.",
};

/**
 * Página de Media: últimas noticias, vídeo destacado, Draft y highlights.
 *
 * El bloque de noticias vive aquí porque es estático. El resto está en
 * <MediaSections>, que es cliente porque el filtro de categorías lleva
 * estado; esta página se queda como Server Component.
 *
 * Los vídeos de los partidos NO se escriben a mano: se leen del canal
 * de YouTube de la liga y se agrupan por año y jornada a partir del
 * título ("PMFL RAPTORS VS TIGERS WEEK 3 2026"). Subir el vídeo es todo
 * lo que hay que hacer para que aparezca aquí.
 */

// Un partido recién subido tarda como mucho esto en salir. Si el canal
// no responde, getMatchVideosByYear devuelve [] y la sección lo dice,
// en vez de tumbar la página.
export const revalidate = 3600;

export default async function MediaPage() {
  const years = await getMatchVideosByYear().catch((err) => {
    console.error("[media] no se pudieron leer los vídeos del canal", err);
    return [];
  });

  return (
    <div className="container-page py-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-brand-gold-700 dark:text-brand-gold-300">
          Watch
        </p>
        <h1 className="h-display text-4xl md:text-5xl text-brand-navy dark:text-white">
          Media
        </h1>
        <p className="mt-2 text-brand-navy/70 dark:text-white/70 max-w-2xl">
          Los mejores momentos, noticias, jugadas destacadas y contenido
          exclusivo de la PMFL.
        </p>
      </header>

      {/* VÍDEOS DE LOS PARTIDOS — lo primero de la página. Salen del
          canal, no de data/media.json: antes había una lista a mano que
          alguien tenía que actualizar cada jornada, y se quedaba atrás. */}
      <section className="mb-12">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="h-display text-2xl text-brand-navy dark:text-white">
              Vídeos
            </h2>
            <p className="mt-1 text-sm text-brand-navy/60 dark:text-white/60">
              Partidos completos del canal oficial, por jornada.
            </p>
          </div>
          <Badge variant="red">YouTube</Badge>
        </div>

        <MatchVideos years={years} />
      </section>

      {/* ÚLTIMAS NOTICIAS */}
      <section className="mb-12">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="h-display text-2xl text-brand-navy dark:text-white">
            Últimas Noticias
          </h2>
          <Badge variant="gold">Nuevo</Badge>
        </div>

        {weekly.news && <NewsCard news={weekly.news} />}
      </section>

      <MediaSections />
    </div>
  );
}
