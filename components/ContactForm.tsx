"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
    };

    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "No se pudo enviar. Intenta de nuevo.");
        setStatus("error");
        return;
      }
      form.reset();
      setStatus("sent");
    } catch {
      setError("No se pudo enviar. Revisa tu conexión e intenta de nuevo.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-2xl">
          ✅
        </div>
        <h3 className="mt-3 h-display text-xl text-brand-navy dark:text-white">¡Mensaje enviado!</h3>
        <p className="mt-2 max-w-sm text-brand-navy/70 dark:text-white/70">
          Gracias por escribirnos. Te responderemos lo antes posible.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="btn-secondary mt-5"
        >
          Enviar otro mensaje
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="text-xs text-brand-navy/60 dark:text-white/60">Nombre</label>
        <input
          name="name"
          type="text"
          required
          minLength={2}
          placeholder="Tu nombre completo"
          className="mt-1 w-full rounded-md border border-brand-navy/10 dark:border-white/10 bg-brand-navy/[0.04] dark:bg-white/5 px-4 py-2 text-brand-navy dark:text-white outline-none focus:border-brand-gold/50"
        />
      </div>

      <div>
        <label className="text-xs text-brand-navy/60 dark:text-white/60">Correo</label>
        <input
          name="email"
          type="email"
          required
          placeholder="tu@email.com"
          className="mt-1 w-full rounded-md border border-brand-navy/10 dark:border-white/10 bg-brand-navy/[0.04] dark:bg-white/5 px-4 py-2 text-brand-navy dark:text-white outline-none focus:border-brand-gold/50"
        />
      </div>

      <div>
        <label className="text-xs text-brand-navy/60 dark:text-white/60">Mensaje</label>
        <textarea
          name="message"
          rows={5}
          required
          minLength={5}
          placeholder="¿En qué podemos ayudarte?"
          className="mt-1 w-full rounded-md border border-brand-navy/10 dark:border-white/10 bg-brand-navy/[0.04] dark:bg-white/5 px-4 py-2 text-brand-navy dark:text-white outline-none focus:border-brand-gold/50"
        />
      </div>

      {status === "error" && (
        <p className="rounded-md border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-sm text-brand-red-700 dark:text-brand-red-100">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "sending" ? "Enviando…" : "Enviar mensaje"}
      </button>
    </form>
  );
}
