# ==============================================================================
# ALSEK PULSE - DOCKERFILE MULTI-STAGE (Next.js 15 Standalone + Prisma 6)
# ==============================================================================

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# 1. Installation complète des dépendances (devDependencies incluses pour le build)
FROM base AS deps
WORKDIR /app
ENV NODE_ENV=development
COPY package.json ./
COPY prisma ./prisma/
RUN npm install --legacy-peer-deps

# 2. Génération Prisma 6 & Build Next.js Standalone
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN ./node_modules/.bin/prisma generate
RUN npm run build

# 3. Image de Production Légère
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Créer le dossier .data accessible à l'utilisateur nextjs pour le cache/fallback
RUN mkdir -p /app/.data && chown -R nextjs:nodejs /app/.data

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
