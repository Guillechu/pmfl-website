import Link from "next/link";
import Image from "next/image";
import type { PortadaPanel } from "@/lib/types";

/**
 * Portada del inicio: el arte del momento (playoffs, final) con su
 * titular. Va justo debajo de la presentación de la liga, que siempre es
 * lo primero, y antes de "Lo último". Se pone y se quita desde portada en
 * data/weekly.json.
 */
export default function Portada({ data }: { data: PortadaPanel }) {
  return (
    <Link
      href={data.url}
      className="group block overflow-hidden rounded-2xl border border-brand-navy/10 bg-white shadow-card transition-colors hover:border-brand-gold-600/50 dark:border-white/10 dark:bg-black/40 dark:shadow-cardDark dark:hover:border-brand-gold/40"
    >
      <Image
        src={data.image}
        alt={data.alt}
        width={1920}
        height={1080}
        sizes="(min-width: 1280px) 1200px, 100vw"
        className="h-auto w-full"
      />
      <div className="px-5 py-5 md:px-8 md:py-6">
        <span className="inline-flex items-center rounded-full bg-brand-gold px-3 py-1 text-xs font-semibold text-brand-navy-900">
          {data.eyebrow}
        </span>
        <h2 className="mt-3 h-display text-2xl leading-tight text-brand-navy transition-colors group-hover:text-brand-gold-700 dark:text-white group-hover:dark:text-brand-gold-300 md:text-4xl">
          {data.title}
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-brand-navy/70 dark:text-white/75 md:text-base">
          {data.summary}
        </p>
        <span className="mt-4 inline-flex items-center gap-2 text-sm text-brand-gold-700 dark:text-brand-gold-300">
          {data.linkLabel}
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}
