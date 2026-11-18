# Imagem para hospedar o sistema em infraestrutura própria (ex.: CeTIC-DF),
# sem depender da Vercel. Usa o modo "standalone" do Next.js (next.config.mjs).
#
#   docker build -t visitas-domiciliares .
#   docker run -p 3000:3000 -e MONGO_URI=... -e JWT_SECRET=... visitas-domiciliares
#
# Os segredos (MONGO_URI, JWT_SECRET) são passados no momento da execução,
# nunca gravados na imagem.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
# Processo sem privilégios de administrador.
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
