import type { NewsPanel } from "@/lib/types";

/**
 * Tarjeta de noticia de prensa. Aparece en el inicio y en /media.
 *
 * El contenido es de un medio externo, así que la foto se sirve desde su
 * propio dominio (no se copia) y el medio y la fecha van siempre
 * visibles. El enlace abre su artículo.
 */
export default function NewsCard({ news }: { news: NewsPanel }) {
  return (
    <a
      href={news.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group grid overflow-hidden rounded-2xl border border-white/10 transition-colors hover:border-brand-gold/40 md:grid-cols-[minmax(0,340px)_1fr]"
    >
      <div className="relative aspect-video overflow-hidden md:aspect-auto">
        <img
          src={news.image}
          alt=""
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      </div>

      <div className="p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-brand-red px-3 py-1 font-semibold text-white">
            NOTICIA
          </span>
          <span className="text-white/60">{news.source}</span>
          <span className="text-white/30" aria-hidden="true">
            ·
          </span>
          <span className="text-white/60">{news.dateLabel}</span>
        </div>

        <h3 className="mt-3 h-display text-2xl leading-tight text-white transition-colors group-hover:text-brand-gold-300">
          {news.title}
        </h3>

        <p className="mt-2 text-sm text-white/75">{news.summary}</p>

        <span className="mt-4 inline-flex items-center gap-2 text-sm text-brand-gold-300">
          Leer la nota completa
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </a>
  );
}
