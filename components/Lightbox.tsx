"use client";

import { useEffect } from "react";
import { cldFull } from "@/lib/cloudinary";
import type { GalleryImage } from "@/lib/types";

export default function Lightbox({
  image,
  onClose,
  onPrev,
  onNext,
}: {
  image: GalleryImage | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    if (!image) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [image, onClose, onPrev, onNext]);

  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 hover:bg-white/20 text-white"
        aria-label="Previous"
      >
        ‹
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 hover:bg-white/20 text-white"
        aria-label="Next"
      >
        ›
      </button>
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-md px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white"
      >
        Close (Esc)
      </button>

      <figure
        className="max-w-5xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.publicId ? cldFull(image.publicId, 1600) : image.src}
          alt={image.alt}
          className="w-full max-h-[80vh] object-contain rounded-lg"
        />
        <figcaption className="mt-3 text-sm text-white/80 text-center">
          {image.alt} · <span className="text-brand-gold-300">{image.category}</span>
        </figcaption>
      </figure>
    </div>
  );
}
