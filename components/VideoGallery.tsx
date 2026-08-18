import type { MediaItem } from "@/lib/types";
import Badge from "@/components/ui/Badge";

/**
 * Sección propia para los vídeos de YouTube: partidos completos y
 * transmisiones. Va la primera en /media.
 *
 * Se muestran como miniatura y no con el reproductor incrustado: cuatro
 * iframes de YouTube en la misma pantalla cargan cientos de KB cada uno
 * y retrasan la página. La miniatura la sirve el propio YouTube y abre
 * el vídeo en su web.
 */
export default function VideoGallery({ videos }: { videos: MediaItem[] }) {
  if (videos.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="h-display text-2xl text-brand-navy dark:text-white">
            Vídeos
          </h2>
          <p className="mt-1 text-sm text-brand-navy/60 dark:text-white/60">
            Partidos completos y transmisiones de la liga.
          </p>
        </div>
        <Badge variant="red">YouTube</Badge>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => (
          <article
            key={v.id}
            className="card card-hover group overflow-hidden p-0"
          >
            <a
              href={`https://www.youtube.com/watch?v=${v.youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={v.thumbnail}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* El degradado y el botón van sobre la foto: mismos
                    colores en los dos temas. */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                <div className="absolute bottom-3 left-3">
                  <Badge variant="gold">{v.category}</Badge>
                </div>

                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-brand-red/90 p-4 transition-transform duration-300 group-hover:scale-110">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-brand-navy transition-colors group-hover:text-brand-gold-700 dark:text-white dark:group-hover:text-brand-gold-300">
                  {v.title}
                </h3>
              </div>
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
