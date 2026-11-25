# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=2048
# URL factice : prisma generate et le prerender n'ouvrent pas une base réelle.
# Les lectures CMS retombent sur les valeurs par défaut si MySQL est absent.
ENV DATABASE_URL=mysql://build:build@127.0.0.1:3306/build
RUN npx prisma generate && npx next build

FROM node:22-bookworm-slim AS migrate
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
COPY package.json ./
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:22-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates tini \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/public ./public
COPY --from=build /app/public/uploads /opt/csirt-defaults/uploads
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/prisma ./prisma
COPY deploy/docker/entrypoint.sh /entrypoint.sh
RUN chmod 755 /entrypoint.sh \
  && mkdir -p /app/data /app/public/uploads \
  && chown -R nextjs:nodejs /app
USER nextjs
EXPOSE 3000
ENTRYPOINT ["tini", "--", "/entrypoint.sh"]
CMD ["node", "server.js"]
