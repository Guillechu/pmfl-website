// Área privada de fotógrafos. La lógica vive en <AdminPanel/> (cliente);
// aquí solo va la cabecera y los metadatos.

import AdminPanel from "@/components/AdminPanel";

export const metadata = {
  title: "Área de fotógrafos · PMFL",
  // No queremos este panel en Google.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <div className="container-page py-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-brand-gold-300">
          Privado
        </p>
        <h1 className="h-display text-4xl text-white md:text-5xl">
          Área de fotógrafos
        </h1>
        <p className="mt-2 max-w-2xl text-white/70">
          Crea el álbum de la jornada y sube las fotos. Aparecen en la galería
          del sitio al terminar la subida.
        </p>
      </header>

      <AdminPanel />
    </div>
  );
}
