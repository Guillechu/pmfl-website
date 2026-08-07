# syntax=docker/dockerfile:1

# ----------------------------------------------------------------------
# PMFL Website — imagen Docker multi-etapa para Next.js 14 (standalone)
# ----------------------------------------------------------------------

# 1) Dependencias
FROM node:20-alpine AS deps
WORKDIR /app
# libc6-compat: requerido por algunos binarios (sharp) en Alpine
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci

# 2) Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 3) Runtime (imagen final, mínima)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Usuario sin privilegios
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copiamos solo lo necesario del build standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# sharp: sin él, Next en modo standalone no optimiza las imágenes —las
# sirve a tamaño completo y llena el log de errores. Con tantos escudos y
# miniaturas de galería, la diferencia de peso es notable.
# Va DESPUÉS de copiar el standalone para no pisar su node_modules.
RUN apk add --no-cache libc6-compat \
  && npm install --no-save --omit=dev sharp \
  && chown -R nextjs:nodejs /app/node_modules

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
