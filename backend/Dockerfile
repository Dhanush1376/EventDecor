# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Set NODE_ENV for build-time optimizations (tree-shaking, dead code elimination)
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production Stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder --chown=node:node /app/dist ./dist

# Install pm2 globally
RUN npm install -g pm2

# Copy templates directory for email rendering (Handlebars templates)
COPY --from=builder --chown=node:node /app/src/templates ./src/templates

# Create required directories with correct ownership
RUN mkdir -p logs public/temp && chown -R node:node logs public/temp

# Run as non-root user
USER node

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:10000/api/health || exit 1

CMD ["npm", "run", "start:pm2"]
