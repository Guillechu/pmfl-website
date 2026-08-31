import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * The stage every screen sits on: deep navy ground, a stadium-light wash from
 * the top, a vignette to keep the corners quiet on a big panel, and a very
 * faint texture so large flat areas do not band on a TV.
 */
export function BroadcastFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-pitch-950', className)}>
      <div className="pointer-events-none absolute inset-0 bg-field-glow" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 120%, rgba(245,197,66,0.10) 0%, transparent 60%)',
        }}
      />
      {/* Yard-line hint: barely there, but it stops the background reading flat. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(255,255,255,0.9) 0 1px, transparent 1px 7.5rem)',
          maskImage: 'linear-gradient(180deg, transparent 0%, black 35%, black 65%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(180deg, transparent 0%, black 35%, black 65%, transparent 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: 'inset 0 0 14rem 4rem rgba(0,0,0,0.75)' }}
      />
      <div className="relative flex h-full w-full flex-col">{children}</div>
    </div>
  );
}
