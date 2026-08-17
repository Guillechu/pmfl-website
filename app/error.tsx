"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[PMFL] Page error:", error);
  }, [error]);

  return (
    <div className="container-page py-24 text-center">
      <p className="font-display text-6xl text-brand-red">Fumble.</p>
      <h1 className="mt-3 h-display text-2xl text-brand-navy dark:text-white">Something went wrong</h1>
      <p className="mt-2 text-brand-navy/70 dark:text-white/70">We&apos;ve called a timeout. Please try again.</p>
      <button onClick={reset} className="btn-primary mt-6 inline-flex">Try again</button>
    </div>
  );
}
