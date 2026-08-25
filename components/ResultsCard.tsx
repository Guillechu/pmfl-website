import Link from "next/link";
import type { ResultsPanel } from "@/lib/types";

/**
 * Resumen de la jornada en el inicio: titular, resumen y los marcadores,
 * cada uno con su foto.
 *
 * Los marcadores se escriben en data/weekly.json a mano, no salen de
 * Cloob: esto es una nota editorial sobre una jornada concreta, y debe
 * seguir diciendo lo mismo aunque la clasificación en vivo avance.
 */
function Marcador({
  casa,
  marcadorCasa,
  visita,
  marcadorVisita,
}: ResultsPanel["partidos"][number]) {
  const fila = (equipo: string, tantos: number, gana: boolean) => (
    <div className="flex items-baseline justify-between gap-3">
      <span className={"truncate " + (gana ? "font-semibold text-brand-navy dark:text-white" : "text-brand-navy/70 dark:text-white/70")}>
        {equipo}
      </span>
      <span
        className={
          "font-display tabular-nums text-2xl " +
          (gana ? "text-brand-gold-700 dark:text-brand-gold-300" : "text-brand-navy/55 dark:text-white/50")
        }
      >
        {tantos}
      </span>
    </div>
  );

  return (
    <div className="rounded-xl border border-brand-navy/10 dark:border-white/10 bg-white dark:bg-white/[0.04] px-4 py-3">
      {fila(casa, marcadorCasa, marcadorCasa > marcadorVisita)}
      <div className="my-2 border-t border-brand-navy/[0.07] dark:border-white/5" />
      {fila(visita, marcadorVisita, marcadorVisita > marcadorCasa)}
    </div>
  );
}

export default function ResultsCard({ data }: { data: ResultsPanel }) {
  return (
    <Link
      href={data.url}
      className="group block overflow-hidden rounded-2xl border border-brand-navy/10 bg-gradient-to-br from-white via-white to-brand-navy/[0.06] transition-colors hover:border-brand-gold-600/50 dark:border-white/10 dark:from-brand-navy-800 dark:via-brand-navy-900 dark:to-black hover:dark:border-brand-gold/40"
    >
      <div className="p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-brand-red px-3 py-1 font-semibold text-white">
            RESULTADOS
          </span>
          <span className="text-brand-navy/60 dark:text-white/60">{data.eyebrow}</span>
        </div>

        <h3 className="mt-3 h-display text-2xl leading-tight text-brand-navy dark:text-white transition-colors group-hover:text-brand-gold-700 group-hover:dark:text-brand-gold-300 md:text-3xl">
          {data.title}
        </h3>

        <p className="mt-2 max-w-3xl text-sm text-brand-navy/70 dark:text-white/75">{data.summary}</p>

        {/* Un partido por columna. La foto va entera, sin recortar: son
            fotos verticales y llevan dentro el crédito del fotógrafo.
            En móvil eso las haría larguísimas apiladas, así que ahí se
            reduce a miniatura y el marcador se pone al lado. */}
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {data.partidos.map((p) => (
            <article key={`${p.casa}-${p.visita}`} className="flex gap-3 sm:block">
              {p.foto && (
                <div className="w-28 shrink-0 overflow-hidden rounded-xl sm:mb-3 sm:w-full">
                  <img
                    src={p.foto}
                    alt={p.fotoAlt ?? ""}
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
              )}

              <div className="min-w-0 flex-1 self-center sm:self-auto">
                <Marcador {...p} />
              </div>
            </article>
          ))}
        </div>

        <span className="mt-5 inline-flex items-center gap-2 text-sm text-brand-gold-700 dark:text-brand-gold-300">
          {data.linkLabel}
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}
