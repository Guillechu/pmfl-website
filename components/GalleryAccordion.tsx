"use client";

// ----------------------------------------------------------------------
// Galería por álbumes desplegables.
//
// Cada álbum (Combine, Jornada 1, Jornada 2…) es una sección que se abre y
// se cierra al hacer clic en su nombre. El primero viene abierto; el resto
// cerrado, para que la página no cargue cientos de fotos de golpe: las
// miniaturas de un álbum cerrado no se piden al servidor.
// ----------------------------------------------------------------------

import { useCallback, useMemo, useState } from "react";
import Lightbox from "@/components/Lightbox";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { cldThumb, cldBlur, cldUrl } from "@/lib/cloudinary";
import type { GalleryImage } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface AlbumView {
  slug: string;
  title: string;
  latest: string | null;
  photos: GalleryImage[];
}

/** Miniatura: Cloudinary si hay publicId, si no la ruta local (legado). */
function thumbSrc(img: GalleryImage) {
  return img.publicId ? cldThumb(img.publicId, 600) : (img.src ?? "");
}
function blurSrc(img: GalleryImage) {
  return img.publicId ? cldBlur(img.publicId) : undefined;
}
function downloadHref(img: GalleryImage) {
  return img.publicId ? cldUrl(img.publicId) + "?_dl=1" : (img.src ?? "");
}

/** "2026-07-30T…" → "30 jul 2026". */
function formatLatest(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-PA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Panama",
  });
}

export default function GalleryAccordion({ albums }: { albums: AlbumView[] }) {
  // Abierto por defecto: solo el primero (el álbum más reciente).
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(albums.length ? [albums[0].slug] : []),
  );
  // El lightbox recuerda de qué álbum salió, para que las flechas naveguen
  // dentro de ese álbum y no entre todas las fotos del sitio.
  const [active, setActive] = useState<{ slug: string; index: number } | null>(null);

  const toggle = useCallback((slug: string) => {
    setOpen((cur) => {
      const next = new Set(cur);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const total = useMemo(
    () => albums.reduce((n, a) => n + a.photos.length, 0),
    [albums],
  );

  const activeAlbum = active ? albums.find((a) => a.slug === active.slug) : null;
  const activePhoto =
    activeAlbum && active ? (activeAlbum.photos[active.index] ?? null) : null;

  function move(delta: number) {
    if (!activeAlbum || !active) return;
    const n = activeAlbum.photos.length;
    setActive({ slug: active.slug, index: (active.index + delta + n) % n });
  }

  if (!albums.length || total === 0) {
    return (
      <EmptyState
        title="Todavía no hay fotos"
        description="Los álbumes de cada jornada aparecerán aquí en cuanto el equipo de fotografía los suba."
      />
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setOpen(new Set(albums.map((a) => a.slug)))}
          className="btn-secondary text-xs"
        >
          Abrir todos
        </button>
        <button onClick={() => setOpen(new Set())} className="btn-ghost text-xs">
          Cerrar todos
        </button>
        <span className="ml-auto text-xs text-brand-navy/55 dark:text-white/50">
          {albums.length} {albums.length === 1 ? "álbum" : "álbumes"} · {total} fotos
        </span>
      </div>

      <div className="space-y-4">
        {albums.map((album) => {
          const isOpen = open.has(album.slug);
          const fecha = formatLatest(album.latest);
          const panelId = `album-${album.slug}`;

          return (
            <section
              key={album.slug}
              className={cn(
                "card overflow-hidden transition-colors",
                isOpen && "border-brand-gold-600/30 dark:border-brand-gold/30",
              )}
            >
              {/* Cabecera clickeable: abre / cierra el álbum */}
              <h2>
                <button
                  onClick={() => toggle(album.slug)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-brand-navy/[0.04] hover:dark:bg-white/[0.04]"
                >
                  {/* Portada en miniatura */}
                  {album.photos[0] ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={thumbSrc(album.photos[0])}
                      alt=""
                      loading="lazy"
                      className="h-14 w-14 shrink-0 rounded-lg border border-brand-navy/10 dark:border-white/10 object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded-lg border border-brand-navy/10 dark:border-white/10 bg-brand-navy/[0.04] dark:bg-white/5" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="h-display text-xl text-brand-navy dark:text-white md:text-2xl">
                        {album.title}
                      </span>
                      <Badge variant="muted">
                        {album.photos.length}{" "}
                        {album.photos.length === 1 ? "foto" : "fotos"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-brand-navy/55 dark:text-white/50">
                      {isOpen ? "Clic para ocultar" : "Clic para ver las fotos"}
                      {fecha ? ` · ${fecha}` : ""}
                    </p>
                  </div>

                  {/* Flecha indicadora */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "shrink-0 text-2xl leading-none text-brand-gold-700 dark:text-brand-gold-300 transition-transform duration-200",
                      isOpen && "rotate-180",
                    )}
                  >
                    ⌄
                  </span>
                </button>
              </h2>

              {/* Cuadrícula de fotos — solo se monta si el álbum está abierto */}
              {isOpen && (
                <div id={panelId} className="border-t border-brand-navy/10 dark:border-white/10 p-5">
                  <div className="columns-1 gap-4 [column-fill:_balance] sm:columns-2 lg:columns-3">
                    {album.photos.map((img, i) => (
                      <div
                        key={img.id}
                        className="group relative mb-4 overflow-hidden rounded-lg border border-brand-navy/10 dark:border-white/10"
                      >
                        <button
                          onClick={() => setActive({ slug: album.slug, index: i })}
                          className="block w-full"
                          aria-label={`Ampliar foto ${i + 1} de ${album.title}`}
                          style={
                            img.width && img.height
                              ? {
                                  backgroundImage: blurSrc(img)
                                    ? `url(${blurSrc(img)})`
                                    : undefined,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                  aspectRatio: `${img.width} / ${img.height}`,
                                }
                              : undefined
                          }
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={thumbSrc(img)}
                            alt={img.alt}
                            loading="lazy"
                            decoding="async"
                            width={img.width}
                            height={img.height}
                            className="h-auto w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        </button>

                        <div className="pointer-events-none absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100" />

                        <a
                          href={downloadHref(img)}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-2 top-2 rounded bg-black/70 px-3 py-1 text-xs text-white opacity-0 transition-opacity hover:bg-black group-hover:opacity-100"
                        >
                          Descargar
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <Lightbox
        image={activePhoto}
        onClose={() => setActive(null)}
        onPrev={() => move(-1)}
        onNext={() => move(1)}
      />
    </>
  );
}
