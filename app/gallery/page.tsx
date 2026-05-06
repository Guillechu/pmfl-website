"use client";

import { useMemo, useState } from "react";
import { gallery } from "@/lib/data";
import Lightbox from "@/components/Lightbox";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import type { GalleryImage } from "@/lib/types";

const CATEGORIES = ["Combine 2026"] as const;

export default function GalleryPage() {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("Combine 2026");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const filtered: GalleryImage[] = useMemo(() => {
    return gallery.filter((g) => String(g.category) === String(cat));
  }, [cat]);

  function go(delta: number) {
    if (activeIndex === null) return;
    const next = (activeIndex + delta + filtered.length) % filtered.length;
    setActiveIndex(next);
  }

  return (
    <div className="container-page py-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-brand-gold-300">Visuals</p>
        <h1 className="h-display text-4xl md:text-5xl text-white">Gallery</h1>
        <p className="mt-2 text-white/70 max-w-2xl">
          Imágenes del Combine 2026 de la PMFL.
        </p>
      </header>

      {/* Categoría */}
      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={
              "rounded-full px-4 py-1.5 text-sm transition-colors " +
              (cat === c
                ? "bg-brand-red text-white"
                : "bg-white/5 text-white/70 hover:bg-white/10")
            }
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No images in this category yet" />
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
          {filtered.map((img, i) => (
            <div
              key={img.id}
              className="mb-4 relative group rounded-lg overflow-hidden border border-white/10"
            >
              {/* Imagen clickeable */}
              <button onClick={() => setActiveIndex(i)} className="block w-full">
                <img
                  src={img.src}
                  alt={img.alt}
                  loading="lazy"
                  className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </button>

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Categoría */}
              <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Badge variant="gold">{img.category}</Badge>
              </div>

              {/* BOTÓN DESCARGAR */}
              <a
                href={img.src}
                download
                onClick={(e) => e.stopPropagation()}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 hover:bg-black text-white text-xs px-3 py-1 rounded"
              >
                Descargar
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Lightbox
        image={activeIndex === null ? null : filtered[activeIndex]}
        onClose={() => setActiveIndex(null)}
        onPrev={() => go(-1)}
        onNext={() => go(1)}
      />
    </div>
  );
}