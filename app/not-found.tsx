import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <p className="font-display text-7xl text-brand-gold-700 dark:text-brand-gold-300">4ᵗʰ &amp; long</p>
      <h1 className="mt-3 h-display text-3xl text-brand-navy dark:text-white">Page not found</h1>
      <p className="mt-2 text-brand-navy/70 dark:text-white/70">
        Looks like you ran out of bounds. Let&apos;s get you back to the field.
      </p>
      <Link href="/" className="btn-primary mt-6 inline-flex">Back to home</Link>
    </div>
  );
}
