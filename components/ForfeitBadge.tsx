/**
 * Aviso de que un partido se decidió por forfeit (data/forfeits.json): el
 * marcador es el que fija la liga, no uno jugado. En oscuro, blanco sobre
 * la tarjeta; en claro, navy, para que se lea igual.
 */
export default function ForfeitBadge() {
  return (
    <span className="shrink-0 rounded-md bg-brand-navy px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-white dark:bg-white dark:text-black">
      * Forfeit
    </span>
  );
}
