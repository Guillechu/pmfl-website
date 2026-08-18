// ----------------------------------------------------------------------
// Regenera data/youtube-archive.json leyendo el canal de la PMFL.
//
// Por qué existe: leer el canal funciona desde una máquina normal, pero NO
// desde los servidores de Vercel, que es donde se construye el sitio. Así
// que el archivo histórico se genera aquí, a mano, y se sube al repo; en
// producción el sitio lo lee del JSON y solo pide a YouTube lo más reciente.
//
// Cuándo re-ejecutarlo: cuando quieras que los vídeos viejos que YouTube ya
// no manda por RSS aparezcan en el sitio. Los nuevos salen solos.
//
// Uso:  node scripts/actualizar-archivo-youtube.mjs
// ----------------------------------------------------------------------
import { writeFile } from "node:fs/promises";

const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID ?? "UCBUlU2N-7PYZ5Wi_UBJnLOw";
const MAX_PAGES = 12;
const SALIDA = new URL("../data/youtube-archive.json", import.meta.url);

const CABECERAS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
  "Accept-Language": "es",
  // Sin esto YouTube contesta el muro de consentimiento en vez de la página.
  Cookie: "CONSENT=YES+cb; SOCS=CAI",
};

function recolectar(nodo, salida) {
  if (Array.isArray(nodo)) {
    for (const v of nodo) recolectar(v, salida);
    return;
  }
  if (nodo && typeof nodo === "object") {
    if (nodo.lockupViewModel) salida.push(nodo.lockupViewModel);
    if (nodo.videoRenderer) salida.push(nodo.videoRenderer);
    for (const v of Object.values(nodo)) recolectar(v, salida);
  }
}

function leerTarjeta(t) {
  const idNuevo = t.contentId;
  const tituloNuevo = t.metadata?.lockupMetadataViewModel?.title?.content;
  if (idNuevo && tituloNuevo) return { id: idNuevo, title: tituloNuevo };

  const idViejo = t.videoId;
  const tituloViejo =
    t.title?.simpleText ?? t.title?.runs?.map((r) => r.text ?? "").join("");
  if (idViejo && tituloViejo) return { id: idViejo, title: tituloViejo };

  return null;
}

const buscarToken = (p) =>
  /"continuationCommand":\{"token":"([^"]+)"/.exec(JSON.stringify(p))?.[1] ?? null;

const res = await fetch(`https://www.youtube.com/channel/${CHANNEL_ID}/videos`, {
  headers: CABECERAS,
});
if (!res.ok) throw new Error(`canal → HTTP ${res.status}`);
const html = await res.text();

const bruto = /var ytInitialData = (\{.*?\});<\/script>/s.exec(html);
if (!bruto) throw new Error("no se encontró ytInitialData (¿muro de consentimiento?)");

const clientVersion =
  /"INNERTUBE_CLIENT_VERSION":"([^"]+)"/.exec(html)?.[1] ?? "2.20240101.00.00";

const primera = JSON.parse(bruto[1]);
const tarjetas = [];
recolectar(primera, tarjetas);

let token = buscarToken(primera);
let paginas = 1;
while (token && paginas < MAX_PAGES) {
  const cont = await fetch("https://www.youtube.com/youtubei/v1/browse?prettyPrint=false", {
    method: "POST",
    headers: { ...CABECERAS, "Content-Type": "application/json" },
    body: JSON.stringify({
      context: { client: { clientName: "WEB", clientVersion, hl: "es" } },
      continuation: token,
    }),
  });
  if (!cont.ok) break;
  const payload = await cont.json();
  const antes = tarjetas.length;
  recolectar(payload, tarjetas);
  if (tarjetas.length === antes) break;
  token = buscarToken(payload);
  paginas++;
}

const vistos = new Set();
const videos = [];
for (const t of tarjetas) {
  const v = leerTarjeta(t);
  if (!v || vistos.has(v.id)) continue;
  vistos.add(v.id);
  videos.push({ id: v.id, title: v.title.replace(/\s+/g, " ").trim() });
}

if (!videos.length) throw new Error("el canal no devolvió ningún vídeo; no se sobrescribe el archivo");

await writeFile(SALIDA, JSON.stringify(videos, null, 2) + "\n", "utf8");
console.log(`✓ ${videos.length} vídeos guardados en data/youtube-archive.json (${paginas} páginas del canal)`);
