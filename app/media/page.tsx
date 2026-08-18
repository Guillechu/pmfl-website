import { getMatchVideosByYear } from "@/lib/youtube";
import MatchVideos from "@/components/MatchVideos";
import MediaSections from "@/components/MediaSections";
import NewsCard from "@/components/NewsCard";
import Badge from "@/components/ui/Badge";
import { weekly } from "@/lib/data";

// Los vídeos de los partidos se leen del canal de YouTube en el servidor y se
// cachean una hora: cuando la liga sube uno nuevo aparece solo.
export const revalidate = 3600;

export const metadata = {
  title: "Media · PMFL",
  description:
    "Vídeos de los partidos por jornada, noticias, jugadas destacadas y contenido exclusivo de la PMFL.",
};

/**
 * Página de Media: últimas noticias, vídeos de los partidos, vídeo destacado,
 * Draft y highlights.
 *
 * El bloque de noticias vive aquí porque es estático, y los vídeos porque hay
 * que ir a buscarlos al servidor. El resto está en <MediaSections>, que es
 * cliente porque el filtro de categorías lleva estado.
 */
export default async function MediaPage() {
  const years = await getMatchVideosByYear();
  const total = years.reduce((n, y) => n + y.total, 0);

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

      {/* VÍDEOS DE LOS PARTIDOS — del canal de YouTube de la liga */}
      <section className="mb-12">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="h-display text-2xl text-brand-navy dark:text-white">
              Videos de los Partidos
            </h2>
            <p className="mt-1 text-sm text-brand-navy/60 dark:text-white/60">
              Toca un año y una jornada para ver sus partidos.
            </p>
          </div>
          <a
            href="https://www.youtube.com/@pmfl"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand-gold-700 transition-colors hover:text-brand-gold-600 dark:text-brand-gold-300 dark:hover:text-brand-gold-500"
          >
            Canal de YouTube →
            {total > 0 && (
              <span className="ml-2 text-xs text-brand-navy/45 dark:text-white/45">
                {total} vídeos
              </span>
            )}
          </a>
        </div>

        <MatchVideos years={years} />
      </section>

      <MediaSections />
    </div>
  );
}
