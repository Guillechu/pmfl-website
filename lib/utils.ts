// Tiny utilities used across the app.

/** Tailwind class merge: skip falsy, join with spaces. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Format ISO date as "sáb, 15 ago · 5:00 p. m.".
 * Always renders in Panama time (America/Panama) so the hour is consistent
 * for every viewer and matches between server render and client.
 */
export function formatGameDate(iso: string): string {
  const d = new Date(iso);
  const TZ = "America/Panama";
  const day = d.toLocaleDateString("es-PA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: TZ,
  });
  const time = d.toLocaleTimeString("es-PA", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ,
  });
  return `${day} · ${time}`;
}

/** Returns a slug from any string (basic). */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
