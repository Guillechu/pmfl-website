import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * The stage every screen sits on.
 *
 * White paper with the faintest yard-line ruling and a single hairline of
 * league gold across the top - nothing that glows. Large flat areas on a
 * television will band if they are perfectly uniform, so the ruling is there
 * to give the panel something to hold on to, not to be seen.
 */
export function BroadcastFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-paper', className)}>
      <div className="pointer-events-none absolute inset-0 bg-field-glow" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(22,34,47,0.85) 0 1px, transparent 1px 7.5rem)',
          maskImage: 'linear-gradient(180deg, transparent 0%, black 32%, black 68%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(180deg, transparent 0%, black 32%, black 68%, transparent 100%)',
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[0.28rem] bg-gold-500" />
      <div className="relative flex h-full w-full flex-col">{children}</div>
    </div>
  );
}
