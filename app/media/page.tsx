import MediaSections from "@/components/MediaSections";
import NewsCard from "@/components/NewsCard";
import Badge from "@/components/ui/Badge";
import { weekly } from "@/lib/data";

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
 */
export default function MediaPage() {
  return (
    <div className="container-page py-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-brand-gold-300">
          Watch
        </p>
        <h1 className="h-display text-4xl md:text-5xl text-white">
          Media
        </h1>
        <p className="mt-2 text-white/70 max-w-2xl">
          Los mejores momentos, noticias, jugadas destacadas y contenido
          exclusivo de la PMFL.
        </p>
      </header>

      {/* ÚLTIMAS NOTICIAS */}
      <section className="mb-12">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="h-display text-2xl text-white">
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
