# ═══════════════════════════════════════════════════════════════════════
# STAGE 1: BUILDER - Dependencies and compilation
# ═══════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (sqlite3, sharp, puppeteer, etc.)
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev pixman-dev libpng-dev

# Copy package files first (better layer caching)
COPY package*.json ./

# Install dependencies (production + build tools for native modules)
# Using npm ci for reproducible installs, then prune devDependencies
RUN npm ci && npm prune --production

# Copy source code
COPY . .

# ═══════════════════════════════════════════════════════════════════════
# STAGE 2: RUNTIME - Minimal production image
# ═══════════════════════════════════════════════════════════════════════
FROM node:20-alpine

# Add labels for image metadata
LABEL maintainer="imprenta-app" \
      description="Complete printing management system" \
      version="2.0.0"

WORKDIR /app

# Create non-root user for security (principle of least privilege)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy production dependencies from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create required directories with proper permissions
RUN mkdir -p public/uploads public/uploads/thumbs data && \
    chown -R nodejs:nodejs public data

# Expose application port
EXPOSE 3000

# Switch to non-root user
USER nodejs

# Health check for orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Start application
CMD ["node", "server.js"]
