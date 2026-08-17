"use client";

// Vídeos de los partidos, desplegables por año y por jornada.
//
// El año más reciente viene abierto; dentro, cada jornada es otro
// desplegable. Las miniaturas de una jornada cerrada no se piden, así que
// la página no carga 150 imágenes de golpe.
//
// Al hacer clic en un vídeo se reproduce ahí mismo (iframe de YouTube),
// sin salir del sitio.

import { useState } from "react";
import type { VideoYear, Video } from "@/lib/youtube";
import { cn } from "@/lib/utils";

function VideoCard({ video }: { video: Video }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="overflow-hidden rounded-lg border border-brand-navy/10 dark:border-white/10">
        <div className="relative aspect-video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
        <p className="p-2.5 text-xs text-brand-navy/75 dark:text-white/80">{video.title}</p>
      </div>
    );
  }

  return (
    <button
      onClick={() => setPlaying(true)}
      className="group overflow-hidden rounded-lg border border-brand-navy/10 dark:border-white/10 text-left transition-colors hover:border-brand-gold-600/50 hover:dark:border-brand-gold/40"
    >
      <div className="relative aspect-video bg-brand-navy/[0.04] dark:bg-white/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={video.thumbnail}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-red text-white">
            ▶
          </span>
        </span>
      </div>
      <p className="p-2.5 text-xs text-brand-navy/75 dark:text-white/80 group-hover:text-brand-navy group-hover:dark:text-white">
        {video.title}
      </p>
    </button>
  );
}

function YearBlock({ data, open }: { data: VideoYear; open: boolean }) {
  const [expanded, setExpanded] = useState(open);
  // Dentro del año, la primera jornada abierta es la más reciente.
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(open && data.groups.length ? [data.groups[data.groups.length - 1].label] : []),
  );

  function toggleGroup(label: string) {
    setOpenGroups((cur) => {
      const next = new Set(cur);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <section className={cn("card overflow-hidden", expanded && "border-brand-gold-600/30 dark:border-brand-gold/30")}>
      <h3>
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-brand-navy/[0.04] hover:dark:bg-white/[0.04]"
        >
          <span className="h-display text-2xl text-brand-navy dark:text-white">{data.year}</span>
          <span className="pill bg-brand-navy/[0.04] dark:bg-white/5 text-brand-navy/60 dark:text-white/60">
            {data.total} {data.total === 1 ? "vídeo" : "vídeos"}
          </span>
          <span className="ml-auto text-xs text-brand-navy/50 dark:text-white/45">
            {data.groups.length}{" "}
            {data.groups.length === 1 ? "jornada" : "jornadas"}
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "text-2xl leading-none text-brand-gold-700 dark:text-brand-gold-300 transition-transform duration-200",
              expanded && "rotate-180",
            )}
          >
            ⌄
          </span>
        </button>
      </h3>

      {expanded && (
        <div className="space-y-2 border-t border-brand-navy/10 dark:border-white/10 p-4">
          {data.groups.map((group) => {
            const isOpen = openGroups.has(group.label);
            return (
              <div key={group.label} className="rounded-lg bg-white dark:bg-white/[0.02]">
                <button
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-navy/[0.04] hover:dark:bg-white/[0.04]"
                >
                  <span className="font-display text-sm uppercase tracking-wide text-brand-navy dark:text-white">
                    {group.label}
                  </span>
                  <span className="text-xs text-brand-navy/50 dark:text-white/45">
                    {group.videos.length}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "ml-auto text-lg leading-none text-brand-navy/50 dark:text-white/40 transition-transform duration-200",
                      isOpen && "rotate-180",
                    )}
                  >
                    ⌄
                  </span>
                </button>

                {isOpen && (
                  <div className="grid gap-4 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-3">
                    {group.videos.map((v) => (
                      <VideoCard key={v.id} video={v} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function MatchVideos({ years }: { years: VideoYear[] }) {
  if (!years.length) {
    return (
      <div className="card p-8 text-center text-brand-navy/60 dark:text-white/60">
        Los vídeos de los partidos aparecerán aquí en cuanto se publiquen en
        el canal de YouTube de la liga.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {years.map((y, i) => (
        <YearBlock key={y.year} data={y} open={i === 0} />
      ))}
    </div>
  );
}
