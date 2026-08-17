"use client";

import { useEffect, useState } from "react";

/**
 * Selector de apariencia, fijo abajo a la derecha.
 *
 * El tema vive en la clase "dark" de <html>, que es lo que mira Tailwind.
 * La elección se guarda en localStorage y la aplica un script en <head>
 * ANTES de pintar (ver app/layout.tsx): si se hiciera aquí, quien tenga
 * elegido el claro vería un parpadeo oscuro en cada carga.
 *
 * Por defecto, oscuro: es lo que había hasta ahora y quien no toque nada
 * no debe notar ningún cambio.
 */
type Tema = "claro" | "oscuro";

const CLAVE = "pmfl-tema";

function aplicar(tema: Tema) {
  document.documentElement.classList.toggle("dark", tema === "oscuro");
}

export default function ThemeToggle() {
  const [tema, setTema] = useState<Tema>("oscuro");
  // Hasta que no monta en el cliente no se sabe qué eligió el visitante;
  // se pinta igual para no mover el layout, pero sin marcar opción.
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    const guardado = localStorage.getItem(CLAVE);
    setTema(guardado === "claro" ? "claro" : "oscuro");
    setMontado(true);
  }, []);

  function elegir(nuevo: Tema) {
    setTema(nuevo);
    localStorage.setItem(CLAVE, nuevo);
    aplicar(nuevo);
  }

  const opciones: { valor: Tema; etiqueta: string; icono: React.ReactNode }[] = [
    {
      valor: "claro",
      etiqueta: "Apariencia clara",
      icono: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      valor: "oscuro",
      etiqueta: "Apariencia oscura",
      icono: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-full border border-brand-navy/10 bg-white/90 p-1 shadow-card backdrop-blur-md dark:border-white/15 dark:bg-brand-navy-800/90"
      role="group"
      aria-label="Apariencia del sitio"
    >
      {opciones.map((o) => {
        const activo = montado && tema === o.valor;
        return (
          <button
            key={o.valor}
            type="button"
            onClick={() => elegir(o.valor)}
            aria-label={o.etiqueta}
            aria-pressed={activo}
            title={o.etiqueta}
            className={
              "flex h-8 w-8 items-center justify-center rounded-full transition-colors " +
              (activo
                ? "bg-brand-gold-600/20 text-brand-gold-800 dark:bg-brand-gold/20 dark:text-brand-gold-300"
                : "text-brand-navy/50 hover:bg-brand-navy/5 hover:text-brand-navy dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white")
            }
          >
            {o.icono}
          </button>
        );
      })}
    </div>
  );
}
