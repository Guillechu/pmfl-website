import type { Position } from '@/types/player';
import { cn } from '@/lib/cn';

const POSITION_CLASS: Record<Position, string> = {
  QB: 'bg-pos-qb/90 text-white',
  RB: 'bg-pos-rb/90 text-pitch-950',
  WR: 'bg-pos-wr/90 text-pitch-950',
  TE: 'bg-pos-te/90 text-pitch-950',
  K: 'bg-pos-k/90 text-white',
  DST: 'bg-pos-def/90 text-white',
  UNKNOWN: 'bg-white/20 text-white',
};

const LABEL: Record<Position, string> = {
  QB: 'QB',
  RB: 'RB',
  WR: 'WR',
  TE: 'TE',
  K: 'K',
  DST: 'DEF',
  UNKNOWN: '--',
};

export function PositionBadge({
  position,
  className,
}: {
  position: Position;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-[0.15rem] font-display font-bold uppercase leading-none tracking-[0.06em]',
        POSITION_CLASS[position],
        className ?? 'px-[0.4rem] py-[0.18rem] text-tv-sm',
      )}
    >
      {LABEL[position]}
    </span>
  );
}

export const POSITION_COLOR: Record<Position, string> = {
  QB: '#E4572E',
  RB: '#2BB673',
  WR: '#2E9BFF',
  TE: '#F2A03D',
  K: '#9B7BE0',
  DST: '#6C8AA6',
  UNKNOWN: '#8892A6',
};
