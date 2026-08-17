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
      <span className={gana ? "font-semibold text-white" : "text-white/70"}>
        {equipo}
      </span>
      <span
        className={
          "font-display tabular-nums text-2xl " +
          (gana ? "text-brand-gold-300" : "text-white/50")
        }
      >
        {tantos}
      </span>
    </div>
  );

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
      {fila(casa, marcadorCasa, marcadorCasa > marcadorVisita)}
      <div className="my-2 border-t border-white/5" />
      {fila(visita, marcadorVisita, marcadorVisita > marcadorCasa)}
    </div>
  );
}

export default function ResultsCard({ data }: { data: ResultsPanel }) {
  return (
    <Link
      href={data.url}
      className="group block overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-brand-navy-800 via-brand-navy-900 to-black transition-colors hover:border-brand-gold/40"
    >
      <div className="p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-brand-red px-3 py-1 font-semibold text-white">
            RESULTADOS
          </span>
          <span className="text-white/60">{data.eyebrow}</span>
        </div>

        <h3 className="mt-3 h-display text-2xl leading-tight text-white transition-colors group-hover:text-brand-gold-300 md:text-3xl">
          {data.title}
        </h3>

        <p className="mt-2 max-w-3xl text-sm text-white/75">{data.summary}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {data.partidos.map((p) => (
            <Marcador key={`${p.casa}-${p.visita}`} {...p} />
          ))}
        </div>

        <span className="mt-5 inline-flex items-center gap-2 text-sm text-brand-gold-300">
          {data.linkLabel}
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}
