# ==================================
# Build Stage
# ==================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api-analytics/package.json ./apps/api-analytics/
COPY packages ./packages

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api-analytics ./apps/api-analytics
COPY tsconfig.json ./

# Build the application
RUN pnpm --filter @verichron/api-analytics build

# ==================================
# Production Stage
# ==================================
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm and dumb-init (for proper signal handling)
RUN npm install -g pnpm@9 && \
    apk add --no-cache dumb-init

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api-analytics/package.json ./apps/api-analytics/
COPY packages ./packages

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder
COPY --from=builder /app/apps/api-analytics/dist ./apps/api-analytics/dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3010

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3010/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "apps/api-analytics/dist/main.js"]
