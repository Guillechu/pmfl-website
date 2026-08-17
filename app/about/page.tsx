import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sobre Nosotros · PMFL",
  description:
    "Historia y campeones de la Panama Major Football League (PMFL), la liga mayor de fútbol americano de Panamá.",
};

// Palmarés oficial de la PMFL (campeones por año).
const CHAMPIONS: { year: string; champion: string; pandemic?: boolean }[] = [
  { year: "2025", champion: "Raptors" },
  { year: "2024", champion: "Frailes" },
  { year: "2023", champion: "Frailes" },
  { year: "2022", champion: "Frailes" },
  { year: "2020 – 2021", champion: "Tiempo de pandemia", pandemic: true },
  { year: "2019", champion: "Frailes" },
  { year: "2018", champion: "Raptors" },
  { year: "2017", champion: "Raptors" },
  { year: "2016", champion: "Saints" },
  { year: "2015", champion: "Raptors" },
  { year: "2014", champion: "Saints" },
  { year: "2013", champion: "Saints" },
  { year: "2012", champion: "Colón Eagles" },
  { year: "2011", champion: "Frailes" },
];

// Títulos por equipo (derivado del palmarés).
const TITLES = Object.entries(
  CHAMPIONS.filter((c) => !c.pandemic).reduce<Record<string, number>>((acc, c) => {
    acc[c.champion] = (acc[c.champion] ?? 0) + 1;
    return acc;
  }, {}),
).sort((a, b) => b[1] - a[1]);

export default function AboutPage() {
  return (
    <div className="container-page py-12">
      <header className="mb-10 max-w-3xl">
        <p className="text-xs uppercase tracking-widest text-brand-gold-700 dark:text-brand-gold-300">
          La liga
        </p>
        <h1 className="h-display text-4xl md:text-5xl text-brand-navy dark:text-white">
          Sobre Nosotros
        </h1>
      </header>

      {/* HISTORIA */}
      <section className="mb-14 grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4 text-brand-navy/75 dark:text-white/80 leading-relaxed">
          <h2 className="h-display text-2xl text-brand-navy dark:text-white">Nuestra historia</h2>
          <p>
            La <span className="text-brand-navy dark:text-white">Panama Major Football League (PMFL)</span>{" "}
            es la liga mayor de fútbol americano de Panamá: una organización
            deportiva sin fines de lucro que trabaja desde 2011 por el desarrollo
            de este deporte en el país.
          </p>
          <p>
            Tras años de escasa actividad del fútbol americano organizado en
            Panamá, la liga impulsó el resurgimiento de la disciplina y hoy reúne
            a siete equipos que compiten temporada tras temporada con creciente
            nivel, pasión y espectáculo.
          </p>
          <p>
            La PMFL está amparada bajo{" "}
            <a
              href="https://pandeportes.gob.pa/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-gold-700 dark:text-brand-gold-300 hover:text-brand-gold-700 hover:dark:text-brand-gold-500"
            >
              Pandeportes
            </a>{" "}
            y la{" "}
            <a
              href="https://www.instagram.com/affpma/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-gold-700 dark:text-brand-gold-300 hover:text-brand-gold-700 hover:dark:text-brand-gold-500"
            >
              Asociación de Fútbol Americano de Panamá (AFFP)
            </a>
            , y sigue el reglamento internacional{" "}
            <Link href="/rules" className="text-brand-gold-700 dark:text-brand-gold-300 hover:text-brand-gold-700 hover:dark:text-brand-gold-500">
              IFAF
            </Link>
            .
          </p>
          <p className="text-sm text-brand-navy/55 dark:text-white/50">
            (Texto preliminar — se actualizará con la reseña oficial de la liga.)
          </p>
        </div>

        {/* Placeholder para fotos */}
        <div className="card flex min-h-[200px] flex-col items-center justify-center p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-brand-gold-600/30 dark:border-brand-gold/30 bg-brand-gold-600/10 dark:bg-brand-gold/10 text-2xl">
            🏈
          </div>
          <p className="mt-3 text-sm text-brand-navy/60 dark:text-white/60">
            Galería de fotos históricas próximamente.
          </p>
        </div>
      </section>

      {/* CAMPEONES POR AÑO */}
      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="h-display text-2xl md:text-3xl text-brand-navy dark:text-white">
            Campeones por año
          </h2>
          <a
            href="https://www.instagram.com/p/Da5F_zhRJIo/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand-gold-700 dark:text-brand-gold-300 hover:text-brand-gold-700 hover:dark:text-brand-gold-500"
          >
            Ver en Instagram →
          </a>
        </div>

        {/* Palmarés por año */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CHAMPIONS.map((c) => (
            <div
              key={c.year}
              className={
                "card flex items-center justify-between gap-4 p-4 " +
                (c.pandemic ? "opacity-70" : "")
              }
            >
              <span className="font-display text-2xl tabular-nums text-brand-gold-700 dark:text-brand-gold-300">
                {c.year}
              </span>
              {c.pandemic ? (
                <span className="text-right text-sm italic text-brand-navy/60 dark:text-white/60">
                  {c.champion}
                </span>
              ) : (
                <span className="h-display text-lg text-brand-navy dark:text-white">
                  🏆 {c.champion}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Títulos por equipo */}
        <div className="mt-8">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-gold-700 dark:text-brand-gold-300">
            Títulos por equipo
          </h3>
          <div className="flex flex-wrap gap-3">
            {TITLES.map(([team, count]) => (
              <div
                key={team}
                className="flex items-center gap-2 rounded-full border border-brand-navy/10 dark:border-white/10 bg-brand-navy/[0.04] dark:bg-white/5 px-4 py-2"
              >
                <span className="h-display text-brand-navy dark:text-white">{team}</span>
                <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-brand-gold-600/15 dark:bg-brand-gold/20 px-2 text-sm font-semibold text-brand-gold-700 dark:text-brand-gold-300">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
