"use client";

// ----------------------------------------------------------------------
// Panel del fotógrafo.
//
// Flujo: entrar con contraseña → elegir o crear un álbum ("Jornada 1") →
// arrastrar las fotos. Cada archivo se sube DIRECTO a Cloudinary con una
// firma de un solo uso que pide al servidor; el archivo no pasa por Next,
// así que no hay límite de tamaño de body ni timeouts.
// ----------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import { cldThumb } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

interface AlbumRow {
  slug: string;
  title: string;
  count: number;
  latest: string | null;
  cover: string | null;
}

type FileState = "pending" | "uploading" | "done" | "error";

interface UploadItem {
  key: string;
  name: string;
  file: File;
  state: FileState;
  pct: number;
  publicId?: string;
  error?: string;
}

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  signature: string;
  timestamp: number;
  folder: string;
  context: string;
  /** Parámetros extra ya firmados por el servidor. */
  extra?: Record<string, string>;
}

/** Subidas en paralelo. Suficiente para ir rápido sin saturar la red. */
const CONCURRENCY = 3;

/** Álbum especial: retratos de jugadores para el pódium de anotadores. */
const PLAYERS_ALBUM = "jugadores";

export default function AdminPanel() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [cloudinaryOk, setCloudinaryOk] = useState(true);
  const [adminOk, setAdminOk] = useState(true);

  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [albums, setAlbums] = useState<AlbumRow[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [newAlbum, setNewAlbum] = useState("");
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const [items, setItems] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // -------- sesión y álbumes -------------------------------------------

  const loadAlbums = useCallback(async () => {
    const res = await fetch("/api/admin/albums", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { albums: AlbumRow[] };
    setAlbums(data.albums);
    setSelected((cur) => cur || data.albums[0]?.slug || "");
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/session", { cache: "no-store" });
        const data = (await res.json()) as {
          authenticated: boolean;
          photoConfigured: boolean;
          cloudinaryConfigured: boolean;
        };
        setAuthed(data.authenticated);
        setAdminOk(data.photoConfigured);
        setCloudinaryOk(data.cloudinaryConfigured);
        if (data.authenticated) await loadAlbums();
      } finally {
        setReady(true);
      }
    })();
  }, [loadAlbums]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, area: "foto" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setLoginError(data.error ?? "No se pudo entrar");
        return;
      }
      setPassword("");
      setAuthed(true);
      await loadAlbums();
    } catch {
      setLoginError("Error de red");
    } finally {
      setLoggingIn(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setItems([]);
    setAlbums([]);
  }

  async function createAlbum(e: React.FormEvent) {
    e.preventDefault();
    const name = newAlbum.trim();
    if (!name) return;
    setCreating(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as { error?: string; slug?: string; title?: string };
      if (!res.ok) {
        setNotice({ kind: "err", msg: data.error ?? "No se pudo crear el álbum" });
        return;
      }
      setNewAlbum("");
      await loadAlbums();
      if (data.slug) setSelected(data.slug);
      setNotice({ kind: "ok", msg: `Álbum "${data.title}" listo. Ya puedes subir fotos.` });
    } finally {
      setCreating(false);
    }
  }

  /** Sugiere el nombre de la siguiente jornada según lo que ya existe. */
  function suggestNextJornada(): string {
    const nums = albums
      .map((a) => /^jornada-(\d+)$/.exec(a.slug)?.[1])
      .filter(Boolean)
      .map(Number);
    const next = nums.length ? Math.max(...nums) + 1 : 1;
    return `Jornada ${next}`;
  }

  // -------- subida ------------------------------------------------------

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const incoming: UploadItem[] = Array.from(list)
      .filter((f) => f.type.startsWith("image/"))
      .map((f, i) => ({
        key: `${f.name}-${f.size}-${f.lastModified}-${i}`,
        name: f.name,
        file: f,
        state: "pending" as FileState,
        pct: 0,
      }));
    setItems((cur) => {
      const seen = new Set(cur.map((c) => c.key));
      return [...cur, ...incoming.filter((f) => !seen.has(f.key))];
    });
  }

  function patch(key: string, changes: Partial<UploadItem>) {
    setItems((cur) => cur.map((it) => (it.key === key ? { ...it, ...changes } : it)));
  }

  /** POST del archivo a Cloudinary, con progreso. true si quedó subido. */
  function putToCloudinary(item: UploadItem, sig: UploadSignature): Promise<boolean> {
    const form = new FormData();
    form.append("file", item.file);
    form.append("api_key", sig.apiKey);
    form.append("timestamp", String(sig.timestamp));
    form.append("signature", sig.signature);
    form.append("folder", sig.folder);
    form.append("context", sig.context);
    // Parámetros extra que vienen firmados (p. ej. conservar el nombre
    // del archivo en el álbum de retratos): se reenvían tal cual.
    for (const [k, v] of Object.entries(sig.extra ?? {})) form.append(k, v);

    return new Promise<boolean>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          patch(item.key, { pct: Math.round((e.loaded / e.total) * 100) });
        }
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText) as {
            public_id?: string;
            error?: { message?: string };
          };
          if (xhr.status >= 200 && xhr.status < 300 && data.public_id) {
            patch(item.key, { state: "done", pct: 100, publicId: data.public_id });
            resolve(true);
            return;
          }
          patch(item.key, {
            state: "error",
            error: data.error?.message ?? `Cloudinary respondió ${xhr.status}`,
          });
        } catch {
          patch(item.key, { state: "error", error: "Respuesta inesperada de Cloudinary" });
        }
        resolve(false);
      };

      xhr.onerror = () => {
        patch(item.key, { state: "error", error: "Error de red al subir" });
        resolve(false);
      };

      xhr.send(form);
    });
  }

  /** Pide la firma y sube un archivo. true si quedó subido. */
  async function uploadOne(item: UploadItem, albumSlug: string): Promise<boolean> {
    patch(item.key, { state: "uploading", pct: 0, error: undefined });

    try {
      const res = await fetch("/api/admin/upload-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ album: albumSlug }),
      });
      const sig = (await res.json()) as UploadSignature & { error?: string };
      if (!res.ok) {
        patch(item.key, { state: "error", error: sig.error ?? "Sin permiso para subir" });
        return false;
      }
      return await putToCloudinary(item, sig);
    } catch {
      patch(item.key, { state: "error", error: "No se pudo pedir la firma" });
      return false;
    }
  }

  async function startUpload() {
    if (!selected) {
      setNotice({ kind: "err", msg: "Elige o crea un álbum primero." });
      return;
    }
    const queue = items.filter((it) => it.state === "pending" || it.state === "error");
    if (!queue.length) return;

    setUploading(true);
    setNotice(null);

    // Pool sencillo: CONCURRENCY trabajadores consumiendo la misma cola.
    // Contamos los fallos con lo que devuelve cada subida (el estado de
    // React todavía no está actualizado en este punto).
    let cursor = 0;
    let failedCount = 0;
    const worker = async () => {
      while (cursor < queue.length) {
        const item = queue[cursor++];
        const ok = await uploadOne(item, selected);
        if (!ok) failedCount++;
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    // El índice de búsqueda de Cloudinary tarda un par de segundos en ver
    // las fotos nuevas. Esperamos antes de refrescar para que la galería
    // no se quede cacheada sin ellas.
    await new Promise((r) => setTimeout(r, 3000));
    await fetch("/api/admin/refresh", { method: "POST" });
    await loadAlbums();
    setUploading(false);

    setNotice({
      kind: failedCount ? "err" : "ok",
      msg: failedCount
        ? `Subida terminada con ${failedCount} error(es). Puedes reintentar los fallidos.`
        : "Fotos subidas. Ya se ven en la galería.",
    });
  }

  async function removePhoto(item: UploadItem) {
    if (!item.publicId) return;
    if (!window.confirm(`¿Borrar "${item.name}" de la galería? No se puede deshacer.`)) return;
    const res = await fetch(
      `/api/admin/photos?publicId=${encodeURIComponent(item.publicId)}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      setItems((cur) => cur.filter((it) => it.key !== item.key));
      await loadAlbums();
    } else {
      const data = (await res.json()) as { error?: string };
      setNotice({ kind: "err", msg: data.error ?? "No se pudo borrar" });
    }
  }

  // -------- render ------------------------------------------------------

  if (!ready) {
    return (
      <div className="card p-10 text-center text-brand-navy/60 dark:text-white/60">Cargando panel…</div>
    );
  }

  if (!authed) {
    return (
      <div className="mx-auto max-w-sm">
        <form onSubmit={login} className="card space-y-4 p-6">
          <div>
            <h2 className="h-display text-xl text-brand-navy dark:text-white">Área de fotógrafos</h2>
            <p className="mt-1 text-sm text-brand-navy/60 dark:text-white/60">
              Introduce la contraseña para subir fotos.
            </p>
          </div>

          {!adminOk && (
            <p className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-200 ring-1 ring-amber-400/30">
              Falta configurar <code>ADMIN_PASSWORD</code> y{" "}
              <code>SESSION_SECRET</code> en el servidor.
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
        </form>
      </div>
    );
  }

  const pending = items.filter((it) => it.state === "pending").length;
  const done = items.filter((it) => it.state === "done").length;
  const failed = items.filter((it) => it.state === "error").length;
  const selectedAlbum = albums.find((a) => a.slug === selected);

  return (
    <div className="space-y-6">
      {!cloudinaryOk && (
        <p className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-200 ring-1 ring-amber-400/30">
          Cloudinary no está configurado en el servidor: no se puede subir.
        </p>
      )}

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

      {/* Paso 1 — álbum */}
      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="h-display text-lg text-brand-navy dark:text-white">
            <span className="mr-2 text-brand-gold-700 dark:text-brand-gold-300">1.</span> Álbum
          </h2>
          <button onClick={logout} className="btn-ghost text-xs">
            Salir
          </button>
        </div>

        {albums.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {albums.map((a) => (
              <button
                key={a.slug}
                onClick={() => setSelected(a.slug)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm transition-colors",
                  selected === a.slug
                    ? "bg-brand-red text-white"
                    : "bg-brand-navy/[0.04] dark:bg-white/5 text-brand-navy/70 dark:text-white/70 hover:bg-brand-navy/[0.07] hover:dark:bg-white/10",
                )}
              >
                {a.title}
                <span className="ml-2 text-xs opacity-70">{a.count}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-brand-navy/60 dark:text-white/60">
            Todavía no hay álbumes. Crea el primero abajo.
          </p>
        )}

        <form onSubmit={createAlbum} className="flex flex-col gap-2 sm:flex-row">
          <input
            value={newAlbum}
            onChange={(e) => setNewAlbum(e.target.value)}
            placeholder="Nombre del álbum nuevo (ej. Jornada 1)"
            className="flex-1 rounded-md border border-brand-navy/10 dark:border-white/10 bg-brand-navy/[0.04] dark:bg-white/5 px-3 py-2 text-sm text-brand-navy dark:text-white outline-none focus:border-brand-gold/50"
          />
          <button
            type="button"
            onClick={() => setNewAlbum(suggestNextJornada())}
            className="btn-secondary text-sm"
          >
            {suggestNextJornada()}
          </button>
          <button type="submit" disabled={creating || !newAlbum.trim()} className="btn-primary text-sm disabled:opacity-60">
            {creating ? "Creando…" : "Crear álbum"}
          </button>
        </form>
      </section>

      {/* Paso 2 — fotos */}
      <section className="card p-6">
        <h2 className="mb-1 h-display text-lg text-brand-navy dark:text-white">
          <span className="mr-2 text-brand-gold-700 dark:text-brand-gold-300">2.</span> Fotos
        </h2>
        <p className="mb-4 text-sm text-brand-navy/60 dark:text-white/60">
          {selectedAlbum
            ? `Se subirán a "${selectedAlbum.title}" (${selectedAlbum.count} fotos actualmente).`
            : "Elige un álbum arriba."}
        </p>

        {selected === PLAYERS_ALBUM && (
          <p className="mb-4 rounded-md bg-brand-gold-600/10 dark:bg-brand-gold/10 p-3 text-sm text-brand-gold-700 dark:text-brand-gold-300 ring-1 ring-brand-gold/30">
            <strong>Retratos de jugadores.</strong> Nombra cada archivo con el
            nombre del jugador —{" "}
            <code className="text-brand-navy/75 dark:text-white/80">rafael-borges.jpg</code> o{" "}
            <code className="text-brand-navy/75 dark:text-white/80">Rafael Borges.jpg</code>— y la foto
            saldrá sola en el pódium de anotadores. Volver a subir el mismo
            nombre reemplaza la foto. Este álbum no aparece en la galería
            pública.
          </p>
        )}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInput.current?.click()}
          className={cn(
            "cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors",
            dragging
              ? "border-brand-gold/60 bg-brand-gold/5"
              : "border-brand-navy/15 dark:border-white/15 hover:border-white/30 hover:bg-brand-navy/[0.04] hover:dark:bg-white/[0.03]",
          )}
        >
          <p className="text-brand-navy dark:text-white">Arrastra las fotos aquí</p>
          <p className="mt-1 text-sm text-brand-navy/55 dark:text-white/50">
            o haz clic para elegirlas · JPG o PNG, hasta 10 MB cada una
          </p>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {items.length > 0 && (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={startUpload}
                disabled={uploading || !selected || (!pending && !failed)}
                className="btn-primary disabled:opacity-60"
              >
                {uploading
                  ? "Subiendo…"
                  : failed && !pending
                    ? `Reintentar ${failed}`
                    : `Subir ${pending} foto${pending === 1 ? "" : "s"}`}
              </button>
              <button
                onClick={() => setItems([])}
                disabled={uploading}
                className="btn-secondary text-sm disabled:opacity-60"
              >
                Limpiar lista
              </button>
              <span className="text-sm text-brand-navy/60 dark:text-white/60">
                {done} subidas · {pending} pendientes
                {failed ? ` · ${failed} con error` : ""}
              </span>
            </div>

            <ul className="mt-4 space-y-2">
              {items.map((it) => (
                <li key={it.key} className="flex items-center gap-3 rounded-lg bg-white dark:bg-white/[0.03] p-3">
                  {it.publicId ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={cldThumb(it.publicId, 96)}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 shrink-0 rounded bg-brand-navy/[0.04] dark:bg-white/5" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm text-brand-navy dark:text-white">{it.name}</span>
                      <span
                        className={cn(
                          "shrink-0 text-xs",
                          it.state === "done" && "text-emerald-700 dark:text-emerald-300",
                          it.state === "error" && "text-brand-red-700 dark:text-brand-red-100",
                          it.state === "uploading" && "text-brand-gold-700 dark:text-brand-gold-300",
                          it.state === "pending" && "text-brand-navy/50 dark:text-white/40",
                        )}
                      >
                        {it.state === "done"
                          ? "Listo"
                          : it.state === "error"
                            ? (it.error ?? "Error")
                            : it.state === "uploading"
                              ? `${it.pct}%`
                              : "En cola"}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-brand-navy/[0.07] dark:bg-white/10">
                      <div
                        className={cn(
                          "h-full transition-all",
                          it.state === "error" ? "bg-brand-red" : "bg-brand-gold",
                        )}
                        style={{ width: `${it.state === "done" ? 100 : it.pct}%` }}
                      />
                    </div>
                  </div>

                  {it.state === "done" && (
                    <button
                      onClick={() => removePhoto(it)}
                      className="shrink-0 rounded px-2 py-1 text-xs text-brand-navy/55 dark:text-white/50 hover:bg-brand-navy/[0.07] hover:dark:bg-white/10 hover:text-brand-red-700 hover:dark:text-brand-red-100"
                      title="Borrar de la galería"
                    >
                      Borrar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
