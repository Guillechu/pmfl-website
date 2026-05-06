"use client";

import { useMemo, useState } from "react";
import { media } from "@/lib/data";
import VideoEmbed from "@/components/VideoEmbed";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";

export default function MediaPage() {
  const categories = useMemo(() => {
    const set = new Set<string>(["Todos"]);
    media.highlights.forEach((h) => set.add(h.category));
    return [...set];
  }, []);

  const [cat, setCat] = useState<string>("Todos");

  const filtered = useMemo(() => {
    if (cat === "Todos") return media.highlights;
    return media.highlights.filter((h) => h.category === cat);
  }, [cat]);

  return (
    <div className="container-page py-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-brand-gold-300">
          Watch
        </p>
        <h1 className="h-display text-4xl md:text-5xl text-white">
          Media
        </h1>
        <p className="mt-2 text-white/70 max-w-2xl">
          Los mejores momentos, jugadas destacadas y contenido exclusivo de la PMFL.
        </p>
      </header>

      {/* PLAY OF THE WEEK */}
      <section className="mb-12">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="h-display text-2xl text-white">
            Video Destacado
          </h2>
          <Badge variant="red">PMFL</Badge>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <VideoEmbed
              youtubeId={media.playOfTheWeek.youtubeId}
              title={media.playOfTheWeek.title}
            />
          </div>

          <div className="card p-6 flex flex-col justify-center">
            <h3 className="h-display text-2xl text-white">
              {media.playOfTheWeek.title}
            </h3>
            <p className="mt-2 text-sm text-white/70">
              {media.playOfTheWeek.description}
            </p>
            <p className="mt-4 text-xs uppercase tracking-wider text-brand-gold-300">
              {media.playOfTheWeek.team}
            </p>
          </div>
        </div>
      </section>

      {/* HIGHLIGHTS */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="h-display text-2xl text-white">
            Highlights
          </h2>

          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={
                  "rounded-full px-3 py-1 text-xs transition-colors " +
                  (cat === c
                    ? "bg-brand-red text-white"
                    : "bg-white/5 text-white/70 hover:bg-white/10")
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No hay contenido aún" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((h) => {
              const isLocalVideo = Boolean(h.video);

              return (
                <article
                  key={h.id}
                  className="card card-hover overflow-hidden p-0 group"
                >
                  {isLocalVideo ? (
                    // 🔥 VIDEO LOCAL (MP4)
                    <div className="block">
                      <div className="relative aspect-video overflow-hidden">
                        <video
                          src={h.video}
                          className="h-full w-full object-cover"
                          autoPlay
                          muted
                          loop
                          playsInline
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="absolute bottom-3 left-3">
                          <Badge variant="gold">{h.category}</Badge>
                        </div>
                      </div>

                      <div className="p-4">
                        <h3 className="font-semibold text-white group-hover:text-brand-gold-300 transition-colors">
                          {h.title}
                        </h3>
                      </div>
                    </div>
                  ) : (
                    // 🔥 YOUTUBE o NOTICIA
                    <a
                      href={
                        h.link
                          ? h.link
                          : `https://www.youtube.com/watch?v=${h.youtubeId}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <div className="relative aspect-video overflow-hidden">
                        <img
                          src={h.thumbnail}
                          alt={h.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                        <div className="absolute bottom-3 left-3">
                          <Badge variant="gold">{h.category}</Badge>
                        </div>

                        {!h.link && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="rounded-full bg-brand-red/90 p-4 transition-transform duration-300 group-hover:scale-110">
                              <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="white"
                              >
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <h3 className="font-semibold text-white group-hover:text-brand-gold-300 transition-colors">
                          {h.title}
                        </h3>
                      </div>
                    </a>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}