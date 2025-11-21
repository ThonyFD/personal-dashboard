# Multi-stage build for Cloud Run
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code including generated SDK
COPY src ./src

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built application and generated SDK (needed at runtime)
COPY --from=builder /app/dist ./dist
# Copy generated SDK to dist folder for runtime require()
COPY --from=builder /app/src/generated ./dist/generated

# Run as non-root user
USER node

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "dist/index.js"]
