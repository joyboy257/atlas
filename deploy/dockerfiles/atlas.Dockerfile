# Atlas Sandbox Dockerfile
# -------------------------
# Builds the Atlas runtime for the sandbox environment.
# Multi-stage: build → production runtime.

FROM node:22-alpine AS builder

WORKDIR /build

# Copy workspace config
COPY package.json package-lock.json ./
COPY packages/atlas/package.json packages/atlas/
COPY packages/project-spec/package.json packages/project-spec/
COPY packages/sdk/package.json packages/sdk/

# Install all dependencies
RUN npm ci

# Copy source and build
COPY packages/ packages/
COPY tsconfig.base.json ./
RUN npm run build --workspace packages/atlas

# ── Production Stage ───────────────────────────────────────────

FROM node:22-alpine AS runtime

RUN addgroup -S atlas && adduser -S atlas -G atlas
WORKDIR /app

# Copy only production artifacts
COPY --from=builder /build/package.json /build/package-lock.json ./
COPY --from=builder /build/packages/atlas/package.json packages/atlas/
COPY --from=builder /build/packages/atlas/dist packages/atlas/dist
COPY --from=builder /build/packages/atlas/bin packages/atlas/bin
COPY --from=builder /build/packages/atlas/schema packages/atlas/schema
COPY --from=builder /build/packages/atlas/examples/front-desk /app/project
RUN rm -rf /app/project/.atlas
RUN chown -R atlas:atlas /app/project

RUN npm ci --omit=dev && npm cache clean --force

USER atlas
EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4001/health || exit 1

CMD ["node", "packages/atlas/dist/sandbox-entry.js"]
