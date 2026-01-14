# Multi-stage build for Cloud Run
FROM node:20-alpine AS builder

# Keep directory layout to preserve relative "file:../../packages/..." deps
WORKDIR /app/services/ingestor

# Copy package files (context is repo root)
COPY services/ingestor/package*.json ./
COPY services/ingestor/tsconfig.json ./
# Copy local shared package to expected relative path
COPY packages/oauth-token-store /app/packages/oauth-token-store

# Install dependencies (no package-lock in repo, use install)
RUN npm install --no-audit --progress=false

# Copy source code including generated SDK
COPY services/ingestor/src ./src

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app/services/ingestor

# Copy package files
COPY services/ingestor/package*.json ./
# Copy local shared package
COPY packages/oauth-token-store /app/packages/oauth-token-store

# Install production dependencies only
RUN npm install --omit=dev --no-audit --progress=false

# Copy built application and generated SDK (needed at runtime)
COPY --from=builder /app/services/ingestor/dist ./dist
# Copy generated SDK to dist folder for runtime require()
COPY --from=builder /app/services/ingestor/src/generated ./dist/generated

# Run as non-root user
USER node

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "dist/index.js"]
