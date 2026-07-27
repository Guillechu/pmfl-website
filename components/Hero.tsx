import Link from "next/link";
import Image from "next/image";
import PanamaFlag from "./PanamaFlag";
import { InstagramIcon } from "./SocialIcons";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Stadium-style backdrop (sutil) */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,rgba(212,175,55,0.14),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_120%,rgba(200,16,46,0.14),transparent_60%)]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent 0 60px, rgba(255,255,255,0.6) 60px 61px)",
          }}
        />
      </div>

      {/* Instagram de la liga, arriba a la derecha */}
      <div className="container-page flex justify-end pt-6">
        <a
          href="https://www.instagram.com/pmfl507/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition-colors hover:border-brand-gold/50 hover:text-white"
          aria-label="PMFL en Instagram"
        >
          <InstagramIcon className="h-5 w-5" />
          <span>@pmfl507</span>
        </a>
      </div>

      <div className="container-page grid items-center gap-10 pb-16 pt-6 md:pb-24 lg:grid-cols-[1fr_auto]">
        {/* Texto */}
        <div className="order-2 animate-fade-up lg:order-1">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-brand-gold-300 sm:text-sm">
            <PanamaFlag className="h-4 w-6 rounded-sm shadow-sm" />
            Liga deportiva sin fines de lucro desde 2011
          </p>

          <h1 className="mt-4 h-display text-4xl leading-[0.95] text-white sm:text-5xl lg:text-6xl">
            Panama Major
            <br />
            Football League
          </h1>

          <p className="mt-3 text-lg text-brand-gold-300 md:text-xl">
            La liga más explosiva de Panamá
          </p>

          <p className="mt-5 max-w-xl text-base text-white/75 md:text-lg">
            Siete equipos. Un solo objetivo. La PMFL reúne la intensidad,
            velocidad y espectáculo del fútbol americano en todo Panamá.
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

        {/* Logo grande, sin recuadro */}
        <div className="order-1 flex justify-center lg:order-2">
          <Image
            src="/pmfl-logo.png"
            alt="Panama Major Football League"
            width={971}
            height={698}
            priority
            className="h-auto w-[280px] animate-fade-in object-contain drop-shadow-[0_0_40px_rgba(212,175,55,0.22)] sm:w-[340px] md:w-[400px] lg:w-[460px]"
          />
        </div>
      </div>

      {/* Pie de la sección: nombre en español */}
      <div className="border-t border-white/10 bg-white/[0.02]">
        <div className="container-page flex flex-wrap items-center justify-center gap-3 py-4 text-center">
          <PanamaFlag className="h-5 w-8 rounded-sm shadow-sm" />
          <p className="h-display text-sm tracking-wider text-white/80 md:text-base">
            Liga Mayor de Fútbol Americano de Panamá
          </p>
        </div>
      </div>
    </section>
  );
}
