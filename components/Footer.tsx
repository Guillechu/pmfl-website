import Link from "next/link";
import LeagueMark from "./LeagueMark";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-white/10 bg-brand-navy-900/60">
      <div className="container-page py-12 grid gap-10 md:grid-cols-4">
        
        {/* IZQUIERDA */}
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <LeagueMark className="h-10 w-10" />
            <div>
              <div className="h-display text-xl text-white">PMFL</div>
              <div className="text-xs uppercase tracking-widest text-brand-gold-300">
                Panama mayor football league
              </div>
            </div>
          </div>

          <p className="mt-4 max-w-md text-sm text-white/70">
            La PMFL es la principal liga de fútbol americano en Panamá, avalada por la
            <span className="text-brand-gold-300"> Federación Panameña de Fútbol Americano (AFFP)</span>.
          </p>

          <div className="mt-4 flex items-center gap-3 text-white/70">
            <a
              href="https://www.instagram.com/pmfl507/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-gold-300 transition-colors"
              aria-label="PMFL en Instagram"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2c2.7 0 3 .01 4.1.06 1.06.05 1.79.22 2.43.47.66.26 1.22.6 1.77 1.16a4.9 4.9 0 0 1 1.16 1.77c.25.64.42 1.37.47 2.43C21.99 9 22 9.3 22 12s-.01 3-.06 4.1c-.05 1.06-.22 1.79-.47 2.43-.26.66-.6 1.22-1.16 1.77a4.9 4.9 0 0 1-1.77 1.16c-.64.25-1.37.42-2.43.47C15 21.99 14.7 22 12 22s-3-.01-4.1-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.77-1.16 4.9 4.9 0 0 1-1.16-1.77c-.25-.64-.42-1.37-.47-2.43C2.01 15 2 14.7 2 12s.01-3 .06-4.1c.05-1.06.22-1.79.47-2.43A4.9 4.9 0 0 1 3.69 3.7 4.9 4.9 0 0 1 5.46 2.54c.64-.25 1.37-.42 2.43-.47C9 2.01 9.3 2 12 2zm0 5.4a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2zm0 7.6a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm5.85-7.78a1.08 1.08 0 1 1-2.15 0 1.08 1.08 0 0 1 2.15 0z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* EXPLORAR */}
        <div>
          <h4 className="h-display text-sm text-white mb-3">Explorar</h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li><Link href="/teams" className="hover:text-white">Equipos</Link></li>
            <li><Link href="/stats" className="hover:text-white">Estadísticas y Rankings</Link></li>
            <li><Link href="/schedule" className="hover:text-white">Calendario</Link></li>
            <li><Link href="/media" className="hover:text-white">Media</Link></li>
            <li><Link href="/gallery" className="hover:text-white">Galería</Link></li>
          </ul>
        </div>

        {/* LIGA */}
        <div>
          <h4 className="h-display text-sm text-white mb-3">Liga</h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li><Link href="/sponsors" className="hover:text-white">Patrocinadores</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contacto</Link></li>
            <li><span className="text-white/50">Avalado por la AFFP</span></li>
          </ul>
        </div>
      </div>

      {/* PARTE FINAL */}
      <div className="border-t border-white/10">
        <div className="container-page py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-white/50">
          <p>© {year} Panama Major Football League. Todos los derechos reservados.</p>
          <p>Federación Panameña de Fútbol Americano (AFFP) · Organismo regulador</p>
        </div>
      </div>
    </footer>
  );
}