"use client";

import { sponsors } from "@/lib/data";
import { cn } from "@/lib/utils";

export default function SponsorCarousel({ className }: { className?: string }) {
  const loop = [...sponsors, ...sponsors];

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Fade lados */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-brand-navy-900 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-brand-navy-900 to-transparent z-10" />

      {/* Carrusel */}
      <div
        className="flex gap-10 py-6 will-change-transform animate-[marquee_30s_linear_infinite] hover:[animation-play-state:paused]"
        style={{ width: "max-content" }}
      >
        {loop.map((s, i) => (
          <div
            key={`${s.id}-${i}`}
            className="flex items-center gap-3 min-w-[220px] h-16 rounded-md border border-white/10 bg-white/[0.04] px-5 hover:bg-white/[0.08] transition"
            title={s.name}
          >
            {/* Logo (solo si lo tenemos) */}
            {s.logo && (
              <img
                src={s.logo}
                alt={s.name}
                className="max-h-8 w-auto object-contain"
                loading="lazy"
              />
            )}

            {/* Nombre */}
            <span className="text-sm text-white/80 font-medium whitespace-nowrap">
              {s.name}
            </span>
          </div>
        ))}
      </div>

      {/* Animación */}
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}