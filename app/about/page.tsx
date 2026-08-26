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

/**
 * Collage de la sección "Nuestra historia". Son fotos de la Jornada 2
 * (23 de agosto, Estadio Emilio Royo), recortadas a 4:5 y reducidas: las
 * originales pesaban entre 3 y 8 MB cada una y aquí van a ~110 KB.
 */
const COLLAGE = [
  {
    src: "/media/nosotros/aguilas-carrera.jpg",
    alt: "Un corredor de las Águilas Doradas avanza con el balón perseguido por el número 69 de los Saints",
  },
  {
    src: "/media/nosotros/saints-celebracion.jpg",
    alt: "El número 22 de los Saints celebra con un compañero dentro de la zona de anotación",
  },
  {
    src: "/media/nosotros/eagles-pase.jpg",
    alt: "El quarterback número 7 de los Colón Eagles arma el brazo para lanzar",
  },
  {
    src: "/media/nosotros/wolfpack-carrera.jpg",
    alt: "Un corredor de los Wolfpack rompe la tacleada de un defensivo de los Tigers",
  },
  {
    src: "/media/nosotros/eagles-defensa.jpg",
    alt: "El número 83 de los Colón Eagles frena a un receptor rival cerca de la banda",
  },
  {
    src: "/media/nosotros/arbitros.jpg",
    alt: "Dos árbitros conversan junto al marcador de la yarda 50 antes de reanudar el juego",
  },
];

/**
 * Reglamento IFAF. Vivía en su propia página (/rules) y ahora va al
 * final de Nosotros: es material de consulta, no una sección que la
 * gente visite por su cuenta.
 */
const REGLAS = [
  {
    title: "Reglamento completo 2026",
    subtitle: "Reglas e interpretaciones de fútbol americano (IFAF) · Español",
    file: "/reglas/reglamento-futbol-americano-2026.pdf",
  },
  {
    title: "Modificaciones 2026",
    subtitle: "Cambios de reglas IFAF para la temporada 2026",
    file: "/reglas/modificaciones-ifaf-2026.pdf",
  },
];

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
      <section className="mb-14 grid items-start gap-8 lg:grid-cols-[1.1fr_1fr]">
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
        </div>

        {/* Collage: sin separacion, sin borde y con las esquinas rectas, para
            que las seis fotos se lean como una sola imagen. */}
        <div className="grid grid-cols-3">
          {COLLAGE.map((foto) => (
            <img
              key={foto.src}
              src={foto.src}
              alt={foto.alt}
              loading="lazy"
              className="block aspect-[4/5] w-full object-cover"
            />
          ))}
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

      {/* Reglamento IFAF — antes en su propia página /rules */}
      <section id="reglas" className="mt-16 scroll-mt-24">
        <div className="mb-6 max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-brand-gold-700 dark:text-brand-gold-300">
            Reglamento
          </p>
          <h2 className="mt-1 h-display text-2xl md:text-3xl text-brand-navy dark:text-white">
            Reglas IFAF
          </h2>
          <p className="mt-3 text-brand-navy/70 dark:text-white/70">
            La PMFL se rige por el reglamento de la Federación Internacional de
            Fútbol Americano (IFAF). Consulta el reglamento completo y sus
            modificaciones de la temporada 2026.
          </p>
        </div>

        <div className="space-y-10">
          {REGLAS.map((doc) => (
            <div key={doc.file}>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="h-display text-xl text-brand-navy dark:text-white">
                    {doc.title}
                  </h3>
                  <p className="text-sm text-brand-navy/60 dark:text-white/60">
                    {doc.subtitle}
                  </p>
                </div>
                <a
                  href={doc.file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-gold-700 dark:text-brand-gold-300 hover:text-brand-gold-800 hover:dark:text-brand-gold-500"
                >
                  Abrir en pestaña nueva ↗
                </a>
              </div>

              <div className="overflow-hidden rounded-2xl border border-brand-navy/10 dark:border-white/10 bg-white dark:bg-black/40">
                <iframe
                  src={`${doc.file}#view=FitH`}
                  title={doc.title}
                  className="h-[80vh] min-h-[480px] w-full"
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
