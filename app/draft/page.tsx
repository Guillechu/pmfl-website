import draft from "@/data/draft.json";
import TeamLogo from "@/components/TeamLogo";

export default function DraftPage() {
  const roundOne = draft.filter((p) => p.round === 1);

  return (
    <div className="container-page py-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-brand-gold-300">
          PMFL Draft 2026
        </p>

        <h1 className="h-display text-4xl md:text-5xl text-white">
          Draft Results
        </h1>

        <p className="mt-2 text-white/70 max-w-2xl">
          Resultados oficiales del Round 1 del Draft PMFL 2026.
        </p>
      </header>

      <section>
        <h2 className="h-display text-2xl text-white mb-5">
          Round 1
        </h2>

        <div className="space-y-4">
          {roundOne.map((player) => (
            <div
              key={player.pick}
              className="card p-5 flex items-center gap-5"
            >
              <div className="text-4xl font-black text-brand-gold-300 w-12 text-center">
                {player.pick}
              </div>

              {/* Escudo del equipo que lo seleccionó */}
              <TeamLogo name={player.team} className="h-14 w-14" />

              <div>
                <h3 className="text-2xl font-bold text-white">
                  {player.name}
                </h3>

                <p className="text-white/60">
                  {player.position} · #{player.number}
                </p>

                <p className="text-brand-gold-300 font-semibold capitalize">
                  {player.team}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}