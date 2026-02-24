#Stage 1: Installs only production dependencies
FROM docker.arvancloud.ir/node:20-bullseye-slim AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Stage 2: Builds NestJS application
FROM docker.arvancloud.ir/node:20-bullseye-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# Stage 3: Final optimized image
FROM docker.arvancloud.ir/node:20-bullseye-slim AS production
# Install dumb-init for proper signal handling
RUN apt-get update && \
    apt-get install -y --no-install-recommends dumb-init && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
RUN groupadd -r nodejs && \
    useradd -r -g nodejs nodejs
WORKDIR /app
COPY --chown=nodejs:nodejs --from=dependencies /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs --from=builder /app/dist ./dist
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs .env.example* ./
ENV NODE_ENV=production \
    PORT=3000
USER nodejs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]