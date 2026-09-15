import type { MediaItem } from "@/lib/types";

/**
 * Aviso de transmisión en vivo, arriba del todo en el inicio.
 *
 * Se enciende con un solo campo: playOfTheWeek.enVivo en data/media.json.
 * Cada semana, al poner el live nuevo, se marca true; al terminar, false.
 * Enlaza directo al vídeo en YouTube y no a la sección "Lo mejor del
 * momento", porque esa sección entra y sale del inicio según la semana.
 *
 * El punto son tres capas: un núcleo con volumen (degradado radial) que
 * late con su halo, y dos ondas que se expanden desfasadas un segundo,
 * así siempre hay una saliendo. Con "reducir movimiento" activado en el
 * sistema, las ondas desaparecen y el punto se queda fijo.
 *
 * El rojo es propio (#ef233c) y no el de la marca: tiene que leerse como
 * "en directo" en los dos temas, igual que en YouTube o en la tele.
 */
export default function LiveBadge({ live }: { live: MediaItem }) {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${live.youtubeId}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`En vivo: ${live.title}. Ver la transmisión en YouTube`}
      className="group inline-flex max-w-full items-center gap-3 rounded-full border border-[#ef233c]/40 bg-[#ef233c]/[0.07] py-2 pl-3.5 pr-4 text-sm shadow-[0_8px_24px_-10px_rgba(239,35,60,0.55)] transition-all duration-300 hover:border-[#ef233c]/70 hover:bg-[#ef233c]/[0.13] hover:shadow-[0_10px_30px_-8px_rgba(239,35,60,0.7)] dark:bg-[#ef233c]/[0.12] dark:hover:bg-[#ef233c]/[0.2]"
    >
      <span className="relative flex h-3 w-3 shrink-0" aria-hidden="true">
        <span className="absolute inset-0 rounded-full bg-[#ef233c] animate-live-ripple motion-reduce:hidden" />
        <span className="absolute inset-0 rounded-full bg-[#ef233c] animate-live-ripple [animation-delay:1s] motion-reduce:hidden" />
        <span className="relative h-3 w-3 rounded-full bg-[radial-gradient(circle_at_35%_35%,#ff8a95,#ef233c_55%,#b3001b)] animate-live-blink motion-reduce:animate-none" />
      </span>

      <span className="font-bold uppercase tracking-[0.18em] text-[#d90429] dark:text-[#ff5a69]">
        En vivo
      </span>

      <span className="h-4 w-px shrink-0 bg-[#ef233c]/30" aria-hidden="true" />

      <span className="truncate text-brand-navy/80 transition-colors group-hover:text-brand-navy dark:text-white/85 dark:group-hover:text-white">
        Ver transmisión{" "}
        <span
          aria-hidden="true"
          className="inline-block transition-transform duration-300 group-hover:translate-x-0.5"
        >
          →
        </span>
      </span>
    </a>
  );
}
