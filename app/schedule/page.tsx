"use client";

import { useMemo, useState } from "react";
import { schedule, teams, gamesByWeek } from "@/lib/data";
import GameCard from "@/components/GameCard";
import EmptyState from "@/components/ui/EmptyState";

export default function SchedulePage() {
  const [weekFilter, setWeekFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");

  const weeks = Object.keys(gamesByWeek())
    .map(Number)
    .sort((a, b) => a - b);

  const filtered = useMemo(() => {
    return schedule.filter((g) => {
      if (weekFilter !== "all" && g.week !== Number(weekFilter)) return false;
      if (teamFilter !== "all" && g.homeTeamId !== teamFilter && g.awayTeamId !== teamFilter) return false;
      return true;
    });
  }, [weekFilter, teamFilter]);

  // Group by week for display
  const grouped = useMemo(() => {
    const m = new Map<number, typeof filtered>();
    for (const g of filtered) {
      if (!m.has(g.week)) m.set(g.week, []);
      m.get(g.week)!.push(g);
    }
    return [...m.entries()].sort(([a], [b]) => a - b);
  }, [filtered]);

  return (
    <div className="container-page py-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-brand-gold-300">2026 Season</p>
        <h1 className="h-display text-4xl md:text-5xl text-white">Schedule</h1>
        <p className="mt-2 text-white/70 max-w-2xl">
          Full season calendar — filter by week or team to find what you&apos;re looking for.
        </p>
      </header>

      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <select
          value={weekFilter}
          onChange={(e) => setWeekFilter(e.target.value)}
          className="rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-brand-gold/50"
        >
          <option value="all">All weeks</option>
          {weeks.map((w) => <option key={w} value={w}>Week {w}</option>)}
        </select>
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-brand-gold/50"
        >
          <option value="all">All teams</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {grouped.length === 0 ? (
        <EmptyState title="No games match" description="Try a different week or team." />
      ) : (
        <div className="space-y-10">
          {grouped.map(([week, games]) => (
            <section key={week}>
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="h-display text-2xl text-white">Week {week}</h2>
                <span className="text-xs text-white/50">{games.length} games</span>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {games.map((g) => <GameCard key={g.id} game={g} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
