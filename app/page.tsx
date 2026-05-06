"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Hero from "@/components/Hero";
import GameCard from "@/components/GameCard";
import VideoEmbed from "@/components/VideoEmbed";
import SponsorCarousel from "@/components/SponsorCarousel";
import { CardSection } from "@/components/ui/Card";
import { recentResults, nextGames, media, standings } from "@/lib/data";

function calculateTimeLeft() {
  const targetDate = new Date("2026-08-15T00:00:00");
  const now = new Date();
  const difference = targetDate.getTime() - now.getTime();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}

export default function HomePage() {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  const recent = recentResults(3);
  const upcoming = nextGames(3);
  const top = standings().slice(0, 4);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <Hero />

      <div className="container-page">
        {/* Countdown */}
        <CardSection title="INICIO DE TEMPORADA 2026">
          <div className="card p-8 text-center">
            <p className="text-brand-gold-300 text-sm uppercase tracking-[0.25em] mb-6">
              La liga inicia el 15 de agosto de 2026
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-white/10 p-6">
                <div className="text-4xl font-black text-white">{timeLeft.days}</div>
                <div className="text-xs uppercase text-white/60 mt-2">Días</div>
              </div>

              <div className="rounded-2xl bg-white/10 p-6">
                <div className="text-4xl font-black text-white">{timeLeft.hours}</div>
                <div className="text-xs uppercase text-white/60 mt-2">Horas</div>
              </div>

              <div className="rounded-2xl bg-white/10 p-6">
                <div className="text-4xl font-black text-white">{timeLeft.minutes}</div>
                <div className="text-xs uppercase text-white/60 mt-2">Minutos</div>
              </div>

              <div className="rounded-2xl bg-white/10 p-6">
                <div className="text-4xl font-black text-white">{timeLeft.seconds}</div>
                <div className="text-xs uppercase text-white/60 mt-2">Segundos</div>
              </div>
            </div>
          </div>
        </CardSection>

        {/* Play of the Week */}
        <CardSection
          title="🏈 Lo mejor del momento"
          action={
            <Link href="/media" className="text-sm text-brand-gold-300 hover:text-brand-gold-500">
              Todos los highlights →
            </Link>
          }
        >
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <VideoEmbed youtubeId={media.playOfTheWeek.youtubeId} title={media.playOfTheWeek.title} />
            </div>

            <div className="card p-6 flex flex-col justify-center">
              <span className="pill bg-brand-red/20 text-brand-red-100 ring-1 ring-brand-red/40 self-start">
                LA ULTIMAS
              </span>

              <h3 className="mt-3 h-display text-2xl text-white">
                {media.playOfTheWeek.title}
              </h3>

              <p className="mt-2 text-sm text-white/70">
                {media.playOfTheWeek.description}
              </p>

              <p className="mt-4 text-xs uppercase tracking-wider text-brand-gold-300">
                {media.playOfTheWeek.team}
              </p>
            </div>
          </div>
        </CardSection>

        {/* Latest Results */}
        <CardSection
          title="Ultimos Resultados"
          action={
            <Link href="/schedule" className="text-sm text-brand-gold-300 hover:text-brand-gold-500">
              Full schedule →
            </Link>
          }
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recent.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </CardSection>

        {/* Upcoming Games */}
        <CardSection title="PRÓXIMOS PARTIDOS">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {upcoming.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </CardSection>

        {/* Top Players */}
        <CardSection title="MEJORES JUGADORES">
          <div className="card p-10 text-center">
            <h3 className="text-2xl font-black text-white">
              Estadísticas próximamente
            </h3>

            <p className="mt-3 text-white/60">
              Los líderes y estadísticas oficiales estarán disponibles cuando inicie la temporada 2026.
            </p>
          </div>
        </CardSection>

        {/* Standings */}
        <CardSection
          title="CLASIFICACIÓN"
          action={
            <Link href="/stats" className="text-sm text-brand-gold-300 hover:text-brand-gold-500">
              Clasificación completa →
            </Link>
          }
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {top.map((t, i) => (
              <Link key={t.id} href={`/teams/${t.id}`} className="card card-hover p-5 flex items-center gap-3">
                <span className="font-display text-3xl text-brand-gold-300 w-8">{i + 1}</span>

                <div className="min-w-0">
                  <div className="h-display text-white truncate">{t.name}</div>

                  <div className="text-xs text-white/60">
                    {t.record.wins}-{t.record.losses} · PF {t.stats.pointsFor}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardSection>

        {/* Sponsors */}
        <CardSection
          title="PATROCINADORES"
          action={
            <Link href="/sponsors" className="text-sm text-brand-gold-300 hover:text-brand-gold-500">
              Patrocinadores →
            </Link>
          }
        >
          <SponsorCarousel />
        </CardSection>
      </div>
    </>
  );
}