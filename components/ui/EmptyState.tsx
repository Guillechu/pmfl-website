export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card p-10 text-center">
      <h3 className="h-display text-xl text-brand-navy dark:text-white">{title}</h3>
      {description && <p className="mt-2 text-sm text-brand-navy/60 dark:text-white/60 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
