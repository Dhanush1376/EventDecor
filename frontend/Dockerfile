# --- Stage 1: Build Environment ---
FROM node:20-alpine AS builder

WORKDIR /app

# Enable caching of dependency layers
COPY package*.json ./
RUN npm ci

# Copy codebase and compile optimized static assets
COPY . .
RUN npm run build

# --- Stage 2: High-Performance Production Serve ---
FROM nginxinc/nginx-unprivileged:1.25-alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 8080 for Nginx unprivileged traffic
EXPOSE 8080

# Run healthcheck validation
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
