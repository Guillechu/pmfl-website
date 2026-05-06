"use client";

export default function ContactPage() {
  return (
    <div className="container-page py-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-brand-gold-300">
          Contáctanos
        </p>
        <h1 className="h-display text-4xl md:text-5xl text-white">
          Contacto
        </h1>
        <p className="mt-2 text-white/70 max-w-2xl">
          ¿Tienes preguntas sobre equipos, patrocinios, media o cómo participar?
          Escríbenos.
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* FORMULARIO */}
        <div className="lg:col-span-2 card p-6">
          <form className="space-y-4">
            <div>
              <label className="text-xs text-white/60">Nombre</label>
              <input
                type="text"
                placeholder="Tu nombre completo"
                className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-4 py-2 text-white"
              />
            </div>

            <div>
              <label className="text-xs text-white/60">Correo</label>
              <input
                type="email"
                placeholder="tu@email.com"
                className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-4 py-2 text-white"
              />
            </div>

            <div>
              <label className="text-xs text-white/60">Mensaje</label>
              <textarea
                rows={5}
                placeholder="¿En qué podemos ayudarte?"
                className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-4 py-2 text-white"
              />
            </div>

            <button type="submit" className="btn-primary">
              Enviar mensaje
            </button>
          </form>
        </div>

        {/* INFO LATERAL */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="h-display text-lg text-white mb-2">
              Oficina de la Liga
            </h3>
            <p className="text-white/70 text-sm">
              Panama Major Football League
              <br />
              Ciudad de Panamá, Panamá
            </p>
            <p className="text-white/70 text-sm mt-2">
              Email:{" "}
<a
  href="mailto:pmfllogistica@gmail.com"
  className="text-brand-gold-300 hover:text-brand-gold-500 transition-colors"
>
  pmfllogistica@gmail.com
</a>
            </p>
          </div>

          <div className="card p-5">
            <h3 className="h-display text-lg text-white mb-2">
              Síguenos en Instagram
            </h3>
            <a
  href="https://www.instagram.com/pmfl507/"
  target="_blank"
  rel="noopener noreferrer"
  className="text-brand-gold-300 hover:text-brand-gold-500 transition-colors"
>
  @pmfl507
</a>
          </div>

          <div className="card p-5">
            <h3 className="h-display text-lg text-white mb-2">
              Entidad Reguladora
            </h3>
            <p className="text-white/70 text-sm">
              La PMFL está avalada por la
              <span className="text-brand-gold-300">
                {" "}Federación Panameña de Fútbol Americano (AFFP)
              </span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}