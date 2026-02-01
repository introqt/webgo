# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server
COPY packages/client ./packages/client

# Build shared package first
RUN pnpm --filter @webgo/shared run build

# Build server and client
RUN pnpm --filter @webgo/server run build
RUN pnpm --filter @webgo/client run build

# Nginx stage for client (for local docker-compose if needed)
FROM nginx:alpine AS client

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built client files
COPY --from=builder /app/packages/client/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# Production stage for server (MUST BE LAST - Railway default)
FROM node:20-alpine AS server

WORKDIR /app

# Copy package files for workspace structure
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/

# Copy node_modules from builder (faster than reinstalling)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=builder /app/packages/server/node_modules ./packages/server/node_modules

# Copy built files and migration scripts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/server/src/db ./packages/server/src/db

# Copy built client files to serve as static assets
COPY --from=builder /app/packages/client/dist ./packages/client/dist

EXPOSE 3000

# Run migrations then start server
CMD sh -c "cd packages/server && node dist/db/migrate.js && cd ../.. && node packages/server/dist/index.js"
