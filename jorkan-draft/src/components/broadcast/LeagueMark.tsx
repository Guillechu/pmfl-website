import { LEAGUE } from '@/config/league';
import { cn } from '@/lib/cn';

/** League lockup used in the header and on the pre-draft screens. */
export function LeagueMark({
  size = 'sm',
  className,
}: {
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const large = size === 'lg';
  return (
    <div className={cn('flex items-center gap-[0.75rem]', className)}>
      <Shield className={large ? 'h-[5rem] w-[5rem]' : 'h-[2.6rem] w-[2.6rem]'} />
      <div className="leading-none">
        <div
          className={cn(
            'headline text-white',
            large ? 'text-tv-2xl tracking-[0.02em]' : 'text-tv-md',
          )}
        >
          {LEAGUE.name}
        </div>
        <div
          className={cn(
            'font-display font-semibold uppercase tracking-[0.34em] text-gold-500',
            large ? 'text-tv-md' : 'text-tv-xs',
          )}
        >
          {LEAGUE.season} Draft
        </div>
      </div>
    </div>
  );
}

function Shield({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 72" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="jorkan-shield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD75E" />
          <stop offset="100%" stopColor="#D9A21B" />
        </linearGradient>
      </defs>
      <path
        d="M32 2 60 12v26c0 17-12 27-28 32C16 65 4 55 4 38V12L32 2z"
        fill="none"
        stroke="url(#jorkan-shield)"
        strokeWidth="3"
      />
      <ellipse cx="32" cy="34" rx="15" ry="9.5" fill="none" stroke="#FFFFFF" strokeWidth="2.4" />
      <path d="M24 34h16M29 29.5v9M35 29.5v9" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
