// Home — Server Component. La clasificación y los líderes de anotación se
// traen en vivo desde Cloob.

import Link from "next/link";
import Hero from "@/components/Hero";
import MatchCard from "@/components/MatchCard";
import VideoEmbed from "@/components/VideoEmbed";
import SponsorCarousel from "@/components/SponsorCarousel";
import NewsCard from "@/components/NewsCard";
import ResultsCard from "@/components/ResultsCard";
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
        {/* Lo último: resumen de la jornada + noticia de prensa. Ambos se
            editan en data/weekly.json, sin tocar código. */}
        <CardSection title="LO ÚLTIMO">
          {weekly.resultados && <ResultsCard data={weekly.resultados} />}

          {weekly.news && (
            <div className="mt-5">
              <NewsCard news={weekly.news} />
            </div>
          )}
        </CardSection>

        {/* Play of the Week */}
        <CardSection
          title="🏈 Lo mejor del momento"
          action={
            <Link href="/media" className="text-sm text-brand-gold-700 dark:text-brand-gold-300 hover:text-brand-gold-700 hover:dark:text-brand-gold-500">
              Todos los highlights →
            </Link>
          }
        >
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <VideoEmbed youtubeId={media.playOfTheWeek.youtubeId} title={media.playOfTheWeek.title} />
            </div>
            <div className="card flex flex-col justify-center p-6">
              <span className="pill self-start bg-brand-red/10 dark:bg-brand-red/20 text-brand-red-700 dark:text-brand-red-100 ring-1 ring-brand-red/30 dark:ring-brand-red/40">
                DESTACADO
              </span>
              <h3 className="mt-3 h-display text-2xl text-brand-navy dark:text-white">
                {media.playOfTheWeek.title}
              </h3>
              <p className="mt-2 text-sm text-brand-navy/70 dark:text-white/70">
                {media.playOfTheWeek.description}
              </p>
              <p className="mt-4 text-xs uppercase tracking-wider text-brand-gold-700 dark:text-brand-gold-300">
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
              <Link href="/schedule" className="text-sm text-brand-gold-700 dark:text-brand-gold-300 hover:text-brand-gold-700 hover:dark:text-brand-gold-500">
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
              <Link href="/schedule" className="text-sm text-brand-gold-700 dark:text-brand-gold-300 hover:text-brand-gold-700 hover:dark:text-brand-gold-500">
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
            <Link href="/stats" className="text-sm text-brand-gold-700 dark:text-brand-gold-300 hover:text-brand-gold-700 hover:dark:text-brand-gold-500">
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
              <h3 className="text-2xl font-black text-brand-navy dark:text-white">Estadísticas próximamente</h3>
              <p className="mt-3 text-brand-navy/60 dark:text-white/60">
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
              <Link href="/stats" className="text-sm text-brand-gold-700 dark:text-brand-gold-300 hover:text-brand-gold-700 hover:dark:text-brand-gold-500">
                Clasificación completa →
              </Link>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {topStandings.map((t) => {
                const local = teamByName(t.name);
                const inner = (
                  <>
                    <span className="w-6 shrink-0 font-display text-3xl text-brand-gold-700 dark:text-brand-gold-300">
                      {t.position}
                    </span>
                    <TeamLogo name={t.name} team={local} className="h-11 w-11" />
                    <div className="min-w-0">
                      <div className="h-display truncate text-brand-navy dark:text-white">
                        {local?.name ?? t.name}
                      </div>
                      <div className="text-xs text-brand-navy/60 dark:text-white/60">
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
            <Link href="/sponsors" className="text-sm text-brand-gold-700 dark:text-brand-gold-300 hover:text-brand-gold-700 hover:dark:text-brand-gold-500">
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
