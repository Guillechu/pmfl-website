import Image from "next/image";
import { getTeam } from "@/lib/data";
import ContactForm from "@/components/ContactForm";
import {
  WhatsAppIcon,
  InstagramIcon,
  FacebookIcon,
  TikTokIcon,
  YouTubeIcon,
} from "@/components/SocialIcons";

const PRESIDENTE = {
  role: "Presidente",
  name: "Gino Gómez",
  photo: "/junta/gino-gomez.jpg",
};

const JUNTA = [
  { role: "Vicepresidente", name: "Roberto Carrillo" },
  { role: "Secretario", name: "Raúl Esquivel" },
  { role: "Fiscal", name: "Alonzo Smith" },
  { role: "Tesorero", name: "Por confirmar" },
  { role: "Vocal", name: "Raúl Rodríguez" },
];

// Bureau de Directores — un directivo por club (foto pendiente).
const BUREAU_ORDER = [
  "aguilas-doradas",
  "eagles",
  "hunters",
  "raptors",
  "saints",
  "tigers",
  "wolfpack",
];

const SOCIAL = [
  { label: "Instagram", href: "https://www.instagram.com/pmfl507/", Icon: InstagramIcon },
  { label: "YouTube", href: "https://www.youtube.com/@pmfl", Icon: YouTubeIcon },
  {
    label: "Facebook",
    href: "https://www.facebook.com/p/Panama-Major-Football-League-100063496664850/",
    Icon: FacebookIcon,
  },
  { label: "TikTok", href: "https://www.tiktok.com/@pmfl507?lang=es", Icon: TikTokIcon },
];

function initials(name: string): string {
  // Quita apodos entre comillas y usa inicial de nombre + apellido.
  const parts = name
    .replace(/["'“”]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export default function ContactPage() {
  const bureau = BUREAU_ORDER.map((id) => getTeam(id)).filter(
    (t): t is NonNullable<typeof t> => Boolean(t),
  );

  return (
    <div className="container-page py-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-brand-gold-300">
          Contáctanos
        </p>
        <h1 className="h-display text-4xl md:text-5xl text-white">Contacto</h1>
        <p className="mt-2 text-white/70 max-w-2xl">
          ¿Tienes preguntas sobre equipos, patrocinios, media o cómo participar?
          Escríbenos.
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* FORMULARIO */}
        <div className="lg:col-span-2 card p-6">
          <ContactForm />
        </div>

        {/* INFO LATERAL */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="h-display text-lg text-white mb-2">
              Oficinas de la Liga
            </h3>
            <p className="text-white/70 text-sm">
              Estadio Emilio Royo
              <br />
              Ciudad Deportiva Irving Saladino
              <br />
              Juan Díaz, Panamá
            </p>
            <p className="text-white/70 text-sm mt-3">
              Email:{" "}
              <a
                href="mailto:pmfllogistica@gmail.com"
                className="text-brand-gold-300 hover:text-brand-gold-500 transition-colors"
              >
                pmfllogistica@gmail.com
              </a>
            </p>
          </div>

          <div className="card p-5">
            <h3 className="h-display text-lg text-white mb-3">WhatsApp</h3>
            <a
              href="https://wa.me/50765515822"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 rounded-lg bg-[#25D366]/15 px-4 py-3 text-white transition-colors hover:bg-[#25D366]/25"
            >
              <WhatsAppIcon className="h-6 w-6 text-[#25D366]" />
              <span className="font-medium">6551-5822</span>
            </a>
          </div>

          <div className="card p-5">
            <h3 className="h-display text-lg text-white mb-2">
              Entidad Reguladora
            </h3>
            <p className="text-white/70 text-sm">
              Liga deportiva amparada bajo{" "}
              <a
                href="https://pandeportes.gob.pa/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-gold-300 hover:text-brand-gold-500 transition-colors"
              >
                Pandeportes
              </a>{" "}
              y la{" "}
              <a
                href="https://www.instagram.com/affpma/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-gold-300 hover:text-brand-gold-500 transition-colors"
              >
                Asociación de Fútbol Americano de Panamá (AFFP)
              </a>
              .
            </p>
          </div>

          <div className="card p-5">
            <h3 className="h-display text-lg text-white mb-3">Síguenos</h3>
            <div className="flex flex-wrap gap-2">
              {SOCIAL.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 transition-colors hover:border-brand-gold/50 hover:text-white"
                  aria-label={label}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* JUNTA DIRECTIVA */}
      <section className="mt-14">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="h-display text-2xl md:text-3xl text-white">
            Junta Directiva
          </h2>
          <span className="text-sm text-brand-gold-300">2026 – 2030</span>
        </div>

        {/* Presidente destacado con foto */}
        <div className="mb-6 flex justify-center">
          <div className="card w-full max-w-sm p-6 text-center">
            <div className="mx-auto h-48 w-48 overflow-hidden rounded-2xl border border-white/10">
              <Image
                src={PRESIDENTE.photo}
                alt={PRESIDENTE.name}
                width={400}
                height={400}
                className="h-full w-full object-cover object-top"
              />
            </div>
            <p className="mt-4 text-xs uppercase tracking-widest text-brand-gold-300">
              {PRESIDENTE.role}
            </p>
            <p className="mt-1 h-display text-2xl text-white">
              {PRESIDENTE.name}
            </p>
          </div>
        </div>

        {/* Resto de la junta */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {JUNTA.map((m) => (
            <div key={m.role} className="card p-5 text-center">
              <p className="text-xs uppercase tracking-widest text-brand-gold-300">
                {m.role}
              </p>
              <p className="mt-1 h-display text-lg text-white">{m.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BUREAU DE DIRECTORES */}
      <section className="mt-14">
        <h2 className="h-display text-2xl md:text-3xl text-white mb-5">
          Bureau de Directores
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bureau.map((team) => (
            <div key={team.id} className="card flex items-center gap-4 p-5">
              {/* Foto del directivo (placeholder por ahora) */}
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-brand-gold/30 bg-brand-gold/10 font-display text-lg text-brand-gold-300">
                {initials(team.directivo || team.name)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="h-display text-base text-white truncate">
                  {team.directivo || "Por confirmar"}
                </p>
                <p className="text-xs text-white/60 truncate">{team.name}</p>
              </div>

              {/* Logo del equipo */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
                <Image
                  src={team.logo}
                  alt={team.name}
                  width={48}
                  height={48}
                  className="object-contain p-1"
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
