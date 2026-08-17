import Link from "next/link";
import type { ResultsPanel } from "@/lib/types";

/**
 * Resumen de la jornada en el inicio: titular, resumen y los marcadores.
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
    <div className="flex items-baseline justify-between gap-4">
      <span className={gana ? "font-semibold text-brand-navy dark:text-white" : "text-brand-navy/70 dark:text-white/70"}>
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
      className={
        "group grid overflow-hidden rounded-2xl border border-brand-navy/10 dark:border-white/10 bg-gradient-to-br from-white dark:from-brand-navy-800 via-white dark:via-brand-navy-900 to-black transition-colors hover:border-brand-gold-600/50 hover:dark:border-brand-gold/40 " +
        (data.image ? "lg:grid-cols-[minmax(0,44%)_1fr]" : "")
      }
    >
      {data.image && (
        // En pantalla ancha la foto ocupa una columna y se estira al alto
        // del texto: así queda casi en su proporción natural. Como banner
        // a todo lo ancho se recortaba dos tercios de la imagen y se
        // perdía la mitad de los jugadores.
        <div className="relative h-56 overflow-hidden sm:h-72 lg:h-auto">
          <img
            src={data.image}
            alt={data.imageAlt ?? ""}
            className="absolute inset-0 h-full w-full object-cover object-center transition duration-500 group-hover:scale-105"
          />
          {/* Funde la foto con la tarjeta: por abajo al apilarse, por el
              lado derecho cuando van en columnas. */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-brand-navy-900 to-transparent lg:hidden" />
          <div className="absolute inset-y-0 right-0 hidden w-20 bg-gradient-to-l from-brand-navy-900 to-transparent lg:block" />
        </div>
      )}

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

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {data.partidos.map((p) => (
            <Marcador key={`${p.casa}-${p.visita}`} {...p} />
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
