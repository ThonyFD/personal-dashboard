# Multi-stage build for Cloud Run
FROM node:20-alpine AS builder

# Keep directory layout to preserve relative "file:../../packages/..." deps
WORKDIR /app/services/poller

# Copy package files (context is repo root)
COPY services/poller/package*.json ./
COPY services/poller/tsconfig.json ./
# Copy local shared package to expected relative path
COPY packages/oauth-token-store /app/packages/oauth-token-store

# Install dependencies
RUN npm install --no-audit --progress=false

# Copy source code
COPY services/poller/src ./src

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app/services/poller

# Copy package files
COPY services/poller/package*.json ./
# Copy local shared package
COPY packages/oauth-token-store /app/packages/oauth-token-store

# Install production dependencies only
RUN npm install --omit=dev --no-audit --progress=false

# Copy built application
COPY --from=builder /app/services/poller/dist ./dist

# Run as non-root user
USER node

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "dist/index.js"]
