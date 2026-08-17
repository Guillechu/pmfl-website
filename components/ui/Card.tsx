import { cn } from "@/lib/utils";

export function Card({
  className,
  hoverable = true,
  children,
}: {
  className?: string;
  hoverable?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("card p-5", hoverable && "card-hover", className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn("h-display text-lg text-brand-navy dark:text-white", className)}>{children}</h3>
  );
}

export function CardSubtitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn("text-xs text-brand-navy/60 dark:text-white/60", className)}>{children}</p>;
}

export function CardSection({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("py-10", className)}>
      <div className="flex items-end justify-between mb-5">
        <h2 className="h-display text-2xl md:text-3xl text-brand-navy dark:text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
