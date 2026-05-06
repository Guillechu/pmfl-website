import { cn } from "@/lib/utils";

type Variant = "default" | "gold" | "red" | "navy" | "success" | "muted";

const styles: Record<Variant, string> = {
  default: "bg-white/10 text-white",
  gold: "bg-brand-gold/20 text-brand-gold-300 ring-1 ring-brand-gold/30",
  red: "bg-brand-red/20 text-brand-red-100 ring-1 ring-brand-red/40",
  navy: "bg-brand-navy-500/40 text-white ring-1 ring-white/10",
  success: "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30",
  muted: "bg-white/5 text-white/60",
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
