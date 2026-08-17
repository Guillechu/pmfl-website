import { cn } from "@/lib/utils";

/** Lightweight loading placeholder. */
export default function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-brand-navy/[0.07] dark:bg-white/10",
        className
      )}
    />
  );
}
