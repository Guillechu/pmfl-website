"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { teams, players } from "@/lib/data";
import { cn } from "@/lib/utils";

type Result =
  | { kind: "team"; id: string; label: string; sub: string; href: string }
  | { kind: "player"; id: string; label: string; sub: string; href: string };

export default function SearchBar({ className }: { className?: string }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const results = useMemo<Result[]>(() => {
    if (q.trim().length < 2) return [];
    const needle = q.toLowerCase();
    const teamResults: Result[] = teams
      .filter((t) =>
        t.name.toLowerCase().includes(needle) ||
        t.city.toLowerCase().includes(needle) ||
        t.abbreviation.toLowerCase().includes(needle)
      )
      .slice(0, 5)
      .map((t) => ({
        kind: "team",
        id: t.id,
        label: t.name,
        sub: `${t.city} · ${t.conference}`,
        href: `/teams/${t.id}`,
      }));

    const playerResults: Result[] = players
      .filter((p) => p.name.toLowerCase().includes(needle))
      .slice(0, 5)
      .map((p) => {
        const team = teams.find((t) => t.id === p.teamId);
        return {
          kind: "player",
          id: p.id,
          label: p.name,
          sub: `${p.position} · ${team?.name ?? "Free Agent"}`,
          href: `/teams/${p.teamId}`,
        };
      });

    return [...teamResults, ...playerResults];
  }, [q]);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3-3" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar equipos o jugadores…"
          className="w-full rounded-md bg-white/5 border border-white/10 pl-9 pr-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-brand-gold/50 focus:bg-white/10 transition-colors"
        />
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute z-50 mt-2 w-full rounded-md border border-white/10 bg-brand-navy-800/95 backdrop-blur-md shadow-card overflow-hidden animate-fade-in">
          {results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-white/60">No matches.</div>
          ) : (
            <ul className="max-h-80 overflow-auto py-1">
              {results.map((r) => (
                <li key={`${r.kind}-${r.id}`}>
                  <Link
                    href={r.href}
                    onClick={() => { setOpen(false); setQ(""); }}
                    className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-white/5"
                  >
                    <div>
                      <div className="text-sm text-white">{r.label}</div>
                      <div className="text-xs text-white/50">{r.sub}</div>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-brand-gold-300">
                      {r.kind}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
