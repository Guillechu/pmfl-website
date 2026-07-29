import { sponsors } from "@/lib/data";
import SponsorCarousel from "@/components/SponsorCarousel";
import type { Sponsor, SponsorCategory } from "@/lib/types";

// Order + copy for the three groups shown inside "Patrocinadores".
const GROUPS: { key: SponsorCategory; blurb: string }[] = [
  {
    key: "Patrocinadores",
    blurb: "Marcas que impulsan y hacen posible la liga.",
  },
  {
    key: "Alianzas",
    blurb: "Aliados estratégicos que crecen junto a la PMFL.",
  },
  {
    key: "Team Partners",
    blurb: "Colaboradores que apoyan a nuestros equipos.",
  },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function SponsorCard({ s }: { s: Sponsor }) {
  const hasLink = s.url && s.url !== "#";
  const inner = (
    <>
      {s.logo ? (
        <div className="relative z-10 flex h-20 w-full items-center justify-center rounded-xl bg-white px-4 py-3">
          <img
            src={s.logo}
            alt={s.name}
            className="max-h-14 max-w-[170px] object-contain transition duration-300 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="relative z-10 flex h-16 w-full items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-brand-gold/30 bg-brand-gold/10 font-display text-lg text-brand-gold-300">
            {initials(s.name)}
          </span>
        </div>
      )}
      <h3 className="relative z-10 mt-4 font-display text-base tracking-wide text-white">
        {s.name}
      </h3>
    </>
  );

  const className =
    "group relative flex min-h-[160px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center transition duration-300 hover:-translate-y-1 hover:border-brand-gold/40 hover:bg-white/[0.07]";

  if (hasLink) {
    return (
      <a href={s.url} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    );
  }
  return <div className={className}>{inner}</div>;
}

export default function SponsorsPage() {
  return (
    <div className="container-page py-12">
      <section className="relative mb-12 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-brand-navy-800 via-brand-navy-900 to-black p-8 md:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.18),transparent_45%)]" />
        <div className="relative z-10 max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-brand-gold-300">
            Aliados oficiales
          </p>
          <h1 className="mt-3 h-display text-4xl leading-tight text-white md:text-6xl">
            Patrocinadores PMFL 2026
          </h1>
          <p className="mt-4 text-base text-white/75 md:text-lg">
            Marcas que impulsan el crecimiento del fútbol americano en Panamá y
            apoyan la evolución de la liga más explosiva del país.
          </p>
        </div>
      </section>

      <SponsorCarousel className="mb-14" />

      <div className="space-y-14">
        {GROUPS.map((group) => {
          const items = sponsors.filter((s) => s.category === group.key);
          if (items.length === 0) return null;

          return (
            <section key={group.key}>
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <h2 className="h-display text-3xl text-white">{group.key}</h2>
                  <p className="mt-1 text-sm text-white/60">{group.blurb}</p>
                </div>
                <span className="whitespace-nowrap text-sm text-white/50">
                  {items.length} {items.length === 1 ? "aliado" : "aliados"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((s) => (
                  <SponsorCard key={s.id} s={s} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <section className="card relative mt-16 overflow-hidden p-8 text-center md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(200,16,46,0.16),transparent_60%)]" />
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-widest text-brand-gold-300">
            Únete a la liga
          </p>
          <h2 className="mt-2 h-display text-3xl text-white">
            Impulsa tu marca con la PMFL
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/70">
            Conecta con fanáticos apasionados, atletas, equipos y comunidades
            deportivas en todo Panamá. Sé parte del crecimiento del fútbol
            americano nacional.
          </p>
          <a href="/contact" className="btn-primary mt-6 inline-flex">
            Contactar alianzas
          </a>
        </div>
      </section>
    </div>
  );
}
