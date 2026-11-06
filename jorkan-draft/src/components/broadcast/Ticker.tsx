import { useMemo } from 'react';
import type { DraftState } from '@/types/draft';
import { LEAGUE } from '@/config/league';
import { POSITION_COLOR } from '@/components/player/PositionBadge';

/**
 * Lower ticker.
 *
 * Rendered as two identical halves scrolling as one track, so the loop is
 * seamless and the animation runs entirely on the compositor - no layout work
 * per frame over a five-hour draft.
 */
export function Ticker({ state }: { state: DraftState }) {
  const items = useMemo(() => buildItems(state), [state]);
  const duration = Math.max(38, items.length * 3.4);

  return (
    <div className="relative h-full overflow-hidden border-t border-ink/10 bg-surface-900/85">
      <div className="absolute inset-y-0 left-0 z-10 flex items-center bg-gold-500 px-[1.1rem]">
        <span className="font-display text-tv-sm font-bold uppercase tracking-[0.24em] text-paper">
          {LEAGUE.name}
        </span>
      </div>
      <div
        className="flex h-full items-center animate-ticker-scroll whitespace-nowrap will-change-transform"
        style={{ ['--ticker-duration' as string]: `${duration}s` }}
      >
        <TickerRun items={items} />
        <TickerRun items={items} />
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[6rem] bg-gradient-to-l from-surface-900 to-transparent" />
    </div>
  );
}

interface TickerItem {
  key: string;
  label: string;
  value: string;
  color?: string;
}

function TickerRun({ items }: { items: TickerItem[] }) {
  return (
    <div className="flex shrink-0 items-center">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-[0.55rem] pl-[2.4rem]">
          <span
            className="font-display text-tv-xs font-semibold uppercase tracking-[0.26em]"
            style={{ color: item.color ?? 'rgba(245,197,66,0.85)' }}
          >
            {item.label}
          </span>
          <span className="font-display text-tv-sm font-medium uppercase tracking-[0.06em] text-ink/85">
            {item.value}
          </span>
          <span className="pl-[1.6rem] text-ink/15">/</span>
        </div>
      ))}
    </div>
  );
}

function buildItems(state: DraftState): TickerItem[] {
  const items: TickerItem[] = [];

  if (state.onTheClock) {
    items.push({
      key: 'otc',
      label: 'En el reloj',
      value: state.onTheClock.fantasyTeamName,
      color: '#A67512',
    });
  }
  if (state.onDeck) {
    items.push({ key: 'deck', label: 'On Deck', value: state.onDeck.fantasyTeamName });
  }
  items.push({
    key: 'round',
    label: 'Ronda',
    value: `${state.round} of ${LEAGUE.rounds}`,
  });

  const recent = state.picks.slice(-14).reverse();
  for (const pick of recent) {
    items.push({
      key: pick.eventId,
      label: `${pick.round}.${String(pick.pickInRound).padStart(2, '0')}`,
      value: `${pick.player.name} - ${pick.player.position}${
        pick.player.nflTeamAbbr ? ` ${pick.player.nflTeamAbbr}` : ''
      } - ${pick.fantasyTeamName}`,
      color: POSITION_COLOR[pick.player.position],
    });
  }

  if (items.length < 6) {
    for (const team of LEAGUE.teams) {
      items.push({ key: `team-${team.id}`, label: `#${team.draftSlot}`, value: team.name });
    }
  }
  return items;
}
