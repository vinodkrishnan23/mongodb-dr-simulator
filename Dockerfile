# MongoDB DR Simulator - Optimized Production Dockerfile
# Multi-stage build with enhanced security and performance

# Stage 1: Base image with security updates
FROM node:20-alpine AS base
# Install security updates and necessary packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    libc6-compat \
    curl \
    dumb-init && \
    rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Create non-root user early
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown nextjs:nodejs /app

# Stage 2: Dependencies installation
FROM base AS deps

# Copy package files for better layer caching
COPY package.json package-lock.json* ./

# Install production dependencies with optimizations
RUN npm ci --omit=dev --no-audit --no-fund && \
    npm cache clean --force

# Stage 3: Development dependencies for build
FROM base AS builder

# Copy all dependencies (including dev dependencies)
COPY package.json package-lock.json* ./

# Install all dependencies including dev dependencies
RUN npm ci --no-audit --no-fund

# Copy source code
COPY . .

# Set build-time environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# Stage 4: Production runtime
FROM base AS runner

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Add container labels for better management
LABEL org.opencontainers.image.title="MongoDB DR Simulator"
LABEL org.opencontainers.image.description="Interactive MongoDB Disaster Recovery Simulator"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.authors="MongoDB DR Simulator Team"

# Copy production dependencies
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy health check script
COPY --chown=nextjs:nodejs healthcheck.js ./

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Enhanced health check with better error handling
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node healthcheck.js || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]