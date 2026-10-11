import type { Position } from '@/types/player';
import { cn } from '@/lib/cn';

const POSITION_CLASS: Record<Position, string> = {
  QB: 'bg-pos-qb/90 text-ink',
  RB: 'bg-pos-rb/90 text-paper',
  WR: 'bg-pos-wr/90 text-paper',
  TE: 'bg-pos-te/90 text-paper',
  K: 'bg-pos-k/90 text-ink',
  DST: 'bg-pos-def/90 text-ink',
  UNKNOWN: 'bg-ink/20 text-ink',
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

/** Solid position inks, weighted to read on a white ground. */
export const POSITION_COLOR: Record<Position, string> = {
  QB: '#B04724',
  RB: '#1C7548',
  WR: '#1D5C9F',
  TE: '#A06C10',
  K: '#66499B',
  DST: '#465C6E',
  UNKNOWN: '#6B7688',
};
