import { useState } from 'react';
import type { Player } from '@/types/player';
import { cn } from '@/lib/cn';
import { espnHeadshotUrl } from '@/data/nflTeams';

/**
 * ESPN's headshot when ESPN gives us one, and a designed placeholder when it
 * does not. A missing image must never leave a hole in the broadcast.
 */
export function PlayerHeadshot({
  player,
  className,
  accent = '#A67512',
}: {
  player: Player;
  className?: string;
  accent?: string;
}) {
  const src = player.headshotUrl ?? espnHeadshotUrl(player.espnId);
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[0.4rem] bg-gradient-to-b from-surface-700/70 to-surface-900',
        className,
      )}
    >
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background: `radial-gradient(ellipse 90% 70% at 50% 108%, ${accent}55 0%, transparent 62%)`,
        }}
      />
      {showImage ? (
        <img
          src={src}
          alt={player.name}
          className="relative h-full w-full object-cover object-top"
          onError={() => setFailed(true)}
          draggable={false}
        />
      ) : (
        <Silhouette accent={accent} />
      )}
    </div>
  );
}

function Silhouette({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 120 140" className="relative h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="jorkan-silhouette" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.30" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.20" />
        </linearGradient>
      </defs>
      <g fill="url(#jorkan-silhouette)">
        <circle cx="60" cy="48" r="25" />
        <path d="M60 78c-25 0-42 16-46 38-1 6 0 24 0 24h92s1-18 0-24c-4-22-21-38-46-38z" />
      </g>
    </svg>
  );
}
