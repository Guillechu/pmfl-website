import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reglas IFAF · PMFL",
  description:
    "Principales cambios al reglamento IFAF 2026 que rigen la Panama Major Football League.",
};

// Cambios de regla más relevantes de la temporada 2026 (fuente: IFAF 2026).
const RULE_CHANGES = [
  {
    code: "2-8-3-b",
    title: "Señal de “T” = fair catch inválido",
    desc: "Un jugador que hace una señal con los brazos extendidos formando una “T” se considera una señal de recepción libre (fair catch) inválida.",
  },
  {
    code: "2-16-10-a",
    title: "Formación de patada redefinida",
    desc: "Para contar como formación de patada (scrimmage kick), ningún jugador puede estar en la posición de quarterback y debe haber al menos un pateador potencial a 7 o más yardas de la zona neutral.",
  },
  {
    code: "3-1-3-h",
    title: "Tiempos muertos en tiempo extra",
    desc: "Cada equipo tiene un tiempo muerto para el primer y segundo periodo extra. A partir del tercer periodo extra, solo se permite un tiempo muerto por equipo hasta que termine el juego.",
  },
  {
    code: "3-3-6-a-1",
    title: "Lesión tras marcar el balón",
    desc: "Si un jugador se presenta lesionado después de que los oficiales marcan el balón para la siguiente jugada, se le cobra un tiempo muerto de equipo (o penalización por demora si ya no le quedan).",
  },
  {
    code: "3-5-3-b",
    title: "Faltas de sustitución tras el aviso de 2 minutos",
    desc: "Si la defensa comete una falta de sustitución en los últimos dos minutos de cada mitad con 12 o más jugadores participando, el equipo ofensivo puede optar por reiniciar el reloj al tiempo que marcaba en el snap. Frena tácticas para perder tiempo.",
  },
  {
    code: "9-1-9-a",
    title: "Roughing the passer ampliado",
    desc: "El contacto ilegal al pasador ahora incluye también el contacto a un jugador ofensivo que está en postura de pase, dándole protección extra antes de lanzar.",
  },
  {
    code: "9-1-14",
    title: "Protección al snapper",
    desc: "En formación de patada, cuando el snapper no está en el extremo de la línea, un defensor no puede iniciar contacto con él hasta que haya transcurrido un segundo después del snap.",
  },
  {
    code: "7-1-5-a",
    title: "Señales que confunden al rival",
    desc: "Nadie puede usar palabras o señales que desconcierten al oponente al iniciar la jugada. Los términos “move” y “stem” quedan reservados para la defensa; la ofensiva puede usar un “clap” como señal de salida y la defensa no.",
  },
];

const EDITORIAL_CHANGES = [
  {
    code: "1-2-3",
    title: "Zona de seguridad",
    desc: "Se define la zona de seguridad como el área a 18 pies (≈5.5 m) del terreno de juego. Ni fotógrafos, camarógrafos ni prensa pueden estar dentro durante el juego, salvo excepciones puntuales, por seguridad de todos.",
  },
  {
    code: "2-27-14-k",
    title: "Jugador indefenso al recuperar un balón",
    desc: "Un jugador que atrapa o recupera un balón suelto se considera indefenso, recibiendo la misma protección que quien recupera un fumble.",
  },
  {
    code: "11-2-2",
    title: "Estándares de arbitraje",
    desc: "Desde 2028, solo oficiales que usen las mecánicas más recientes aprobadas serán considerados para torneos internacionales, elevando el estándar del arbitraje.",
  },
];

export default function RulesPage() {
  return (
    <div className="container-page py-12">
      <header className="mb-8 max-w-3xl">
        <p className="text-xs uppercase tracking-widest text-brand-gold-300">
          Reglamento
        </p>
        <h1 className="h-display text-4xl md:text-5xl text-white">Reglas IFAF</h1>
        <p className="mt-3 text-white/70">
          La PMFL se rige por el reglamento de la{" "}
          <span className="text-white">
            Federación Internacional de Fútbol Americano (IFAF)
          </span>
          . Estos son los principales cambios que entran en vigor en la
          temporada 2026.
        </p>
      </header>

      {/* Cambios de regla */}
      <section className="mb-12">
        <h2 className="h-display text-2xl text-white mb-1">Cambios de regla</h2>
        <p className="text-sm text-white/60 mb-5">
          Modificaciones que pueden cambiar el resultado de una jugada respecto a
          la temporada anterior.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {RULE_CHANGES.map((r) => (
            <article key={r.code} className="card p-5">
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-brand-red/15 px-2 py-1 font-display text-xs tracking-wider text-brand-red-100 ring-1 ring-brand-red/40">
                  {r.code}
                </span>
                <h3 className="font-semibold text-white">{r.title}</h3>
              </div>
              <p className="mt-3 text-sm text-white/70">{r.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Cambios editoriales */}
      <section className="mb-12">
        <h2 className="h-display text-2xl text-white mb-1">
          Aclaraciones editoriales
        </h2>
        <p className="text-sm text-white/60 mb-5">
          Precisiones que no cambian el resultado en el campo, pero clarifican el
          reglamento.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {EDITORIAL_CHANGES.map((r) => (
            <article key={r.code} className="card p-5">
              <span className="rounded-md bg-white/10 px-2 py-1 font-display text-xs tracking-wider text-white/80">
                {r.code}
              </span>
              <h3 className="mt-3 font-semibold text-white">{r.title}</h3>
              <p className="mt-2 text-sm text-white/70">{r.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Reglamento oficial */}
      <section className="card relative overflow-hidden p-8 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.12),transparent_60%)]" />
        <div className="relative z-10">
          <h2 className="h-display text-2xl text-white">Reglamento completo</h2>
          <p className="mx-auto mt-2 max-w-2xl text-white/70">
            Consulta el reglamento IFAF 2026 completo, con todos los cambios
            incorporados, en el sitio oficial.
          </p>
          <a
            href="http://www.myiafoa.org/rules/ifaf2026/index.htm"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-5 inline-flex"
          >
            Ver reglamento oficial IFAF 2026
          </a>
        </div>
      </section>
    </div>
  );
}
