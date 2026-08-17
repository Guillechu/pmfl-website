import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reglas IFAF · PMFL",
  description:
    "Reglamento completo de fútbol americano 2026 (IFAF) y sus modificaciones.",
};

const DOCS = [
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

export default function RulesPage() {
  return (
    <div className="container-page py-12">
      <header className="mb-8 max-w-3xl">
        <p className="text-xs uppercase tracking-widest text-brand-gold-700 dark:text-brand-gold-300">
          Reglamento
        </p>
        <h1 className="h-display text-4xl md:text-5xl text-brand-navy dark:text-white">Reglas IFAF</h1>
        <p className="mt-3 text-brand-navy/70 dark:text-white/70">
          La PMFL se rige por el reglamento de la Federación Internacional de
          Fútbol Americano (IFAF). Consulta el reglamento completo y sus
          modificaciones de la temporada 2026.
        </p>
      </header>

      <div className="space-y-12">
        {DOCS.map((doc) => (
          <section key={doc.file}>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="h-display text-2xl text-brand-navy dark:text-white">{doc.title}</h2>
                <p className="text-sm text-brand-navy/60 dark:text-white/60">{doc.subtitle}</p>
              </div>
              <a
                href={doc.file}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-gold-700 dark:text-brand-gold-300 hover:text-brand-gold-700 hover:dark:text-brand-gold-500"
              >
                Abrir en pestaña nueva ↗
              </a>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white dark:bg-black/40">
              <iframe
                src={`${doc.file}#view=FitH`}
                title={doc.title}
                className="h-[80vh] min-h-[480px] w-full"
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
