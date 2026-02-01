# WebGo Deployment Guide

This guide covers multiple hosting options for deploying WebGo, from easiest to most advanced.

## Table of Contents
1. [Railway.app (Recommended - Easiest)](#option-1-railwayapp-recommended)
2. [Render.com (Free Tier Available)](#option-2-rendercom)
3. [Fly.io (Good for Docker)](#option-3-flyio)
4. [DigitalOcean App Platform](#option-4-digitalocean-app-platform)
5. [VPS (Most Control)](#option-5-vps-digitalocean-linode-etc)

---

## Option 1: Railway.app (Recommended)

**Pros:** Very easy, automatic deployments from GitHub, built-in PostgreSQL, supports WebSockets
**Cost:** Free tier with $5 credit/month, then pay-as-you-go (~$5-10/month)

### Step-by-Step

1. **Prerequisites**
   - Create account at [railway.app](https://railway.app)
   - Push your code to GitHub

2. **Create New Project**
   ```bash
   # In Railway dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your webgo repository
   ```

3. **Add PostgreSQL Database**
   ```bash
   # In your Railway project
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway will auto-create the database
   ```

4. **Configure Environment Variables**
   
   Click on your web service → "Variables" tab:
   ```env
   NODE_ENV=production
   PORT=3000
   
   # Database (use Railway's provided variables)
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   
   # OR manually set:
   DB_HOST=${{Postgres.PGHOST}}
   DB_PORT=${{Postgres.PGPORT}}
   DB_NAME=${{Postgres.PGDATABASE}}
   DB_USER=${{Postgres.PGUSER}}
   DB_PASSWORD=${{Postgres.PGPASSWORD}}
   DB_SSL=true
   
   # JWT Secret (REQUIRED - generate a strong one!)
   JWT_SECRET=<paste output from: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
   
   # CORS (use your Railway frontend URL)
   CORS_ORIGIN=https://<your-app>.up.railway.app
   ```

5. **Add Build Configuration**
   
   Create `railway.json` in your project root:
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "DOCKERFILE",
       "dockerfilePath": "Dockerfile"
     },
     "deploy": {
       "startCommand": "node packages/server/dist/index.js",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

6. **Update Dockerfile for Railway**
   
   Railway needs a single-stage build. Create `Dockerfile.railway`:
   ```dockerfile
   FROM node:20-alpine

   WORKDIR /app

   # Install pnpm
   RUN npm install -g pnpm

   # Copy package files
   COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
   COPY packages/shared/package.json ./packages/shared/
   COPY packages/server/package.json ./packages/server/
   COPY packages/client/package.json ./packages/client/

   # Install dependencies
   RUN pnpm install --frozen-lockfile

   # Copy source code
   COPY packages ./packages

   # Build all packages
   RUN pnpm build

   # Run migrations on startup
   CMD pnpm db:migrate && node packages/server/dist/index.js

   EXPOSE 3000
   ```

7. **Deploy**
   ```bash
   git add railway.json Dockerfile.railway
   git commit -m "Add Railway deployment config"
   git push
   ```
   Railway will automatically deploy!

8. **Custom Domain (Optional)**
   - Go to your service settings
   - Click "Generate Domain" or add your custom domain
   - Update CORS_ORIGIN environment variable

---

## Option 2: Render.com

**Pros:** Free tier available, good documentation, supports Docker
**Cost:** Free tier (limited), then $7/month for web service + $7/month for PostgreSQL

### Step-by-Step

1. **Sign up** at [render.com](https://render.com)

2. **Create PostgreSQL Database**
   - Dashboard → "New" → "PostgreSQL"
   - Choose Free tier or Starter ($7/month)
   - Note the "Internal Database URL"

3. **Create Web Service**
   - Dashboard → "New" → "Web Service"
   - Connect your GitHub repo
   - Configure:
     ```
     Name: webgo
     Environment: Docker
     Branch: main
     Dockerfile Path: Dockerfile
     ```

4. **Environment Variables**
   
   In the "Environment" section:
   ```env
   NODE_ENV=production
   PORT=3000
   
   # Use Render's PostgreSQL URL
   DATABASE_URL=<your-postgres-internal-url>
   
   # OR parse it manually:
   DB_HOST=<from DATABASE_URL>
   DB_PORT=5432
   DB_NAME=<from DATABASE_URL>
   DB_USER=<from DATABASE_URL>
   DB_PASSWORD=<from DATABASE_URL>
   DB_SSL=true
   
   JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
   CORS_ORIGIN=https://webgo.onrender.com
   ```

5. **Add Build Script**
   
   Update `package.json` in root:
   ```json
   {
     "scripts": {
       "build": "pnpm install && pnpm build:shared && pnpm build:server && pnpm build:client",
       "start": "pnpm db:migrate && node packages/server/dist/index.js"
     }
   }
   ```

6. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy automatically
   - First deploy takes ~5-10 minutes

7. **Static Site for Frontend (Optional)**
   - Create another service: "New" → "Static Site"
   - Build command: `pnpm build:client`
   - Publish directory: `packages/client/dist`
   - Update CORS_ORIGIN to point to this URL

---

## Option 3: Fly.io

**Pros:** Good performance, edge deployment, generous free tier
**Cost:** Free tier includes 3 shared VMs, then ~$2-5/month

### Step-by-Step

1. **Install Fly CLI**
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   
   # macOS/Linux
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login and Launch**
   ```bash
   fly auth login
   cd webgo
   fly launch
   ```
   
   When prompted:
   - App name: `webgo-<your-name>`
   - Region: Choose closest to you
   - PostgreSQL: Yes (it will create one)
   - Deploy now: No (we need to configure first)

3. **Configure fly.toml**
   
   Edit the generated `fly.toml`:
   ```toml
   app = "webgo-yourname"
   primary_region = "iad"

   [build]
     dockerfile = "Dockerfile"

   [env]
     NODE_ENV = "production"
     PORT = "3000"
     DB_SSL = "false"  # Fly's internal network doesn't need SSL

   [http_service]
     internal_port = 3000
     force_https = true
     auto_stop_machines = true
     auto_start_machines = true
     min_machines_running = 1

     [[http_service.checks]]
       grace_period = "30s"
       interval = "15s"
       method = "GET"
       timeout = "5s"
       path = "/health"
   ```

4. **Set Secrets**
   ```bash
   # Generate JWT secret
   fly secrets set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   
   # Set database URL (Fly provides this automatically)
   # Get it with: fly postgres config show
   fly secrets set DATABASE_URL=<your-fly-postgres-url>
   ```

5. **Add Health Check Endpoint**
   
   In `packages/server/src/index.ts`, add:
   ```typescript
   app.get('/health', (req, res) => {
     res.json({ status: 'ok' });
   });
   ```

6. **Deploy**
   ```bash
   fly deploy
   ```

7. **Scale (if needed)**
   ```bash
   # Check current status
   fly status
   
   # Scale up
   fly scale count 2
   
   # Scale memory
   fly scale memory 512
   ```

---

## Option 4: DigitalOcean App Platform

**Pros:** Simple UI, integrated with DO ecosystem
**Cost:** $5/month for basic app + $15/month for PostgreSQL

### Step-by-Step

1. **Create App**
   - Go to [DigitalOcean](https://cloud.digitalocean.com)
   - Click "Create" → "Apps"
   - Connect your GitHub repo

2. **Configure Components**
   
   **Backend (Server):**
   ```
   Type: Web Service
   Source: packages/server
   Build Command: pnpm install && pnpm build:shared && pnpm build:server
   Run Command: pnpm db:migrate && node dist/index.js
   HTTP Port: 3000
   ```

   **Frontend (Client):**
   ```
   Type: Static Site
   Source: packages/client
   Build Command: pnpm install && pnpm build:shared && pnpm build:client
   Output Directory: dist
   ```

3. **Add PostgreSQL**
   - Click "Create Resources" → "Database"
   - Choose PostgreSQL
   - Plan: Basic ($15/month)

4. **Environment Variables**
   ```env
   NODE_ENV=production
   PORT=3000
   DB_HOST=${db.HOSTNAME}
   DB_PORT=${db.PORT}
   DB_NAME=${db.DATABASE}
   DB_USER=${db.USERNAME}
   DB_PASSWORD=${db.PASSWORD}
   DB_SSL=true
   JWT_SECRET=<generate>
   CORS_ORIGIN=${client.PUBLIC_URL}
   ```

5. **Deploy**
   - Click "Next" → "Create Resources"
   - App Platform will build and deploy

---

## Option 5: VPS (DigitalOcean, Linode, etc.)

**Pros:** Full control, cheapest for high traffic
**Cost:** $4-6/month for basic VPS

### Step-by-Step

1. **Create Droplet/VPS**
   - OS: Ubuntu 22.04 LTS
   - Size: Basic $6/month (1GB RAM)

2. **SSH into Server**
   ```bash
   ssh root@<your-server-ip>
   ```

3. **Install Prerequisites**
   ```bash
   # Update system
   apt update && apt upgrade -y
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   
   # Install Docker Compose
   apt install docker-compose -y
   
   # Install Node.js (for generating secrets)
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt install -y nodejs
   ```

4. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/webgo.git
   cd webgo
   ```

5. **Create .env File**
   ```bash
   # Generate JWT secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # Create .env
   cat > .env << EOF
   NODE_ENV=production
   JWT_SECRET=<paste-generated-secret>
   CORS_ORIGIN=http://<your-server-ip>
   EOF
   ```

6. **Deploy with Docker Compose**
   ```bash
   docker-compose up -d
   ```

7. **Run Migrations**
   ```bash
   docker-compose exec server pnpm db:migrate
   ```

8. **Setup Nginx Reverse Proxy**
   ```bash
   apt install nginx -y
   
   cat > /etc/nginx/sites-available/webgo << 'EOF'
   server {
       listen 80;
       server_name <your-domain-or-ip>;
   
       # Frontend
       location / {
           proxy_pass http://localhost:80;
           proxy_set_header Host $host;
       }
   
       # Backend API
       location /api {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   
       # WebSocket
       location /socket.io {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
       }
   }
   EOF
   
   ln -s /etc/nginx/sites-available/webgo /etc/nginx/sites-enabled/
   nginx -t && systemctl restart nginx
   ```

9. **Setup SSL with Let's Encrypt (Optional)**
   ```bash
   apt install certbot python3-certbot-nginx -y
   certbot --nginx -d yourdomain.com
   ```

10. **Auto-restart on Reboot**
    ```bash
    docker update --restart unless-stopped $(docker ps -q)
    ```

---

## Environment Variables Reference

Required for all platforms:

| Variable | How to Generate | Example |
|----------|----------------|---------|
| `NODE_ENV` | Set to `production` | `production` |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | `a3f5d8...` (64 chars) |
| `CORS_ORIGIN` | Your frontend URL | `https://app.example.com` |
| `DB_HOST` | From database provider | `postgres.railway.internal` |
| `DB_PORT` | Usually `5432` | `5432` |
| `DB_NAME` | From database provider | `railway` |
| `DB_USER` | From database provider | `postgres` |
| `DB_PASSWORD` | From database provider | `xxx` |
| `DB_SSL` | `true` for external DBs | `true` |

---

## Post-Deployment Checklist

- [ ] Database migrations ran successfully
- [ ] JWT_SECRET is set to a strong value (not default)
- [ ] CORS_ORIGIN matches your frontend URL
- [ ] WebSocket connections work (test real-time moves)
- [ ] SSL certificate installed (HTTPS)
- [ ] Backups configured for database
- [ ] Monitoring/logging setup (optional)
- [ ] Custom domain configured (optional)

---

## Troubleshooting

### "FATAL: JWT_SECRET is required"
Generate a secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Set it in your platform's environment variables.

### WebSocket Connection Failed
- Ensure your hosting platform supports WebSockets
- Check that CORS_ORIGIN is set correctly
- Verify no firewall blocking port 3000

### Database Connection Failed
- Check DB_SSL setting (use `true` for managed databases)
- Verify all DB_* credentials are correct
- Ensure database is in same region/network as app

### Build Failed
- Ensure all dependencies are in package.json
- Check build logs for specific errors
- Try building locally first: `pnpm build`

---

## Recommended Setup for Different Budgets

**Free / Learning:**
- Render.com (free tier) - Limited hours but good for demos

**Small Project ($5-10/month):**
- Railway.app - Best developer experience

**Production ($15-30/month):**
- Fly.io (app) + managed PostgreSQL
- OR DigitalOcean App Platform

**High Traffic ($30+/month):**
- VPS with Docker + managed PostgreSQL
- Consider CDN for frontend (Cloudflare, Vercel)

---

## Next Steps

1. Choose a hosting platform from above
2. Follow the step-by-step guide
3. Deploy and test
4. Setup monitoring (optional but recommended)
5. Configure custom domain (optional)

Need help? Check the troubleshooting section or open an issue on GitHub.
