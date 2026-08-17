"use client";

// ----------------------------------------------------------------------
// Panel de la liga: patrocinadores.
//
// Añadir uno = subir su logo con sus datos. Los datos viajan dentro del
// propio archivo en Cloudinary (su `context`), así que se pueden editar
// después sin volver a subir la imagen.
// ----------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Sponsor {
  id: string;
  publicId: string;
  name: string;
  category: string;
  url: string;
  logo: string;
  order: number;
  editable: boolean;
}

const EMPTY = { name: "", category: "Patrocinadores", url: "", order: 100 };

export default function SponsorAdmin() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [configured, setConfigured] = useState(true);

  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [categories, setCategories] = useState<string[]>([
    "Patrocinadores",
    "Alianzas",
    "Team Partners",
  ]);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Alta
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Edición
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/sponsors", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { sponsors: Sponsor[]; categories: string[] };
    setSponsors(data.sponsors);
    if (data.categories?.length) setCategories(data.categories);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/session", { cache: "no-store" });
        const data = (await res.json()) as {
          role: string | null;
          adminConfigured: boolean;
        };
        setConfigured(data.adminConfigured);
        const ok = data.role === "admin";
        setAuthed(ok);
        if (ok) await load();
      } finally {
        setReady(true);
      }
    })();
  }, [load]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, area: "admin" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setLoginError(data.error ?? "No se pudo entrar");
        return;
      }
      setPassword("");
      setAuthed(true);
      await load();
    } catch {
      setLoginError("Error de red");
    } finally {
      setLoggingIn(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setSponsors([]);
  }

  // -------- alta ---------------------------------------------------------

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setNotice({ kind: "err", msg: "Elige el archivo del logo." });
      return;
    }
    setBusy(true);
    setNotice(null);

    try {
      const sigRes = await fetch("/api/admin/sponsors/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const sig = (await sigRes.json()) as {
        cloudName: string;
        apiKey: string;
        signature: string;
        timestamp: number;
        folder: string;
        context: string;
        extra?: Record<string, string>;
        error?: string;
      };
      if (!sigRes.ok) {
        setNotice({ kind: "err", msg: sig.error ?? "No se pudo firmar la subida" });
        return;
      }

      const body = new FormData();
      body.append("file", file);
      body.append("api_key", sig.apiKey);
      body.append("timestamp", String(sig.timestamp));
      body.append("signature", sig.signature);
      body.append("folder", sig.folder);
      body.append("context", sig.context);
      for (const [k, v] of Object.entries(sig.extra ?? {})) body.append(k, v);

      const up = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
        { method: "POST", body },
      );
      const upData = (await up.json()) as { public_id?: string; error?: { message?: string } };
      if (!up.ok || !upData.public_id) {
        setNotice({
          kind: "err",
          msg: upData.error?.message ?? "Cloudinary rechazó el logo",
        });
        return;
      }

      setForm(EMPTY);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      // El índice de Cloudinary tarda un par de segundos en verlo.
      await new Promise((r) => setTimeout(r, 2500));
      await load();
      setNotice({ kind: "ok", msg: `"${form.name}" añadido. Ya sale en el sitio.` });
    } finally {
      setBusy(false);
    }
  }

  // -------- edición y borrado -------------------------------------------

  function startEdit(s: Sponsor) {
    setEditing(s.publicId);
    setEditForm({
      name: s.name,
      category: s.category,
      url: s.url === "#" ? "" : s.url,
      order: s.order,
    });
  }

  async function saveEdit(publicId: string) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/sponsors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId, ...editForm }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setNotice({ kind: "err", msg: data.error ?? "No se pudo guardar" });
        return;
      }
      setEditing(null);
      await load();
      setNotice({ kind: "ok", msg: "Cambios guardados." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(s: Sponsor) {
    if (!window.confirm(`¿Quitar a "${s.name}" del sitio? No se puede deshacer.`)) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/sponsors?publicId=${encodeURIComponent(s.publicId)}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setNotice({ kind: "err", msg: data.error ?? "No se pudo borrar" });
        return;
      }
      await load();
      setNotice({ kind: "ok", msg: `"${s.name}" eliminado.` });
    } finally {
      setBusy(false);
    }
  }

  // -------- render -------------------------------------------------------

  if (!ready) {
    return <div className="card p-10 text-center text-brand-navy/60 dark:text-white/60">Cargando panel…</div>;
  }

  if (!authed) {
    return (
      <div className="mx-auto max-w-sm">
        <form onSubmit={login} className="card space-y-4 p-6">
          <div>
            <h2 className="h-display text-xl text-brand-navy dark:text-white">Panel de la liga</h2>
            <p className="mt-1 text-sm text-brand-navy/60 dark:text-white/60">
              Contraseña de administración para gestionar patrocinadores.
            </p>
          </div>

          {!configured && (
            <p className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-200 ring-1 ring-amber-400/30">
              Falta definir <code>SESSION_SECRET</code> y{" "}
              <code>ADMIN_LIGA_PASSWORD</code> en el servidor.
            </p>
          )}

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            autoComplete="current-password"
            className="w-full rounded-md border border-brand-navy/10 dark:border-white/10 bg-brand-navy/[0.04] dark:bg-white/5 px-3 py-2 text-brand-navy dark:text-white outline-none focus:border-brand-gold/50"
          />

          {loginError && <p className="text-sm text-brand-red-700 dark:text-brand-red-100">{loginError}</p>}

          <button type="submit" disabled={loggingIn} className="btn-primary w-full disabled:opacity-60">
            {loggingIn ? "Entrando…" : "Entrar"}
          </button>

          <p className="text-center text-xs text-brand-navy/50 dark:text-white/40">
            ¿Buscas subir fotos?{" "}
            <a href="/adminfoto" className="text-brand-gold-700 dark:text-brand-gold-300 hover:underline">
              Área de fotógrafos
            </a>
          </p>
        </form>
      </div>
    );
  }

  const pendientes = sponsors.filter((s) => !s.editable).length;
  const inputClass =
    "w-full rounded-md border border-brand-navy/10 dark:border-white/10 bg-brand-navy/[0.04] dark:bg-white/5 px-3 py-2 text-sm text-brand-navy dark:text-white outline-none focus:border-brand-gold/50";

  return (
    <div className="space-y-6">
      {notice && (
        <p
          className={cn(
            "rounded-md p-3 text-sm ring-1",
            notice.kind === "ok"
              ? "bg-emerald-600/10 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 ring-emerald-600/30 dark:ring-emerald-400/30"
              : "bg-brand-red/10 text-brand-red-700 dark:text-brand-red-100 ring-brand-red/30 dark:ring-brand-red/40",
          )}
        >
          {notice.msg}
        </p>
      )}

      {pendientes > 0 && (
        <p className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-200 ring-1 ring-amber-400/30">
          Hay {pendientes} patrocinador(es) del listado antiguo del código.
          Se muestran en el sitio, pero para editarlos desde aquí hay que
          migrarlos a Cloudinary.
        </p>
      )}

      {/* Alta */}
      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="h-display text-lg text-brand-navy dark:text-white">Añadir patrocinador</h2>
          <button onClick={logout} className="btn-ghost text-xs">
            Salir
          </button>
        </div>

        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-1">
            <span className="mb-1 block text-xs text-brand-navy/60 dark:text-white/60">Nombre</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre Visible S.A."
              className={inputClass}
            />
          </label>

          <label>
            <span className="mb-1 block text-xs text-brand-navy/60 dark:text-white/60">Categoría</span>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={inputClass}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1 block text-xs text-brand-navy/60 dark:text-white/60">
              Sitio web (opcional)
            </span>
            <input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://…"
              className={inputClass}
            />
          </label>

          <label>
            <span className="mb-1 block text-xs text-brand-navy/60 dark:text-white/60">
              Orden (menor = primero)
            </span>
            <input
              type="number"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
              className={inputClass}
            />
          </label>

          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs text-brand-navy/60 dark:text-white/60">
              Logo (PNG con fondo transparente si es posible)
            </span>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-brand-navy/70 dark:text-white/70 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:text-white hover:file:bg-white/20"
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy || !form.name.trim() || !file}
              className="btn-primary disabled:opacity-60"
            >
              {busy ? "Subiendo…" : "Añadir patrocinador"}
            </button>
          </div>
        </form>
      </section>

      {/* Listado */}
      <section className="card p-6">
        <h2 className="mb-4 h-display text-lg text-brand-navy dark:text-white">
          Patrocinadores actuales{" "}
          <span className="ml-1 text-sm font-normal text-brand-navy/55 dark:text-white/50">
            {sponsors.length}
          </span>
        </h2>

        <ul className="space-y-2">
          {sponsors.map((s) => (
            <li key={s.id} className="rounded-lg bg-white dark:bg-white/[0.03] p-3">
              {editing === s.publicId ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className={inputClass}
                    placeholder="Nombre"
                  />
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className={inputClass}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input
                    value={editForm.url}
                    onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                    className={inputClass}
                    placeholder="https://… (vacío = sin enlace)"
                  />
                  <input
                    type="number"
                    value={editForm.order}
                    onChange={(e) => setEditForm({ ...editForm, order: Number(e.target.value) })}
                    className={inputClass}
                    placeholder="Orden"
                  />
                  <div className="flex gap-2 sm:col-span-2">
                    <button
                      onClick={() => saveEdit(s.publicId)}
                      disabled={busy}
                      className="btn-primary text-sm disabled:opacity-60"
                    >
                      Guardar
                    </button>
                    <button onClick={() => setEditing(null)} className="btn-secondary text-sm">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-20 shrink-0 items-center justify-center rounded bg-white px-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.logo}
                      alt={s.name}
                      className="max-h-9 max-w-full object-contain"
                    />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-brand-navy dark:text-white">{s.name}</div>
                    <div className="truncate text-xs text-brand-navy/55 dark:text-white/50">
                      {s.category} · orden {s.order}
                      {s.url && s.url !== "#" ? ` · ${s.url}` : " · sin enlace"}
                    </div>
                  </div>

                  {s.editable ? (
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => startEdit(s)}
                        className="rounded px-2 py-1 text-xs text-brand-navy/60 dark:text-white/60 hover:bg-brand-navy/[0.07] hover:dark:bg-white/10 hover:text-brand-navy hover:dark:text-white"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => remove(s)}
                        className="rounded px-2 py-1 text-xs text-brand-navy/55 dark:text-white/50 hover:bg-brand-navy/[0.07] hover:dark:bg-white/10 hover:text-brand-red-700 hover:dark:text-brand-red-100"
                      >
                        Borrar
                      </button>
                    </div>
                  ) : (
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-brand-navy/40 dark:text-white/30">
                      del código
                    </span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
