import { sponsors } from "@/lib/data";
import SponsorCarousel from "@/components/SponsorCarousel";

export default function SponsorsPage() {
  return (
    <div className="container-page py-12">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-brand-navy-800 via-brand-navy-900 to-black p-8 md:p-12 mb-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.18),transparent_45%)]" />
        <div className="relative z-10 max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-brand-gold-300">
            Aliados oficiales
          </p>
          <h1 className="mt-3 h-display text-4xl md:text-6xl text-white leading-tight">
            Patrocinadores PMFL 2026
          </h1>
          <p className="mt-4 text-white/75 text-base md:text-lg">
            Marcas que impulsan el crecimiento del fútbol americano en Panamá y
            apoyan la evolución de la liga más explosiva del país.
          </p>
        </div>
      </section>

      <SponsorCarousel className="mb-14" />

      <section>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-brand-gold-300">
              Partners
            </p>
            <h2 className="h-display text-3xl text-white">
              Nuestros patrocinadores
            </h2>
          </div>
          <span className="text-sm text-white/50">
            {sponsors.length} aliados
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {sponsors.map((s) => (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 min-h-[180px] flex flex-col items-center justify-center text-center transition duration-300 hover:-translate-y-1 hover:border-brand-gold/50 hover:bg-white/[0.08] hover:shadow-[0_0_30px_rgba(212,175,55,0.12)]"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.12),transparent_60%)]" />

              <div className="relative z-10 h-20 w-full flex items-center justify-center">
                <img
                  src={s.logo}
                  alt={s.name}
                  className="max-h-16 max-w-[150px] object-contain transition duration-300 group-hover:scale-105"
                />
              </div>

              <h3 className="relative z-10 mt-5 font-display text-lg text-white tracking-wide">
                {s.name}
              </h3>

              <p className="relative z-10 mt-2 text-xs uppercase tracking-widest text-brand-gold-300 opacity-80">
                Patrocinador oficial
              </p>
            </a>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden card mt-16 p-8 md:p-10 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(200,16,46,0.16),transparent_60%)]" />
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-widest text-brand-gold-300">
            Únete a la liga
          </p>
          <h2 className="mt-2 h-display text-3xl text-white">
            Impulsa tu marca con la PMFL
          </h2>
          <p className="mt-3 text-white/70 max-w-2xl mx-auto">
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