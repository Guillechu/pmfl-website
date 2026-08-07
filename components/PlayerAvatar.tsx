"use client";

// Retrato de jugador con repliegue.
//
// Las fotos del roster de Cloob no siempre son accesibles (algunas
// devuelven 403), y una imagen rota se ve peor que no poner nada. Si la
// carga falla, se pinta el respaldo — normalmente el escudo del equipo.

import { useState } from "react";

export default function PlayerAvatar({
  src,
  alt,
  className,
  fallback,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Qué mostrar si no hay foto o si no carga (el escudo del equipo). */
  fallback: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return <>{fallback}</>;

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
