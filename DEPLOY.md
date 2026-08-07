# Despliegue con Docker — PMFL Website

Guía rápida para levantar el sitio en tu servidor Linux con Docker.

## 1. Requisitos en el servidor

- Docker y Docker Compose instalados.
- Los archivos del proyecto copiados al servidor (por `git clone` o `scp`).

## 2. Configurar variables de entorno

Copia la plantilla y edítala:

```bash
cp .env.example .env
nano .env
```

Rellena al menos:

- `CLOOB_TOURNAMENT_ID` y `CLOOB_CATEGORY_ID` → torneo/categoría de la PMFL en Cloob (ya vienen con los valores actuales).
- `RESEND_API_KEY` → si quieres que funcione el formulario de contacto.
- `CLOUDINARY_*` → para la galería (fase siguiente).

> ⚠️ El archivo `.env` contiene secretos y **no** se sube a git (está en `.gitignore`).

## 3. Construir y levantar

Con Docker Compose (recomendado):

```bash
docker compose up -d --build
```

El sitio queda escuchando en el puerto **3000**. Compruébalo:

```bash
curl -I http://localhost:3000
```

Para ver logs / reiniciar / detener:

```bash
docker compose logs -f
docker compose restart
docker compose down
```

Sin Compose (solo Docker):

```bash
docker build -t pmfl-website .
docker run -d --name pmfl-website -p 3000:3000 --env-file .env pmfl-website
```

## 4. Poner detrás de tu dominio (HTTPS)

Coloca un reverse proxy (Nginx, Caddy o Traefik) delante del contenedor,
apuntando `pmfl.com.pa` → `http://localhost:3000`, y que gestione el
certificado TLS. Ejemplo mínimo con Nginx:

```nginx
server {
  server_name pmfl.com.pa;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

(Usa Certbot para el certificado, o Caddy que lo hace automático.)

## 5. Actualizar el sitio

Cuando cambie el código:

```bash
git pull            # o vuelve a copiar los archivos
docker compose up -d --build
```

---

## Notas sobre las estadísticas en vivo

- Los datos (clasificación, goleadores, resultados) se leen desde la API
  pública de Cloob en el **servidor**, y se cachean **60 s** (configurable
  con `CLOOB_REVALIDATE`). No hace falta editar JSON a mano.
- Si Cloob no responde, las páginas muestran un estado "próximamente" en
  vez de romperse.
- **Nueva temporada:** cuando crees un torneo nuevo en Cloob, actualiza
  `CLOOB_TOURNAMENT_ID` y `CLOOB_CATEGORY_ID` en `.env` y reinicia el
  contenedor.
