import Link from "next/link";
import LeagueMark from "./LeagueMark";
import {
  InstagramIcon,
  FacebookIcon,
  TikTokIcon,
  YouTubeIcon,
} from "./SocialIcons";

const FOOTER_SOCIAL = [
  { label: "Instagram", href: "https://www.instagram.com/pmfl507/", Icon: InstagramIcon },
  { label: "YouTube", href: "https://www.youtube.com/@pmfl", Icon: YouTubeIcon },
  {
    label: "Facebook",
    href: "https://www.facebook.com/p/Panama-Major-Football-League-100063496664850/",
    Icon: FacebookIcon,
  },
  { label: "TikTok", href: "https://www.tiktok.com/@pmfl507?lang=es", Icon: TikTokIcon },
];

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
                Panama Major Football League
              </div>
            </div>
          </div>

          <p className="mt-4 max-w-md text-sm text-white/70">
            La PMFL es la principal liga de fútbol americano en Panamá, avalada por la
            <span className="text-brand-gold-300"> Federación Panameña de Fútbol Americano (AFFP)</span>.
          </p>

          <div className="mt-4 flex items-center gap-3 text-white/70">
            {FOOTER_SOCIAL.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brand-gold-300 transition-colors"
                aria-label={`PMFL en ${label}`}
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>

        {/* EXPLORAR */}
        <div>
          <h4 className="h-display text-sm text-white mb-3">Explorar</h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li><Link href="/teams" className="hover:text-white">Equipos</Link></li>
            <li><Link href="/stats" className="hover:text-white">Rankings y Stats</Link></li>
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
            {/* Acceso discreto para el equipo de fotografía (pide contraseña). */}
            <li><Link href="/adminfoto" className="text-white/50 hover:text-white">Área de fotógrafos</Link></li>
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