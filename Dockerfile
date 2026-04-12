FROM node:20-alpine AS builder

WORKDIR /app

# Native build tools for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy workspace manifests
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/core/package.json packages/core/

# Install all dependencies
RUN npm ci

# Copy source code
COPY packages/core/ packages/core/
COPY apps/web/ apps/web/
COPY config/ config/

# Ensure public directory exists (may be absent in some builds)
RUN mkdir -p /app/apps/web/public

# Build the web app
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static apps/web/.next/static
COPY --from=builder /app/apps/web/public apps/web/public

# Runtime directory for AVE metrics, smartmoney snapshots, and credential DB
RUN mkdir -p /app/apps/web/.runtime && \
    chown nextjs:nodejs /app/apps/web/.runtime

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
