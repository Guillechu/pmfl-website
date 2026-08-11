import Image from "next/image";
import Link from "next/link";
import MediaSections from "@/components/MediaSections";
import Badge from "@/components/ui/Badge";

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

        <div className="card overflow-hidden p-0">
          <div className="grid items-center lg:grid-cols-2">
            {/* La infografía es vertical y muy densa: se muestra entera
                (object-contain) y enlaza al original para poder ampliarla. */}
            <a
              href="/media/rivales-2026.jpg"
              target="_blank"
              rel="noopener noreferrer"
              className="group block bg-black/40 p-4 sm:p-6"
              aria-label="Ver la infografía Rivales 2026 en tamaño completo"
            >
              <Image
                src="/media/rivales-2026.jpg"
                alt="Rivales 2026: los seis oponentes que enfrenta cada equipo de la PMFL"
                width={1290}
                height={1597}
                sizes="(min-width: 1024px) 28rem, 100vw"
                priority
                className="mx-auto h-auto w-full max-w-md rounded-xl object-contain shadow-lg transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </a>

            <div className="flex flex-col gap-4 p-6 md:p-10">
              <h3 className="h-display text-3xl text-white">
                Rivales 2026
              </h3>

              <p className="text-white/75">
                Ya están definidos los cruces de la temporada 2026. Cada uno de
                los siete equipos de la liga se mide con los otros seis a lo
                largo de la campaña.
              </p>

              <p className="text-sm text-white/55">
                Toca la imagen para verla en grande.
              </p>

              <div className="pt-1">
                <Link
                  href="/schedule"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/85 transition-colors hover:border-brand-gold-300/60 hover:text-white"
                >
                  Ver el calendario completo
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MediaSections />
    </div>
  );
}
