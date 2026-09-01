import { useState } from 'react';
import { cn } from '@/lib/cn';
import { nflLogoUrl, resolveNflTeam } from '@/data/nflTeams';

/** NFL club logo with a lettermark fallback when ESPN gives us nothing. */
export function NflTeamMark({
  abbr,
  logoUrl,
  className,
}: {
  abbr?: string | undefined;
  logoUrl?: string | undefined;
  className?: string;
}) {
  const team = resolveNflTeam(abbr);
  const src = logoUrl ?? nflLogoUrl(abbr);
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={team?.name ?? abbr ?? ''}
        className={cn('object-contain', className)}
        onError={() => setFailed(true)}
        draggable={false}
      />
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-[0.2rem] font-display font-bold uppercase',
        className,
      )}
      // Club colours tint the chip, but the letters stay white: some teams'
      // secondary colour is black, which would vanish on this background.
      style={{
        backgroundColor: team ? `${team.primary}` : 'rgba(22,34,47,0.06)',
        color: team ? '#FFFFFF' : 'rgba(22,34,47,0.75)',
        border: team ? `1px solid ${team.primary}` : '1px solid rgba(22,34,47,0.14)',
      }}
    >
      {abbr ?? '--'}
    </span>
  );
}
