import Link from "next/link";
import Image from "next/image";
import PanamaFlag from "./PanamaFlag";
import { InstagramIcon } from "./SocialIcons";
import LiveBadge from "./LiveBadge";
import type { MediaItem, PortadaPanel } from "@/lib/types";

export default function Hero({
  live,
  portada,
}: {
  live?: MediaItem | null;
  portada?: PortadaPanel | null;
}) {
  return (
    <section className="relative overflow-hidden">
      {/* Stadium-style backdrop (sutil) */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,rgba(212,175,55,0.14),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_120%,rgba(200,16,46,0.14),transparent_60%)]" />
        {/* Rayas verticales de fondo. Van duplicadas porque el color
            está en un style en línea y ahí no valen las variantes dark:
            unas rayas blancas no se ven sobre claro, y unas navy no se
            ven sobre oscuro. */}
        <div
          className="absolute inset-0 opacity-[0.05] dark:hidden"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent 0 60px, rgba(11,31,58,0.45) 60px 61px)",
          }}
        />
        <div
          className="absolute inset-0 hidden opacity-[0.06] dark:block"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent 0 60px, rgba(255,255,255,0.6) 60px 61px)",
          }}
        />
      </div>

      {/* Arriba del todo: el aviso EN VIVO a la izquierda, cuando hay
          transmisión, e Instagram a la derecha. Es lo primero que se
          ve al entrar, también en móvil, donde el logo grande empuja
          el resto del Hero por debajo de la pantalla. Si no caben
          juntos, Instagram baja a la línea siguiente sin perder su
          sitio a la derecha (ml-auto). */}
      <div className="container-page flex flex-wrap items-center gap-3 pt-6">
        {live && <LiveBadge live={live} />}

        <a
          href="https://www.instagram.com/pmfl507/"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-2 rounded-full border border-brand-navy/15 dark:border-white/15 bg-brand-navy/[0.04] dark:bg-white/5 px-4 py-2 text-sm text-brand-navy/75 dark:text-white/80 transition-colors hover:border-brand-gold/50 hover:text-brand-navy hover:dark:text-white"
          aria-label="PMFL en Instagram"
        >
          <InstagramIcon className="h-5 w-5" />
          <span>@pmfl507</span>
        </a>
      </div>

      {/* Portada: el arte del momento (playoffs, final) con su titular,
          antes que la presentación de la liga. Se pone y se quita desde
          portada en data/weekly.json. Es lo primero que se pinta, así
          que la imagen va con priority. */}
      {portada && (
        <div className="container-page pt-6">
          <Link
            href={portada.url}
            className="group block overflow-hidden rounded-2xl border border-brand-navy/10 bg-white shadow-card transition-colors hover:border-brand-gold-600/50 dark:border-white/10 dark:bg-black/40 dark:shadow-cardDark dark:hover:border-brand-gold/40"
          >
            <Image
              src={portada.image}
              alt={portada.alt}
              width={1920}
              height={1080}
              priority
              sizes="(min-width: 1280px) 1200px, 100vw"
              className="h-auto w-full"
            />
            <div className="px-5 py-5 md:px-8 md:py-6">
              <span className="inline-flex items-center rounded-full bg-brand-gold px-3 py-1 text-xs font-semibold text-brand-navy-900">
                {portada.eyebrow}
              </span>
              <h2 className="mt-3 h-display text-2xl leading-tight text-brand-navy transition-colors group-hover:text-brand-gold-700 dark:text-white group-hover:dark:text-brand-gold-300 md:text-4xl">
                {portada.title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-brand-navy/70 dark:text-white/75 md:text-base">
                {portada.summary}
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm text-brand-gold-700 dark:text-brand-gold-300">
                {portada.linkLabel}
                <span aria-hidden="true">→</span>
              </span>
            </div>
          </Link>
        </div>
      )}

      <div className="container-page grid items-center gap-10 pb-16 pt-6 md:pb-24 lg:grid-cols-[1fr_auto]">
        {/* Texto */}
        <div className="order-2 animate-fade-up lg:order-1">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-brand-gold-700 dark:text-brand-gold-300 sm:text-sm">
            <PanamaFlag className="h-4 w-6 rounded-sm shadow-sm" />
            Liga deportiva sin fines de lucro desde 2011
          </p>

          <h1 className="mt-4 h-display text-4xl leading-[0.95] text-brand-navy dark:text-white sm:text-5xl lg:text-6xl">
            Panama Major
            <br />
            Football League
          </h1>

          <p className="mt-3 text-lg text-brand-gold-700 dark:text-brand-gold-300 md:text-xl">
            La liga más explosiva de Panamá
          </p>

          <p className="mt-5 max-w-xl text-base text-brand-navy/70 dark:text-white/75 md:text-lg">
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
            className="h-auto w-[280px] animate-fade-in object-contain drop-shadow-[0_12px_28px_rgba(11,31,58,0.18)] dark:drop-shadow-[0_0_40px_rgba(212,175,55,0.22)] sm:w-[340px] md:w-[400px] lg:w-[460px]"
          />
        </div>
      </div>

      {/* Pie de la sección: nombre en español */}
      <div className="border-t border-brand-navy/10 dark:border-white/10 bg-white dark:bg-brand-navy/[0.03] dark:bg-white/[0.02]">
        <div className="container-page flex flex-wrap items-center justify-center gap-3 py-4 text-center">
          <PanamaFlag className="h-5 w-8 rounded-sm shadow-sm" />
          <p className="h-display text-sm tracking-wider text-brand-navy/75 dark:text-white/80 md:text-base">
            Liga Mayor de Fútbol Americano de Panamá
          </p>
        </div>
      </div>
    </section>
  );
}
