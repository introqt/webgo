# Quick Deploy to Railway.app (PowerShell)
# This script helps you deploy WebGo to Railway in minutes

Write-Host "🚂 WebGo Railway Deployment Script" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Railway CLI is installed
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Railway CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install it with:"
    Write-Host "  npm install -g @railway/cli"
    Write-Host ""
    Write-Host "Or visit: https://docs.railway.app/develop/cli"
    exit 1
}

Write-Host "✅ Railway CLI found" -ForegroundColor Green
Write-Host ""

# Check if user is logged in
try {
    railway whoami | Out-Null
    Write-Host "✅ Logged in to Railway" -ForegroundColor Green
} catch {
    Write-Host "🔐 Please log in to Railway:" -ForegroundColor Yellow
    railway login
}

Write-Host ""

# Generate JWT secret
Write-Host "🔐 Generating secure JWT_SECRET..." -ForegroundColor Yellow
$JWT_SECRET = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
Write-Host "✅ JWT_SECRET generated" -ForegroundColor Green
Write-Host ""

# Initialize Railway project
Write-Host "🚀 Initializing Railway project..." -ForegroundColor Yellow
railway init

Write-Host ""
Write-Host "📦 Creating PostgreSQL database..." -ForegroundColor Yellow
railway add --database postgres

Write-Host ""
Write-Host "🔧 Setting environment variables..." -ForegroundColor Yellow

# Set environment variables
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set DB_SSL=false
railway variables set JWT_SECRET="$JWT_SECRET"

Write-Host "✅ Environment variables set" -ForegroundColor Green
Write-Host ""

# Deploy
Write-Host "🚀 Deploying to Railway..." -ForegroundColor Yellow
railway up

Write-Host ""
Write-Host "✅ Deployment initiated!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Go to https://railway.app/dashboard"
Write-Host "2. Find your project and click on it"
Write-Host "3. Click on 'Settings' → 'Networking' → 'Generate Domain'"
Write-Host "4. Copy the generated domain"
Write-Host "5. Set CORS_ORIGIN: railway variables set CORS_ORIGIN=https://your-domain.railway.app"
Write-Host "6. Wait for redeployment (~2 minutes)"
Write-Host ""
Write-Host "🎉 Your app will be live at the generated domain!" -ForegroundColor Green
