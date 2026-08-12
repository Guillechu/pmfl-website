// Home — Server Component. La clasificación y los goleadores se traen en
// vivo desde Cloob; el contador regresivo vive en <Countdown/> (cliente).

import Link from "next/link";
import Hero from "@/components/Hero";
import MatchCard from "@/components/MatchCard";
import VideoEmbed from "@/components/VideoEmbed";
import SponsorCarousel from "@/components/SponsorCarousel";
import Countdown from "@/components/Countdown";
import { CardSection } from "@/components/ui/Card";
import { recentResults, nextGames, media, weekly, teamByName } from "@/lib/data";
import {
  getStandings,
  getTopScorers,
  getUpcomingMatches,
  getRecentResults,
} from "@/lib/cloob";
import { fromCloob, fromLocal } from "@/lib/match";
import PlayerPodium from "@/components/PlayerPodium";
import TeamLogo from "@/components/TeamLogo";
import { getPlayerPhotoMap, photoFor } from "@/lib/player-photos";
import { getPublicSponsors } from "@/lib/sponsors";
import { YouTubeIcon } from "@/components/SocialIcons";

export const revalidate = 60;

export default async function HomePage() {
  // Datos en vivo desde Cloob (con degradación elegante si no hay datos).
  const [standings, scorers, cloobUpcoming, cloobResults, photos] =
    await Promise.all([
      getStandings(),
      getTopScorers(5),
      getUpcomingMatches(3),
      getRecentResults(3),
      getPlayerPhotoMap(),
    ]);

  // Patrocinadores en vivo (gestionados desde /admin).
  const sponsors = await getPublicSponsors(60);
  const topStandings = standings.slice(0, 4);

  const podium = scorers.map((p) => ({
    id: p.playerId,
    name: p.playerName,
    club: p.clubName,
    points: p.totalPoints,
    photo: photoFor(photos, p.playerId, p.playerName),
  }));

  // Partidos: manda Cloob. Si el torneo aún no tiene partidos cargados,
  // caemos al calendario estático de data/schedule.json.
  const upcoming =
    cloobUpcoming.length > 0
      ? cloobUpcoming.map(fromCloob)
      : nextGames(3).map(fromLocal);
  const recent =
    cloobResults.length > 0
      ? cloobResults.map(fromCloob)
      : recentResults(3).map(fromLocal);

  return (
    <>
      <Hero />

      <div className="container-page">
        {/* Lo último: boletos del próximo evento + noticia de prensa.
            Ambos se editan en data/weekly.json, sin tocar código. */}
        <CardSection title="LO ÚLTIMO">
          {/* El arte del evento lleva dentro los enfrentamientos, los
              horarios y el precio, así que se muestra entero: recortarlo
              a un fondo de tarjeta se comía justo esa información. */}
          <a
            href={weekly.tickets.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block overflow-hidden rounded-2xl border border-white/10 bg-black/40 transition-colors hover:border-brand-gold/40"
          >
            <img
              src={weekly.tickets.image}
              alt={weekly.tickets.label}
              className="w-full"
            />

            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
                  🎟️ BOLETOS
                </span>
                <h3 className="mt-2 h-display text-2xl text-white">
                  {weekly.tickets.label}
                </h3>
                <p className="mt-1 text-sm text-white/70">
                  {weekly.tickets.note}
                </p>
              </div>

              <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white transition-colors group-hover:bg-brand-gold/20">
                Comprar en Ticketplus
                <span aria-hidden="true">→</span>
              </span>
            </div>
          </a>

          {weekly.news && (
            <a
              href={weekly.news.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-5 grid overflow-hidden rounded-2xl border border-white/10 transition-colors hover:border-brand-gold/40 md:grid-cols-[minmax(0,340px)_1fr]"
            >
              <div className="relative aspect-video overflow-hidden md:aspect-auto">
                {/* Foto del medio: se sirve desde su propio dominio. */}
                <img
                  src={weekly.news.image}
                  alt=""
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              </div>

              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-brand-red px-3 py-1 font-semibold text-white">
                    NOTICIA
                  </span>
                  <span className="text-white/60">{weekly.news.source}</span>
                  <span className="text-white/30" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-white/60">
                    {weekly.news.dateLabel}
                  </span>
                </div>

                <h3 className="mt-3 h-display text-2xl leading-tight text-white transition-colors group-hover:text-brand-gold-300">
                  {weekly.news.title}
                </h3>

                <p className="mt-2 text-sm text-white/75">
                  {weekly.news.summary}
                </p>

                <span className="mt-4 inline-flex items-center gap-2 text-sm text-brand-gold-300">
                  Leer la nota completa
                  <span aria-hidden="true">→</span>
                </span>
              </div>
            </a>
          )}
        </CardSection>

        {/* Live de YouTube (se actualiza en data/weekly.json) */}
        <CardSection title="EN VIVO">
          <a
            href={weekly.youtubeLive.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex min-h-[220px] items-end overflow-hidden rounded-2xl border border-white/10"
          >
            <img
              src={weekly.youtubeLive.image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-60 transition duration-300 group-hover:scale-105 group-hover:opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            <div className="relative z-10 p-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-red px-3 py-1 text-xs font-semibold text-white">
                <YouTubeIcon className="h-4 w-4" /> EN VIVO
              </span>
              <h3 className="mt-3 h-display text-2xl text-white">
                {weekly.youtubeLive.label}
              </h3>
              <p className="mt-1 text-sm text-white/75">
                {weekly.youtubeLive.note}
              </p>
            </div>
          </a>
        </CardSection>

        {/* Countdown */}
        <CardSection title="INICIO DE TEMPORADA 2026">
          <div className="card p-8 text-center">
            <p className="mb-6 text-sm uppercase tracking-[0.25em] text-brand-gold-300">
              La liga inicia el 15 de agosto de 2026
            </p>
            <Countdown targetDate="2026-08-15T00:00:00" />
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
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <VideoEmbed youtubeId={media.playOfTheWeek.youtubeId} title={media.playOfTheWeek.title} />
            </div>
            <div className="card flex flex-col justify-center p-6">
              <span className="pill self-start bg-brand-red/20 text-brand-red-100 ring-1 ring-brand-red/40">
                LO ÚLTIMO
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

        {/* Últimos resultados — EN VIVO desde Cloob (respaldo: schedule.json) */}
        {recent.length > 0 && (
          <CardSection
            title="ÚLTIMOS RESULTADOS"
            action={
              <Link href="/schedule" className="text-sm text-brand-gold-300 hover:text-brand-gold-500">
                Calendario completo →
              </Link>
            }
          >
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {recent.map((g) => (
                <MatchCard key={g.id} game={g} />
              ))}
            </div>
          </CardSection>
        )}

        {/* Próximos partidos — EN VIVO desde Cloob (respaldo: schedule.json) */}
        {upcoming.length > 0 && (
          <CardSection
            title="PRÓXIMOS PARTIDOS"
            action={
              <Link href="/schedule" className="text-sm text-brand-gold-300 hover:text-brand-gold-500">
                Calendario completo →
              </Link>
            }
          >
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((g) => (
                <MatchCard key={g.id} game={g} />
              ))}
            </div>
          </CardSection>
        )}

        {/* Top Players — EN VIVO desde Cloob */}
        <CardSection
          title="MEJORES JUGADORES"
          action={
            <Link href="/stats" className="text-sm text-brand-gold-300 hover:text-brand-gold-500">
              Todas las estadísticas →
            </Link>
          }
        >
          {podium.length > 0 ? (
            <div className="card px-4 py-8 md:px-8">
              <PlayerPodium players={podium} />
            </div>
          ) : (
            <div className="card p-10 text-center">
              <h3 className="text-2xl font-black text-white">Estadísticas próximamente</h3>
              <p className="mt-3 text-white/60">
                Los líderes estarán disponibles cuando inicie la temporada 2026.
              </p>
            </div>
          )}
        </CardSection>

        {/* Standings — EN VIVO desde Cloob */}
        {topStandings.length > 0 && (
          <CardSection
            title="CLASIFICACIÓN"
            action={
              <Link href="/stats" className="text-sm text-brand-gold-300 hover:text-brand-gold-500">
                Clasificación completa →
              </Link>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {topStandings.map((t) => {
                const local = teamByName(t.name);
                const inner = (
                  <>
                    <span className="w-6 shrink-0 font-display text-3xl text-brand-gold-300">
                      {t.position}
                    </span>
                    <TeamLogo name={t.name} team={local} className="h-11 w-11" />
                    <div className="min-w-0">
                      <div className="h-display truncate text-white">
                        {local?.name ?? t.name}
                      </div>
                      <div className="text-xs text-white/60">
                        {t.won}-{t.lost}
                        {t.drawn ? `-${t.drawn}` : ""} · PF {t.pf}
                      </div>
                    </div>
                  </>
                );
                return local ? (
                  <Link
                    key={t.name}
                    href={`/teams/${local.id}`}
                    className="card card-hover flex items-center gap-3 p-5"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={t.name} className="card flex items-center gap-3 p-5">
                    {inner}
                  </div>
                );
              })}
            </div>
          </CardSection>
        )}

        {/* Sponsors */}
        <CardSection
          title="PATROCINADORES"
          action={
            <Link href="/sponsors" className="text-sm text-brand-gold-300 hover:text-brand-gold-500">
              Patrocinadores →
            </Link>
          }
        >
          <SponsorCarousel sponsors={sponsors} />
        </CardSection>
      </div>
    </>
  );
}
