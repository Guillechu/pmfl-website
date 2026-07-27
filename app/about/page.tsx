import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sobre Nosotros · PMFL",
  description:
    "Historia y campeones de la Panama Major Football League (PMFL), la liga mayor de fútbol americano de Panamá.",
};

// Palmarés — a completar con la información oficial de la liga.
const CHAMPIONS = [
  { year: "2025", note: "Final: Raptors vs Wolfpack", champion: "Por confirmar" },
  { year: "2024", note: "", champion: "Por confirmar" },
  { year: "2023", note: "", champion: "Por confirmar" },
];

export default function AboutPage() {
  return (
    <div className="container-page py-12">
      <header className="mb-10 max-w-3xl">
        <p className="text-xs uppercase tracking-widest text-brand-gold-300">
          La liga
        </p>
        <h1 className="h-display text-4xl md:text-5xl text-white">
          Sobre Nosotros
        </h1>
      </header>

      {/* HISTORIA */}
      <section className="mb-14 grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4 text-white/80 leading-relaxed">
          <h2 className="h-display text-2xl text-white">Nuestra historia</h2>
          <p>
            La <span className="text-white">Panama Major Football League (PMFL)</span>{" "}
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
              className="text-brand-gold-300 hover:text-brand-gold-500"
            >
              Pandeportes
            </a>{" "}
            y la{" "}
            <a
              href="https://www.instagram.com/affpma/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-gold-300 hover:text-brand-gold-500"
            >
              Asociación de Fútbol Americano de Panamá (AFFP)
            </a>
            , y sigue el reglamento internacional{" "}
            <Link href="/rules" className="text-brand-gold-300 hover:text-brand-gold-500">
              IFAF
            </Link>
            .
          </p>
          <p className="text-sm text-white/50">
            (Texto preliminar — se actualizará con la reseña oficial de la liga.)
          </p>
        </div>

        {/* Placeholder para fotos */}
        <div className="card flex min-h-[200px] flex-col items-center justify-center p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-brand-gold/30 bg-brand-gold/10 text-2xl">
            🏈
          </div>
          <p className="mt-3 text-sm text-white/60">
            Galería de fotos históricas próximamente.
          </p>
        </div>
      </section>

      {/* CAMPEONES POR AÑO */}
      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="h-display text-2xl md:text-3xl text-white">
            Campeones por año
          </h2>
          <a
            href="https://www.instagram.com/p/Da5F_zhRJIo/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand-gold-300 hover:text-brand-gold-500"
          >
            Ver en Instagram →
          </a>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CHAMPIONS.map((c) => (
            <div key={c.year} className="card p-5">
              <p className="font-display text-3xl text-brand-gold-300">{c.year}</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {c.champion}
              </p>
              {c.note && <p className="mt-1 text-sm text-white/60">{c.note}</p>}
            </div>
          ))}
        </div>

        <p className="mt-4 text-sm text-white/50">
          Estamos recopilando el palmarés histórico completo de la liga. Envíanos
          la lista de campeones por año y la publicamos aquí.
        </p>
      </section>
    </div>
  );
}
