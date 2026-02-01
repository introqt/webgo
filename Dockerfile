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

# Production stage for server
FROM node:20-alpine AS server

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built files
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/server/dist ./packages/server/dist

EXPOSE 3000

CMD ["node", "packages/server/dist/index.js"]

# Nginx stage for client
FROM nginx:alpine AS client

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built client files
COPY --from=builder /app/packages/client/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
