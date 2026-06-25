import Link from "next/link";
import LeagueMark from "./LeagueMark";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Stadium-style backdrop */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,rgba(212,175,55,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_120%,rgba(200,16,46,0.18),transparent_60%)]" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent 0 60px, rgba(255,255,255,0.6) 60px 61px)",
          }}
        />
      </div>

      <div className="container-page py-20 md:py-28 lg:py-32 grid gap-10 lg:grid-cols-[auto_1fr] items-center">
        <LeagueMark className="h-32 w-32 md:h-40 md:w-40 animate-fade-in shadow-glow rounded-2xl" />

        <div className="animate-fade-up">
          <h1 className="h-display text-5xl sm:text-6xl lg:text-7xl text-white leading-[0.95]">
            La liga más explosiva
            <br />
            <span className="text-brand-gold-300">de Panamá</span>
          </h1>

          <p className="mt-5 max-w-xl text-base md:text-lg text-white/75">
            Ocho equipos. Un solo objetivo. La PMFL reúne la intensidad, velocidad
            y espectáculo del fútbol americano en todo Panamá.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/schedule" className="btn-primary">
              Ver Calendario
            </Link>
            <Link href="/teams" className="btn-secondary">
              Ver Equipos
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
