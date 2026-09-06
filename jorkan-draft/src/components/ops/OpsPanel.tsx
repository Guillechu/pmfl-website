import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

/**
 * Shell for the operator panels (audio, simulator, debug, checklist).
 * These are tools for whoever is running the show, not part of the broadcast,
 * so they sit above everything and can be dismissed with one key.
 */
export function OpsPanel({
  title,
  subtitle,
  onClose,
  side = 'right',
  width = '32rem',
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  side?: 'left' | 'right';
  width?: string;
  children: ReactNode;
}) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: side === 'right' ? 40 : -40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: side === 'right' ? 40 : -40 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{ width }}
      className={cn(
        'absolute inset-y-[1rem] z-50 flex flex-col overflow-hidden rounded-[0.4rem] border border-ink/15 bg-paper shadow-panel',
        side === 'right' ? 'right-[1rem]' : 'left-[1rem]',
      )}
    >
      <header className="flex items-start justify-between border-b border-ink/10 px-[1rem] py-[0.7rem]">
        <div>
          <h2 className="font-display text-tv-md font-bold uppercase tracking-[0.2em] text-ink">
            {title}
          </h2>
          {subtitle ? <p className="text-tv-xs text-ink/40">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[0.2rem] border border-ink/15 px-[0.5rem] py-[0.15rem] font-display text-tv-xs uppercase tracking-[0.16em] text-ink/60 hover:bg-ink/10"
        >
          Close
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-[1rem] py-[0.8rem]">{children}</div>
    </motion.aside>
  );
}

export function OpsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-[1rem]">
      <h3 className="mb-[0.45rem] font-display text-tv-xs font-semibold uppercase tracking-[0.28em] text-gold-500">
        {title}
      </h3>
      <div className="space-y-[0.45rem]">{children}</div>
    </section>
  );
}

export function OpsButton({
  onClick,
  children,
  tone = 'default',
  disabled = false,
}: {
  onClick: () => void;
  children: ReactNode;
  tone?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-[0.22rem] border px-[0.65rem] py-[0.3rem] font-display text-tv-xs font-semibold uppercase tracking-[0.16em] transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        tone === 'primary' && 'border-gold-500/60 bg-gold-500/15 text-gold-600 hover:bg-gold-500/25',
        tone === 'danger' && 'border-alert-500/60 bg-alert-500/10 text-alert-500 hover:bg-alert-500/20',
        tone === 'default' && 'border-ink/15 bg-ink/[0.04] text-ink/75 hover:bg-ink/10',
      )}
    >
      {children}
    </button>
  );
}

export function OpsSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  format,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (value: number) => string;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-tv-xs uppercase tracking-[0.16em] text-ink/55">
          {label}
        </span>
        <span className="tabular text-tv-xs text-ink/80">
          {format ? format(value) : `${Math.round(value * 100)}%`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-[0.15rem] h-[0.9rem] w-full accent-gold-500"
      />
    </label>
  );
}

export function OpsToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-[0.6rem]">
      <span className="font-display text-tv-xs uppercase tracking-[0.16em] text-ink/55">
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-[0.85rem] w-[0.85rem] accent-gold-500"
      />
    </label>
  );
}

export function OpsRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-[0.6rem] border-b border-ink/5 py-[0.18rem]">
      <span className="font-display text-tv-xs uppercase tracking-[0.14em] text-ink/40">
        {label}
      </span>
      <span className="tabular truncate text-right text-tv-xs text-ink/85">{value}</span>
    </div>
  );
}
