"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import LeagueMark from "./LeagueMark";
import SearchBar from "./SearchBar";

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/teams", label: "Equipos" },
  { href: "/stats", label: "Rankings y Stats" },
  { href: "/schedule", label: "Calendario" },
  { href: "/media", label: "Media" },
  { href: "/gallery", label: "Galería" },
  { href: "/rules", label: "Reglas IFAF" },
  { href: "/about", label: "Nosotros" },
  { href: "/sponsors", label: "Patrocinadores" },
  { href: "/contact", label: "Contacto" },
];

const TICKETS_URL = "https://ticketpluspty.com/";

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-200",
        scrolled
          ? "border-b border-white/10 bg-brand-navy-900/85 backdrop-blur-md"
          : "border-b border-transparent bg-brand-navy-900/40 backdrop-blur"
      )}
    >
      <div className="container-page flex h-16 items-center gap-4">
        <Link href="/" className="flex items-center gap-2 group">
          <LeagueMark className="h-9 w-9 transition-transform group-hover:scale-105" />
          <div className="leading-tight">
            <div className="h-display text-lg text-white">PMFL</div>
            <div className="text-[10px] uppercase tracking-widest text-brand-gold-300">
              Panama Major Football League
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="ml-auto hidden lg:flex items-center gap-0.5">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors whitespace-nowrap",
                  active
                    ? "bg-white/10 text-brand-gold-300"
                    : "text-white/80 hover:text-white hover:bg-white/5"
                )}
              >
                {item.label}
              </Link>
            );
          })}

          {/* Tickets (Ticketpluss) — CTA destacado */}
          <a
            href={TICKETS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 rounded-md bg-emerald-500 px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-400 whitespace-nowrap"
          >
            Tickets
          </a>
        </nav>

        <div className="ml-auto hidden xl:block xl:ml-3 w-52">
          <SearchBar />
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="lg:hidden ml-auto rounded-md p-2 text-white/80 hover:text-white hover:bg-white/5"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-white/10 bg-brand-navy-900/95 backdrop-blur-md animate-fade-in">
          <div className="container-page py-3">
            <SearchBar />
            <nav className="mt-3 flex flex-col">
              {NAV.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-white/10 text-brand-gold-300"
                        : "text-white/85 hover:bg-white/5"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}

              <a
                href={TICKETS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 rounded-md bg-emerald-500 px-3 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
              >
                Tickets · Ticketpluss
              </a>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
