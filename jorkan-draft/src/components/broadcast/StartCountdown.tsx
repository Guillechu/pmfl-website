import { useEffect, useState } from 'react';
import { countdownParts, msUntilStart, scheduledStartLabel } from '@/config/schedule';

/**
 * Time until the draft is due to start.
 *
 * A clock, not a trigger. ESPN starting the draft is what starts the
 * presentation; this only tells the room how long is left, and keeps counting
 * past zero rather than disappearing, because a draft that starts late is the
 * normal case and a blank space would read as something being broken.
 */
export function StartCountdown() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = msUntilStart(now);
  if (remaining === null) return null;

  const { days, hours, minutes, seconds, overdue } = countdownParts(remaining);
  const label = scheduledStartLabel();

  return (
    <div className="flex flex-col items-center">
      <p className="eyebrow text-ink/45">
        {overdue ? 'La hora prevista ya pasó' : 'El draft empieza en'}
      </p>
      {/*
        No labels under the numbers. On a television the reading is obvious
        from the shape of the clock, and four little words in a row were the
        busiest thing on an otherwise calm screen.
      */}
      <div className="mt-[0.5rem] flex items-end gap-[0.7rem]">
        {days > 0 ? <Unit value={days} /> : null}
        {days > 0 ? <Colon /> : null}
        <Unit value={hours} />
        <Colon />
        <Unit value={minutes} />
        <Colon />
        <Unit value={seconds} />
      </div>
      {label ? (
        <p className="mt-[0.7rem] font-display text-tv-xs uppercase tracking-[0.24em] text-ink/40">
          {label}
        </p>
      ) : null}
    </div>
  );
}

function Unit({ value }: { value: number }) {
  return (
    <span className="tabular headline text-tv-2xl leading-none text-ink">
      {String(value).padStart(2, '0')}
    </span>
  );
}

function Colon() {
  return <span className="headline text-tv-2xl leading-none text-ink/25">:</span>;
}
