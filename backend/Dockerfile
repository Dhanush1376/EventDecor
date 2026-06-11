# Build Stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN NODE_ENV=production npm run build

# Production Stage
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
# Align Node.js heap limit with PM2 max_memory_restart (800M) to prevent uncontrolled OOM
ENV NODE_OPTIONS="--max-old-space-size=768"

COPY package*.json ./
# --ignore-scripts prevents postinstall supply-chain attacks in production dependencies
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --chown=node:node ecosystem.config.js ./

# Install pm2 globally
RUN npm install -g pm2

# Copy templates directory for email rendering (Handlebars templates)
COPY --from=builder --chown=node:node /app/src/templates ./src/templates

# Create required directories with correct ownership
RUN mkdir -p logs public/temp && chown -R node:node logs public/temp

# Run as non-root user
USER node

EXPOSE 10000

# Use readiness probe (matches render.yaml healthCheckPath) — does not depend on DB state
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-10000}/api/readiness || exit 1

CMD ["npm", "run", "start:pm2"]
