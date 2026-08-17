import Image from "next/image";
import type { Team } from "@/lib/types";

export default function TeamMark({
  team,
  className = "h-12 w-12",
}: {
  team: Team;
  className?: string;
}) {
  return (
    <div className={`${className} relative`}>
      <div className="w-full h-full rounded-lg bg-brand-navy/[0.04] dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 flex items-center justify-center overflow-hidden">
        <Image
          src={team.logo}
          alt={team.name}
          width={64}
          height={64}
          className="object-contain p-1"
        />
      </div>
    </div>
  );
}