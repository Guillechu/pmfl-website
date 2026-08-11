import MediaSections from "@/components/MediaSections";

export const metadata = {
  title: "Media · PMFL",
  description:
    "Los mejores momentos, noticias, jugadas destacadas y contenido exclusivo de la PMFL.",
};

/**
 * Página de Media: vídeo destacado, noticia del Draft y highlights.
 *
 * El contenido vive en <MediaSections>, que es cliente porque el filtro de
 * categorías lleva estado. Esta página se queda como Server Component.
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

      <MediaSections />
    </div>
  );
}
