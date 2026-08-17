import { cn } from "@/lib/utils";

type Variant = "default" | "gold" | "red" | "navy" | "success" | "muted";

const styles: Record<Variant, string> = {
  default: "bg-brand-navy/[0.07] dark:bg-white/10 text-brand-navy dark:text-white",
  gold: "bg-brand-gold-600/15 dark:bg-brand-gold/20 text-brand-gold-700 dark:text-brand-gold-300 ring-1 ring-brand-gold/30",
  red: "bg-brand-red/10 dark:bg-brand-red/20 text-brand-red-700 dark:text-brand-red-100 ring-1 ring-brand-red/30 dark:ring-brand-red/40",
  navy: "bg-brand-navy/10 dark:bg-brand-navy-500/40 text-brand-navy dark:text-white ring-1 ring-brand-navy/10 dark:ring-white/10",
  success: "bg-emerald-600/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-600/30 dark:ring-emerald-400/30",
  muted: "bg-brand-navy/[0.04] dark:bg-white/5 text-brand-navy/60 dark:text-white/60",
};

export default function Badge({
  variant = "default",
  className,
  children,
}: {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  return <span className={cn("pill", styles[variant], className)}>{children}</span>;
}
