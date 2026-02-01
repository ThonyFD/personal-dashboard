# Builder stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production deps only
COPY package*.json ./
RUN npm install --only=production

# Copy built code from builder
COPY --from=builder /app/dist ./dist

# Use non-root user
USER node

# Expose port
EXPOSE 8080

# Start service
CMD ["node", "dist/index.js"]
