// Panel de la liga. Hoy gestiona patrocinadores; el área de fotografía
// vive aparte, en /adminfoto, con su propia contraseña.

import SponsorAdmin from "@/components/SponsorAdmin";

export const metadata = {
  title: "Panel de la liga · PMFL",
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
          Panel de la liga
        </h1>
        <p className="mt-2 max-w-2xl text-white/70">
          Gestiona los patrocinadores del sitio: añade uno con su logo,
          edita sus datos o quítalo. Los cambios se ven al instante.
        </p>
      </header>

      <SponsorAdmin />
    </div>
  );
}
