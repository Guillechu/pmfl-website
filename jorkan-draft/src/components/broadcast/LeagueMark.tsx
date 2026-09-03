import { useState } from 'react';
import { LEAGUE } from '@/config/league';
import { cn } from '@/lib/cn';

/**
 * League lockup used in the header and on the pre-draft screens.
 *
 * The league's own logo, if it has one: an image committed under
 * `public/branding/`, with the drawn shield standing in when there is none.
 * Several names and extensions are tried in turn so that dropping the file
 * into the folder is the whole job - whatever the camera roll or the download
 * called it. It has to be committed: the site is served from Vercel, and a
 * file sitting only on the machine that ran the dev server does not exist for
 * a television opening a URL.
 */
const LOGO_SOURCES = [
  '/branding/league-logo.png',
  '/branding/league-logo.jpg',
  '/branding/league-logo.jpeg',
  '/branding/league-logo.webp',
  '/branding/league-logo.svg',
  '/branding/logo.png',
  '/branding/logo.jpg',
];

export function LeagueMark({
  size = 'sm',
  className,
}: {
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const large = size === 'lg';
  const [sourceIndex, setSourceIndex] = useState(0);
  const logo = LOGO_SOURCES[sourceIndex];
  // Bigger on the waiting screen: it is the league's own artwork and that
  // screen has nothing but room. object-contain so none of it is cropped away,
  // whatever shape the file turns out to be.
  const box = large ? 'h-[9.5rem] w-[9.5rem]' : 'h-[2.8rem] w-[2.8rem]';

  return (
    <div className={cn('flex items-center gap-[0.85rem]', className)}>
      {logo ? (
        <img
          src={logo}
          alt=""
          onError={() => setSourceIndex((index) => index + 1)}
          className={cn(box, 'shrink-0 rounded-[0.4rem] border border-line bg-paper object-contain')}
        />
      ) : (
        <Shield className={large ? 'h-[5rem] w-[5rem]' : 'h-[2.6rem] w-[2.6rem]'} />
      )}
      <div className="leading-none">
        <div
          className={cn(
            'headline text-ink',
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
          <stop offset="0%" stopColor="#C8901A" />
          <stop offset="100%" stopColor="#A67512" />
        </linearGradient>
      </defs>
      <path
        d="M32 2 60 12v26c0 17-12 27-28 32C16 65 4 55 4 38V12L32 2z"
        fill="none"
        stroke="url(#jorkan-shield)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
